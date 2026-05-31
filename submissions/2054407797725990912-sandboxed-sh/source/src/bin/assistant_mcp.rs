//! MCP server for a standalone Hermes assistant.
//!
//! This is intentionally narrower than `orchestrator-mcp`: it exposes the
//! control-plane tools a personal assistant needs without deployment or
//! durable-job capabilities.

use std::io::{BufRead, BufReader, Write};

use chrono::Utc;
use jsonwebtoken::{EncodingKey, Header};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

const SERVER_VERSION: &str = "0.1.0";

#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    #[serde(rename = "jsonrpc")]
    _jsonrpc: String,
    #[serde(default)]
    id: Value,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Serialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize)]
struct JsonRpcError {
    code: i32,
    message: String,
}

impl JsonRpcResponse {
    fn success(id: Value, result: Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    fn error(id: Value, code: i32, message: impl Into<String>) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(JsonRpcError {
                code,
                message: message.into(),
            }),
        }
    }
}

#[derive(Debug, Serialize)]
struct ToolDefinition {
    name: String,
    description: String,
    #[serde(rename = "inputSchema")]
    input_schema: Value,
}

#[derive(Debug, Deserialize)]
struct MissionIdParams {
    mission_id: String,
}

#[derive(Debug, Deserialize)]
struct ListMissionsParams {
    #[serde(default)]
    status: Option<String>,
    #[serde(default = "default_limit")]
    limit: usize,
}

