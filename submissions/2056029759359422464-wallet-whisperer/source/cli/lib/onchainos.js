import { spawn } from 'node:child_process';

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('onchainos', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('onchainos CLI not found on PATH. Install it from https://github.com/okx/onchainos-skills'));
      } else {
        reject(err);
      }
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`onchainos ${args.join(' ')} exited with code ${code}\n${stderr.trim()}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error(`Failed to parse onchainos JSON output: ${e.message}\n${stdout.slice(0, 400)}`));
      }
    });
  });
}

function ensureOk(response, label) {
  if (!response || response.ok !== true) {
    const note = response?.notifications?.[0]?.code ?? 'unknown';
    throw new Error(`${label} failed (notification: ${note})`);
  }
  return response.data;
}

export async function walletStatus() {
  return ensureOk(await run(['wallet', 'status']), 'wallet status');
}

export async function portfolioOverview(address, chain, timeFrame) {
  return ensureOk(
    await run(['market', 'portfolio-overview', '--address', address, '--chain', chain, '--time-frame', String(timeFrame)]),
    'portfolio-overview',
  );
}

export async function portfolioRecentPnl(address, chain, limit) {
  return ensureOk(
    await run(['market', 'portfolio-recent-pnl', '--address', address, '--chain', chain, '--limit', String(limit ?? 100)]),
    'portfolio-recent-pnl',
  );
}

export async function trackerActivities(address, chain, opts = {}) {
  const args = ['tracker', 'activities', '--tracker-type', 'multi_address', '--wallet-address', address, '--chain', chain];
  if (opts.tradeType != null) args.push('--trade-type', String(opts.tradeType));
  if (opts.minVolume != null) args.push('--min-volume', String(opts.minVolume));
  return ensureOk(await run(args), 'tracker activities');
}

// chainId comes from tracker rows (chainIndex). Tokens is array of contract addresses.
export async function securityTokenScan(chainId, tokenAddresses) {
  if (!Array.isArray(tokenAddresses) || tokenAddresses.length === 0) return { results: [] };
  const tokens = tokenAddresses.slice(0, 10).map((a) => `${chainId}:${a}`).join(',');
  return ensureOk(await run(['security', 'token-scan', '--tokens', tokens]), 'security token-scan');
}
