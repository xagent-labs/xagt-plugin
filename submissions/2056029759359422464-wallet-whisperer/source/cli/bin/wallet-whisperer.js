#!/usr/bin/env node
import { walletStatus, portfolioOverview, portfolioRecentPnl } from '../lib/onchainos.js';
import { inferPersona, selectHighlights } from '../lib/persona.js';
import { renderPersonaCard, renderReplay } from '../lib/render.js';
import { startSpinner, c } from '../lib/style.js';
import { installSkill, summariseInstall, HOSTS, hostKeys } from '../lib/install.js';

const USAGE = `wallet-whisperer

Usage:
  wallet-whisperer whisper <address> [--chain <chain>]   Render a Persona Card
  wallet-whisperer replay  <address> [--chain <chain>]   Persona Card + best/worst trades
  wallet-whisperer mirror  <address>                     Print mirror handoff instructions
  wallet-whisperer init    <host>    [--force] [--dir]   Install the agent skill
  wallet-whisperer --help

Supported hosts for "init": ${hostKeys().join(' · ')}

Examples:
  wallet-whisperer whisper 21czpZj3BxT75dVbzmUJtE5QznJrLrYHHaF5pT4CpWM1
  wallet-whisperer init claude
  wallet-whisperer init cursor --force

Notes:
  - Requires the onchainos CLI on PATH (https://github.com/okx/onchainos-skills).
  - For whisper/replay you also need to be logged in: onchainos wallet login <email>.
  - Mirroring is interactive (per-trade confirmation) and runs inside an agent host.
`;

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    return { command: 'help' };
  }
  const command = args[0];
  if (!['whisper', 'replay', 'mirror', 'init'].includes(command)) {
    return { command: 'help', error: `Unknown command: ${command}` };
  }
  const positionals = [];
  const opts = {};
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--chain') opts.chain = args[++i];
    else if (a.startsWith('--chain=')) opts.chain = a.slice('--chain='.length);
    else if (a === '--dir') opts.dir = args[++i];
    else if (a.startsWith('--dir=')) opts.dir = a.slice('--dir='.length);
    else if (a === '--force') opts.force = true;
    else if (a === '--offline') opts.offline = true;
    else if (a.startsWith('--')) return { command: 'help', error: `Unknown flag: ${a}` };
    else positionals.push(a);
  }
  if (positionals.length !== 1) return { command: 'help', error: 'Exactly one positional argument required.' };
  return { command, address: positionals[0], host: positionals[0], chain: opts.chain, dir: opts.dir, force: opts.force, offline: opts.offline };
}

function detectChain(address) {
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return 'ethereum';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return 'solana';
  return null;
}

async function ensureLogin() {
  let status;
  try {
    status = await walletStatus();
  } catch (e) {
    throw new Error(`Failed to check wallet status. ${e.message}`);
  }
  if (!status?.loggedIn) {
    throw new Error('Not logged in to onchainos. Run "onchainos wallet login <email>" then "onchainos wallet verify <code>".');
  }
}

async function runInit(parsed) {
  if (!HOSTS[parsed.host]) {
    console.error(`\nUnknown host "${parsed.host}".`);
    console.error(`Supported: ${hostKeys().join(', ')}\n`);
    process.exit(1);
  }
  try {
    const result = await installSkill(parsed.host, { force: parsed.force, dir: parsed.dir, offline: parsed.offline });
    process.stdout.write('\n' + summariseInstall(result) + '\n\n');
  } catch (e) {
    console.error(`\nInstall failed: ${e.message}\n`);
    process.exit(2);
  }
}

async function runProfile(parsed) {
  const chain = parsed.chain ?? detectChain(parsed.address);
  if (!chain) {
    console.error(`Could not detect chain for address ${parsed.address}. Pass --chain solana | ethereum | base | bsc | arbitrum.`);
    process.exit(1);
  }

  if (parsed.command === 'mirror') {
    process.stdout.write(`
Mirror mode is interactive (per-trade confirmation) and is not available from this terminal CLI.

To mirror ${parsed.address} on ${chain}:

  1. Install the wallet-whisperer skill into your agent host:
       wallet-whisperer init claude     # or cursor / codex / opencode / windsurf
  2. Open the agent host in any directory.
  3. Type:  mirror this wallet ${parsed.address}

The skill will run pre-flight checks (login, persona score, caps), then poll the
source wallet and surface each candidate trade as a one-tap confirmation card.
No swap is executed without your explicit "execute" reply.

For a read-only profile of this wallet, run:
  wallet-whisperer whisper ${parsed.address} --chain ${chain}
`);
    return;
  }

  try {
    await ensureLogin();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  const stopSpinner = startSpinner(`Pulling on-chain history for ${c.cyan(parsed.address.slice(0, 8) + '…')} on ${c.cyan(chain)}`);

  let overview30d;
  let recentPnl;
  try {
    [overview30d, recentPnl] = await Promise.all([
      portfolioOverview(parsed.address, chain, 4),
      portfolioRecentPnl(parsed.address, chain, 100),
    ]);
  } catch (e) {
    stopSpinner();
    console.error(`Data fetch failed: ${e.message}`);
    process.exit(2);
  }
  stopSpinner();

  const closedCount = recentPnl?.pnlList?.length ?? 0;
  if (closedCount < 5) {
    console.error(`Only ${closedCount} closed positions found on ${chain}. Try a different chain with --chain.`);
    process.exit(3);
  }

  const persona = inferPersona({ overview30d, recentPnl });

  if (parsed.command === 'whisper') {
    process.stdout.write(renderPersonaCard(parsed.address, chain, persona));
  } else {
    const highlights = selectHighlights(recentPnl, 3);
    process.stdout.write(renderPersonaCard(parsed.address, chain, persona));
    process.stdout.write(renderReplay(parsed.address, chain, highlights));
  }
}

async function run() {
  const parsed = parseArgs(process.argv);
  if (parsed.command === 'help') {
    if (parsed.error) console.error(parsed.error + '\n');
    process.stdout.write(USAGE);
    process.exit(parsed.error ? 1 : 0);
  }
  if (parsed.command === 'init') {
    return runInit(parsed);
  }
  return runProfile(parsed);
}

run().catch((e) => {
  console.error(e.stack ?? e.message);
  process.exit(99);
});