#[derive(Debug, Deserialize)]
struct MissionEventsParams {
    mission_id: String,
    #[serde(default = "default_event_limit")]
    limit: usize,
    #[serde(default)]
    view: Option<String>,
    #[serde(default)]
    since_seq: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct StartMissionParams {
    title: String,
    prompt: String,
    #[serde(default)]
    workspace_id: Option<String>,
    #[serde(default)]
    backend: Option<String>,
    #[serde(default)]
    model_override: Option<String>,
    #[serde(default)]
    model_effort: Option<String>,
    #[serde(default)]
    config_profile: Option<String>,
    #[serde(default)]
    agent: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SendMessageParams {
    mission_id: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct JwtClaims {
    sub: String,
    usr: String,
    iat: i64,
    exp: i64,
}

fn default_limit() -> usize {
    50
}

fn default_event_limit() -> usize {
    40
}

fn mint_service_jwt(secret: &str) -> Option<String> {
    let now = Utc::now();
    let exp = now + chrono::Duration::hours(24);
    let user_id = std::env::var("HERMES_ASSISTANT_USER_ID")
        .or_else(|_| std::env::var("SANDBOXED_ASSISTANT_USER_ID"))
        .or_else(|_| std::env::var("SANDBOXED_SINGLE_TENANT_USER_ID"))
        .or_else(|_| std::env::var("SINGLE_TENANT_USER_ID"))
        .unwrap_or_else(|_| "default".to_string());
    let user_id = user_id.trim();
    let user_id = if user_id.is_empty() {
        "default"
    } else {
        user_id
    };

    let claims = JwtClaims {
        sub: user_id.to_string(),
        usr: user_id.to_string(),
        iat: now.timestamp(),
        exp: exp.timestamp(),
    };
    jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .ok()
}

struct AssistantMcp {
    api_url: String,
    api_token: Option<String>,
    client: reqwest::Client,
}

impl AssistantMcp {
    fn new() -> Self {
        let api_url = std::env::var("HERMES_SANDBOXED_API_URL")
            .or_else(|_| std::env::var("SANDBOXED_API_URL"))
            .or_else(|_| std::env::var("OPEN_AGENT_API_URL"))
            .unwrap_or_else(|_| "http://127.0.0.1:3000".to_string())
            .trim_end_matches('/')
            .to_string();
        let api_token = std::env::var("HERMES_SANDBOXED_API_TOKEN")
            .or_else(|_| std::env::var("SANDBOXED_API_TOKEN"))
            .or_else(|_| std::env::var("OPEN_AGENT_API_TOKEN"))
            .ok()
            .filter(|token| !token.trim().is_empty())
            .or_else(|| {
                std::env::var("JWT_SECRET")
                    .ok()
                    .filter(|secret| !secret.trim().is_empty())
                    .and_then(|secret| mint_service_jwt(&secret))
            });
        Self {
            api_url,
            api_token,
            client: reqwest::Client::new(),
        }
    }

    fn auth_header(&self) -> Option<(String, String)> {
        self.api_token
            .as_ref()
            .map(|token| ("Authorization".to_string(), format!("Bearer {token}")))
    }

    async fn api_get(&self, path: &str) -> Result<reqwest::Response, String> {
        let mut req = self.client.get(format!("{}{}", self.api_url, path));
        if let Some((name, value)) = self.auth_header() {
            req = req.header(name, value);
        }
        req.send()
            .await
            .map_err(|error| format!("HTTP request failed: {error}"))
    }

    async fn api_post(&self, path: &str, body: Value) -> Result<reqwest::Response, String> {
        let mut req = self
            .client
            .post(format!("{}{}", self.api_url, path))
            .json(&body);
        if let Some((name, value)) = self.auth_header() {
            req = req.header(name, value);
        }
        req.send()
            .await
            .map_err(|error| format!("HTTP request failed: {error}"))
    }

    fn tools() -> Vec<ToolDefinition> {
        vec![
            ToolDefinition {
                name: "list_active_missions".to_string(),
                description: "List active, pending, blocked, or awaiting-user missions in sandboxed.sh.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "description": "Maximum missions to return, default 50."}
                    }
                }),
            },
            ToolDefinition {
                name: "list_missions".to_string(),
                description: "List recent missions, optionally filtered by status.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "status": {"type": "string", "description": "Optional mission status filter."},
                        "limit": {"type": "integer", "description": "Maximum missions to return, default 50."}
                    }
                }),
            },
            ToolDefinition {
                name: "get_mission".to_string(),
                description: "Get one mission by UUID.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["mission_id"],
                    "properties": {"mission_id": {"type": "string"}}
                }),
            },
            ToolDefinition {
                name: "get_mission_events".to_string(),
                description: "Fetch persisted mission events, usually with view='transcript' for chat history or view='all' for debugging.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["mission_id"],
                    "properties": {
                        "mission_id": {"type": "string"},
                        "limit": {"type": "integer", "description": "Maximum events to return, default 40."},
                        "view": {"type": "string", "enum": ["transcript", "trace", "history", "all"]},
                        "since_seq": {"type": "integer", "description": "Return events with sequence greater than this value."}
                    }
                }),
            },
            ToolDefinition {
                name: "start_mission".to_string(),
                description: "Create a new sandboxed.sh mission and send its initial prompt.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["title", "prompt"],
                    "properties": {
                        "title": {"type": "string"},
                        "prompt": {"type": "string"},
                        "workspace_id": {"type": "string"},
                        "backend": {"type": "string", "enum": ["opencode", "claudecode", "codex", "gemini", "grok"]},
                        "model_override": {"type": "string"},
                        "model_effort": {"type": "string", "enum": ["low", "medium", "high", "xhigh", "max"]},
                        "config_profile": {"type": "string"},
                        "agent": {"type": "string"}
                    }
                }),
            },
            ToolDefinition {
                name: "send_message_to_mission".to_string(),
                description: "Send a follow-up message to an existing mission.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["mission_id", "content"],
                    "properties": {
                        "mission_id": {"type": "string"},
                        "content": {"type": "string"}
                    }
                }),
            },
            ToolDefinition {
                name: "cancel_mission".to_string(),
                description: "Cancel a running or pending mission.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["mission_id"],
                    "properties": {"mission_id": {"type": "string"}}
                }),
            },
            ToolDefinition {
                name: "list_workspaces".to_string(),
                description: "List sandboxed.sh workspaces so new missions can target the right environment.".to_string(),
                input_schema: json!({"type": "object", "properties": {}}),
            },
        ]
    }

    async fn list_missions(&self, params: ListMissionsParams) -> Result<Value, String> {
        let limit = params.limit.clamp(1, 100);
        let response = self
            .api_get(&format!("/api/control/missions?limit={limit}&offset=0"))
            .await?;
        if !response.status().is_success() {
            return Err(format!("Failed to list missions: {}", response.status()));
        }
        let mut missions: Vec<Value> = response
            .json()
            .await
            .map_err(|error| format!("Failed to parse missions: {error}"))?;
        if let Some(status) = params.status {
            missions.retain(|mission| mission["status"].as_str() == Some(status.as_str()));
        }
        let missions = missions
            .into_iter()
            .map(compact_mission_summary)
            .collect::<Vec<_>>();
        Ok(json!({ "missions": missions }))
    }

    async fn list_active_missions(&self, limit: usize) -> Result<Value, String> {
        let requested = limit.clamp(1, 100);
        // The API returns the most recent missions regardless of status, so a
        // narrow fetch limit can be fully consumed by recent completed missions
        // and starve the active filter below. Fetch a wider window than the
        // caller asked for, then filter and truncate to the requested count.
        let fetch_limit = requested.saturating_mul(4).clamp(50, 100);
        let mut result = self
            .list_missions(ListMissionsParams {
                status: None,
                limit: fetch_limit,
            })
            .await?;
        if let Some(missions) = result["missions"].as_array_mut() {
            missions.retain(|mission| {
                matches!(
                    mission["status"].as_str(),
                    Some("active" | "pending" | "awaiting_user" | "blocked")
                )
            });
            missions.truncate(requested);
        }
        Ok(result)
    }

    async fn get_mission(&self, params: MissionIdParams) -> Result<Value, String> {
        let id = parse_uuid(&params.mission_id)?;
        let response = self.api_get(&format!("/api/control/missions/{id}")).await?;
        if !response.status().is_success() {
            return Err(format!("Mission not found: {}", response.status()));
        }
        response
            .json()
            .await
            .map_err(|error| format!("Failed to parse mission: {error}"))
    }

    async fn get_mission_events(&self, params: MissionEventsParams) -> Result<Value, String> {
        let id = parse_uuid(&params.mission_id)?;
        let limit = params.limit.clamp(1, 200);
        // Validate against the declared enum rather than interpolating a
        // free-form string into the URL, which would let a caller smuggle
        // extra query parameters (e.g. `all&foo=bar`) into the internal request.
        let view = match params.view.as_deref() {
            None | Some("transcript") => "transcript",
            Some("trace") => "trace",
            Some("history") => "history",
            Some("all") => "all",
            Some(other) => {
                return Err(format!(
                    "Invalid view '{other}'; expected one of: transcript, trace, history, all"
                ))
            }
        };
        let mut path = format!(
            "/api/control/missions/{id}/events?limit={limit}&view={view}&include_counts=false"
        );
        if let Some(since_seq) = params.since_seq {
            path.push_str(&format!("&since_seq={since_seq}"));
        }
        let response = self.api_get(&path).await?;
        if !response.status().is_success() {
            return Err(format!(
                "Failed to fetch mission events: {}",
                response.status()
            ));
        }
        response
            .json()
            .await
            .map_err(|error| format!("Failed to parse mission events: {error}"))
    }

    async fn start_mission(&self, params: StartMissionParams) -> Result<Value, String> {
        let workspace_id = resolve_default_workspace_id(params.workspace_id);
        let body = json!({
            "title": params.title,
            "workspace_id": workspace_id,
            "backend": params.backend,
            "model_override": params.model_override,
            "model_effort": params.model_effort,
            "config_profile": params.config_profile,
            "agent": params.agent,
        });
        let response = self.api_post("/api/control/missions", body).await?;
        if !response.status().is_success() {
            let text = response.text().await.unwrap_or_default();
            return Err(format!("Failed to create mission: {text}"));
        }
        let mission: Value = response
            .json()
            .await
            .map_err(|error| format!("Failed to parse created mission: {error}"))?;
        let Some(mission_id) = mission["id"].as_str() else {
            return Err("Created mission response did not include an id".to_string());
        };
        self.send_message(SendMessageParams {
            mission_id: mission_id.to_string(),
            content: params.prompt,
        })
        .await?;
        Ok(json!({ "mission": mission }))
    }

    async fn send_message(&self, params: SendMessageParams) -> Result<Value, String> {
        let id = parse_uuid(&params.mission_id)?;
        let response = self
            .api_post(
                "/api/control/message",
                json!({
                    "mission_id": id.to_string(),
                    "content": params.content,
                }),
            )
            .await?;
        if !response.status().is_success() {
            let text = response.text().await.unwrap_or_default();
            return Err(format!("Failed to send message: {text}"));
        }
        response
            .json()
            .await
            .map_err(|error| format!("Failed to parse send result: {error}"))
    }

    async fn cancel_mission(&self, params: MissionIdParams) -> Result<Value, String> {
        let id = parse_uuid(&params.mission_id)?;
        let response = self
            .api_post(&format!("/api/control/missions/{id}/cancel"), json!({}))
            .await?;
        if !response.status().is_success() {
            let text = response.text().await.unwrap_or_default();
            return Err(format!("Failed to cancel mission: {text}"));
        }
        Ok(json!({ "success": true, "cancelled": id.to_string() }))
    }

    async fn list_workspaces(&self) -> Result<Value, String> {
        let response = self.api_get("/api/workspaces").await?;
        if !response.status().is_success() {
            return Err(format!("Failed to list workspaces: {}", response.status()));
        }
        let workspaces: Value = response
            .json()
            .await
            .map_err(|error| format!("Failed to parse workspaces: {error}"))?;
        Ok(json!({ "workspaces": workspaces }))
    }

    async fn handle_call(&self, name: &str, arguments: Value) -> Result<Value, String> {
        match name {
            "list_active_missions" => {
                let params: ListMissionsParams = serde_json::from_value(arguments)
                    .map_err(|error| format!("Invalid params: {error}"))?;
                self.list_active_missions(params.limit).await
            }
            "list_missions" => {
                let params: ListMissionsParams = serde_json::from_value(arguments)
                    .map_err(|error| format!("Invalid params: {error}"))?;
                self.list_missions(params).await
            }
            "get_mission" => {
                let params: MissionIdParams = serde_json::from_value(arguments)
                    .map_err(|error| format!("Invalid params: {error}"))?;
                self.get_mission(params).await
            }
            "get_mission_events" => {
                let params: MissionEventsParams = serde_json::from_value(arguments)
                    .map_err(|error| format!("Invalid params: {error}"))?;
                self.get_mission_events(params).await
            }
            "start_mission" => {
                let params: StartMissionParams = serde_json::from_value(arguments)
                    .map_err(|error| format!("Invalid params: {error}"))?;
                self.start_mission(params).await
            }
            "send_message_to_mission" => {
                let params: SendMessageParams = serde_json::from_value(arguments)
                    .map_err(|error| format!("Invalid params: {error}"))?;
                self.send_message(params).await
            }
            "cancel_mission" => {
                let params: MissionIdParams = serde_json::from_value(arguments)
                    .map_err(|error| format!("Invalid params: {error}"))?;
                self.cancel_mission(params).await
            }
            "list_workspaces" => self.list_workspaces().await,
            other => Err(format!("Unknown tool: {other}")),
        }
    }

    async fn handle_request(&self, req: JsonRpcRequest) -> JsonRpcResponse {
        match req.method.as_str() {
            "initialize" => JsonRpcResponse::success(
                req.id,
                json!({
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {"name": "sandboxed-hermes-assistant", "version": SERVER_VERSION},
                    "capabilities": {"tools": {}}
                }),
            ),
            "tools/list" => JsonRpcResponse::success(req.id, json!({ "tools": Self::tools() })),
            "tools/call" => {
                let Some(params) = req.params.as_object() else {
                    return JsonRpcResponse::error(req.id, -32602, "Invalid params");
                };
                let Some(name) = params.get("name").and_then(Value::as_str) else {
                    return JsonRpcResponse::error(req.id, -32602, "Missing tool name");
                };
                let arguments = params
                    .get("arguments")
                    .cloned()
                    .unwrap_or_else(|| json!({}));
                match self.handle_call(name, arguments).await {
                    Ok(mut value) => {
                        scrub_sensitive_json(&mut value);
                        JsonRpcResponse::success(
                            req.id,
                            json!({
                                "content": [{
                                    "type": "text",
                                    "text": serde_json::to_string_pretty(&value).unwrap_or_else(|_| value.to_string())
                                }]
                            }),
                        )
                    }
                    Err(error) => JsonRpcResponse::error(req.id, -32000, error),
                }
            }
            _ => JsonRpcResponse::error(req.id, -32601, "Method not found"),
        }
    }
}

