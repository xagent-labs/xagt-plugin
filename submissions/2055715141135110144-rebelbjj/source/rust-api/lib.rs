use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub ok: bool,
    pub service: &'static str,
    pub runtime: &'static str,
    pub version: &'static str,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionProofRequest {
    pub athlete_wallet: Option<String>,
    pub log_id: String,
    pub date: String,
    pub duration_minutes: u32,
    pub location: String,
    pub session_type: String,
    pub uniform_type: String,
    pub coach: String,
    pub techniques: Vec<String>,
    pub categories: Vec<String>,
    pub summary: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionProofResponse {
    pub digest: String,
    pub privacy_model: &'static str,
    pub included_fields: Vec<&'static str>,
    pub excluded_fields: Vec<&'static str>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerificationRequest {
    pub athlete_wallet: Option<String>,
    pub coach_name: String,
    pub coach_wallet: Option<String>,
    pub log: SessionProofRequest,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoachVerificationRecord {
    pub id: String,
    pub log_id: String,
    pub athlete_wallet: Option<String>,
    pub coach_name: String,
    pub coach_wallet: Option<String>,
    pub digest: String,
    pub status: VerificationStatus,
    pub requested_at: String,
    pub verified_at: Option<String>,
    pub receipt: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum VerificationStatus {
    PendingCoach,
    VerifiedByCoach,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoachApproveRequest {
    pub verification_id: String,
    pub log_id: Option<String>,
    pub athlete_wallet: Option<String>,
    pub coach_name: Option<String>,
    pub coach_wallet: Option<String>,
    pub digest: Option<String>,
    pub requested_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub error: String,
}

pub fn health_payload() -> HealthResponse {
    HealthResponse {
        ok: true,
        service: "phantom-mat-pass-api",
        runtime: "vercel-rust-functions",
        version: env!("CARGO_PKG_VERSION"),
    }
}

pub fn create_session_proof_payload(payload: SessionProofRequest) -> Result<SessionProofResponse, &'static str> {
    let digest = build_session_digest(&payload)?;
    Ok(SessionProofResponse {
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
    })
}

pub fn create_verification_record(payload: VerificationRequest) -> Result<CoachVerificationRecord, &'static str> {
    if payload.coach_name.trim().is_empty() {
        return Err("coachName is required");
    }

    let digest = build_session_digest(&payload.log)?;
    Ok(CoachVerificationRecord {
        id: format!("verify-{}", Uuid::new_v4()),
        log_id: payload.log.log_id,
        athlete_wallet: payload.athlete_wallet,
        coach_name: payload.coach_name.trim().to_owned(),
        coach_wallet: payload.coach_wallet.filter(|value| !value.trim().is_empty()),
        digest,
        status: VerificationStatus::PendingCoach,
        requested_at: Utc::now().to_rfc3339(),
        verified_at: None,
        receipt: None,
    })
}

pub fn approve_verification_record(payload: CoachApproveRequest) -> Result<CoachVerificationRecord, &'static str> {
    let digest = payload.digest.ok_or("digest is required for stateless Rust verification")?;
    let log_id = payload.log_id.ok_or("logId is required for stateless Rust verification")?;
    let coach_name = payload.coach_name.unwrap_or_else(|| "Coach".to_owned());
    let verified_at = Utc::now().to_rfc3339();
    let receipt = build_receipt(
        &payload.verification_id,
        &digest,
        payload.coach_wallet.as_deref(),
        &verified_at,
    );

    Ok(CoachVerificationRecord {
        id: payload.verification_id,
        log_id,
        athlete_wallet: payload.athlete_wallet,
        coach_name,
        coach_wallet: payload.coach_wallet.filter(|value| !value.trim().is_empty()),
        digest,
        status: VerificationStatus::VerifiedByCoach,
        requested_at: payload.requested_at.unwrap_or_else(|| verified_at.clone()),
        verified_at: Some(verified_at),
        receipt: Some(receipt),
    })
}

pub fn build_session_digest(payload: &SessionProofRequest) -> Result<String, &'static str> {
    if payload.log_id.trim().is_empty() {
        return Err("logId is required");
    }
    if payload.date.trim().is_empty() {
        return Err("date is required");
    }
    if payload.duration_minutes == 0 {
        return Err("durationMinutes must be greater than 0");
    }

    let public_summary = json!({
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

pub fn build_receipt(
    verification_id: &str,
    digest: &str,
    coach_wallet: Option<&str>,
    verified_at: &str,
) -> String {
    let payload = json!({
        "verificationId": verification_id,
        "digest": digest,
        "coachWallet": coach_wallet,
        "verifiedAt": verified_at,
        "runtime": "vercel-rust-functions",
    });
    sha256_hex(payload.to_string().as_bytes())
}

pub fn api_error(status: StatusCode, message: impl Into<String>) -> Response {
    (
        status,
        Json(ErrorResponse {
            error: message.into(),
        }),
    )
        .into_response()
}

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}
