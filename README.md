# BetterSite

Landing page for **BetterSite** — a service that rebuilds your existing website with modern UI/UX, top-tier performance, SEO, and security, at a fraction of typical agency cost. Free homepage sample within 48h, no card required.

Live: https://luongnv89.github.io/bettersite

## Stack

- [Astro](https://astro.build) — static-first, zero JS by default
- Tailwind CSS v4
- Hosted on GitHub Pages, deployed via GitHub Actions
- [Web3Forms](https://web3forms.com) for the "Request a free sample" form (no backend)

## Local development

```sh
npm install
cp .env.example .env  # add your Web3Forms key
npm run dev           # http://localhost:4321
npm run build         # outputs to ./dist — fails without PUBLIC_WEB3FORMS_KEY
npm run preview
npm run measure       # viewport + WCAG contrast audit; needs `npm i`, a built
                      # dist/ served under /bettersite/, and playwright-core.
                      # See docs/audits/2026-10-09/report.md for full recipe.
npm run generate:og   # regenerate public/og-{en,fr}.png social cards (1200x630;
                      # needs playwright-core and installed Google Chrome)
npm run generate:demo # regenerate public/demo/{before,after}.png from the
                      # assets/demo/ fixtures + refresh assets/demo/stats.json
npm run generate:mirrors # regenerate public/{,fr/}index.md + llms.txt — the
                      # agent-facing markdown mirrors rendered from the i18n
                      # dictionaries — plus docs/origin/llms-txt-entry.md,
                      # the BetterSite block for the origin llms.txt (#33)
                      # (run after editing src/i18n/*.json)
npm run check:og      # verify built pages declare og:image/twitter:image
                      # 1200x630 with alt — run after `npm run build`
npm run check:landing # verify landing acceptance checks (#10/#11/#12/#16):
                      # truthful form copy, sourced metrics, compare table,
                      # hero before/after + gallery — run after `npm run build`
npm run check:locale  # verify locale redirect rules (#18): /fr/ never
                      # auto-redirects away; root keeps FR-ward detection and
                      # the bs_lang language switch — run after `npm run build`
npm run check:nojs    # verify the no-JS form fallback (#19): native POST to
                      # Web3Forms + redirect back to the confirmation block —
                      # run after `npm run build`
npm run check:nav     # verify the below-768px section nav (#23): a `md:hidden`
                      # anchor strip in the sticky header reaches #how/#proof/
                      # #samples/#faq and targets carry scroll-margin —
                      # run after `npm run build`
npm run check:mirrors # verify agent discovery (#25/#26/#32/#33/#36/#37):
                      # built pages link the markdown mirrors + llms.txt +
                      # auth.md + OAuth PRM, mirrors exist in dist and match a
                      # fresh i18n render, every contact email sits inside
                      # Cloudflare email_off markers, and the docs/origin/
                      # artifacts exist — run after `npm run build`
npm run check:trust   # verify the P2 trust batch (#17/#20/#21/#22/#24):
                      # deduped hero promise, enriched localized JSON-LD,
                      # published price + Pricing nav link, founder block,
                      # privacy links + pages — run after `npm run build`
npm run check:copy    # verify the P3 copy polish batch (#27/#29/#34):
                      # problem outro trimmed, one-sentence solution lead, nav
                      # label matches the #proof heading, no hedge words —
                      # run after `npm run build`
npm run check:tap-targets # verify the EN/FR switch tap targets (#28): each
                      # language link measures ≥44px tall / ≥24px wide in the
                      # built pages — run after `npm run build`
```

### Agent endpoints

Every page's `<head>` carries RFC 8288 web links to per-locale markdown
mirrors (`rel="alternate" type="text/markdown"` → `/bettersite/index.md`,
`/bettersite/fr/index.md`), to an `llms.txt` service index
(`rel="service-doc"` / `rel="describedby"`), to a BetterSite-scoped
`auth.md` (`rel="help"`), and to OAuth Protected Resource metadata
(`rel="describedby"` → `/bettersite/.well-known/oauth-protected-resource`).
The contact email is wrapped in `<!--email_off-->` markers so Cloudflare's
Scrape Shield leaves it readable for agents and no-JS readers.

True `Accept: text/markdown` content negotiation, HTTP `Link:` response
headers, the **origin** `luongnv.com/llms.txt` entry, DNS-AID `_agents`
records, and the origin `auth.md` are **not** expressible from a static site —
they need origin/CDN/DNS configuration on `luongnv.com`. The in-repo files
above are the deployable floor; `docs/origin/README.md` records the decisions
and carries the ready-to-apply artifacts (owner actions tracked there).

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes to GitHub Pages.

### One-time setup

1. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Get a free access key from [web3forms.com](https://web3forms.com) (used to receive sample requests by email).
3. Add it as a repo secret: **Settings → Secrets and variables → Actions → New repository secret**, name `PUBLIC_WEB3FORMS_KEY`.
4. Push to `main` — first deploy takes ~1–2 minutes.

## Roadmap

- [x] French translation (`/fr`)
- [x] Before/after rebuild pair in the hero + `#samples` gallery (one measured demo rebuild — `npm run generate:demo`)
- [ ] Interactive before/after slider
- [ ] More samples in the gallery (3–5 anonymised past rebuilds)
- [ ] Custom domain (bettersite.dev)

## Workflow

1. Visitor submits website URL + email
2. Web3Forms posts the request to our inbox — no confirmation email is sent to the visitor
3. We rebuild their homepage and email them a private preview link within 48h
4. If they continue, they sign the published offer — €490 fixed rebuild, optional €29/month maintenance
5. We deliver. Done.
