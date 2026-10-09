# P0 measurements — performance, responsive layout, contrast

Issue [#9](https://github.com/luongnv89/bettersite/issues/9) · epic #7 · run 2026-10-09
Code under test: `ac20c9b` + this branch's contrast fix (`slate-500 → slate-400`).

## Methodology and recorded settings

| Tool | Setting | Value |
|------|---------|-------|
| Build | `npm run build` | `PUBLIC_WEB3FORMS_KEY=ci-placeholder` (any non-empty string; build refuses empty keys since #8) |
| Serve | `python3 -m http.server` | static `dist/` mounted under the `/bettersite/` path prefix, mirroring production paths |
| Lighthouse | 12.8.2 via `npx` | HeadlessChrome 154, axe-core 4.14.0 |
| — mobile preset | `formFactor: mobile` | emulated 412×823, DSF 1.75 (Moto G Power); simulated throttling RTT 150 ms / 1.6 Mbps / 4× CPU |
| — desktop preset | `formFactor: desktop` | emulated 1350×940 DSF 1; RTT 40 ms / 10 Mbps / no CPU slowdown |
| Viewport matrix | playwright-core 1.56.1 | installed Chrome, headless; full-page captures |
| 200 % zoom | `documentElement.style.zoom = 2` | verified equivalent to browser zoom (clientWidth 1440→720 CSS px) |
| Contrast | `getComputedStyle` + `::placeholder` | WCAG 2.2 SC 1.4.3 formula; alpha layers composited to an effective background; oklch→sRGB converted |
| CrUX field data | — | **not available**: CrUX API requires a key (HTTP 403), PSI quota exhausted (HTTP 429); origin is likely below the CrUX traffic threshold anyway |

Raw machine-readable results: [`measurements.json`](./measurements.json). Lighthouse LHRs: [`lighthouse/`](./lighthouse/). Captures: [`screenshots/`](./screenshots/).

## 1 · Lighthouse lab runs

Post-fix local build (`ac20c9b` + contrast fix), EN `/bettersite/` and FR `/bettersite/fr/`:

| Run | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
|-----|------------:|--------------:|---------------:|----:|----:|----:|----:|----:|------------:|
| EN mobile   | 100 | 100 | 100 | 100 | 0.9 s | 1.1 s | 0 ms | 0 | 2.5 s |
| FR mobile † | 100 | 100 | 100 | 100 | 0.9 s | 1.1 s | 0 ms | 0 | 0.9 s |
| EN desktop  | 100 | 100 | 100 | 100 | 0.2 s | 0.3 s | 0 ms | 0 | 0.2 s |
| FR desktop †| 100 | 100 | 100 | 100 | 0.2 s | 0.3 s | 0 ms | 0 | 0.2 s |

† FR runs executed against a byte-identical copy of `dist/` with the locale
auto-redirect pre-disabled (sessionStorage flag). Required because the redirect
makes `/fr/` unreachable to non-French browsers — see **F-3**. All other bytes,
assets and code are identical.

Non-scoring Lighthouse observations (mobile presets): `uses-long-cache-ttl` and
`uses-text-compression` fail **on localhost only** — both are served correctly
by GitHub Pages in production; `render-blocking-resources` flags the compiled
Tailwind stylesheet (~14 KB).

### Live-site comparison (`https://luongnv.com/bettersite/`, still pre-fix)

| Run | Perf | A11y | SEO | `color-contrast` audit |
|-----|-----:|-----:|----:|------------------------|
| live EN mobile  | 99 | 96 | 92 | **fail** (slate-500 palette) |
| live EN desktop | 100 | 96 | 92 | **fail** |
| live FR mobile  | —  | —  | —  | request to `/fr/` **redirected to `/`** — see F-3 |

## 2 · Responsive layout — viewport matrix

`scrollWidth ≤ clientWidth` on `documentElement`, both locales, full-page
captures committed under [`screenshots/`](./screenshots/).

| CSS px | EN 100 % | FR 100 % | EN 200 % zoom (eff. px) | FR 200 % zoom |
|-------:|:--------:|:--------:|:-----------------------:|:-------------:|
| 320  | ok | ok | **scroll (eff. 160)** | **scroll (eff. 160)** |
| 375  | ok | ok | **scroll (eff. 187)** | **scroll (eff. 187)** |
| 390  | ok | ok | **scroll (eff. 195)** | **scroll (eff. 195)** |
| 768  | ok | ok | **scroll (eff. 384)** | **scroll (eff. 384)** |
| 1440 | ok | ok | ok (eff. 720) | ok (eff. 720) |

- **All five device widths at 100 % pass both locales** — no unintended
  horizontal scroll at 320–1440 CSS px. (The 390 px clipping seen by the audit
  was a capture artifact: the real 390 px renders are complete and contained.)
- **200 % zoom passes at ≥ 720 effective CSS px** and fails at ≤ 384 effective —
  see **F-2** for the offending elements.

## 3 · Computed contrast — WCAG 2.2 SC 1.4.3

Effective background composited from `bg-slate-950/60` input over
`bg-slate-900/60` form over `bg-slate-950` body (measured, not assumed).

| Element (both locales) | Before | After (this PR) | Required | Verdict |
|------------------------|-------:|----------------:|---------:|:-------:|
| form `::placeholder` (hero + final, ×3 measured) | 4.23 : 1 | 7.66 : 1 | 4.5 : 1 | **was FAIL → pass** |
| footer text + `mailto` link | 4.23 : 1 | 7.66 : 1 | 4.5 : 1 | **was FAIL → pass** |
| form fineprint `text-xs` | 7.66 : 1 | 7.66 : 1 | 4.5 : 1 | pass |
| final-CTA fineprint `text-sm` | 7.66 : 1 | 7.66 : 1 | 4.5 : 1 | pass |
| nav links `text-slate-300` | 13.56 : 1 | 13.56 : 1 | 4.5 : 1 | pass |
| language switcher `text-slate-400` | 7.66 : 1 | 7.66 : 1 | 4.5 : 1 | pass |

Corroborated by Lighthouse's axe `color-contrast` audit: `0` (fail) on the
live pre-fix site, `1` (pass) on the post-fix build.

## Findings

- **F-1 — fixed in this PR.** `placeholder:text-slate-500` and footer
  `text-slate-500` measured 4.23 : 1 < 4.5 : 1 (WCAG 2.2 SC 1.4.3, normal
  text). Bumped to `slate-400` → 7.66 : 1. Files: `src/components/
  RequestSampleForm.astro`, `src/components/Landing.astro`.
- **F-2 — not fixed here (layout-design change, overlaps #23/#28).** At 200 %
  zoom below ~400 effective CSS px the page scrolls horizontally. Offenders:
  the header's right cluster (`LangSwitcher` + CTA, needs ≈ 480 CSS px) and the
  footer's link group; the decorative `w-[40rem]` blur blobs also extend past
  the edge but are clipped by `overflow-hidden` (not scroll-causing). The fix
  needs a wrapping/collapsing header — deliberately left to the nav/mobile
  issues rather than patched inside a measurement PR.
- **F-3 — not fixed here (behavioural, SEO-relevant).** The inline locale
  auto-redirect (`src/layouts/Layout.astro`) bounces every non-`fr` browser off
  `/fr/` onto absolute production EN URLs. An en-US browser — Lighthouse,
  crawlers, shared links — can never land on `/fr/` directly (live evidence:
  `live-fr-mobile.report.html`, requested `/fr/` → final `/`). It also fired
  during local testing and made early FR measurements silently measure the
  production EN page. Recommends its own fix issue (cookie/redirect review).
- **F-4 — note only.** LangSwitcher's `|` separator is `text-slate-600`
  (~3 : 1) but `aria-hidden` decorative — exempt from SC 1.4.3.

## Reproduce

```sh
npm install
PUBLIC_WEB3FORMS_KEY=ci-placeholder npm run build
mkdir -p /tmp/bs-serve && ln -sfn "$PWD/dist" /tmp/bs-serve/bettersite
(cd /tmp/bs-serve && python3 -m http.server 4899)
node scripts/measure/viewports-and-contrast.mjs \
  --base-url http://localhost:4899/bettersite/ --out /tmp/measure-out
npx -y lighthouse@12 http://localhost:4899/bettersite/ --output=html --quiet
```
