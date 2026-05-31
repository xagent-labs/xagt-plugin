use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, Mutex},
};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

type SharedState = Arc<AppState>;

#[derive(Default)]
struct AppState {
    verifications: Mutex<HashMap<String, CoachVerificationRecord>>,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    ok: bool,
    service: &'static str,
    version: &'static str,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionProofRequest {
    athlete_wallet: Option<String>,
    log_id: String,
    date: String,
    duration_minutes: u32,
    location: String,
    session_type: String,
    uniform_type: String,
    coach: String,
    techniques: Vec<String>,
    categories: Vec<String>,
    summary: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionProofResponse {
    digest: String,
    privacy_model: &'static str,
    included_fields: Vec<&'static str>,
    excluded_fields: Vec<&'static str>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VerificationRequest {
    athlete_wallet: Option<String>,
    coach_name: String,
    coach_wallet: Option<String>,
    log: SessionProofRequest,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CoachVerificationRecord {
    id: String,
    log_id: String,
    athlete_wallet: Option<String>,
    coach_name: String,
    coach_wallet: Option<String>,
    digest: String,
    status: VerificationStatus,
    requested_at: String,
    verified_at: Option<String>,
    receipt: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "kebab-case")]
enum VerificationStatus {
    PendingCoach,
    VerifiedByCoach,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoachApproveRequest {
    verification_id: String,
    coach_wallet: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorResponse {
    error: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "phantom_mat_pass_api=debug,tower_http=info".into()
        }))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let state = Arc::new(AppState::default());
    let app = Router::new()
        .route("/health", get(health))
        .route("/api/training/session-proof", post(create_session_proof))
        .route("/api/training/request-verification", post(request_verification))
        .route("/api/coach/verify-session", post(verify_session))
        .route("/api/verifications", get(list_verifications))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let port = std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8787);
    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(address).await?;

    tracing::info!("phantom-mat-pass-api listening on http://{address}");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        service: "phantom-mat-pass-api",
        version: env!("CARGO_PKG_VERSION"),
    })
}

async fn create_session_proof(Json(payload): Json<SessionProofRequest>) -> impl IntoResponse {
    match build_session_digest(&payload) {
        Ok(digest) => (
            StatusCode::OK,
            Json(SessionProofResponse {
                digest,
                privacy_model: "private-log/public-proof",
                included_fields: vec![
                    "athleteWallet",
                    "logId",
                    "date",
                    "durationMinutes",
                    "location",
                    "sessionType",
                    "uniformType",
                    "coach",
                    "techniques",
                    "categories",
                    "summary",
                ],
                excluded_fields: vec!["notes", "feeling", "menstrualPhase"],
            }),
        )
            .into_response(),
        Err(error) => api_error(StatusCode::BAD_REQUEST, error),
    }
}

async fn request_verification(
    State(state): State<SharedState>,
    Json(payload): Json<VerificationRequest>,
) -> impl IntoResponse {
    if payload.coach_name.trim().is_empty() {
        return api_error(StatusCode::BAD_REQUEST, "coachName is required");
    }

    let digest = match build_session_digest(&payload.log) {
        Ok(digest) => digest,
        Err(error) => return api_error(StatusCode::BAD_REQUEST, error),
    };

    let now = Utc::now().to_rfc3339();
    let record = CoachVerificationRecord {
        id: format!("verify-{}", Uuid::new_v4()),
        log_id: payload.log.log_id,
        athlete_wallet: payload.athlete_wallet,
        coach_name: payload.coach_name.trim().to_owned(),
        coach_wallet: payload.coach_wallet.filter(|value| !value.trim().is_empty()),
        digest,
        status: VerificationStatus::PendingCoach,
        requested_at: now,
        verified_at: None,
        receipt: None,
    };

    state
        .verifications
        .lock()
        .expect("verification store poisoned")
        .insert(record.id.clone(), record.clone());

    (StatusCode::CREATED, Json(record)).into_response()
}

async fn verify_session(
    State(state): State<SharedState>,
    Json(payload): Json<CoachApproveRequest>,
) -> impl IntoResponse {
    let mut verifications = state
        .verifications
        .lock()
        .expect("verification store poisoned");

    let Some(record) = verifications.get_mut(&payload.verification_id) else {
        return api_error(StatusCode::NOT_FOUND, "verification request not found");
    };

    let verified_at = Utc::now().to_rfc3339();
    let coach_wallet = payload
        .coach_wallet
        .filter(|value| !value.trim().is_empty())
        .or_else(|| record.coach_wallet.clone());
    let receipt = build_receipt(&record.id, &record.digest, coach_wallet.as_deref(), &verified_at);

    record.status = VerificationStatus::VerifiedByCoach;
    record.coach_wallet = coach_wallet;
    record.verified_at = Some(verified_at);
    record.receipt = Some(receipt);

    (StatusCode::OK, Json(record.clone())).into_response()
}

async fn list_verifications(State(state): State<SharedState>) -> impl IntoResponse {
    let mut records = state
        .verifications
        .lock()
        .expect("verification store poisoned")
        .values()
        .cloned()
        .collect::<Vec<_>>();

    records.sort_by(|left, right| right.requested_at.cmp(&left.requested_at));
    Json(records)
}

fn build_session_digest(payload: &SessionProofRequest) -> Result<String, &'static str> {
    if payload.log_id.trim().is_empty() {
        return Err("logId is required");
    }
    if payload.date.trim().is_empty() {
        return Err("date is required");
    }
    if payload.duration_minutes == 0 {
        return Err("durationMinutes must be greater than 0");
    }

    let public_summary = serde_json::json!({
        "app": "phantom-mat-pass",
        "version": 1,
        "athleteWallet": payload.athlete_wallet,
        "logId": payload.log_id,
        "date": payload.date,
        "durationMinutes": payload.duration_minutes,
        "location": payload.location.trim(),
        "sessionType": payload.session_type,
        "uniformType": payload.uniform_type,
        "coach": payload.coach.trim(),
        "techniques": payload.techniques,
        "categories": payload.categories,
        "summary": payload.summary.trim(),
    });

    Ok(sha256_hex(public_summary.to_string().as_bytes()))
}

fn build_receipt(
    verification_id: &str,
    digest: &str,
    coach_wallet: Option<&str>,
    verified_at: &str,
) -> String {
    let payload = serde_json::json!({
        "verificationId": verification_id,
        "digest": digest,
        "coachWallet": coach_wallet,
        "verifiedAt": verified_at,
    });
    sha256_hex(payload.to_string().as_bytes())
}

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn api_error(status: StatusCode, message: impl Into<String>) -> axum::response::Response {
    (
        status,
        Json(ErrorResponse {
            error: message.into(),
        }),
    )
        .into_response()
}
