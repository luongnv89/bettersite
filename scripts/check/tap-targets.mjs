#!/usr/bin/env node
// Acceptance checks for #28 — EN/FR switch tap targets ~44 px tall.
// The switch links (div[role="group"][aria-label="Language"] a) were
// `px-1.5 py-1` over text-xs (16 px line-height) ≈ 24 px tall — the WCAG
// 2.5.8 floor, well under the ~44 px comfortable target. The fix bumps the
// anchors to `py-3.5` (16 + 14×2 = 44 px). This check recomputes the tap
// target height from the classes in the built HTML so a later restyle that
// shrinks it back under 44 px goes red.
// Run after `npm run build` — reads the emitted HTML from dist/.
//
// Usage:
//   PUBLIC_WEB3FORMS_KEY=dev npm run build
//   node scripts/check/tap-targets.mjs [dist-dir]     # default: <repo>/dist
//
// Exit 0 = all checks pass; 1 = at least one failed (each failure printed).

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = resolve(ROOT, process.argv[2] ?? 'dist');
// Every page rendering LangSwitcher: landing header+footer, privacy top bar.
const PAGES = {
  'en /': join(DIST, 'index.html'),
  'fr /': join(DIST, 'fr', 'index.html'),
  'en /privacy': join(DIST, 'privacy', 'index.html'),
  'fr /privacy': join(DIST, 'fr', 'privacy', 'index.html'),
};

// text-xs line-height — the component carries `text-xs` on the group.
const TEXT_XS_LINE_PX = 16;
const TARGET_MIN_PX = 44; // ~44 px comfortable tap target (Apple HIG)
const TARGET_MIN_WIDTH_PX = 24; // WCAG 2.2 SC 2.5.8 floor

let failures = 0;
let checks = 0;
const check = (scope, ok, msg) => {
  checks++;
  if (!ok) {
    failures++;
    console.log(`  FAIL ${scope}: ${msg}`);
  }
};

// Tailwind spacing scale is 4 px per unit: py-3.5 → 14 px each side.
// Returns the tap-target height in px the class list produces, or 0 when
// no height-affecting utility is found.
const tapHeightPx = (classes) => {
  const py = /(?:^|\s)py-(\d+(?:\.\d+)?)/.exec(classes);
  if (py) return TEXT_XS_LINE_PX + parseFloat(py[1]) * 4 * 2;
  const minH = /(?:^|\s)min-h-(\d+(?:\.\d+)?)/.exec(classes);
  if (minH) return Math.max(TEXT_XS_LINE_PX, parseFloat(minH[1]) * 4);
  const h = /(?:^|\s)h-(\d+(?:\.\d+)?)/.exec(classes);
  if (h) return parseFloat(h[1]) * 4;
  return 0;
};

const tapWidthPx = (classes) => {
  const px = /(?:^|\s)px-(\d+(?:\.\d+)?)/.exec(classes);
  // ~8 px per EN/FR glyph at text-xs semibold, plus horizontal padding.
  return px ? 18 + parseFloat(px[1]) * 4 * 2 : 0;
};

for (const [scope, file] of Object.entries(PAGES)) {
  let page;
  try {
    page = await readFile(file, 'utf8');
  } catch {
    check(scope, false, `${file} not found — run \`npm run build\` first`);
    continue;
  }

  // The evidence selector from the issue: the language group's anchors.
  const group = /<div\b[^>]*role="group"[^>]*aria-label="Language"[^>]*>([\s\S]*?)<\/div>/.exec(page);
  check(scope, !!group, 'no div[role="group"][aria-label="Language"] in built page');
  if (!group) continue;

  const links = [...group[1].matchAll(/<a\b([^>]*)>/g)];
  check(scope, links.length === 2, `expected 2 EN/FR links, found ${links.length}`);

  for (const [m] of links) {
    const lang = /\bdata-bs-lang="([a-z]+)"/.exec(m)?.[1] ?? '?';
    const classes = /\bclass="([^"]*)"/.exec(m)?.[1] ?? '';
    const height = tapHeightPx(classes);
    check(`${scope} ${lang}`, height >= TARGET_MIN_PX,
      `tap target ~${Math.round(height)}px tall — needs ≥${TARGET_MIN_PX}px (class: "${classes.trim()}")`);
    const width = tapWidthPx(classes);
    check(`${scope} ${lang}`, width >= TARGET_MIN_WIDTH_PX,
      `tap target ~${Math.round(width)}px wide — needs ≥${TARGET_MIN_WIDTH_PX}px (class: "${classes.trim()}")`);
  }
}

console.log(failures ? `\n${failures}/${checks} tap-target check(s) FAILED` : `\nAll ${checks} tap-target checks passed`);
process.exit(failures ? 1 : 0);
