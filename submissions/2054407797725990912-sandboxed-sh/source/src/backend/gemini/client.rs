use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::{mpsc, Mutex};
use tracing::{debug, error, info, warn};
use uuid::Uuid;

use crate::backend::shared::ProcessHandle;
use crate::workspace_exec::WorkspaceExec;

/// Configuration for the Gemini CLI client.
#[derive(Debug, Clone)]
pub struct GeminiConfig {
    pub cli_path: String,
    pub api_key: Option<String>,
    pub default_model: Option<String>,
    /// When true, set GEMINI_FORCE_FILE_STORAGE=true so the CLI uses
    /// file-based token storage (for OAuth credentials written to
    /// ~/.gemini/oauth_creds.json) instead of the system keychain.
    pub force_file_storage: bool,
}

impl Default for GeminiConfig {
    fn default() -> Self {
        Self {
            cli_path: std::env::var("GEMINI_CLI_PATH").unwrap_or_else(|_| "gemini".to_string()),
            api_key: std::env::var("GEMINI_API_KEY").ok(),
            default_model: None,
            force_file_storage: false,
        }
    }
}

/// Client for communicating with the Gemini CLI.
pub struct GeminiClient {
    config: GeminiConfig,
}

impl GeminiClient {
    pub fn new() -> Self {
        Self {
            config: GeminiConfig::default(),
        }
    }

    pub fn with_config(config: GeminiConfig) -> Self {
        Self { config }
    }

    pub fn create_session_id(&self) -> String {
        Uuid::new_v4().to_string()
    }

    /// Execute a message and return a stream of events.
    /// Returns a tuple of (event receiver, process handle).
    pub async fn execute_message(
        &self,
        directory: &str,
        message: &str,
        model: Option<&str>,
        session_id: Option<&str>,
        _agent: Option<&str>,
        workspace_exec: Option<&WorkspaceExec>,
    ) -> Result<(mpsc::Receiver<GeminiEvent>, ProcessHandle)> {
        let (tx, rx) = mpsc::channel(256);

        let mut args = vec![
            "--output-format".to_string(),
            "stream-json".to_string(),
            "--yolo".to_string(),
            "--sandbox".to_string(),
            "false".to_string(),
        ];

        let mut env: HashMap<String, String> = HashMap::new();

        // Set API key if configured
        if let Some(ref key) = self.config.api_key {
            env.insert("GEMINI_API_KEY".to_string(), key.clone());
            debug!("Using API key for Gemini CLI authentication");
        }

        // Force file-based token storage for OAuth credentials
        if self.config.force_file_storage {
            env.insert("GEMINI_FORCE_FILE_STORAGE".to_string(), "true".to_string());
            debug!("Forcing file-based token storage for Gemini CLI OAuth");
        }

        // Model selection
        let effective_model = model.or(self.config.default_model.as_deref());
        if let Some(m) = effective_model {
            args.push("--model".to_string());
            args.push(m.to_string());
        }

        // Session resumption
        if let Some(sid) = session_id {
            args.push("--resume".to_string());
            args.push(sid.to_string());
        }

        // Use --prompt for non-interactive (headless) mode
        args.push("--prompt".to_string());
        args.push(message.to_string());

        info!(
            "Spawning Gemini CLI: directory={}, model={:?}",
            directory, effective_model
        );

        let (program, full_args) = if self.config.cli_path.contains(' ') {
            let parts: Vec<&str> = self.config.cli_path.split_whitespace().collect();
            let program = parts[0].to_string();
            let mut full_args: Vec<String> = parts[1..].iter().map(|s| s.to_string()).collect();
            full_args.extend(args.clone());
            (program, full_args)
        } else {
            (self.config.cli_path.clone(), args.clone())
        };

        let mut child = if let Some(exec) = workspace_exec {
            exec.spawn_streaming(Path::new(directory), &program, &full_args, env)
                .await
                .map_err(|e| {
                    error!("Failed to spawn Gemini CLI in workspace: {}", e);
                    anyhow!("Failed to spawn Gemini CLI in workspace: {}", e)
                })?
        } else {
            let mut cmd = Command::new(&program);
            cmd.current_dir(directory)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .args(&full_args);
            if !env.is_empty() {
                cmd.envs(env);
            }
            cmd.spawn().map_err(|e| {
                error!("Failed to spawn Gemini CLI: {}", e);
                anyhow!(
                    "Failed to spawn Gemini CLI: {}. Is it installed at '{}'?",
                    e,
                    self.config.cli_path
                )
            })?
        };

        // Close stdin immediately since we don't need to write to it
        drop(child.stdin.take());

        // Spawn task to read stdout and parse events
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| anyhow!("Failed to capture Gemini stdout"))?;

