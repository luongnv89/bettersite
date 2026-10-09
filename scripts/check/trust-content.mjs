#!/usr/bin/env node
// Acceptance checks for the #17/#20/#21/#22/#24 batch — P2 trust & transparency
// improvements on the shared landing surface:
//   #17 hero states the free-sample / no-card / 48h promise at most twice
//   #20 JSON-LD Service carries url/@id, a real provider, localized offers
//   #21 one fixed rebuild price on the page + a Pricing link in both navs
//   #22 founder photo + name + first-person story near the final form
//   #24 privacy link in the form fineprint and the footer, EN + FR pages
// Run after `npm run build` — reads the emitted HTML from dist/ and the i18n
// dictionaries.
//
// Usage:
//   PUBLIC_WEB3FORMS_KEY=dev npm run build
//   node scripts/check/trust-content.mjs [dist-dir]     # default: <repo>/dist
//
// Exit 0 = all checks pass; 1 = at least one failed (each failure printed).

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = resolve(ROOT, process.argv[2] ?? 'dist');
const PAGES = { en: join(DIST, 'index.html'), fr: join(DIST, 'fr', 'index.html') };
const PRIVACY = { en: join(DIST, 'privacy', 'index.html'), fr: join(DIST, 'fr', 'privacy', 'index.html') };

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

// The audited promise cluster — "free sample / no card / 48 h" in either locale.
const PROMISE =
  /free sample|no card|credit card|48[\s-]?(h|hour|hours)|échantillon gratuit|sans carte|carte bancaire|48 heures|2 days|2 jours/i;

// ── Issue #17: the hero states the promise in at most two zones ─────────────
// The audit counted 4 statement zones: badge, subtitle, bullets, form
// fineprint. Kept: the badge (urgency cue) + the fineprint (point-of-action
// reassurance). The subtitle and bullets must not restate it.
for (const locale of ['en', 'fr']) {
  const h = dicts[locale].hero;
  check(`#17 ${locale}`, !PROMISE.test(h.subtitle), 'hero.subtitle still restates the free-sample/no-card/48h promise');
  h.bullets.forEach((b, i) => {
    check(`#17 ${locale}`, !PROMISE.test(b), `hero.bullets[${i}] ("${b}") restates the promise`);
  });
  check(`#17 ${locale}`, PROMISE.test(h.badge), 'hero.badge lost the promise — it is the one hero zone that keeps it');
  if (!html[locale]) continue;
  const hero = html[locale].split('id="top"')[1]?.split('</section>')[0] ?? '';
  const zones = [
    hero.split('<h1')[0] ?? '',                                  // badge pill zone
    /<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/.exec(hero)?.[1] ?? '',    // subtitle
    hero.split('flex-wrap')[1]?.split('id="request"')[0] ?? '',  // bullets
    `<form${hero.split('<form')[1] ?? ''}`,                       // form incl. fineprint
  ];
  const stated = zones.filter((z) => PROMISE.test(z)).length;
  check(`#17 ${locale}`, stated <= 2, `hero states the promise in ${stated} zones (max 2)`);
}

// ── Issue #20: enriched, localized JSON-LD ──────────────────────────────────
for (const locale of ['en', 'fr']) {
  const page = html[locale];
  if (!page) continue;
  const ldRaw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page)?.[1];
  let ld = null;
  try {
    ld = JSON.parse(ldRaw ?? '');
  } catch {
    check(`#20 ${locale}`, false, 'JSON-LD script does not parse');
    continue;
  }
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(page)?.[1] ?? '';
  check(`#20 ${locale}`, ld['@type'] === 'Service', 'JSON-LD @type is not Service');
  check(`#20 ${locale}`, ld['@id'] === canonical && ld.url === canonical,
    `url/@id (${ld.url} / ${ld['@id']}) != canonical ${canonical}`);
  check(`#20 ${locale}`, typeof ld.provider === 'object' && !!ld.provider.url,
    'provider is still name-only (no provider.url)');
  check(`#20 ${locale}`, !!ld.image, 'Service has no image');
  const offers = Array.isArray(ld.offers) ? ld.offers : [ld.offers];
  const sample = offers.find((o) => o?.price === '0');
  const rebuild = offers.find((o) => o?.price === dicts[locale].pricing?.price_amount);
  check(`#20 ${locale}`, !!sample, 'no free-sample Offer (price 0)');
  check(`#20 ${locale}`, !!rebuild, 'no Offer matching the published rebuild price');
  check(`#20 ${locale}`, sample?.description === dicts[locale].jsonld?.offer_sample_desc,
    `sample Offer description is not the localized one ("${sample?.description}")`);
  check(`#20 ${locale}`, rebuild?.description === dicts[locale].jsonld?.offer_rebuild_desc,
    `rebuild Offer description is not the localized one ("${rebuild?.description}")`);
}

