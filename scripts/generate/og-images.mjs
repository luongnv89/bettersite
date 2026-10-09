#!/usr/bin/env node
// Generate the per-locale 1200x630 Open Graph cards (issue #13) by rendering a
// branded HTML card in headless Chrome and screenshotting it — deterministic,
// reproducible, no binary assets hand-edited. Drives the *installed* Google
// Chrome via playwright-core (same pattern as scripts/measure).
//
// Usage:
//   npm i -D playwright-core        # one-time, dev-only
//   node scripts/generate/og-images.mjs            # writes public/og-{en,fr}.png
//
// Output is committed: Layout.astro references /bettersite/og-{locale}.png as
// the absolute og:image/twitter:image of each locale's pages.

import { chromium } from 'playwright-core';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'public');
const WIDTH = 1200;
const HEIGHT = 630;

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const logoSvg = await readFile(join(ROOT, 'public', 'logo-mark.svg'), 'utf8');

function cardHtml(t) {
  const headline =
    `${esc(t.hero.title_1)} <em>${esc(t.hero.title_highlight)}</em> ${esc(t.hero.title_2)}`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden;
    background: #020617; color: #f1f5f9;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    position: relative;
  }
  .glow-a, .glow-b { position: absolute; border-radius: 50%; filter: blur(110px); }
  .glow-a { top: -180px; left: -140px; width: 560px; height: 560px; background: rgba(16,185,129,.28); }
  .glow-b { top: 220px; right: -180px; width: 560px; height: 560px; background: rgba(34,211,238,.16); }
  .card {
    position: absolute; inset: 0; padding: 64px 72px;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .brand { display: flex; align-items: center; gap: 18px; }
  .brand svg { width: 60px; height: 60px; }
  .brand .name { font-size: 40px; font-weight: 700; letter-spacing: -1px; }
  .brand .name .accent { color: #34d399; }
  .badge {
    display: inline-flex; align-items: center; gap: 10px; align-self: flex-start;
    background: rgba(52,211,153,.10); border: 1px solid rgba(52,211,153,.35);
    color: #6ee7b7; font-size: 22px; font-weight: 500;
    border-radius: 999px; padding: 10px 22px; margin-bottom: 30px;
  }
  .badge .dot { width: 10px; height: 10px; border-radius: 50%; background: #34d399; }
  h1 { font-size: 64px; font-weight: 700; letter-spacing: -2px; line-height: 1.08; max-width: 980px; }
  h1 em {
    font-style: normal;
    background: linear-gradient(90deg, #6ee7b7, #67e8f9);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .foot { display: flex; align-items: center; justify-content: space-between; color: #94a3b8; font-size: 26px; }
  .foot .url { color: #cbd5e1; font-weight: 600; letter-spacing: 0.5px; }
</style></head>
<body>
  <div class="glow-a"></div><div class="glow-b"></div>
  <div class="card">
    <div class="brand">${logoSvg}<span class="name">Better<span class="accent">Site</span></span></div>
    <div>
      <div class="badge"><span class="dot"></span>${esc(t.hero.badge)}</div>
      <h1>${headline}</h1>
    </div>
    <div class="foot"><span>${esc(t.meta.title.split('—')[0].trim())}</span><span class="url">luongnv.com/bettersite</span></div>
  </div>
</body></html>`;
}

const locales = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const targets = locales.length ? locales : ['en', 'fr'];

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const locale of targets) {
    const dict = JSON.parse(await readFile(join(ROOT, 'src', 'i18n', `${locale}.json`), 'utf8'));
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    try {
      await page.setContent(cardHtml(dict), { waitUntil: 'load' });
      await page.waitForTimeout(150); // settle font/gradient paint
      const out = join(OUT_DIR, `og-${locale}.png`);
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
      console.log(`wrote ${out}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
