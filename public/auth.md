# auth.md

Agent authentication for **BetterSite** (`https://bettersite.luongnv.com/`) — a
static marketing/lead-gen site served from GitHub Pages on its own `luongnv.com`
subdomain. This document is the BetterSite-scoped `auth.md`; the origin-wide file
is `https://luongnv.com/auth.md`.

## Audience

Agents reading this site's public content — the EN/FR landing pages, the
privacy pages, the markdown mirrors (`/index.md`,
`/fr/index.md`), and `llms.txt` — need **no credentials**. Fetch
them directly; everything on `bettersite.luongnv.com` is world-readable static HTML
and markdown.

## Registration

No registration or provisioning endpoint exists on `bettersite.luongnv.com`. Nothing
on this site is an OAuth-protected resource and no agent accounts or API keys
are issued here.

Origin-level agent registration for `luongnv.com` is documented in
`https://luongnv.com/auth.md`; its OAuth metadata:

- Authorization Server metadata:
  `https://luongnv.com/.well-known/oauth-authorization-server`
  (canonical issuer `https://auth.luongnv.com` — see `docs/origin/README.md`
  for a DNS note on that host)
- Registration endpoint: `https://auth.luongnv.com/register`
  (as advertised by the authorization-server metadata)
- Protected Resource Metadata (RFC 9728):
  `https://luongnv.com/.well-known/oauth-protected-resource`
  — a BetterSite-scoped copy is served at
  `https://bettersite.luongnv.com/.well-known/oauth-protected-resource`

## Supported methods

- `none` — the method of choice for everything this site serves. All BetterSite
  content is public; do not send credentials.
- The "Request a free sample" form POSTs to `https://api.web3forms.com/submit`,
  a third-party endpoint authorized by its own embedded access key — not an
  OAuth resource of this site. Agents may submit it the same way a browser
  does, without tokens.
- For origin-level resources on `luongnv.com` that do require authorization,
  use `authorization_code` + PKCE (browser agents), `client_credentials`
  (service agents, if provisioned), or the device flow — see
  `https://luongnv.com/auth.md` and the authorization-server metadata above.

## Credential use

This site accepts no credentials: never send `Authorization` headers, cookies,
or API keys to `https://bettersite.luongnv.com/` — they are ignored and only
leak into logs. Any `WWW-Authenticate` challenge an agent receives on this
host is an anomaly, not a contract.

Contact: `bettersite@luongnv.com`.
