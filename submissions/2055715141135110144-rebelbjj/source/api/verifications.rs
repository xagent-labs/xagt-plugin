use axum::{routing::get, Json, Router};
use serde_json::{json, Value};
use tower::ServiceBuilder;
use vercel_runtime::axum::VercelLayer;
use vercel_runtime::Error;

async fn handler() -> Json<Value> {
    Json(json!({
        "items": [],
        "storage": "stateless-vercel-rust-function",
        "note": "The hackathon demo persists verification receipts in the client dossier while Rust signs the proof response."
    }))
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    let router = Router::new()
        .route("/", get(handler))
        .route("/api/verifications", get(handler));
    let app = ServiceBuilder::new()
        .layer(VercelLayer::new())
        .service(router);
    vercel_runtime::run(app).await
}
