#!/usr/bin/env node
// Acceptance checks for #19 — the sample-request form works without
// JavaScript: a native POST to Web3Forms instead of a GET to the same page
// (which sent nothing and leaked the email/website values into the URL).
// Run after `npm run build` — reads the emitted HTML from dist/.
//
// Usage:
//   PUBLIC_WEB3FORMS_KEY=dev npm run build
//   node scripts/check/nojs-form.mjs [dist-dir]     # default: <repo>/dist
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

for (const [locale, file] of Object.entries(PAGES)) {
  let page;
  try {
    page = await readFile(file, 'utf8');
  } catch {
    check(`#19 ${locale}`, false, `${file} not found — run \`npm run build\` first`);
    continue;
  }

  const forms = page.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
  const sampleForms = forms.filter((f) => /name="access_key"/.test(f));
  check(`#19 ${locale}`, sampleForms.length >= 1, 'no sample-request form (access_key) found in built page');

  for (const form of sampleForms) {
    const openTag = /<form\b[^>]*>/.exec(form)?.[0] ?? '';
    const id = /\bid="([^"]+)"/.exec(openTag)?.[1] ?? '?';
    const scope = `#19 ${locale} form#${id}`;

    // Native submission must POST — a GET/absent method puts the field values
    // in the page URL and sends nothing to Web3Forms.
    check(scope, /\bmethod="post"/i.test(openTag),
      `form has no method="POST" (no-JS submit falls back to GET → email leaks into URL)`);
    check(scope, /\baction="https:\/\/api\.web3forms\.com\/submit"/i.test(openTag),
      `form has no action="https://api.web3forms.com/submit" (no-JS submit posts to itself)`);

    // The no-JS path lands back on this page at the form's confirmation block.
    const redirect = /<input\b[^>]*\bname="redirect"[^>]*>/.exec(form)?.[0] ?? '';
    const redirectUrl = /\bvalue="([^"]+)"/.exec(redirect)?.[1] ?? '';
    check(scope, /^https:\/\//.test(redirectUrl),
      'hidden "redirect" input missing or not an absolute https URL');
    const fragment = /#([\w-]+)$/.exec(redirectUrl)?.[1] ?? '';
    check(scope, fragment.length > 0 && new RegExp(`\\bid="${fragment}"`).test(page),
      `redirect fragment "#${fragment}" does not resolve to an element id on this page`);
    check(scope, fragment === `${id}-sent`,
      `redirect fragment should be "#${id}-sent" so the no-JS user lands on the confirmation`);

    // The confirmation block must be visible without JS: it is `hidden` by
    // default and revealed by the :target pseudo-class when the redirect
    // lands on it.
    const sentBlock = new RegExp(`<div\\b[^>]*\\bid="${id}-sent"[^>]*>`).exec(page)?.[0] ?? '';
    check(scope, /\btarget:(block|inline-block|flex)\b/.test(sentBlock),
      `confirmation block #${id}-sent has no target: display class — no-JS user would see a blank form`);

    // Belt-and-suspenders: the method check above already pins POST, but an
    // explicit GET must never regress silently.
    check(scope, !/\bmethod="get"/i.test(openTag), 'form method is GET — field values would land in the URL');
  }
}

console.log(failures ? `\n${failures}/${checks} no-JS form check(s) FAILED` : `\nAll ${checks} no-JS form checks passed`);
process.exit(failures ? 1 : 0);