        // Spawn task to consume stderr to prevent deadlock
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| anyhow!("Failed to capture Gemini stderr"))?;

        let stderr_capture = Arc::new(Mutex::new(String::new()));
        let stderr_capture_clone = Arc::clone(&stderr_capture);
        let stderr_task = tokio::spawn(async move {
            use tokio::io::AsyncBufReadExt;
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                debug!("Gemini stderr: {}", trimmed);

                let mut captured = stderr_capture_clone.lock().await;
                if captured.len() > 4096 {
                    continue;
                }
                if !captured.is_empty() {
                    captured.push('\n');
                }
                if trimmed.len() > 400 {
                    let mut i = 400;
                    while i > 0 && !trimmed.is_char_boundary(i) {
                        i -= 1;
                    }
                    captured.push_str(&trimmed[..i]);
                    captured.push_str("...");
                } else {
                    captured.push_str(trimmed);
                }
            }
        });

        // Wrap child in Arc<Mutex> so it can be killed from outside the task
        let child_handle = Arc::new(Mutex::new(Some(child)));
        let child_for_task = Arc::clone(&child_handle);
        let stdout_non_json = Arc::new(Mutex::new(Vec::<String>::new()));
        let stdout_non_json_clone = Arc::clone(&stdout_non_json);

        let task_handle = tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            let mut saw_any_event = false;

            while let Ok(Some(line)) = lines.next_line().await {
                if line.is_empty() {
                    continue;
                }

                match serde_json::from_str::<GeminiEvent>(&line) {
                    Ok(event) => {
                        saw_any_event = true;
                        debug!("Gemini event: {:?}", event);
                        if tx.send(event).await.is_err() {
                            debug!("Receiver dropped, stopping Gemini event stream");
                            break;
                        }
                    }
                    Err(e) => {
                        warn!(
                            "Failed to parse Gemini event: {} - line: {}",
                            e,
                            if line.len() > 200 {
                                format!("{}...", line.chars().take(200).collect::<String>())
                            } else {
                                line.clone()
                            }
                        );
                        let mut captured = stdout_non_json_clone.lock().await;
                        if captured.len() < 10 {
                            if line.len() > 400 {
                                captured.push(format!(
                                    "{}...",
                                    line.chars().take(400).collect::<String>()
                                ));
                            } else {
                                captured.push(line);
                            }
                        }
                    }
                }
            }

            // Wait for process to finish
            let mut exit_status: Option<std::process::ExitStatus> = None;
            if let Some(mut child) = child_for_task.lock().await.take() {
                match child.wait().await {
                    Ok(status) => {
                        exit_status = Some(status);
                        if !status.success() {
                            warn!("Gemini CLI exited with status: {}", status);
                        } else {
                            debug!("Gemini CLI exited successfully");
                        }
                    }
                    Err(e) => {
                        error!("Failed to wait for Gemini CLI: {}", e);
                    }
                }
            }

            let _ = stderr_task.await;

            // Surface errors if no JSON events were produced
            if !saw_any_event {
                let stderr_content = stderr_capture.lock().await;
                let non_json = stdout_non_json.lock().await;
                let exit_status = exit_status
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| "unknown".to_string());

                if !stderr_content.trim().is_empty() || !non_json.is_empty() {
                    let stderr_excerpt = stderr_content
                        .lines()
                        .take(10)
                        .collect::<Vec<_>>()
                        .join(" | ");
                    let stdout_excerpt = non_json.join(" | ");
                    let _ = tx
                        .send(GeminiEvent::Error {
                            severity: Some("error".to_string()),
                            message: format!(
                                "Gemini CLI produced no JSON output (exit_status: {}). Stderr: {} | Stdout: {}",
                                exit_status,
                                if stderr_excerpt.is_empty() { "<empty>" } else { &stderr_excerpt },
                                if stdout_excerpt.is_empty() { "<empty>" } else { &stdout_excerpt }
                            ),
                        })
                        .await;
                } else {
                    let _ = tx
                        .send(GeminiEvent::Error {
                            severity: Some("error".to_string()),
                            message: format!(
                                "Gemini CLI produced no JSON output (exit_status: {}). No stderr/stdout captured.",
                                exit_status
                            ),
                        })
                        .await;
                }
            }
        });

        Ok((rx, ProcessHandle::new(child_handle, task_handle)))
    }
}

