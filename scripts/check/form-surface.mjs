#!/usr/bin/env node
// Acceptance checks for the #30/#31/#35/#38 batch — form + landing surface:
//   #30 the final form's labels are left-aligned like the hero form's
//       (the form element carries `text-left`, overriding the centered
//       final section; the fineprint keeps its own `text-center`)
//   #31 the badge dot's infinite pulse is `motion-safe:`-gated and every
//       focusable element gets an explicit :focus-visible indicator
//       (@layer base rule in global.css)
//   #35 the post-submit success block carries a share path — a localized
//       mailto: draft prefilled with subject/body + the page URL, so it
//       works on both the JS-revealed and the no-JS :target variants
//   #38 the sample-request forms are declarative WebMCP tools —
//       `toolname`/`tooldescription` on the <form>, `toolparamdescription`
//       on the website/email inputs, and no `toolautosubmit` (the visitor
//       always confirms a submit that sends real email). llms.txt lists
//       the tools so agents can discover them.
// Run after `npm run build` — reads the emitted HTML/CSS from dist/, the
// i18n dictionaries, and dist/llms.txt.
//
// Usage:
//   PUBLIC_WEB3FORMS_KEY=dev npm run build
//   node scripts/check/form-surface.mjs [dist-dir]     # default: <repo>/dist
//
// Exit 0 = all checks pass; 1 = at least one failed (each failure printed).

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = resolve(ROOT, process.argv[2] ?? 'dist');
const PAGES = { en: join(DIST, 'index.html'), fr: join(DIST, 'fr', 'index.html') };
const PAGE_URL = { en: 'luongnv.com%2Fbettersite%2F', fr: 'luongnv.com%2Fbettersite%2Ffr%2F' };

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
// The built stylesheet(s) — Tailwind v4 bundles src/styles/global.css into
// dist/_astro/*.css, where the :focus-visible rule and the motion-safe
// media query must land.
let css = '';
try {
  for (const name of await readdir(join(DIST, '_astro'))) {
    if (name.endsWith('.css')) css += await readFile(join(DIST, '_astro', name), 'utf8');
  }
} catch { /* dist missing — page checks already reported it */ }

// ── Issue #30: final-form labels left-aligned like the hero form ───────────
// `text-left` on the form element is what undoes the final section's
// `text-center` for label spans; assert it on BOTH forms (the hero form is
// pinned to the same truth — labels aligned in every variant).
for (const locale of ['en', 'fr']) {
  const page = html[locale];
  if (!page) continue;
  for (const id of ['form-hero', 'form-final']) {
    const openTag = new RegExp(`<form\\b[^>]*\\bid="${id}"[^>]*>`).exec(page)?.[0] ?? '';
    check(`#30 ${locale}`, /\bclass="[^"]*\btext-left\b/.test(openTag),
      `#${id} lacks text-left — labels inherit the centered section, unlike the hero form`);
    const fineprint = new RegExp(`${id}[\\s\\S]*?(<p\\b[^>]*text-xs[^>]*>)`).exec(page)?.[1] ?? '';
    check(`#30 ${locale}`, /\btext-center\b/.test(fineprint),
      `#${id} fineprint lost its centered alignment — the fix must scope to labels`);
  }
}

// ── Issue #31: reduced-motion + explicit keyboard focus ────────────────────
for (const locale of ['en', 'fr']) {
  const page = html[locale];
  if (!page) continue;
  // No bare infinite animation utility — every animate-* must be gated by a
  // motion-safe:/motion-reduce: variant inside the same class attribute.
  const bare = [...page.matchAll(/class="([^"]*)"/g)]
    .flatMap((m) => m[1].split(/\s+/))
    .filter((cls) => /\banimate-(pulse|ping|bounce|spin)\b/.test(cls))
    .filter((cls) => !/^motion-(safe|reduce):/.test(cls));
  check(`#31 ${locale}`, bare.length === 0,
    `infinite animation without motion-safe:/motion-reduce: gate: ${bare.join(', ')}`);
  // tabindex="-1" is only acceptable on visually hidden elements (the
  // botcheck honeypot) — anything else would drop a link/button from tab order.
  const skipped = [...page.matchAll(/<[^>]*tabindex="-1"[^>]*>/g)]
    .filter(([tag]) => !/\bclass="[^"]*\bhidden\b/.test(tag) && !/\bhidden\b/.test(tag));
  check(`#31 ${locale}`, skipped.length === 0,
    `visible element removed from tab order: ${skipped.join(' ')}`);
}
check('#31', /:focus-visible\s*\{[^}]*outline\s*:/.test(css.replace(/\s+/g, ' ')),
  'built CSS has no :focus-visible rule with an outline — keyboard focus has no explicit indicator');
