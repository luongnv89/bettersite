#!/usr/bin/env node
// Acceptance checks for the #10/#11/#12/#16 batch — post-submit copy aligned
// with the real Web3Forms flow, sourced proof metrics + comparison table,
// hero before/after linked to a sample gallery, outcome-first hero copy.
// Run after `npm run build` — reads the emitted HTML from dist/, the i18n
// dictionaries, and the committed demo assets.
//
// Usage:
//   PUBLIC_WEB3FORMS_KEY=dev npm run build
//   node scripts/check/landing.mjs [dist-dir]     # default: <repo>/dist
//
// Exit 0 = all checks pass; 1 = at least one failed (each failure printed).

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = resolve(ROOT, process.argv[2] ?? 'dist');
const PAGES = { en: join(DIST, 'index.html'), fr: join(DIST, 'fr', 'index.html') };

let failures = 0;
let checks = 0;
const check = (scope, ok, msg) => {
  checks++;
  if (!ok) {
    failures++;
    console.log(`  FAIL ${scope}: ${msg}`);
  }
};

const dicts = {};
for (const locale of ['en', 'fr']) {
  dicts[locale] = JSON.parse(await readFile(join(ROOT, 'src', 'i18n', `${locale}.json`), 'utf8'));
}
const html = {};
for (const [locale, file] of Object.entries(PAGES)) {
  try {
    html[locale] = await readFile(file, 'utf8');
  } catch {
    check(locale, false, `${file} not found — run \`npm run build\` first`);
  }
}

// ── Issue #10: post-submit copy describes the real email flow ────────────────
// Real flow (verified in PR #39): the form POSTs to api.web3forms.com/submit,
// the request lands in the owner inbox, and we email the preview within 48 h.
// No "confirmation link" / double opt-in is ever sent to the submitter.
for (const locale of ['en', 'fr']) {
  const f = dicts[locale].form;
  const phantom = /confirmation link|lien de confirmation|confirm your email|confirmez votre e-mail/i;
  check(`#10 ${locale}`, !phantom.test(f.fineprint), `form.fineprint still promises a confirmation step`);
  check(`#10 ${locale}`, !phantom.test(f.success_body), `form.success_body still promises a confirmation link`);
  check(`#10 ${locale}`, !phantom.test(dicts[locale].steps[0].body), `steps[0] still mentions confirming email`);
  check(`#10 ${locale}`, /48\s*h|48 hours|48 heures/i.test(f.fineprint + ' ' + f.success_body),
    `form copy does not state the real 48-hour email flow`);
  if (html[locale]) {
    check(`#10 ${locale}`, !phantom.test(html[locale]), `built page still contains confirmation-flow copy`);
  }
}

// ── Issue #11: every proof metric is sourced; testimonials removed; compare ──
for (const locale of ['en', 'fr']) {
  const p = dicts[locale].proof;
  p.metrics.forEach((m, i) => {
    check(`#11 ${locale}`, typeof m.source === 'string' && m.source.length > 0,
      `proof.metrics[${i}] ("${m.value}") has no documented source`);
  });
  check(`#11 ${locale}`, !('testimonials' in p), `proof.testimonials still present (no documented consent)`);
  check(`#11 ${locale}`, /audit|Lighthouse/i.test(p.audit_note ?? ''), `proof.audit_note missing the audit citation`);
  check(`#11 ${locale}`, Array.isArray(p.compare?.columns) && p.compare.columns.length === 3,
    `proof.compare.columns must hold the 3 columns (BetterSite / Agency / DIY)`);
  check(`#11 ${locale}`, Array.isArray(p.compare?.rows) && p.compare.rows.length >= 3,
    `proof.compare needs at least 3 rows`);
  p.compare?.rows?.forEach((r, i) => {
    check(`#11 ${locale}`, r.cells?.length === p.compare.columns.length,
      `proof.compare.rows[${i}] cell count != columns`);
  });
  check(`#11 ${locale}`, !/95\+|\+47%|−78|6[.,]2\s?s|Marie L\.|James K\./.test(JSON.stringify(dicts[locale])),
    `unverifiable claims or testimonials still in ${locale}.json`);
  if (html[locale]) {
    const proofSection = html[locale].split('id="proof"')[1] ?? '';
    check(`#11 ${locale}`, /<table[\s>]/.test(proofSection), `#proof section has no comparison table`);
    check(`#11 ${locale}`, !/\+47%|−78|6[.,]2\s?s|Marie L\.|James K\./.test(html[locale]),
      `built ${locale} page still shows unverifiable metrics/testimonials`);
  }
}

