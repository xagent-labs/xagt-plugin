// Skill installer: copy the wallet-whisperer skill into the user's
// chosen agent host's skills directory.
//
// Resolution order for the skill source:
//   1. From the cloned repo (../../skills/wallet-whisperer) — development path
//   2. Bundled in the npm package (../skills/wallet-whisperer) — for npm install -g
//   3. Download from GitHub raw — fallback for users who only got the bin

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { c } from './style.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const HOSTS = {
  claude:    { name: 'Claude Code', dir: '.claude/skills' },
  cursor:    { name: 'Cursor',      dir: '.cursor/skills' },
  codex:     { name: 'Codex CLI',   dir: '.codex/skills' },
  opencode:  { name: 'OpenCode',    dir: '.config/opencode/skills' },
  windsurf:  { name: 'Windsurf',    dir: '.codeium/windsurf/skills' },
  agents:    { name: 'Generic AgentSkills', dir: '.agents/skills' },
};

export function hostKeys() {
  return Object.keys(HOSTS);
}

function findLocalSkill() {
  const candidates = [
    resolve(__dirname, '..', '..', 'skills', 'wallet-whisperer'),  // repo dev path
    resolve(__dirname, '..', 'skills', 'wallet-whisperer'),         // bundled in npm package
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'SKILL.md'))) return candidate;
  }
  return null;
}

const GITHUB_RAW = 'https://raw.githubusercontent.com/Temitope15/wallet-whisperer/main/skills/wallet-whisperer';
const REMOTE_FILES = [
  'SKILL.md',
  'references/cli-reference.md',
  'references/examples.md',
];

async function downloadSkill(targetDir) {
  for (const rel of REMOTE_FILES) {
    const url = `${GITHUB_RAW}/${rel}`;
    const dest = join(targetDir, rel);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed to download ${rel}: HTTP ${r.status}`);
    const body = await r.text();
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, body, 'utf8');
  }
}

function copyDirSync(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) copyDirSync(s, d);
    else copyFileSync(s, d);
  }
}

export async function installSkill(hostKey, opts = {}) {
  const host = HOSTS[hostKey];
  if (!host) {
    const valid = hostKeys().join(' | ');
    throw new Error(`Unknown host "${hostKey}". Supported: ${valid}`);
  }

  const targetRoot = opts.dir ? resolve(opts.dir) : join(homedir(), host.dir);
  const targetSkill = join(targetRoot, 'wallet-whisperer');

  if (existsSync(join(targetSkill, 'SKILL.md')) && !opts.force) {
    return { status: 'already-installed', host, target: targetSkill };
  }

  const localSrc = findLocalSkill();

  if (localSrc) {
    mkdirSync(targetRoot, { recursive: true });
    copyDirSync(localSrc, targetSkill);
    return { status: 'installed-local', host, target: targetSkill, source: localSrc };
  }

  // Fall back to downloading from GitHub
  if (opts.offline) {
    throw new Error('Skill files not found locally and --offline was set.');
  }
  mkdirSync(targetSkill, { recursive: true });
  await downloadSkill(targetSkill);
  return { status: 'installed-remote', host, target: targetSkill, source: GITHUB_RAW };
}

export function summariseInstall(result) {
  const { host, target, status } = result;
  if (status === 'already-installed') {
    return [
      c.yellow(`✓ ${host.name}: wallet-whisperer already installed`),
      `  ${c.gray(target)}`,
      `  ${c.gray('Pass --force to overwrite.')}`,
    ].join('\n');
  }
  const sourceLine = status === 'installed-remote'
    ? c.gray(`  Source: downloaded from github.com/Temitope15/wallet-whisperer`)
    : c.gray(`  Source: ${result.source}`);
  return [
    c.brightGreen(`✓ ${host.name}: wallet-whisperer installed`),
    `  ${c.gray(target)}`,
    sourceLine,
    '',
    c.bold('Next:'),
    `  Open ${host.name} in any directory, then type:`,
    `  ${c.brightCyan('whisper this wallet 21czpZj3BxT75dVbzmUJtE5QznJrLrYHHaF5pT4CpWM1')}`,
  ].join('\n');
}
