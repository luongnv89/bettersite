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
npm run check:og      # verify built pages declare og:image/twitter:image
                      # 1200x630 with alt — run after `npm run build`
npm run check:landing # verify landing acceptance checks (#10/#11/#12/#16):
                      # truthful form copy, sourced metrics, compare table,
                      # hero before/after + gallery — run after `npm run build`
```

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
4. If they continue, we send a detailed contract (rebuild + monthly maintenance)
5. We deliver. Done.
