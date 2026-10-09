#!/usr/bin/env node
// Acceptance checks for #25/#26 — agent discovery. The site cannot emit
// `Accept: text/markdown` negotiation or HTTP `Link:` response headers from
// GitHub Pages (that is luongnv.com origin/CDN config), so the deployable
// equivalents are verified here instead: committed markdown mirrors served at
// /bettersite/{,fr/}index.md, an llms.txt index, and RFC 8288 web links in the
// HTML <head>. Run after `npm run build` — reads dist/, public/ and re-renders
// the mirrors in --check mode to prove they cannot drift from the i18n copy.
//
// Usage:
//   PUBLIC_WEB3FORMS_KEY=dev npm run build
//   node scripts/check/agent-discovery.mjs [dist-dir]     # default: <repo>/dist
//
// Exit 0 = all checks pass; 1 = at least one failed (each failure printed).

import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = resolve(ROOT, process.argv[2] ?? 'dist');
const PAGES = { en: join(DIST, 'index.html'), fr: join(DIST, 'fr', 'index.html') };
const MIRRORS = { en: 'index.md', fr: 'fr/index.md' };
const BASE_URL = 'https://luongnv.com/bettersite';

let failures = 0;
let checks = 0;
const check = (scope, ok, msg) => {
  checks++;
  if (!ok) {
    failures++;
    console.log(`  FAIL ${scope}: ${msg}`);
  }
};

// Return every attribute map of the <link> tags in `html`, order-agnostic.
function linkTags(html) {
  const tags = [];
  for (const m of html.matchAll(/<link\b([^>]*?)\/?>/g)) {
    const attrs = {};
    for (const a of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    tags.push(attrs);
  }
  return tags;
}
const hasLink = (tags, want) =>
  tags.some((t) => Object.entries(want).every(([k, v]) => t[k] === v));

const dicts = {};
for (const locale of ['en', 'fr']) {
  dicts[locale] = JSON.parse(await readFile(join(ROOT, 'src', 'i18n', `${locale}.json`), 'utf8'));
}

// ── #26: RFC 8288 web links in the HTML head ─────────────────────────────────
for (const [locale, file] of Object.entries(PAGES)) {
  let html;
  try {
    html = await readFile(file, 'utf8');
  } catch {
    check(`#26 ${locale}`, false, `${file} not found — run \`npm run build\` first`);
    continue;
  }
  const links = linkTags(html);
  check(`#26 ${locale}`, hasLink(links, { rel: 'alternate', type: 'text/markdown', hreflang: 'en', href: `${BASE_URL}/index.md` }),
    'missing <link rel="alternate" type="text/markdown" hreflang="en"> → index.md');
  check(`#26 ${locale}`, hasLink(links, { rel: 'alternate', type: 'text/markdown', hreflang: 'fr', href: `${BASE_URL}/fr/index.md` }),
    'missing <link rel="alternate" type="text/markdown" hreflang="fr"> → fr/index.md');
  check(`#26 ${locale}`, hasLink(links, { rel: 'alternate', type: 'text/markdown', hreflang: 'x-default', href: `${BASE_URL}/index.md` }),
    'missing x-default markdown alternate');
  check(`#26 ${locale}`, hasLink(links, { rel: 'service-doc', type: 'text/plain', href: `${BASE_URL}/llms.txt` }),
    'missing <link rel="service-doc"> → llms.txt');
  check(`#26 ${locale}`, hasLink(links, { rel: 'describedby', type: 'text/plain', href: `${BASE_URL}/llms.txt` }),
    'missing <link rel="describedby"> → llms.txt');
}

// ── #25: markdown mirrors + llms.txt ship in the built site ──────────────────
for (const [locale, rel] of Object.entries(MIRRORS)) {
  for (const dir of [DIST, join(ROOT, 'public')]) {
    let md;
    try {
      md = await readFile(join(dir, rel), 'utf8');
    } catch {
      check(`#25 ${locale}`, false, `${join(dir, rel)} missing — run node scripts/generate/agent-mirrors.mjs`);
      continue;
    }
    const h = dicts[locale].hero;
    check(`#25 ${locale}`, md.startsWith(`# ${h.title_1} ${h.title_highlight} ${h.title_2}`),
      `${rel} does not open with the ${locale} hero title — stale mirror?`);
  }
}
let llms;
try {
  llms = await readFile(join(DIST, 'llms.txt'), 'utf8');
} catch {
  check('#26', false, `dist/llms.txt missing — run node scripts/generate/agent-mirrors.mjs`);
}
if (llms) {
  check('#26', llms.startsWith('# BetterSite'), 'llms.txt does not open with an H1 name (llmstxt.org)');
  for (const url of [`${BASE_URL}/`, `${BASE_URL}/fr/`, `${BASE_URL}/index.md`, `${BASE_URL}/fr/index.md`]) {
    check('#26', llms.includes(url), `llms.txt does not reference ${url}`);
  }
}

// ── Drift guard: committed mirrors are byte-identical to a fresh render ──────
try {
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'generate', 'agent-mirrors.mjs'), '--check'], { stdio: 'pipe' });
  check('drift', true, '');
} catch (e) {
  check('drift', false, `committed mirrors differ from the i18n render — ${String(e.stdout).trim() || 'run npm run generate:mirrors'}`);
}

console.log(failures ? `\n${failures}/${checks} agent-discovery check(s) FAILED` : `\nAll ${checks} agent-discovery checks passed`);
process.exit(failures ? 1 : 0);
