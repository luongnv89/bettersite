# Source URL policy — before Phase 1 and every external action

Bind the invocation URL as `SOURCE_URL` and `SKILL_DIR` to this skill's directory. Run:

```bash
python3 -B "$SKILL_DIR/scripts/classify_url.py" --url "$SOURCE_URL"
```

Exit 0 and JSON `classification: public` are both required for a public source. Exit 1 means
non-public; any other exit or unavailable helper also forbids external actions. Save the JSON
as `source_policy` in `run-state.json` after Setup creates `PROJECT_DIR` (retain it in memory
until then). This gate runs even with `--no-optimize`.

The helper parses HTTP(S) URLs, classifies literal IPv4/IPv6 addresses and resolves domain names
with the local system's DNS resolver. **Every** returned address must be global unicast. Local
names, loopback, private/LAN, IPv4/IPv6 link-local, IPv6 ULA, shared/reserved/multicast addresses,
mixed public/private DNS results and unresolved/unknown hosts are non-public. Credentialed or
malformed URLs are also non-public. No page or third-party scanner is contacted by this helper.

## Fetching and redirects

For non-public sources, use only local fetch/browser tools and locally captured evidence.
Never hand their URL/content to a remote page-fetcher or scanner. Tell both Phase 2
orchestrators to use that local evidence; skip any member that cannot honor the restriction
and record its coverage gap as `PARTIAL`.

Disable automatic redirect following. With a local tool, inspect one response at a time;
resolve each `Location` against the current URL, then classify the absolute next URL **before**
following it. Re-run the helper with `--redirect <absolute URL>` for every observed hop in
order (pass values as arguments, never paste them into shell code). A non-public hop keeps the
whole source chain non-public, even if a later hop is public. Save all hops in `source_policy`;
never reset that verdict by classifying only the final URL.

Remote page-fetching is allowed only when the tool can avoid unvalidated redirects and use the
validated public destinations. A tool that hides redirects or cannot enforce that restriction
is unsuitable; use a local tool instead. Apply the same rule to robots, sitemaps, assets and
other fetched URLs. Reclassify immediately before each external fetch/send, on resume, and
before publication: DNS results are a snapshot, not permanent authorization. Third-party
scanners resolve/fetch independently, so locally validated addresses and redirect evidence do
not prove their network path; record that limitation. If the public chain cannot be established,
decline G1 and stay local.

## Publication

Publication requires the original URL and **every** observed redirect to remain public, plus
no earlier non-public source verdict in this run. Any non-public, unresolved or unverified
source keeps all source-derived content in the local preview; never publish it to Pages.
Record `deployment_status: unavailable` and the reason. This rule is independent of Phase 2
and cannot be bypassed by `--no-optimize` or `--agent-scan`.
