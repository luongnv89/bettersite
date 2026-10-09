#!/usr/bin/env node
// Acceptance checks for the #27/#29/#34 batch — P3 copy polish on the shared
// i18n surface:
//   #27 problem.outro is gone and solution.lead is a single sentence
//   #29 the nav label for #proof and the section heading use the same wording
//   #34 hedge words ("Most …", "Almost nothing", "La plupart", "Presque rien")
//       are out of the claims — each is stated plainly or removed
// Run after `npm run build` — reads the emitted HTML from dist/, the i18n
// dictionaries and the committed markdown mirrors.
//
// Usage:
//   PUBLIC_WEB3FORMS_KEY=dev npm run build
//   node scripts/check/copy-polish.mjs [dist-dir]     # default: <repo>/dist
//
// Exit 0 = all checks pass; 1 = at least one failed (each failure printed).

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = resolve(ROOT, process.argv[2] ?? 'dist');
const PAGES = { en: join(DIST, 'index.html'), fr: join(DIST, 'fr', 'index.html') };
const MIRRORS = { en: join(ROOT, 'public', 'index.md'), fr: join(ROOT, 'public', 'fr', 'index.md') };

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

// A string is "one sentence" when no terminal punctuation appears before the
// final character class — abbreviations and decimals are not used in the lead.
const oneSentence = (s) => /[.!?…]$/.test(s.trim()) && !/[.!?…]/.test(s.trim().slice(0, -1));

// ── Issue #27: problem.outro removed; solution.lead is one sentence ─────────
for (const locale of ['en', 'fr']) {
  const d = dicts[locale];
  check(`#27 ${locale}`, !('outro' in d.problem), `problem.outro still present in ${locale}.json`);
  check(`#27 ${locale}`, typeof d.solution?.lead === 'string' && oneSentence(d.solution.lead),
    `solution.lead is not a single sentence: "${d.solution?.lead}"`);
  if (html[locale]) {
    const beforeProof = html[locale].split('id="proof"')[0] ?? '';
    check(`#27 ${locale}`, !/agency quotes|devis d'agence/i.test(beforeProof),
      `built ${locale} page still renders the trimmed problem outro`);
  }
}

// ── Issue #29: nav #proof label === #proof heading wording ──────────────────
for (const locale of ['en', 'fr']) {
  const d = dicts[locale];
  check(`#29 ${locale}`, d.nav?.results === d.proof?.title,
    `nav.results ("${d.nav?.results}") != proof.title ("${d.proof?.title}")`);
  const page = html[locale];
  if (!page) continue;
  const header = /<header\b[\s\S]*?<\/header>/.exec(page)?.[0] ?? '';
  const navLink = /<a\b[^>]*\bhref="#proof"[^>]*>([\s\S]*?)<\/a>/.exec(header)?.[1]?.trim() ?? '';
  const h2 = /<section[^>]*\bid="proof"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/.exec(page)?.[1]?.trim() ?? '';
  check(`#29 ${locale}`, navLink !== '' && navLink === h2,
    `built ${locale} page: nav #proof label "${navLink}" != section heading "${h2}"`);
}

// ── Issue #34: hedge words removed from claims ──────────────────────────────
const HEDGE = /\bmost\b|\balmost\b|\bla plupart\b|\bpresque\b/i;
for (const locale of ['en', 'fr']) {
  const json = JSON.stringify(dicts[locale]);
  check(`#34 ${locale}`, !HEDGE.test(json),
    `hedge word still present in ${locale}.json: ${HEDGE.exec(json)?.[0]}`);
  if (html[locale]) {
    check(`#34 ${locale}`, !HEDGE.test(html[locale]),
      `built ${locale} page still contains hedge wording`);
  }
  try {
    const md = await readFile(MIRRORS[locale], 'utf8');
    check(`#34 ${locale}`, !HEDGE.test(md), `markdown mirror ${MIRRORS[locale]} still contains hedge wording`);
  } catch {
    check(`#34 ${locale}`, false, `${MIRRORS[locale]} missing — run npm run generate:mirrors`);
  }
}

console.log(failures ? `\n${failures}/${checks} copy-polish check(s) FAILED` : `\nAll ${checks} copy-polish checks passed`);
process.exit(failures ? 1 : 0);
