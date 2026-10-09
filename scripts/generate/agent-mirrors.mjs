#!/usr/bin/env node
// Generate the agent-facing artifacts for issues #25/#26/#33 — per-locale
// markdown mirrors of the landing page, an llms.txt service index, and the
// ready-to-paste origin llms.txt entry — rendered from the i18n dictionaries
// so the mirrors can never drift from the HTML copy.
//
// Why mirrors instead of real negotiation: this repo deploys to GitHub Pages,
// a static host that cannot vary responses on `Accept:` or emit RFC 8288
// `Link:` response headers. The true negotiation/header config lives on the
// luongnv.com origin/CDN layer. What this repo CAN ship is the markdown
// content itself, discoverable via <link rel="alternate" type="text/markdown">
// and the service-doc/describedby relations added in Layout.astro.
//
// Usage:
//   node scripts/generate/agent-mirrors.mjs           # writes public/index.md,
//                                                     #        public/fr/index.md,
//                                                     #        public/llms.txt,
//                                                     #        docs/origin/llms-txt-entry.md
//   node scripts/generate/agent-mirrors.mjs --check   # exit 1 if committed
//                                                     # mirrors drifted from
//                                                     # the i18n dictionaries
//
// Output is committed: Layout.astro links to /bettersite/{,fr/}index.md,
// /bettersite/llms.txt and /bettersite/auth.md as absolute URLs on every page.
// docs/origin/llms-txt-entry.md is the BetterSite block for the ORIGIN
// luongnv.com/llms.txt (issue #33) — the owner pastes it there; it lives in
// this repo so it is rendered from the same dictionaries.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'public');
const DOCS_DIR = join(ROOT, 'docs', 'origin');

// Mirror of astro.config.mjs — site + base. Kept as plain constants because
// this script runs outside Astro/Vite; update both places if they change.
const SITE = 'https://luongnv.com';
const BASE = '/bettersite';
const pageUrl = (path) => `${SITE}${BASE}/${path}`;

const dicts = {};
for (const locale of ['en', 'fr']) {
  dicts[locale] = JSON.parse(await readFile(join(ROOT, 'src', 'i18n', `${locale}.json`), 'utf8'));
}

// Escape the two characters that would break a markdown table cell.
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function mirrorMarkdown(t, locale) {
  const selfMd = pageUrl(locale === 'fr' ? 'fr/index.md' : 'index.md');
  const lines = [
    `# ${t.hero.title_1} ${t.hero.title_highlight} ${t.hero.title_2}`,
    '',
    `> ${t.meta.description}`,
    '',
    `_${t.hero.badge}_`,
    '',
    t.hero.subtitle,
    '',
    ...t.hero.bullets.map((b) => `- ${b}`),
    '',
    `## ${t.demo.title}`,
    '',
    t.demo.caption,
    '',
    `## ${t.problem.title}`,
    '',
    t.problem.lead,
    '',
    ...t.problem.items.map((item) => `- ${item}`),
    '',
    `**${t.problem.punchline}**`,
    '',
    `## ${t.solution.title}`,
    '',
    t.solution.lead,
    '',
    ...t.features.map((f) => `### ${f.title}\n\n${f.body}\n`),
    '',
    `## ${t.how.title}`,
    '',
    t.how.lead,
    '',
    ...t.steps.map((s) => `${s.n.replace(/^0/, '')}. **${s.title}** — ${s.body}`),
    '',
    `## ${t.proof.title}`,
    '',
    ...t.proof.metrics.map((m) => `- **${m.value}** — ${m.label} (${m.source})`),
    '',
    `### ${t.proof.compare.title}`,
    '',
    t.proof.compare.lead,
    '',
    `| | ${t.proof.compare.columns.map(cell).join(' | ')} |`,
    `|---|---|---|`,
    ...t.proof.compare.rows.map((r) => `| ${cell(r.label)} | ${r.cells.map(cell).join(' | ')} |`),
    '',
    `_${t.proof.audit_note}_`,
    '',
    `## ${t.samples.title}`,
    '',
    t.samples.lead,
    '',
    `### ${t.samples.item_title}`,
    '',
    t.samples.item_desc,
    '',
    `## ${t.faq.title}`,
    '',
    ...t.faq.items.map((item) => `### ${item.q}\n\n${item.a}\n`),
    '',
    `## ${t.pricing.title}`,
    '',
    t.pricing.lead,
    '',
    `- **${t.pricing.price_label}: ${t.pricing.price}** (${t.pricing.price_note})`,
    ...t.pricing.includes.map((item) => `- ${item}`),
    '',
    t.pricing.maintenance,
    '',
    `## ${t.final.title}`,
    '',
    t.final.lead,
    '',
    `_${t.final.fineprint}_`,
    '',
    `### ${t.founder.title}`,
    '',
    `**${t.founder.name}** — ${t.founder.role}`,
    '',
    t.founder.story,
    '',
    '---',
    '',
    `- ${t.footer.github}: https://github.com/luongnv89/bettersite`,
    '- Email: hello@bettersite.dev',
    `- ${t.footer.privacy}: ${pageUrl(locale === 'fr' ? 'fr/privacy/' : 'privacy/')}`,
    `- Canonical HTML: ${pageUrl(locale === 'fr' ? 'fr/' : '')}`,
    `- This file: ${selfMd}`,
    '',
  ];
  return lines.join('\n');
}

