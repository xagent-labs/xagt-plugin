import { chromium } from 'playwright';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const URL = process.env.DEMO_URL || 'https://chain-translator-app.vercel.app/';
const OUT_DIR = path.resolve('media');
const RAW_DIR = path.join(OUT_DIR, 'raw');

await mkdir(RAW_DIR, { recursive: true });

console.log('Recording demo from:', URL);

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-blink-features=AutomationControlled'],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: RAW_DIR, size: { width: 1280, height: 800 } },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Helper: wait until streaming stops (no new text-delta for X ms) by watching DOM
const waitForResponseSettled = async (timeoutMs = 45000, quietMs = 1800) => {
  const start = Date.now();
  let lastLen = -1;
  let stableSince = 0;
  while (Date.now() - start < timeoutMs) {
    const len = await page.evaluate(() => document.body.innerText.length);
    if (len === lastLen) {
      if (Date.now() - stableSince >= quietMs) return;
    } else {
      stableSince = Date.now();
      lastLen = len;
    }
    await sleep(300);
  }
};

const typeAndSend = async (text) => {
  const ta = page.locator('textarea').first();
  await ta.click();
  await ta.fill('');
  // Type with realistic-ish delay
  await ta.type(text, { delay: 28 });
  await sleep(500);
  await page.keyboard.press('Enter');
  await waitForResponseSettled();
  await sleep(1500); // breathe so viewer can read
};

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2200); // hero glance

  // 1. Click "Top 5 gainers" example prompt (market tool, fast)
  const exBtn = page.locator('button', { hasText: 'gainers' }).first();
  if (await exBtn.count()) {
    await exBtn.scrollIntoViewIfNeeded();
    await sleep(500);
    await exBtn.click();
    await waitForResponseSettled();
    await sleep(2000);
  }

  // 2. Translate Vitalik's wallet across 5 EVM chains (NEW: chain tools)
  await typeAndSend("vitalik.eth 钱包 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 在主流链上分别有多少？");

  // 3. Decode a real ETH transaction (NEW: tx decode)
  await typeAndSend("Decode this Ethereum tx: 0x88df016429689c079f3b2f6ad39fa052532c56795b733da78a91ebe6a713944b");

  await sleep(1500);

  console.log('Recording finished, closing context...');
} catch (e) {
  console.error('Demo run error:', e);
} finally {
  await ctx.close();
  await browser.close();
}

// Rename the raw webm to a stable name
const files = await readdir(RAW_DIR);
const webm = files.find((f) => f.endsWith('.webm'));
if (!webm) {
  console.error('No webm produced. Aborting.');
  process.exit(1);
}
const finalWebm = path.join(OUT_DIR, 'demo.webm');
if (existsSync(finalWebm)) await rm(finalWebm);
await rename(path.join(RAW_DIR, webm), finalWebm);
console.log('Saved:', finalWebm);
