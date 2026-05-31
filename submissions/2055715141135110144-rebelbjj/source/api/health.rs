use axum::{routing::get, Json, Router};
use phantom_mat_pass_api::health_payload;
use tower::ServiceBuilder;
use vercel_runtime::axum::VercelLayer;
use vercel_runtime::Error;

async fn handler() -> Json<phantom_mat_pass_api::HealthResponse> {
    Json(health_payload())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    let router = Router::new()
        .route("/", get(handler))
        .route("/api/health", get(handler));
    let app = ServiceBuilder::new()
        .layer(VercelLayer::new())
        .service(router);
    vercel_runtime::run(app).await
}