// llms.txt (https://llmstxt.org): a site-level index written for agents —
// what the service is, where the pages are, and which machine-readable
// formats exist. This is the target of the rel="service-doc"/"describedby"
// links in Layout.astro.
function llmsTxt() {
  const en = dicts.en;
  return [
    '# BetterSite',
    '',
    `> ${en.meta.description}`,
    '',
    en.hero.subtitle,
    '',
    '## Pages',
    '',
    `- [BetterSite (EN)](${pageUrl('')}) — ${en.meta.title}`,
    `- [BetterSite (FR)](${pageUrl('fr/')}) — ${dicts.fr.meta.title}`,
    `- [Privacy (EN)](${pageUrl('privacy/')}) — ${en.privacy.meta_title}`,
    `- [Confidentialité (FR)](${pageUrl('fr/privacy/')}) — ${dicts.fr.privacy.meta_title}`,
    '',
    '## Machine-readable',
    '',
    `- [Markdown mirror (EN)](${pageUrl('index.md')}) — text/markdown rendition of the EN landing page`,
    `- [Markdown mirror (FR)](${pageUrl('fr/index.md')}) — text/markdown rendition of the FR landing page`,
    `- [auth.md](${pageUrl('auth.md')}) — agent authentication doc: none required, all BetterSite content is public`,
    `- [OAuth Protected Resource metadata](${pageUrl('.well-known/oauth-protected-resource')}) — RFC 9728 JSON, delegates to the luongnv.com authorization server`,
    '',
    '## Contact',
    '',
    '- Email: hello@bettersite.dev',
    `- [GitHub repository](https://github.com/luongnv89/bettersite) — source of this site`,
    '',
  ].join('\n');
}

// Issue #33 — entry block for the ORIGIN https://luongnv.com/llms.txt (the
// file lives in the origin repo, outside this deploy scope). Rendered here so
// the BetterSite entry's description stays byte-identical to the page copy;
// the owner pastes it under `## Products` (see docs/origin/README.md).
function originLlmsEntry() {
  const en = dicts.en;
  return [
    '<!-- generated by scripts/generate/agent-mirrors.mjs — do not edit -->',
    '<!-- paste the block below into https://luongnv.com/llms.txt under "## Products" -->',
    '',
    `- [BetterSite](${pageUrl('')})`,
    `  ${en.meta.description} EN + FR: ${pageUrl('')} · ${pageUrl('fr/')}`,
    '',
  ].join('\n');
}

const outputs = [
  [OUT_DIR, 'index.md', mirrorMarkdown(dicts.en, 'en')],
  [OUT_DIR, 'fr/index.md', mirrorMarkdown(dicts.fr, 'fr')],
  [OUT_DIR, 'llms.txt', llmsTxt()],
  [DOCS_DIR, 'llms-txt-entry.md', originLlmsEntry()],
];

// --check: byte-compare the committed mirrors against a fresh render without
// writing — the drift guard scripts/check/agent-discovery.mjs invokes.
if (process.argv.includes('--check')) {
  let stale = 0;
  for (const [dir, rel, expected] of outputs) {
    let actual = null;
    try {
      actual = await readFile(join(dir, rel), 'utf8');
    } catch {
      // missing file counts as stale
    }
    if (actual !== expected) {
      stale++;
      console.log(`  stale ${join(dir.replace(`${ROOT}/`, ''), rel)} — run node scripts/generate/agent-mirrors.mjs`);
    }
  }
  console.log(stale ? `\n${stale} mirror(s) out of date` : 'Agent mirrors up to date');
  process.exit(stale ? 1 : 0);
}

for (const [dir, rel, content] of outputs) {
  const file = join(dir, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
  console.log(`  wrote ${join(dir.replace(`${ROOT}/`, ''), rel)} (${content.length} bytes)`);
}
console.log('\nAgent mirrors generated — commit public/index.md, public/fr/index.md, public/llms.txt, docs/origin/llms-txt-entry.md');
