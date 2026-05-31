use axum::{http::StatusCode, response::IntoResponse, routing::post, Json, Router};
use phantom_mat_pass_api::{
    api_error, create_session_proof_payload, SessionProofRequest, SessionProofResponse,
};
use tower::ServiceBuilder;
use vercel_runtime::axum::VercelLayer;
use vercel_runtime::Error;

async fn handler(Json(payload): Json<SessionProofRequest>) -> axum::response::Response {
    match create_session_proof_payload(payload) {
        Ok(response) => (StatusCode::OK, Json::<SessionProofResponse>(response)).into_response(),
        Err(message) => api_error(StatusCode::BAD_REQUEST, message),
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    let router = Router::new()
        .route("/", post(handler))
        .route("/api/training/session-proof", post(handler));
    let app = ServiceBuilder::new()
        .layer(VercelLayer::new())
        .service(router);
    vercel_runtime::run(app).await
}
