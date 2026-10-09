# Changelog

## v0.2.0 — 2026-10-09

Rebrand and domain move: a new "Rebuilt B" logo, a warm light theme and a public brand page (EN/FR), with the site now served at https://bettersite.luongnv.com and a new contact address.

### Features
- Replace the logo with the "Rebuilt B" mark, a B of two website blocks (stone-grey outline over solid terracotta); all 7 SVGs regenerated (#53) @luongnv89
- Re-theme from dark slate/neon emerald to a flat, warm light palette (cream, navy, terracotta, sage) with WCAG AA text pairings; OG cards regenerated (#53) @luongnv89
- Add a localized brand page (`/brand/`, `/fr/brand/`) with the mark explained, logo downloads, palette, typography and usage rules, linked from the footer (#53) @luongnv89
- Serve the site at `https://bettersite.luongnv.com` (old `luongnv.com/bettersite/` URLs 301-redirect) and point every absolute URL at it (#54) @luongnv89

### Other Changes
- Change the contact email from `hello@bettersite.dev` to `bettersite@luongnv.com` across the EN/FR pages and agent files (#54) @luongnv89

**Full Changelog**: https://github.com/luongnv89/bettersite/compare/v0.1.0...v0.2.0

## v0.1.0 — 2026-10-09

First public release of BetterSite — an Astro landing site (EN/FR) that turns outdated websites into fast, modern ones, plus an agentic website-cloner skill and agent-discovery surface (llms.txt, markdown mirrors, RFC 8288 links, auth.md/PRM, WebMCP tools).

### Features
- Initial BetterSite landing page @luongnv89
- New BetterSite logo and brand identity @luongnv89
- Add French localization under `/fr/` @luongnv89
- Make the website-cloner skill autonomous by default (#3) @luongnv89
- Merge website-cloner into a single skill with design and search audits (#5) @luongnv89
- Add per-locale OG images and social meta tags (#42) @luongnv89
- Ship markdown mirrors with `Accept: text/markdown` negotiation and RFC 8288 `Link` headers (#46) @luongnv89
- Add section navigation below 768px (#47) @luongnv89
- Add pricing, founder section, privacy link, and enriched JSON-LD; dedupe hero claims (#48) @luongnv89
- Agent-discovery origin layer: `email_off` markers, scoped `auth.md` + OAuth Protected Resource Metadata, DNS-AID and llms.txt artifacts (#51) @luongnv89
- Add post-signup share link, expose the sample-request form as a WebMCP tool, and fix focus/reduced-motion/label a11y issues (#52) @luongnv89

### Bug Fixes
- Use the luongnv.com custom domain as the site URL @luongnv89
- Fail the build on an empty Web3Forms `access_key` (#39) @luongnv89
- Announce form success/error status to screen readers and accept bare domains in the website field (#41) @luongnv89
- Only auto-redirect by browser language from the root URL, so explicit locale links stick (#44) @luongnv89
- Post the contact form natively to Web3Forms so it works without JavaScript (#45) @luongnv89

### Other Changes
- Add the website-cloner skill suite retrofitted to the skill standard (#1) @luongnv89
- Add P0 performance/responsive/contrast measurements and fix AA placeholder and footer contrast (#40) @luongnv89
- Rewrite landing copy to be truthful with verified proof and a real before/after demo pair (#43) @luongnv89
- Trim problem/solution prose, unify the proof nav label, and drop hedge words (#49) @luongnv89
- Enlarge EN/FR language-switcher tap targets to 44px (#50) @luongnv89
- Move website-cloner to `pskills` @luongnv89

### New Contributors
- @luongnv89 made their first contribution in #1

**Full Changelog**: https://github.com/luongnv89/bettersite/commits/v0.1.0
