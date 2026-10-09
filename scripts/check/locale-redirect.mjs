#!/usr/bin/env node
// Acceptance check for issue #18: the browser-language auto-redirect must only
// ever fire from the default-locale root (dist/index.html). An explicit /fr/
// URL is itself a locale choice — a fresh non-FR browser profile opening
// /bettersite/fr/ must stay on /fr/. The language switcher's bs_lang cookie
// must keep working on both pages.
//
// Run after `npm run build` — reads the emitted HTML from dist/.
//
// Usage:
//   PUBLIC_WEB3FORMS_KEY=dev npm run build
//   node scripts/check/locale-redirect.mjs [dist-dir]     # default: <repo>/dist
//
// Exit 0 = all checks pass; 1 = at least one failed (each failure printed).

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = resolve(ROOT, process.argv[2] ?? 'dist');
const PAGES = { en: join(DIST, 'index.html'), fr: join(DIST, 'fr', 'index.html') };

let failures = 0;
const check = (scope, ok, msg) => {
  if (!ok) {
    failures++;
    console.log(`  FAIL ${scope}: ${msg}`);
  }
};

const html = {};
for (const [locale, file] of Object.entries(PAGES)) {
  try {
    html[locale] = await readFile(file, 'utf8');
  } catch {
    check(locale, false, `${file} not found — run \`npm run build\` first`);
  }
}

// ── Issue #18: /fr/ must never auto-redirect away ───────────────────────────
// The emitted detector script contains `bs_lang_detected` + `location.replace`.
// On the explicit-locale page neither may appear: no redirect code at all.
if (html.fr) {
  check('#18 fr', !html.fr.includes('bs_lang_detected'),
    'fr/index.html still ships the language-detector script — a non-FR browser opening /fr/ is redirected to EN');
  check('#18 fr', !html.fr.includes('location.replace'),
    'fr/index.html still contains a location.replace redirect');
}

// ── Issue #18: the root page keeps FR-ward detection, never EN-ward ─────────
// Auto-detection stays for a French browser landing on the unprefixed root,
// but no page may carry a redirect toward the EN URL.
if (html.en) {
  check('#18 en', html.en.includes('bs_lang_detected'),
    'index.html lost the language detector — FR browsers landing on / are no longer offered /fr/');
  check('#18 en', html.en.includes('location.replace(frHref)'),
    'index.html no longer redirects toward frHref');
  check('#18 en', !html.en.includes('location.replace(enHref)'),
    'index.html still redirects toward enHref');
}

// ── Issue #18 AC2: the language switcher still sets bs_lang on both pages ───
for (const locale of ['en', 'fr']) {
  if (!html[locale]) continue;
  check(`#18 ${locale}`, html[locale].includes('data-bs-lang="en"') && html[locale].includes('data-bs-lang="fr"'),
    `${locale} page lost the EN/FR switch links`);
  check(`#18 ${locale}`, html[locale].includes('bs_lang='),
    `${locale} page lost the bs_lang cookie setter`);
}

if (failures === 0) {
  console.log('locale-redirect: all checks passed');
} else {
  console.log(`locale-redirect: ${failures} check(s) failed`);
  process.exit(1);
}