impl Default for GeminiClient {
    fn default() -> Self {
        Self::new()
    }
}

/// Events emitted by Gemini CLI in --output-format stream-json mode.
///
/// The Gemini CLI emits newline-delimited JSON (JSONL) with these event types:
/// - `init`: Session metadata (session_id, model)
/// - `message`: User/assistant message chunks (with delta flag for streaming)
/// - `tool_use`: Tool call requests
/// - `tool_result`: Tool execution results
/// - `error`: Warnings and errors
/// - `result`: Final outcome with stats
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type")]
pub enum GeminiEvent {
    /// Session initialization with metadata.
    #[serde(rename = "init")]
    Init {
        #[serde(default)]
        session_id: Option<String>,
        #[serde(default)]
        model: Option<String>,
    },

    /// User or assistant message chunk.
    #[serde(rename = "message")]
    Message {
        #[serde(default)]
        role: Option<String>,
        #[serde(default)]
        content: Option<String>,
        /// True when this is a streaming delta (partial content).
        #[serde(default)]
        delta: Option<bool>,
    },

    /// Tool call request from the model.
    #[serde(rename = "tool_use")]
    ToolUse {
        #[serde(default)]
        tool_name: Option<String>,
        #[serde(default)]
        tool_id: Option<String>,
        #[serde(default)]
        parameters: Option<Value>,
    },

    /// Tool execution result.
    #[serde(rename = "tool_result")]
    ToolResult {
        #[serde(default)]
        tool_id: Option<String>,
        #[serde(default)]
        status: Option<String>,
        #[serde(default)]
        output: Option<Value>,
        #[serde(default)]
        error: Option<GeminiErrorDetail>,
    },

    /// Error or warning event.
    #[serde(rename = "error")]
    Error {
        #[serde(default)]
        severity: Option<String>,
        #[serde(default)]
        message: String,
    },

    /// Final result with aggregated statistics.
    #[serde(rename = "result")]
    Result {
        #[serde(default)]
        status: Option<String>,
        #[serde(default)]
        error: Option<GeminiErrorDetail>,
        #[serde(default)]
        stats: Option<GeminiStats>,
    },

    /// Model thinking/reasoning content.
    #[serde(rename = "thought")]
    Thought {
        #[serde(default)]
        content: Option<String>,
    },

    /// Catch-all for unknown event types.
    #[serde(other)]
    Unknown,
}

/// Error detail from a tool_result event.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GeminiErrorDetail {
    #[serde(default, rename = "type")]
    pub error_type: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

/// Aggregated statistics from a result event.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GeminiStats {
    #[serde(default)]
    pub total_input_tokens: Option<u64>,
    #[serde(default)]
    pub total_output_tokens: Option<u64>,
    /// Per-model usage breakdown, if available.
    #[serde(default)]
    pub models: Option<HashMap<String, GeminiModelUsage>>,
}