fn parse_uuid(raw: &str) -> Result<Uuid, String> {
    Uuid::parse_str(raw.trim()).map_err(|_| format!("Invalid UUID: {raw}"))
}

fn resolve_default_workspace_id(explicit_workspace_id: Option<String>) -> Option<String> {
    explicit_workspace_id
        .or_else(|| std::env::var("HERMES_DEFAULT_WORKSPACE_ID").ok())
        .or_else(|| std::env::var("ASSISTANT_DEFAULT_WORKSPACE_ID").ok())
        .filter(|value| !value.trim().is_empty())
}

fn compact_mission_summary(mission: Value) -> Value {
    json!({
        "id": mission.get("id").cloned().unwrap_or(Value::Null),
        "title": mission.get("title").cloned().unwrap_or(Value::Null),
        "status": mission.get("status").cloned().unwrap_or(Value::Null),
        "mission_mode": mission.get("mission_mode").cloned().unwrap_or(Value::Null),
        "backend": mission.get("backend").cloned().unwrap_or(Value::Null),
        "model_override": mission.get("model_override").cloned().unwrap_or(Value::Null),
        "workspace_id": mission.get("workspace_id").cloned().unwrap_or(Value::Null),
        "workspace_name": mission.get("workspace_name").cloned().unwrap_or(Value::Null),
        "short_description": mission.get("short_description").cloned().unwrap_or(Value::Null),
        "updated_at": mission.get("updated_at").cloned().unwrap_or(Value::Null),
    })
}

