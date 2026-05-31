# Deployment

The web app at `/` and `/whisper` ships as a Docker image and runs as a Render
Web Service. The Dockerfile (in the repo root) bundles Node 20 and the
`onchainos` v3.3.3 binary. The OKX session that authenticates the API calls is
mounted at runtime via Render Secret Files — it is **never** baked into the
image or committed to this repo.

## One-time setup (Render)

1. Push the repo to GitHub (this repo is already public at
   `Temitope15/wallet-whisperer`).
2. On render.com: **New → Blueprint → Connect this repo**. Render reads
   `render.yaml` from the repo root and proposes a `wallet-whisperer` web
   service on the free plan.
3. Provide the demo onchainos session. **Two ways**, pick one:

   **(a) Env var, recommended.** Pasting binary into the Render dashboard's
   Secret File textarea corrupts it. Base64-encode the tarball instead and
   store as a regular env var:

   ```bash
   tar -czf onchainos-session.tar.gz \
     --exclude='.onchainos/audit.jsonl' \
     --exclude='.onchainos/bin' \
     -C $HOME .onchainos
   base64 -w0 onchainos-session.tar.gz
   ```

   Copy the output. Then on Render: **Service → Settings → Environment →
   Add Environment Variable**:
   - Key: `ONCHAINOS_SESSION_B64`
   - Value: paste the base64 string

   **(b) Secret File, must be UPLOADED via the file button (not pasted).**
   Same tarball as above. On Render: **Service → Settings → Secret Files →
   Add Secret File**:
   - Filename: `onchainos-session.tar.gz`
   - Click **Upload** (do not paste into the textarea — binary corrupts)

   Use a **dedicated demo account** (not a personal onchainos login you
   also use elsewhere). All public visitors share this session's 1M-call /
   month free quota.
4. Trigger **Manual Deploy → Deploy latest commit** so the entrypoint picks
   up the new session.

## Local sanity-check

```bash
docker build -t wallet-whisperer .

# Without secrets — server boots but every API call returns NOT_LOGGED_IN
docker run -p 4444:4444 wallet-whisperer

# With your session
mkdir -p /tmp/ww-secrets && cp onchainos-session.tar.gz /tmp/ww-secrets/
docker run -p 4444:4444 \
  -v /tmp/ww-secrets:/etc/secrets:ro \
  wallet-whisperer
# Open http://localhost:4444
```

## Configuration

Both rate-limit caps are env vars on the service:

| Env | Default | Notes |
|---|---|---|
| `PORT` | `4444` | Render injects this automatically. |
| `LIMIT_PROFILE_PER_HOUR` | `6` | Per-IP cap on `/api/profile/stream`. |
| `LIMIT_MIRROR_PER_HOUR` | `12` | Per-IP cap on `/api/mirror-preview/stream`. |
| `NODE_ENV` | `production` | |

## What happens when the quota runs out

The Market API starts returning `MARKET_API_OLD_USER_POST_GRACE_OVER_QUOTA` instead of data. The web server surfaces that to visitors with a clear "demo quota exhausted — install the CLI for unlimited use" message, and the CLI / agent skill paths still work for anyone running locally with their own login.

## Rotating the session

If the session token expires or the demo account is locked out:

1. Re-run `onchainos wallet login <demo-email>` + `verify <otp>` on any machine
   where you have the onchainos CLI installed.
2. Re-create the tarball with the command above.
3. Update the Secret File on Render with the new tarball.
4. Manual deploy.
