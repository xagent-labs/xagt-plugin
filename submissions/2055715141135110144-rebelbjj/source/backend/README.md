# Phantom Mat Pass Rust API

Auxiliary Rust backend for the demo flow. The hackathon-required on-chain logic lives in `../anchor/`.

## Run

```bash
cd backend
cargo run
```

The API listens on `http://127.0.0.1:8787` by default. Set `PORT` to change it.

## Endpoints

- `GET /health`
- `POST /api/training/session-proof`
- `POST /api/training/request-verification`
- `POST /api/coach/verify-session`
- `GET /api/verifications`

The current store is in-memory so the hackathon demo can run without database setup. The proof model keeps sensitive fields like notes, feeling, and menstrual phase out of the public digest.

For the hackathon compliance path, use the Anchor program in `../anchor/` for actual Solana Program deployment on devnet.