check('#31', /prefers-reduced-motion\s*:\s*no-preference/.test(css),
  'built CSS lacks the prefers-reduced-motion:no-preference media — motion-safe: did not compile');

// ── Issue #35: share path inside the success block ─────────────────────────
for (const locale of ['en', 'fr']) {
  const f = dicts[locale].form;
  for (const key of ['share_prompt', 'share_cta', 'share_subject', 'share_body']) {
    check(`#35 ${locale}`, typeof f[key] === 'string' && f[key].length > 0,
      `form.${key} missing from ${locale}.json`);
  }
  const page = html[locale];
  if (!page) continue;
  for (const id of ['form-hero', 'form-final']) {
    const sent = new RegExp(`<div\\b[^>]*\\bid="${id}-sent"[^>]*>[\\s\\S]*?</div>`).exec(page)?.[0] ?? '';
    check(`#35 ${locale}`, sent !== '', `#${id}-sent block missing`);
    const mailto = /href="mailto:\?([^"]*)"/.exec(sent);
    check(`#35 ${locale}`, !!mailto, `#${id}-sent has no mailto: share link`);
    if (mailto) {
      // Astro emits the `&` separator as &#38; (numeric entity) — decode both.
      const query = mailto[1].replace(/&#38;|&amp;/g, '&');
      check(`#35 ${locale}`, /(^|&)subject=/.test(query) && /(^|&)body=/.test(query),
        `#${id}-sent share link lacks prefilled subject/body`);
      check(`#35 ${locale}`, query.includes(encodeURIComponent(f.share_subject)),
        `#${id}-sent share subject is not the localized share_subject`);
      check(`#35 ${locale}`, query.includes(PAGE_URL[locale]),
        `#${id}-sent share body does not carry the ${locale} page URL`);
      check(`#35 ${locale}`, !/mailto:[^?]/.test(mailto[0]),
        `#${id}-sent share mailto: must have no preset recipient (it is a forward draft)`);
    }
    check(`#35 ${locale}`, sent.includes(f.share_prompt),
      `#${id}-sent does not render the localized share prompt`);
  }
}

// ── Issue #38: declarative WebMCP tools on the sample-request forms ────────
for (const locale of ['en', 'fr']) {
  const f = dicts[locale].form;
  for (const key of ['tool_description', 'website_tool_param', 'email_tool_param']) {
    check(`#38 ${locale}`, typeof f[key] === 'string' && f[key].length > 0,
      `form.${key} missing from ${locale}.json`);
  }
  const page = html[locale];
  if (!page) continue;
  const forms = page.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
  const toolForms = forms.filter((f0) => /name="access_key"/.test(f0));
  const names = [];
  for (const form of toolForms) {
    const openTag = /<form\b[^>]*>/.exec(form)?.[0] ?? '';
    const id = /\bid="([^"]+)"/.exec(openTag)?.[1] ?? '?';
    const scope = `#38 ${locale} form#${id}`;
    const name = /\btoolname="([^"]+)"/.exec(openTag)?.[1] ?? '';
    check(scope, /^request_sample_(hero|final)$/.test(name),
      `form has no valid toolname (got "${name}") — the declarative tool is unregistered`);
    names.push(name);
    check(scope, /\btooldescription="[^"]+"/.test(openTag),
      'form has no tooldescription — WebMCP requires both attributes');
    // Deliberate: a form that emails the owner must never auto-submit — the
    // visitor confirms after the agent fills the fields.
    check(scope, !/\btoolautosubmit\b/.test(openTag),
      'toolautosubmit present — an agent could send email without user confirmation');
    for (const field of ['website', 'email']) {
      const input = new RegExp(`<input\\b[^>]*\\bname="${field}"[^>]*>`).exec(form)?.[0] ?? '';
      check(scope, /\btoolparamdescription="[^"]+"/.test(input),
        `input[name="${field}"] lacks toolparamdescription`);
    }
  }
  check(`#38 ${locale}`, new Set(names).size === names.length && names.length >= 2,
    `expected distinct toolname per form variant, got: ${names.join(', ')}`);
}

// The site index must point agents at the tools — llms.txt carries them.
let llms = '';
try {
  llms = await readFile(join(DIST, 'llms.txt'), 'utf8');
} catch {
  check('#38', false, 'dist/llms.txt missing — run node scripts/generate/agent-mirrors.mjs');
}
if (llms) {
  for (const name of ['request_sample_hero', 'request_sample_final']) {
    check('#38', llms.includes(name), `llms.txt does not list the ${name} WebMCP tool`);
  }
}

console.log(failures ? `\n${failures}/${checks} form-surface check(s) FAILED` : `\nAll ${checks} form-surface checks passed`);
process.exit(failures ? 1 : 0);
