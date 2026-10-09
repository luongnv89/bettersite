#!/usr/bin/env node
// Acceptance checks for #25/#26/#32/#33/#36/#37 — agent discovery. The site
// cannot emit `Accept: text/markdown` negotiation or HTTP `Link:` response
// headers from GitHub Pages (that is luongnv.com origin/CDN config), so the
// deployable equivalents are verified here instead: committed markdown
// mirrors served at /bettersite/{,fr/}index.md, an llms.txt index, RFC 8288
// web links in the HTML <head>, Cloudflare email_off markers around the
// contact address (#32), a scoped auth.md + OAuth PRM (#37), and the
// docs/origin/ artifacts carrying what the owner must apply on the origin
// (#33 llms.txt entry, #36 DNS-AID zone). Run after `npm run build` — reads
// dist/, public/ and re-renders the mirrors in --check mode to prove they
// cannot drift from the i18n copy.
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
const PAGES = {
  en: join(DIST, 'index.html'),
  fr: join(DIST, 'fr', 'index.html'),
  'privacy-en': join(DIST, 'privacy', 'index.html'),
  'privacy-fr': join(DIST, 'fr', 'privacy', 'index.html'),
};
const MIRRORS = { en: 'index.md', fr: 'fr/index.md' };
const BASE_URL = 'https://luongnv.com/bettersite';
const EMAIL = 'hello@bettersite.dev';

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
  // ── #37: auth.md + OAuth PRM web links on every page ──────────────────────
  check(`#37 ${locale}`, hasLink(links, { rel: 'help', type: 'text/markdown', href: `${BASE_URL}/auth.md` }),
    'missing <link rel="help" type="text/markdown"> → auth.md');
  check(`#37 ${locale}`, hasLink(links, { rel: 'describedby', type: 'application/json', href: `${BASE_URL}/.well-known/oauth-protected-resource` }),
    'missing <link rel="describedby" type="application/json"> → .well-known/oauth-protected-resource');
}

// ── #32: the contact address survives Cloudflare email obfuscation ──────────
// Every occurrence of the address — bare text or inside mailto: — must sit
// between <!--email_off--> and <!--/email_off--> markers so Scrape Shield
// leaves it readable for no-JS readers and agents (decision: docs/origin/).
// The landing pages must also still carry the mailto itself (footer + the two
// form error blocks); the privacy pages only carry the bare address.
for (const [locale, file] of Object.entries(PAGES)) {
  let html;
  try {
    html = await readFile(file, 'utf8');
  } catch {
    check(`#32 ${locale}`, false, `${file} not found — run \`npm run build\` first`);
    continue;
  }
  if (locale === 'en' || locale === 'fr') {
    check(`#32 ${locale}`, html.includes(`mailto:${EMAIL}`), `${file} lost the mailto:${EMAIL} link`);
  }
  for (const m of html.matchAll(/hello@bettersite\.dev/g)) {
    const before = html.slice(0, m.index);
    const wrapped = before.lastIndexOf('<!--email_off-->') > before.lastIndexOf('<!--/email_off-->');
    check(`#32 ${locale}`, wrapped, `${file}: "${EMAIL}" at offset ${m.index} is outside <!--email_off--> markers — Cloudflare will rewrite it`);
  }
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
  for (const url of [`${BASE_URL}/`, `${BASE_URL}/fr/`, `${BASE_URL}/index.md`, `${BASE_URL}/fr/index.md`, `${BASE_URL}/auth.md`, `${BASE_URL}/.well-known/oauth-protected-resource`]) {
    check('#26', llms.includes(url), `llms.txt does not reference ${url}`);
  }
}

// ── #37: scoped auth.md + OAuth PRM ship in the built site ──────────────────
// Self-contained auth.md per the auth-md guide: H1 containing `auth.md`,
// audience, registration, methods, credential use.
for (const dir of [DIST, join(ROOT, 'public')]) {
  let authMd;
  try {
    authMd = await readFile(join(dir, 'auth.md'), 'utf8');
  } catch {
    check('#37', false, `${join(dir, 'auth.md')} missing — add public/auth.md`);
    continue;
  }
  check('#37', /^#\s+[^\n]*auth\.md/m.test(authMd), 'auth.md needs an H1 containing "auth.md"');
  for (const section of ['Audience', 'Registration', 'Supported methods', 'Credential use']) {
    check('#37', authMd.toLowerCase().includes(section.toLowerCase()), `auth.md lacks a "${section}" section`);
  }
}
// RFC 9728 Protected Resource Metadata: JSON with the required members.
for (const dir of [DIST, join(ROOT, 'public')]) {
  let prm;
  try {
    prm = JSON.parse(await readFile(join(dir, '.well-known', 'oauth-protected-resource'), 'utf8'));
  } catch {
    check('#37', false, `${join(dir, '.well-known/oauth-protected-resource')} missing or invalid JSON`);
    continue;
  }
  check('#37', typeof prm.resource === 'string' && prm.resource.startsWith(BASE_URL), 'PRM resource must identify the /bettersite/ resource');
  check('#37', Array.isArray(prm.authorization_servers) && prm.authorization_servers.length > 0, 'PRM needs a non-empty authorization_servers array');
  check('#37', Array.isArray(prm.bearer_methods_supported) && prm.bearer_methods_supported.includes('header'), 'PRM bearer_methods_supported must include "header"');
}

// ── #33: the origin llms.txt entry exists and matches the page copy ─────────
// docs/origin/llms-txt-entry.md is generated by agent-mirrors.mjs from the
// same i18n dictionaries — presence + canonical URLs + the EN meta
// description are verified here; freshness is covered by the drift guard.
{
  let entry;
  try {
    entry = await readFile(join(ROOT, 'docs', 'origin', 'llms-txt-entry.md'), 'utf8');
  } catch {
    check('#33', false, 'docs/origin/llms-txt-entry.md missing — run node scripts/generate/agent-mirrors.mjs');
  }
  if (entry) {
    for (const url of [`${BASE_URL}/`, `${BASE_URL}/fr/`]) {
      check('#33', entry.includes(url), `origin llms.txt entry does not reference ${url}`);
    }
    check('#33', entry.includes(dicts.en.meta.description), 'origin llms.txt entry description does not match en.meta.description (page copy)');
  }
}

// ── #36: the DNS-AID zone snippet for the owner exists and carries _agents ──
{
  let zone;
  try {
    zone = await readFile(join(ROOT, 'docs', 'origin', 'dns-aid.zone'), 'utf8');
  } catch {
    check('#36', false, 'docs/origin/dns-aid.zone missing');
  }
  if (zone) {
    check('#36', /_agents\.luongnv\.com\.\s+\d+\s+IN\s+(HTTPS|SVCB)/.test(zone),
      'dns-aid.zone has no _agents.luongnv.com SVCB/HTTPS record');
    check('#36', /alpn="h2"/.test(zone) && /port=443/.test(zone), 'dns-aid.zone records need alpn="h2" + port=443');
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
