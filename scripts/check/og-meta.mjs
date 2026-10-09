#!/usr/bin/env node
// Acceptance check for issue #13: every locale page must declare a 1200x630
// og:image and twitter:image, with width, height and alt. Run after `npm run
// build` — reads the emitted HTML from dist/ and the PNG headers in public/.
//
// Usage:
//   PUBLIC_WEB3FORMS_KEY=dev npm run build
//   node scripts/check/og-meta.mjs [dist-dir]     # default: <repo>/dist
//
// Exit 0 = all checks pass; 1 = at least one failed (each failure printed).

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// Expected path prefix mirrors astro.config.mjs `base: '/bettersite'`.
const DIST = resolve(ROOT, process.argv[2] ?? 'dist');
const PUBLIC = join(ROOT, 'public');
const LOCALES = { en: join(DIST, 'index.html'), fr: join(DIST, 'fr', 'index.html') };
const EXPECTED = { width: '1200', height: '630' };

let failures = 0;
const fail = (locale, msg) => {
  failures++;
  console.log(`  FAIL ${locale}: ${msg}`);
};

function metaContent(html, key, attr) {
  // Match <meta property="key"|name="key" content="..."> in either attribute order.
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']` +
      `|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
    'i',
  );
  const m = re.exec(html);
  return m ? (m[1] ?? m[2]) : null;
}

for (const [locale, file] of Object.entries(LOCALES)) {
  let html;
  try {
    html = await readFile(file, 'utf8');
  } catch {
    fail(locale, `${file} not found — run \`npm run build\` first`);
    continue;
  }

  const ogImage = metaContent(html, 'og:image');
  const twImage = metaContent(html, 'twitter:image');
  const expectedPath = `/bettersite/og-${locale}.png`;

  if (!ogImage) fail(locale, 'missing og:image');
  else if (!ogImage.endsWith(expectedPath)) fail(locale, `og:image ${ogImage} does not end with ${expectedPath}`);
  else if (!/^https?:\/\//.test(ogImage)) fail(locale, `og:image ${ogImage} is not absolute`);

  if (!twImage) fail(locale, 'missing twitter:image');
  else if (twImage !== ogImage) fail(locale, `twitter:image ${twImage} != og:image ${ogImage}`);

  for (const [key, want] of [['og:image:width', EXPECTED.width], ['og:image:height', EXPECTED.height]]) {
    const got = metaContent(html, key);
    if (got !== want) fail(locale, `${key} is ${got}, expected ${want}`);
  }
  if (!metaContent(html, 'og:image:alt')) fail(locale, 'missing og:image:alt');
  if (!metaContent(html, 'twitter:image:alt')) fail(locale, 'missing twitter:image:alt');
  if (metaContent(html, 'twitter:card') !== 'summary_large_image') {
    fail(locale, 'twitter:card is not summary_large_image');
  }

  // The referenced PNG must exist and really be 1200x630 (PNG IHDR bytes 16-24).
  try {
    const png = await readFile(join(PUBLIC, `og-${locale}.png`));
    const isPng = png.length > 24 && png.readUInt32BE(0) === 0x89504e47;
    const w = isPng ? png.readUInt32BE(16) : 0;
    const h = isPng ? png.readUInt32BE(20) : 0;
    if (!isPng || w !== 1200 || h !== 630) {
      fail(locale, `public/og-${locale}.png is ${isPng ? `${w}x${h}` : 'not a PNG'}, expected 1200x630`);
    }
  } catch {
    fail(locale, `public/og-${locale}.png missing — run node scripts/generate/og-images.mjs`);
  }

  if (failures === 0) console.log(`  ok ${locale}: og:image + twitter:image 1200x630 with alt`);
}

console.log(failures ? `\n${failures} og-meta check(s) FAILED` : '\nAll og-meta checks passed');
process.exit(failures ? 1 : 0);
