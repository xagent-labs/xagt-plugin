//! Codex backend configuration.
//!
//! Historically this file housed the `codex exec` shell-out client. Path A
//! (PR #403) replaced that with the `codex app-server` JSON-RPC client in
//! `app_server.rs`. Only the configuration struct survives here; everything
//! else moved or was deleted.

/// Configuration for the Codex backend.
///
/// As of Path A (PR #403), all codex missions run through the
/// `codex app-server` JSON-RPC protocol — the legacy `codex exec` path
/// is removed because it doesn't parse slash commands and never arms
/// codex's goals.rs runtime. `oauth_token` and `use_app_server` are
/// retained as no-op fields for one release cycle so existing callers
/// continue to compile; both can be deleted once nothing references
/// them.
#[derive(Debug, Clone)]
pub struct CodexConfig {
    pub cli_path: String,
    /// Deprecated. Codex app-server reads `~/.codex/auth.json` directly
    /// (`app-server/src/lib.rs:646-647` explicitly disables the
    /// `OPENAI_API_KEY`/`OPENAI_OAUTH_TOKEN` env path). Setting this no
    /// longer affects mission auth.
    pub oauth_token: Option<String>,
    pub default_model: Option<String>,
    pub model_effort: Option<String>,
    /// ChatGPT OAuth account supplied by the host app. When set, the app-server
    /// uses external `chatgptAuthTokens` mode and asks the host to refresh.
    pub external_chatgpt_auth: Option<CodexExternalChatgptAuth>,
    /// Deprecated. App-server is the only path now. Setting this to
    /// `false` does nothing — the legacy exec branch is gone. Kept on
    /// the struct so existing call sites that set the field still
    /// compile; remove in a follow-up cleanup PR.
    pub use_app_server: bool,
}

#[derive(Debug, Clone)]
pub struct CodexExternalChatgptAuth {
    pub access_token: String,
    pub chatgpt_account_id: String,
    pub chatgpt_plan_type: Option<String>,
    pub working_dir: std::path::PathBuf,
}

impl Default for CodexConfig {
    fn default() -> Self {
        Self {
            cli_path: std::env::var("CODEX_CLI_PATH").unwrap_or_else(|_| "codex".to_string()),
            oauth_token: std::env::var("OPENAI_OAUTH_TOKEN").ok(),
            default_model: None,
            model_effort: None,
            external_chatgpt_auth: None,
            use_app_server: true,
        }
    }
}
