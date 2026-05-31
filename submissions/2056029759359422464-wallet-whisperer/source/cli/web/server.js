// Tiny zero-dependency HTTP server. Serves the SPA + JSON and SSE endpoints.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walletStatus, portfolioOverview, portfolioRecentPnl, trackerActivities, securityTokenScan } from '../lib/onchainos.js';
import { inferPersona, selectHighlights } from '../lib/persona.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 4444;

// —— IP rate limiting ——
// Default caps are friendly for normal use but block sustained abuse on a
// public deploy. Override via env when running locally.
const RATE_LIMITS = {
  '/api/profile/stream':        Number(process.env.LIMIT_PROFILE_PER_HOUR ?? 6),
  '/api/mirror-preview/stream': Number(process.env.LIMIT_MIRROR_PER_HOUR  ?? 12),
};
const WINDOW_MS = 60 * 60 * 1000;
const RATE_BUCKETS = new Map(); // key = `${ip}::${path}` → [timestamps]

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}
function checkRateLimit(req, pathKey) {
  const cap = RATE_LIMITS[pathKey];
  if (!cap || cap <= 0) return { ok: true };
  const ip = getClientIp(req);
  const now = Date.now();
  const key = `${ip}::${pathKey}`;
  const bucket = (RATE_BUCKETS.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (bucket.length >= cap) {
    const resetIn = Math.ceil((WINDOW_MS - (now - bucket[0])) / 1000);
    return { ok: false, retryAfter: resetIn, limit: cap };
  }
  bucket.push(now);
  RATE_BUCKETS.set(key, bucket);
  return { ok: true, remaining: cap - bucket.length };
}
// Periodically prune empty buckets so the Map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of RATE_BUCKETS) {
    const live = ts.filter((t) => now - t < WINDOW_MS);
    if (live.length === 0) RATE_BUCKETS.delete(key);
    else RATE_BUCKETS.set(key, live);
  }
}, 5 * 60 * 1000).unref();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

