#!/usr/bin/env node
// Viewport matrix + WCAG 2.2 SC 1.4.3 contrast measurement for the BetterSite
// landing page (issue #9). Drives the *installed* Google Chrome headless via
// playwright-core — no browser download required.
//
// Usage:
//   npm i -D playwright-core        # one-time, dev-only
//   npm run build                   # requires PUBLIC_WEB3FORMS_KEY (any value)
//   mkdir -p /tmp/bs-serve && ln -sfn "$PWD/dist" /tmp/bs-serve/bettersite
//   (cd /tmp/bs-serve && python3 -m http.server 4899)
//   node scripts/measure/viewports-and-contrast.mjs \
//     --base-url http://localhost:4899/bettersite/ \
//     --out docs/audits/2026-10-09
//
// Checks, per locale (en = "/", fr = "/fr/"):
//   - horizontal scroll at 320/375/390/768/1440 CSS px — scrollWidth must not
//     exceed clientWidth (offending elements are listed when it does)
//   - the same at 200 % browser zoom (emulated with documentElement zoom=2,
//     which halves the effective CSS viewport exactly like real zoom)
//   - computed contrast (getComputedStyle, ::placeholder included) of the
//     placeholder, fineprint and footer text against WCAG 2.2 SC 1.4.3,
//     with the effective background composited from ancestor alpha layers
//   - a full-page screenshot per viewport for the audit record
//
// Exit status: 0 when every check produced data (a WCAG *failure* is a
// finding in the JSON/report, not a harness failure); 1 on harness error.

import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]] : null)).filter(Boolean),
);
const BASE = (args['base-url'] ?? 'http://localhost:4899/bettersite/').replace(/\/?$/, '/');
const OUT = args.out ?? 'docs/audits/latest';
const WIDTHS = [320, 375, 390, 768, 1440];
const LOCALES = { en: BASE, fr: `${BASE}fr/` };

// ---- WCAG 2.2 helpers (evaluated in-node against serialized rgb()) ---------