// ── Issue #12: hero shows a before/after rebuild, linked to a gallery ────────
let stats;
try {
  stats = JSON.parse(await readFile(join(ROOT, 'assets', 'demo', 'stats.json'), 'utf8'));
} catch {
  stats = null;
  check('#12', false, 'assets/demo/stats.json missing — run node scripts/generate/demo-shots.mjs');
}
if (stats) {
  for (const side of ['before', 'after']) {
    check('#12', Number.isFinite(stats[side]?.htmlKb) && Number.isFinite(stats[side]?.domNodes),
      `stats.json ${side}: htmlKb/domNodes must be numbers`);
  }
  check('#12', stats.before.domNodes > stats.after.domNodes && stats.before.htmlKb > stats.after.htmlKb,
    `rebuild should be lighter than the before page`);
}
for (const name of ['before', 'after']) {
  const fixture = join(ROOT, 'assets', 'demo', `${name}.html`);
  const png = join(ROOT, 'public', 'demo', `${name}.png`);
  try {
    const buf = await readFile(png);
    check('#12', buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47,
      `public/demo/${name}.png is not a PNG — run node scripts/generate/demo-shots.mjs`);
  } catch {
    check('#12', false, `public/demo/${name}.png missing — run node scripts/generate/demo-shots.mjs`);
  }
  try {
    await readFile(fixture);
  } catch {
    check('#12', false, `${fixture} missing — the rebuild pair must be committed`);
  }
}
for (const locale of ['en', 'fr']) {
  if (!html[locale]) continue;
  const heroSection = html[locale].split('id="top"')[1]?.split('</section>')[0] ?? '';
  check(`#12 ${locale}`, /demo\/before\.png/.test(heroSection) && /demo\/after\.png/.test(heroSection),
    `hero (#top) does not show the before/after pair`);
  check(`#12 ${locale}`, /href="#samples"/.test(heroSection), `hero does not link to the sample gallery`);
  check(`#12 ${locale}`, /id="samples"/.test(html[locale]), `no #samples gallery section`);
  for (const name of ['before', 'after']) {
    const re = new RegExp(`<img[^>]+demo/${name}\\.png[^>]*alt="([^"]*)"|` +
      `<img[^>]+alt="([^"]*)"[^>]+demo/${name}\\.png`, 'g');
    const matches = [...html[locale].matchAll(re)];
    check(`#12 ${locale}`, matches.length >= 1 && matches.every((m) => (m[1] ?? m[2] ?? '').length > 0),
      `${locale} demo/${name}.png images must carry non-empty alt text`);
  }
}

// ── Issue #16: hero leads with outcome + numbers in both locales ─────────────
for (const locale of ['en', 'fr']) {
  const h = dicts[locale].hero;
  const title = `${h.title_1} ${h.title_highlight} ${h.title_2}`;
  check(`#16 ${locale}`, /\d/.test(title), `hero H1 carries no number (48 h, €0…)`);
  check(`#16 ${locale}`, /\d/.test(h.subtitle), `hero subtitle carries no verified number`);
  check(`#16 ${locale}`, /Lighthouse|audit/i.test(h.subtitle), `hero subtitle does not cite the audited claim`);
  if (html[locale]) {
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html[locale])?.[1] ?? '';
    check(`#16 ${locale}`, h1.includes(h.title_highlight), `built ${locale} H1 does not render the new headline`);
  }
}

console.log(failures ? `\n${failures}/${checks} landing check(s) FAILED` : `\nAll ${checks} landing checks passed`);
process.exit(failures ? 1 : 0);