function detectChain(address) {
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return 'ethereum';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return 'solana';
  return null;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function serveStatic(req, res, urlPath) {
  let safePath = urlPath.replace(/\?.*/, '');
  if (safePath === '/' || safePath === '') safePath = '/index.html';
  if (safePath === '/whisper' || safePath === '/whisper/' || safePath === '/app' || safePath === '/app/') safePath = '/whisper.html';
  if (safePath === '/setup' || safePath === '/setup/') safePath = '/setup.html';
  if (safePath.includes('..')) {
    res.writeHead(400); res.end('Bad path'); return;
  }
  try {
    const filePath = join(PUBLIC_DIR, safePath);
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    if (e.code === 'ENOENT') { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(500); res.end(String(e.message));
  }
}

// SSE helpers. Force-flush every event so the browser sees them in real time.
function sseHeaders(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.socket?.setNoDelay?.(true);
  // 2KB of padding as an SSE comment to defeat any 1KB browser pre-buffer.
  res.write(':' + ' '.repeat(2048) + '\n\n');
}
function sseEmit(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function streamProfile(res, address, chainParam) {
  sseHeaders(res);
  const skill = (name, op, status, extra = {}) => sseEmit(res, 'skill', { name, op, status, ...extra });

  try {
    // 1. wallet status (okx-agentic-wallet)
    skill('okx-agentic-wallet', 'wallet status', 'started');
    const t0 = Date.now();
    const status = await walletStatus();
    skill('okx-agentic-wallet', 'wallet status', 'completed', { ms: Date.now() - t0 });
    if (!status?.loggedIn) {
      sseEmit(res, 'fail', { error: 'onchainos is not logged in on the server. Reach the admin.', code: 'NOT_LOGGED_IN' });
      res.end(); return;
    }

    // chain resolution
    const chain = chainParam || detectChain(address);
    if (!chain) {
      sseEmit(res, 'fail', { error: `Could not detect chain for ${address}.`, code: 'BAD_ADDRESS' });
      res.end(); return;
    }

    // 2. portfolio-overview
    skill('okx-dex-market', 'portfolio-overview', 'started');
    const t1 = Date.now();
    const overview = await portfolioOverview(address, chain, 4);
    skill('okx-dex-market', 'portfolio-overview', 'completed', { ms: Date.now() - t1 });

    // 3. portfolio-recent-pnl
    skill('okx-dex-market', 'portfolio-recent-pnl', 'started');
    const t2 = Date.now();
    const recentPnl = await portfolioRecentPnl(address, chain, 100);
    skill('okx-dex-market', 'portfolio-recent-pnl', 'completed', { ms: Date.now() - t2 });

    const closedCount = recentPnl?.pnlList?.length ?? 0;
    if (closedCount < 5) {
      sseEmit(res, 'fail', { error: `Only ${closedCount} closed positions on ${chain}. Try another chain.`, code: 'NO_DATA' });
      res.end(); return;
    }

    const persona = inferPersona({ overview30d: overview, recentPnl });
    const highlights = selectHighlights(recentPnl, 3);

    sseEmit(res, 'result', { address, chain, persona, highlights });
    res.end();
  } catch (e) {
    sseEmit(res, 'fail', { error: e.message, code: e.code ?? 'INTERNAL' });
    res.end();
  }
}

async function streamMirrorPreview(res, address, chain, perTradePct) {
  sseHeaders(res);
  const skill = (name, op, status, extra = {}) => sseEmit(res, 'skill', { name, op, status, ...extra });

  try {
    skill('okx-agentic-wallet', 'wallet status', 'started');
    const t0 = Date.now();
    const status = await walletStatus();
    skill('okx-agentic-wallet', 'wallet status', 'completed', { ms: Date.now() - t0 });
    if (!status?.loggedIn) {
      sseEmit(res, 'fail', { error: 'onchainos not logged in.', code: 'NOT_LOGGED_IN' });
      res.end(); return;
    }

    skill('okx-tracker', 'activities', 'started');
    const t1 = Date.now();
    const acts = await trackerActivities(address, chain, { tradeType: 1 });
    skill('okx-tracker', 'activities', 'completed', { ms: Date.now() - t1 });

    const allTrades = acts?.trades ?? [];
    // Dedupe by token (keep most recent buy per token); cap at 4 distinct tokens.
    const seen = new Set();
    const trades = [];
    for (const t of allTrades) {
      if (seen.has(t.tokenContractAddress)) continue;
      seen.add(t.tokenContractAddress);
      trades.push(t);
      if (trades.length >= 4) break;
    }
    if (trades.length === 0) {
      sseEmit(res, 'result', { candidates: [], note: 'No recent buy activity from this source.' });
      res.end(); return;
    }

    const uniqueTokens = trades.map((t) => t.tokenContractAddress);
    const chainId = trades[0].chainIndex;

    skill('okx-security', 'token-scan', 'started', { tokenCount: uniqueTokens.length });
    const t2 = Date.now();
    let scans;
    try { scans = await securityTokenScan(chainId, uniqueTokens); }
    catch (e) { scans = { results: [] }; }
    skill('okx-security', 'token-scan', 'completed', { ms: Date.now() - t2 });

    const scanByToken = new Map();
    for (const s of (Array.isArray(scans) ? scans : (scans?.results ?? scans ?? []))) {
      if (s?.tokenAddress) scanByToken.set(s.tokenAddress, s);
    }
    const POSITIVE_FLAGS = new Set(['isChainSupported']);
    const candidates = trades.map((t) => {
      const scan = scanByToken.get(t.tokenContractAddress);
      const riskFlags = scan ? Object.entries(scan)
        .filter(([k, v]) => k.startsWith('is') && v === true && !POSITIVE_FLAGS.has(k))
        .map(([k]) => k.replace(/^is/, '').replace(/([A-Z])/g, ' $1').trim()) : [];
      return {
        tokenSymbol: t.tokenSymbol,
        tokenContractAddress: t.tokenContractAddress,
        quoteTokenAmount: Number(t.quoteTokenAmount),
        quoteTokenSymbol: t.quoteTokenSymbol,
        tokenPrice: Number(t.tokenPrice),
        marketCapUsd: Number(t.marketCap),
        tradeTimeMs: Number(t.tradeTime),
        txHash: t.txHash,
        riskLevel: scan?.riskLevel ?? 'UNKNOWN',
        riskFlags,
        yourProposedSizePct: perTradePct,
      };
    });

    sseEmit(res, 'result', { candidates });
    res.end();
  } catch (e) {
    sseEmit(res, 'fail', { error: e.message, code: e.code ?? 'INTERNAL' });
    res.end();
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/api/profile/stream')) {
    const rl = checkRateLimit(req, '/api/profile/stream');
    if (!rl.ok) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) });
      res.end(JSON.stringify({ error: `Rate limit hit (${rl.limit} profiles per IP per hour). Retry in ${rl.retryAfter}s, or install the CLI for unlimited use.`, code: 'RATE_LIMITED' }));
      return;
    }
    const url = new URL(req.url, 'http://x');
    const address = (url.searchParams.get('address') ?? '').trim();
    const chain = (url.searchParams.get('chain') ?? '').trim() || null;
    if (!address) { res.writeHead(400); res.end('address required'); return; }
    await streamProfile(res, address, chain);
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/api/mirror-preview/stream')) {
    const rl = checkRateLimit(req, '/api/mirror-preview/stream');
    if (!rl.ok) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) });
      res.end(JSON.stringify({ error: `Rate limit hit (${rl.limit} previews per IP per hour). Retry in ${rl.retryAfter}s.`, code: 'RATE_LIMITED' }));
      return;
    }
    const url = new URL(req.url, 'http://x');
    const address = (url.searchParams.get('address') ?? '').trim();
    const chain = (url.searchParams.get('chain') ?? '').trim() || detectChain(address);
    const perTradePct = Number(url.searchParams.get('perTradePct') ?? 2);
    if (!address || !chain) { res.writeHead(400); res.end('address and chain required'); return; }
    await streamMirrorPreview(res, address, chain, perTradePct);
    return;
  }
  if (req.method === 'GET') {
    await serveStatic(req, res, req.url);
    return;
  }
  res.writeHead(405); res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`\n  wallet-whisperer web UI`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  (uses local onchainos CLI · make sure you have run 'onchainos wallet login')\n`);
});