function parseRgb(rgb) {
  if (!rgb) return null;
  const hex = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(rgb);
  if (hex) {
    const h = hex[1];
    return {
      r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\)/.exec(rgb);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  const oklch = /oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+%?))?\s*\)/i.exec(rgb);
  if (oklch) {
    const L = oklch[1].endsWith('%') ? parseFloat(oklch[1]) / 100 : parseFloat(oklch[1]);
    const C = oklch[2].endsWith('%') ? (parseFloat(oklch[2]) / 100) * 0.4 : parseFloat(oklch[2]);
    const H = (parseFloat(oklch[3]) * Math.PI) / 180;
    const a = oklch[4] === undefined ? 1 : oklch[4].endsWith('%') ? parseFloat(oklch[4]) / 100 : parseFloat(oklch[4]);
    // OKLCH -> OKLab -> linear sRGB (Ottosson matrices) -> sRGB
    const oa = C * Math.cos(H);
    const ob = C * Math.sin(H);
    const l_ = L + 0.3963377774 * oa + 0.2158037573 * ob;
    const m_ = L - 0.1055613458 * oa - 0.0638541729 * ob;
    const s_ = L - 0.0894841775 * oa - 1.291485548 * ob;
    const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
    const lin = (v) => {
      const c = Math.min(1, Math.max(0, v));
      return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
    };
    return {
      r: lin(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
      g: lin(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
      b: lin(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
      a,
    };
  }
  const srgb = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/i.exec(rgb);
  if (srgb) {
    const a = srgb[4] === undefined ? 1 : srgb[4].endsWith('%') ? parseFloat(srgb[4]) / 100 : parseFloat(srgb[4]);
    return { r: +srgb[1] * 255, g: +srgb[2] * 255, b: +srgb[3] * 255, a };
  }
  return null;
}
function composite(fg, bg) {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}
function luminance({ r, g, b }) {
  const f = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(l1, l2) {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// In-page probe: computed foreground + composited background for a target.
// Runs in the browser; returns plain data (computed in node afterwards).
// Chrome reports Tailwind v4 colors as oklch() — converted node-side below.
const PROBE = `(sel, pseudo) => {
  const el = document.querySelector(sel);
  if (!el) return { found: false, sel };
  const cs = getComputedStyle(el, pseudo || null);
  // Effective background: composite this element's and every ancestor's
  // backgroundColor over the body's opaque base.
  const layers = [];
  let node = el;
  while (node && node !== document.documentElement) {
    const bg = getComputedStyle(node).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') layers.push(bg);
    node = node.parentElement;
  }
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const fs = parseFloat(cs.fontSize);
  const fw = parseInt(cs.fontWeight, 10) || 400;
  return {
    found: true, sel, pseudo: pseudo || null,
    color: cs.color, fontSizePx: fs, fontWeight: fw,
    // WCAG "large text": >= 24px, or >= 18.66px and bold (>=700)
    largeText: fs >= 24 || (fs >= 18.66 && fw >= 700),
    layers: [...layers].reverse(), bodyBg,
    text: (el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 60),
  };
}`;

const CONTRAST_TARGETS = [
  { id: 'placeholder.website', sel: 'form[data-variant="hero"] input[name="website"]', pseudo: '::placeholder', need: 4.5 },
  { id: 'placeholder.email', sel: 'form[data-variant="hero"] input[name="email"]', pseudo: '::placeholder', need: 4.5 },
  { id: 'placeholder.final.website', sel: 'form[data-variant="final"] input[name="website"]', pseudo: '::placeholder', need: 4.5 },
  { id: 'fineprint.form', sel: 'form[data-variant="hero"] p.text-xs', pseudo: null, need: 4.5 },
  { id: 'fineprint.final', sel: 'section:last-of-type p.text-sm', pseudo: null, need: 4.5 },
  { id: 'footer', sel: 'footer .flex span', pseudo: null, need: 4.5 },
  { id: 'footer.email-link', sel: 'footer a[href^="mailto:"]', pseudo: null, need: 4.5 },
  { id: 'nav.links', sel: 'header nav a', pseudo: null, need: 4.5 },
  { id: 'langswitcher.label', sel: 'div[role="group"][aria-label="Language"]', pseudo: null, need: 4.5 },
];

const results = { base: BASE, generatedAt: new Date().toISOString(), viewports: [], contrast: [], errors: [] };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [locale, url] of Object.entries(LOCALES)) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      // The layout's inline script auto-redirects to the navigator-language
      // locale (via production absolute URLs). Pre-seed its sessionStorage
      // flag so the audit measures the locale it actually asked for.
      await ctx.addInitScript(() => sessionStorage.setItem('bs_lang_detected', '1'));
      const page = await ctx.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(250); // settle fonts/blur paint

        const measure = () => page.evaluate(() => {
          const cw = document.documentElement.clientWidth;
          const sw = document.documentElement.scrollWidth;
          const offenders = [];
          if (sw > cw + 1) {
            for (const el of document.querySelectorAll('body *')) {
              const r = el.getBoundingClientRect();
              if (r.right > cw + 1 && r.width > 1) {
                offenders.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} right=${Math.round(r.right)}`);
                if (offenders.length >= 8) break;
              }
            }
          }
          return { clientWidth: cw, scrollWidth: sw, hscroll: sw > cw + 1, offenders };
        });

        const normal = await measure();
        await page.screenshot({ path: join(OUT, 'screenshots', `${locale}-${width}w.png`), fullPage: true });

        await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
        await page.waitForTimeout(150);
        const zoomed = await measure();
        await page.screenshot({ path: join(OUT, 'screenshots', `${locale}-${width}w-zoom200.png`), fullPage: true });

        results.viewports.push({ locale, width, normal, zoom200: { ...zoomed, note: 'documentElement zoom=2 (effective ' + width / 2 + ' CSS px)' } });
        console.log(`${locale} ${width}px  hscroll:${normal.hscroll ? 'YES' : 'no'}  zoom200:${zoomed.hscroll ? 'YES' : 'no'}`);
        for (const [tag, m] of [['normal', normal], ['zoom200', zoomed]]) {
          for (const o of m.offenders) console.log(`    ${tag} offender: ${o}`);
        }
      } catch (e) {
        results.errors.push({ locale, width, error: String(e).slice(0, 200) });
        console.log(`${locale} ${width}px  ERROR ${e}`);
      }
      await ctx.close();
    }

    // Contrast — once per locale, desktop width
    const cctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await cctx.addInitScript(() => sessionStorage.setItem('bs_lang_detected', '1'));
    const page = await cctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(250);
    for (const t of CONTRAST_TARGETS) {
      const probe = await page.evaluate(`(${PROBE})(${JSON.stringify(t.sel)}, ${JSON.stringify(t.pseudo)})`);
      if (!probe.found) { results.contrast.push({ locale, id: t.id, error: 'selector not found' }); continue; }
      const fg = parseRgb(probe.color);
      let bg = parseRgb(probe.bodyBg) ?? { r: 255, g: 255, b: 255, a: 1 };
      for (const layer of probe.layers) {
        const c = parseRgb(layer);
        if (c) bg = composite(c, bg);
      }
      const effFg = fg.a < 1 ? composite(fg, bg) : fg;
      const r = ratio(luminance(effFg), luminance(bg));
      const need = probe.largeText ? 3.0 : t.need;
      results.contrast.push({
        locale, id: t.id, text: probe.text,
        foreground: probe.color, effectiveBackground: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
        fontSizePx: probe.fontSizePx, fontWeight: probe.fontWeight, largeText: probe.largeText,
        ratio: +r.toFixed(2), required: need,
        verdict: r >= need ? 'pass' : 'FAIL',
      });
      console.log(`${locale} contrast ${t.id}: ${r.toFixed(2)}:1 (needs ${need}:1) ${r >= need ? 'pass' : 'FAIL'}`);
    }
    await cctx.close();
  }
} finally {
  await browser.close();
}

await mkdir(join(OUT, 'screenshots'), { recursive: true });
await writeFile(join(OUT, 'measurements.json'), JSON.stringify(results, null, 2));

const hscrollFails = results.viewports.filter((v) => v.normal.hscroll || v.zoom200.hscroll);
const contrastFails = results.contrast.filter((c) => c.verdict === 'FAIL');
console.log(`\nSUMMARY viewports=${results.viewports.length} hscroll_failures=${hscrollFails.length} contrast_failures=${contrastFails.length} errors=${results.errors.length}`);
for (const c of contrastFails) console.log(`  FAIL ${c.locale} ${c.id} ${c.ratio}:1 < ${c.required}:1`);
process.exit(results.errors.length ? 1 : 0);