// ── Issue #21: one fixed rebuild price + Pricing in the nav ─────────────────
for (const locale of ['en', 'fr']) {
  const d = dicts[locale];
  check(`#21 ${locale}`, typeof d.nav?.pricing === 'string' && d.nav.pricing.length > 0,
    'nav.pricing label missing');
  check(`#21 ${locale}`, /optional|facultative/i.test(d.pricing?.maintenance ?? ''),
    'pricing.maintenance does not state maintenance is optional');
  check(`#21 ${locale}`, typeof d.pricing?.price_amount === 'string' && /^\d+$/.test(d.pricing.price_amount),
    'pricing.price_amount must be a bare number (drives the JSON-LD Offer)');
  const page = html[locale];
  if (!page) continue;
  const header = /<header\b[\s\S]*?<\/header>/.exec(page)?.[0] ?? '';
  const navs = [...header.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/g)];
  for (const [, attrs, body] of navs) {
    const kind = /md:hidden/.test(attrs) ? 'mobile' : 'desktop';
    const link = new RegExp(`<a\\b[^>]*\\bhref="#pricing"[^>]*>([\\s\\S]*?)</a>`).exec(body);
    check(`#21 ${locale}`, !!link, `${kind} nav has no #pricing link`);
    if (link) check(`#21 ${locale}`, link[1].includes(d.nav.pricing), `${kind} nav #pricing label != nav.pricing`);
  }
  const section = page.split('id="pricing"')[1]?.split('</section>')[0] ?? '';
  check(`#21 ${locale}`, section !== '', 'no #pricing section in built page');
  if (section) {
    check(`#21 ${locale}`, section.includes(d.pricing.price), `pricing section does not show ${d.pricing.price}`);
    check(`#21 ${locale}`, section.includes(d.pricing.maintenance), 'pricing section omits the maintenance statement');
  }
  check(`#21 ${locale}`, /<[a-z]+\b[^>]*id="pricing"[^>]*scroll-mt-/.test(page),
    '#pricing has no scroll-mt-* — the sticky header covers it after a nav jump');
}

// ── Issue #22: founder block near the final form ────────────────────────────
for (const locale of ['en', 'fr']) {
  const f = dicts[locale].founder;
  check(`#22 ${locale}`, !!(f?.name && f?.story && f?.photo_alt), 'founder name/story/photo_alt missing from dict');
  check(`#22 ${locale}`, /\b(I|Je|j')/i.test(f?.story ?? ''), 'founder.story is not first-person');
  const page = html[locale];
  if (!page) continue;
  const finalSection = page.split('id="form-final"')[0]?.split('<section').pop() ?? '';
  check(`#22 ${locale}`, /founder\.jpg/.test(finalSection), 'no founder photo next to the final form');
  check(`#22 ${locale}`, finalSection.includes(f.name), 'final form area does not name the founder');
  check(`#22 ${locale}`, finalSection.includes(f.story.slice(0, 40)), 'founder story missing near the final form');
  const img = /<img\b[^>]*founder\.jpg[^>]*alt="([^"]*)"/.exec(page);
  check(`#22 ${locale}`, !!img && img[1].length > 0, 'founder photo lacks alt text');
}
try {
  const buf = await readFile(join(ROOT, 'public', 'founder.jpg'));
  check('#22', buf.length > 1000, 'public/founder.jpg missing or suspiciously small');
} catch {
  check('#22', false, 'public/founder.jpg missing');
}

// ── Issue #24: privacy links + per-locale privacy pages ─────────────────────
const PRIVACY_HREF = { en: '/privacy/', fr: '/fr/privacy/' };
for (const locale of ['en', 'fr']) {
  const page = html[locale];
  if (!page) continue;
  const forms = page.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
  for (const form of forms) {
    check(`#24 ${locale}`, form.includes(`href="${PRIVACY_HREF[locale]}"`),
      'sample form fineprint has no privacy link');
  }
  const footer = /<footer\b[\s\S]*?<\/footer>/.exec(page)?.[0] ?? '';
  check(`#24 ${locale}`, footer.includes(`href="${PRIVACY_HREF[locale]}"`),
    'footer has no privacy link');
  let priv;
  try {
    priv = await readFile(PRIVACY[locale], 'utf8');
  } catch {
    check(`#24 ${locale}`, false, `${PRIVACY[locale]} not found — privacy page missing`);
    continue;
  }
  check(`#24 ${locale}`, priv.includes(`<html lang="${locale}"`), `privacy page lang != ${locale}`);
  check(`#24 ${locale}`, priv.includes(dicts[locale].privacy.title), 'privacy page does not render the localized title');
  check(`#24 ${locale}`, priv.includes(`hreflang="${locale === 'fr' ? 'en' : 'fr'}"`),
    'privacy page has no hreflang to its locale twin');
}

console.log(failures ? `\n${failures}/${checks} trust-content check(s) FAILED` : `\nAll ${checks} trust-content checks passed`);
process.exit(failures ? 1 : 0);