/// Per-model token usage.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GeminiModelUsage {
    #[serde(default)]
    pub input_tokens: Option<u64>,
    #[serde(default)]
    pub output_tokens: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_init_event() {
        let json = r#"{"type":"init","session_id":"abc-123","model":"gemini-2.5-flash"}"#;
        let event: GeminiEvent = serde_json::from_str(json).unwrap();
        match event {
            GeminiEvent::Init { session_id, model } => {
                assert_eq!(session_id.as_deref(), Some("abc-123"));
                assert_eq!(model.as_deref(), Some("gemini-2.5-flash"));
            }
            _ => panic!("Expected Init event"),
        }
    }

    #[test]
    fn test_parse_message_event() {
        let json = r#"{"type":"message","role":"assistant","content":"Hello world","delta":true}"#;
        let event: GeminiEvent = serde_json::from_str(json).unwrap();
        match event {
            GeminiEvent::Message {
                role,
                content,
                delta,
            } => {
                assert_eq!(role.as_deref(), Some("assistant"));
                assert_eq!(content.as_deref(), Some("Hello world"));
                assert_eq!(delta, Some(true));
            }
            _ => panic!("Expected Message event"),
        }
    }

    #[test]
    fn test_parse_tool_use_event() {
        let json = r#"{"type":"tool_use","tool_name":"read_file","tool_id":"tc1","parameters":{"path":"/tmp/test.txt"}}"#;
        let event: GeminiEvent = serde_json::from_str(json).unwrap();
        match event {
            GeminiEvent::ToolUse {
                tool_name,
                tool_id,
                parameters,
            } => {
                assert_eq!(tool_name.as_deref(), Some("read_file"));
                assert_eq!(tool_id.as_deref(), Some("tc1"));
                assert_eq!(parameters.unwrap()["path"], "/tmp/test.txt");
            }
            _ => panic!("Expected ToolUse event"),
        }
    }

    #[test]
    fn test_parse_tool_result_event() {
        let json =
            r#"{"type":"tool_result","tool_id":"tc1","status":"success","output":"file contents"}"#;
        let event: GeminiEvent = serde_json::from_str(json).unwrap();
        match event {
            GeminiEvent::ToolResult {
                tool_id,
                status,
                output,
                error,
            } => {
                assert_eq!(tool_id.as_deref(), Some("tc1"));
                assert_eq!(status.as_deref(), Some("success"));
                assert_eq!(output.unwrap(), "file contents");
                assert!(error.is_none());
            }
            _ => panic!("Expected ToolResult event"),
        }
    }

    #[test]
    fn test_parse_error_event() {
        let json = r#"{"type":"error","severity":"error","message":"Something went wrong"}"#;
        let event: GeminiEvent = serde_json::from_str(json).unwrap();
        match event {
            GeminiEvent::Error { severity, message } => {
                assert_eq!(severity.as_deref(), Some("error"));
                assert_eq!(message, "Something went wrong");
            }
            _ => panic!("Expected Error event"),
        }
    }

    #[test]
    fn test_parse_result_event() {
        let json = r#"{"type":"result","status":"success","stats":{"total_input_tokens":1000,"total_output_tokens":250}}"#;
        let event: GeminiEvent = serde_json::from_str(json).unwrap();
        match event {
            GeminiEvent::Result {
                status,
                error: _,
                stats,
            } => {
                assert_eq!(status.as_deref(), Some("success"));
                let stats = stats.unwrap();
                assert_eq!(stats.total_input_tokens, Some(1000));
                assert_eq!(stats.total_output_tokens, Some(250));
            }
            _ => panic!("Expected Result event"),
        }
    }

    #[test]
    fn test_parse_unknown_event() {
        let json = r#"{"type":"something_new","data":"value"}"#;
        let event: GeminiEvent = serde_json::from_str(json).unwrap();
        match event {
            GeminiEvent::Unknown => {}
            _ => panic!("Expected Unknown event"),
        }
    }
}