fn is_sensitive_key(key: &str) -> bool {
    let key = key.to_ascii_lowercase();
    key.contains("token")
        || key.contains("secret")
        || key.contains("password")
        || key.contains("api_key")
        || key.contains("apikey")
        || key.contains("authkey")
        || key.contains("private_key")
        || key.contains("credential")
}

fn is_sensitive_value(value: &str) -> bool {
    let trimmed = value.trim();
    trimmed.starts_with("ghp_")
        || trimmed.starts_with("github_pat_")
        || trimmed.starts_with("sk-")
        || trimmed.starts_with("tskey-")
        || trimmed.contains("BEGIN OPENSSH PRIVATE KEY")
        || trimmed.contains("BEGIN PGP PRIVATE KEY")
        || trimmed.contains("<encrypted")
}

fn scrub_sensitive_json(value: &mut Value) {
    match value {
        Value::Object(map) => {
            for (key, child) in map.iter_mut() {
                if is_sensitive_key(key) {
                    *child = Value::String("[redacted]".to_string());
                } else {
                    scrub_sensitive_json(child);
                }
            }
        }
        Value::Array(items) => {
            for item in items {
                scrub_sensitive_json(item);
            }
        }
        Value::String(raw) if is_sensitive_value(raw) => {
            *value = Value::String("[redacted]".to_string());
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    const ENV_KEYS: &[&str] = &[
        "HERMES_SANDBOXED_API_URL",
        "SANDBOXED_API_URL",
        "OPEN_AGENT_API_URL",
        "HERMES_SANDBOXED_API_TOKEN",
        "SANDBOXED_API_TOKEN",
        "OPEN_AGENT_API_TOKEN",
        "HERMES_DEFAULT_WORKSPACE_ID",
        "ASSISTANT_DEFAULT_WORKSPACE_ID",
    ];

    fn clear_env() {
        for key in ENV_KEYS {
            std::env::remove_var(key);
        }
    }

    #[test]
    fn compact_mission_summary_keeps_only_hermes_safe_fields() {
        let summary = compact_mission_summary(json!({
            "id": "mission-1",
            "title": "Fix the build",
            "status": "active",
            "mission_mode": "default",
            "backend": "codex",
            "model_override": "gpt-5.5",
            "workspace_id": "workspace-1",
            "workspace_name": "assistant",
            "short_description": "Build fix",
            "updated_at": "2026-05-28T12:00:00Z",
            "prompt": "secret prompt",
            "api_token": "sk-test",
        }));

        assert_eq!(summary["id"], "mission-1");
        assert_eq!(summary["workspace_name"], "assistant");
        assert!(summary.get("prompt").is_none());
        assert!(summary.get("api_token").is_none());
    }

    #[test]
    fn scrub_sensitive_json_redacts_nested_keys_and_token_values() {
        let mut value = json!({
            "mission": {
                "title": "Hermes",
                "api_key": "sk-test",
                "notes": ["visible", "github_pat_123"]
            },
            "token": "plain-token"
        });

        scrub_sensitive_json(&mut value);

        assert_eq!(value["mission"]["title"], "Hermes");
        assert_eq!(value["mission"]["api_key"], "[redacted]");
        assert_eq!(value["mission"]["notes"][0], "visible");
        assert_eq!(value["mission"]["notes"][1], "[redacted]");
        assert_eq!(value["token"], "[redacted]");
    }

    #[test]
    fn hermes_connection_env_takes_precedence_over_legacy_names() {
        let _guard = ENV_LOCK.lock().unwrap();
        clear_env();
        std::env::set_var("OPEN_AGENT_API_URL", "https://open-agent.example");
        std::env::set_var("SANDBOXED_API_URL", "https://sandboxed.example");
        std::env::set_var("HERMES_SANDBOXED_API_URL", "https://hermes.example/");
        std::env::set_var("OPEN_AGENT_API_TOKEN", "open-agent-token");
        std::env::set_var("SANDBOXED_API_TOKEN", "sandboxed-token");
        std::env::set_var("HERMES_SANDBOXED_API_TOKEN", "hermes-token");

        let server = AssistantMcp::new();

        assert_eq!(server.api_url, "https://hermes.example");
        assert_eq!(server.api_token.as_deref(), Some("hermes-token"));
        clear_env();
    }

    #[test]
    fn legacy_connection_envs_remain_supported_for_compatibility() {
        let _guard = ENV_LOCK.lock().unwrap();
        clear_env();
        std::env::set_var("OPEN_AGENT_API_URL", "https://open-agent.example");
        std::env::set_var("SANDBOXED_API_URL", "https://sandboxed.example/");
        std::env::set_var("OPEN_AGENT_API_TOKEN", "open-agent-token");
        std::env::set_var("SANDBOXED_API_TOKEN", "sandboxed-token");

        let server = AssistantMcp::new();

        assert_eq!(server.api_url, "https://sandboxed.example");
        assert_eq!(server.api_token.as_deref(), Some("sandboxed-token"));
        clear_env();
    }

    #[test]
    fn explicit_workspace_id_takes_precedence_over_default_envs() {
        let _guard = ENV_LOCK.lock().unwrap();
        clear_env();
        std::env::set_var("HERMES_DEFAULT_WORKSPACE_ID", "hermes-workspace");
        std::env::set_var("ASSISTANT_DEFAULT_WORKSPACE_ID", "assistant-workspace");

        let workspace_id = resolve_default_workspace_id(Some("tool-workspace".to_string()));

        assert_eq!(workspace_id.as_deref(), Some("tool-workspace"));
        clear_env();
    }

    #[test]
    fn hermes_default_workspace_env_takes_precedence_over_legacy_name() {
        let _guard = ENV_LOCK.lock().unwrap();
        clear_env();
        std::env::set_var("HERMES_DEFAULT_WORKSPACE_ID", "hermes-workspace");
        std::env::set_var("ASSISTANT_DEFAULT_WORKSPACE_ID", "assistant-workspace");

        let workspace_id = resolve_default_workspace_id(None);

        assert_eq!(workspace_id.as_deref(), Some("hermes-workspace"));
        clear_env();
    }

    #[test]
    fn legacy_default_workspace_env_remains_supported_for_compatibility() {
        let _guard = ENV_LOCK.lock().unwrap();
        clear_env();
        std::env::set_var("ASSISTANT_DEFAULT_WORKSPACE_ID", "assistant-workspace");

        let workspace_id = resolve_default_workspace_id(None);

        assert_eq!(workspace_id.as_deref(), Some("assistant-workspace"));
        clear_env();
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    if std::env::args().any(|arg| arg == "--version" || arg == "-V") {
        println!("assistant-mcp {SERVER_VERSION}");
        return;
    }

    let server = AssistantMcp::new();
    let stdin = std::io::stdin();
    let mut stdout = std::io::stdout();

    for line in BufReader::new(stdin.lock()).lines() {
        let Ok(line) = line else {
            break;
        };
        if line.trim().is_empty() {
            continue;
        }

        let request = match serde_json::from_str::<JsonRpcRequest>(&line) {
            Ok(request) => request,
            Err(error) => {
                let response =
                    JsonRpcResponse::error(Value::Null, -32700, format!("Parse error: {error}"));
                if let Ok(serialized) = serde_json::to_string(&response) {
                    let _ = writeln!(stdout, "{serialized}");
                    let _ = stdout.flush();
                }
                continue;
            }
        };

        // Notifications (no id), e.g. the `notifications/initialized` the MCP
        // client sends after `initialize`, expect no reply per JSON-RPC.
        // Returning a "-32601 Method not found" error here breaks the handshake
        // with stricter clients.
        if request.id.is_null() && request.method.starts_with("notifications/") {
            continue;
        }

        let response = server.handle_request(request).await;
        if let Ok(serialized) = serde_json::to_string(&response) {
            let _ = writeln!(stdout, "{serialized}");
            let _ = stdout.flush();
        }
    }
}
