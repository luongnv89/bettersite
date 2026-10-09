#!/usr/bin/env node
// Acceptance checks for #23 — section navigation below 768 px.
// The desktop header nav is `hidden md:flex`, so before this change a
// sub-768 px visitor had no way to reach #how / #proof / #faq. The fix adds
// a `md:hidden` anchor strip inside the sticky header (reachable at any
// scroll depth, no JS needed), plus scroll-margin on the anchor targets so
// the taller mobile header does not cover the section tops after a jump.
// Run after `npm run build` — reads the emitted HTML from dist/ and the
// i18n dictionaries.
//
// Usage:
//   PUBLIC_WEB3FORMS_KEY=dev npm run build
//   node scripts/check/mobile-nav.mjs [dist-dir]     # default: <repo>/dist
//
// Exit 0 = all checks pass; 1 = at least one failed (each failure printed).

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = resolve(ROOT, process.argv[2] ?? 'dist');
const PAGES = { en: join(DIST, 'index.html'), fr: join(DIST, 'fr', 'index.html') };
// section id → nav.* dictionary key that must label the mobile link
const SECTIONS = { how: 'how', proof: 'results', samples: 'samples', faq: 'faq' };

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
  check(`#23 ${locale}`, typeof dicts[locale].nav?.sections === 'string' && dicts[locale].nav.sections.length > 0,
    `nav.sections label missing from ${locale}.json (mobile nav aria-label)`);
}

for (const [locale, file] of Object.entries(PAGES)) {
  let page;
  try {
    page = await readFile(file, 'utf8');
  } catch {
    check(`#23 ${locale}`, false, `${file} not found — run \`npm run build\` first`);
    continue;
  }

  const header = /<header\b[\s\S]*?<\/header>/.exec(page)?.[0] ?? '';
  check(`#23 ${locale}`, header !== '', 'no <header> in built page');

  const navs = [...header.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/g)];

  // The desktop nav must still be the md-and-up one — the fix adds a mobile
  // nav, it does not remove the existing one.
  check(`#23 ${locale}`, navs.some(([, attrs]) => /\bhidden\b/.test(attrs) && /md:flex/.test(attrs)),
    'desktop nav (hidden md:flex) missing from header');

  // The mobile nav: a nav that renders only below md — `md:hidden` is the
  // "below 768 px" marker (Tailwind's md breakpoint is 768 px).
  const mobileNav = navs.find(([, attrs]) => /md:hidden/.test(attrs));
  check(`#23 ${locale}`, !!mobileNav, 'no `md:hidden` nav in the header — no section navigation below 768 px');

  if (mobileNav) {
    const [attrs, body] = [mobileNav[1], mobileNav[2]];
    const wantLabel = dicts[locale].nav?.sections;
    check(`#23 ${locale}`, /\baria-label="/.test(attrs) && (!wantLabel || attrs.includes(`aria-label="${wantLabel}"`)),
      'mobile nav missing its localized aria-label (nav.sections)');
    for (const [id, key] of Object.entries(SECTIONS)) {
      const link = new RegExp(`<a\\b[^>]*\\bhref="#${id}"[^>]*>([\\s\\S]*?)</a>`).exec(body);
      check(`#23 ${locale}`, !!link, `mobile nav has no link to #${id}`);
      if (link && dicts[locale].nav?.[key]) {
        check(`#23 ${locale}`, link[1].includes(dicts[locale].nav[key]),
          `mobile nav #${id} link is not labelled from nav.${key} ("${dicts[locale].nav[key]}")`);
      }
    }
  }

  // Every mobile-nav target must exist and carry scroll-margin — the mobile
  // sticky header is taller (bar + strip), so without it a #anchor jump
  // leaves the section title hidden under the header.
  for (const id of Object.keys(SECTIONS)) {
    const tag = new RegExp(`<[a-z]+\\b[^>]*\\bid="${id}"[^>]*>`).exec(page)?.[0] ?? '';
    check(`#23 ${locale}`, tag !== '', `no element with id="${id}" for the mobile nav to reach`);
    if (tag) {
      check(`#23 ${locale}`, /scroll-mt-/.test(tag), `#${id} has no scroll-mt-* — the mobile header covers its top after a jump`);
    }
  }
}

console.log(failures ? `\n${failures}/${checks} mobile-nav check(s) FAILED` : `\nAll ${checks} mobile-nav checks passed`);
process.exit(failures ? 1 : 0);
