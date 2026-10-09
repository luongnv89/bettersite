#!/usr/bin/env node
// Generate the before/after demo screenshots for issue #12: render the two
// committed fixtures (assets/demo/before.html — a dated small-business homepage,
// assets/demo/after.html — its BetterSite-style rebuild) in headless Chrome,
// screenshot them to public/demo/, and record honest measured numbers
// (HTML weight, DOM nodes) in assets/demo/stats.json — the same numbers the
// landing page displays next to the pair.
//
// Usage:
//   npm i -D playwright-core        # one-time, dev-only
//   node scripts/generate/demo-shots.mjs
//
// Outputs (all committed):
//   public/demo/before.png, public/demo/after.png   1280x800 page captures
//   assets/demo/stats.json                          measured stats + timestamp

import { chromium } from 'playwright-core';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURE_DIR = join(ROOT, 'assets', 'demo');
const OUT_DIR = join(ROOT, 'public', 'demo');
const STATS_FILE = join(FIXTURE_DIR, 'stats.json');
const WIDTH = 1280;
const HEIGHT = 800;

const stats = { generatedAt: new Date().toISOString(), viewport: `${WIDTH}x${HEIGHT}` };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const name of ['before', 'after']) {
    const file = join(FIXTURE_DIR, `${name}.html`);
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    try {
      await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
      await page.waitForTimeout(150); // settle paint
      const measured = await page.evaluate(() => ({
        htmlBytes: new Blob([document.documentElement.outerHTML]).size,
        domNodes: document.querySelectorAll('*').length,
        images: document.querySelectorAll('img').length,
      }));
      stats[name] = {
        htmlKb: Math.round(measured.htmlBytes / 102.4) / 10,
        domNodes: measured.domNodes,
        images: measured.images,
      };
      const out = join(OUT_DIR, `${name}.png`);
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
      console.log(`wrote ${out} — ${stats[name].htmlKb} KB HTML, ${stats[name].domNodes} DOM nodes`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(STATS_FILE, JSON.stringify(stats, null, 2) + '\n');
console.log(`wrote ${STATS_FILE}`);
