#!/usr/bin/env node
import { createServer } from "node:http";
import { chmodSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const envPath = resolve(repoRoot, ".env");
const port = Number(process.env.SECRETS_SETUP_PORT ?? 4180);

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Local OKX Secret Setup</title>
    <style>
      :root { color: #191713; background: #f4f1ea; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      main { width: min(560px, 100%); border: 1px solid #d8cab0; border-radius: 8px; background: #fffdf7; padding: 18px; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      p { margin: 0 0 14px; color: #51483c; line-height: 1.45; }
      label { display: grid; gap: 6px; margin-top: 12px; font-size: 13px; font-weight: 700; color: #332e27; }
      input { min-height: 38px; border: 1px solid #c9b99c; border-radius: 6px; padding: 7px 9px; font: inherit; }
      button { width: 100%; min-height: 40px; margin-top: 16px; border: 1px solid #0a5f48; border-radius: 7px; background: #0a5f48; color: white; font: inherit; font-weight: 800; cursor: pointer; }
      .note { margin-top: 12px; font-size: 12px; color: #74654e; }
    </style>
  </head>
  <body>
    <main>
      <h1>Local OKX Secret Setup</h1>
      <p>This writes credentials to an ignored local <code>.env</code> file with restricted permissions. Values are not printed by the server.</p>
      <form method="post" action="/save" autocomplete="off">
        <label>OKX API key<input name="OKX_API_KEY" required autocomplete="off" /></label>
        <label>OKX secret key<input name="OKX_SECRET_KEY" required type="password" autocomplete="off" /></label>
        <label>OKX API passphrase<input name="OKX_API_PASSPHRASE" required type="password" autocomplete="off" /></label>
        <button type="submit">Write local .env</button>
      </form>
      <p class="note">Use a newly rotated key if the previous one was pasted into chat.</p>
    </main>
  </body>
</html>`;

const success = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Saved</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f1ea; color: #191713; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(520px, calc(100% - 48px)); border: 1px solid #87b9a1; border-radius: 8px; background: #eef8f2; padding: 18px; }
      h1 { margin: 0 0 8px; font-size: 22px; color: #0a5f48; }
      p { margin: 0; color: #26352e; }
    </style>
  </head>
  <body><main><h1>Saved</h1><p>Local .env was written. You can close this tab.</p></main></body>
</html>`;

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(page);
    return;
  }

  if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20_000) req.destroy();
    });
    req.on("end", () => {
      const form = new URLSearchParams(body);
      const apiKey = form.get("OKX_API_KEY")?.trim() ?? "";
      const secretKey = form.get("OKX_SECRET_KEY")?.trim() ?? "";
      const passphrase = form.get("OKX_API_PASSPHRASE")?.trim() ?? "";

      if (!apiKey || !secretKey || !passphrase) {
        res.writeHead(400, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
        res.end("Missing required fields.");
        return;
      }

      writeFileSync(
        envPath,
        [
          `OKX_API_KEY=${escapeEnv(apiKey)}`,
          `OKX_SECRET_KEY=${escapeEnv(secretKey)}`,
          `OKX_API_PASSPHRASE=${escapeEnv(passphrase)}`,
          `OKX_PASSPHRASE=${escapeEnv(passphrase)}`,
          "",
        ].join("\n"),
        { mode: 0o600 },
      );
      chmodSync(envPath, 0o600);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(success);
    });
    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local secret setup is running at http://127.0.0.1:${port}/`);
  console.log("Values submitted through the form are not printed.");
});

function escapeEnv(value) {
  if (/^[A-Za-z0-9_.!@#$%^*+=:/-]+$/.test(value)) return value;
  return JSON.stringify(value);
}
