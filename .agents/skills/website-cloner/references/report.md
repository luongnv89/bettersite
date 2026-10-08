# Phase 3 — Plain-language report

Read this at Phase 3. Inputs: `analysis.json`, `optimization/findings.md` (absent with
`--no-optimize`). Output: `$PROJECT_DIR/report.md`, written with
`references/report-template.md` as the only template. Field-by-field translation rules:
`references/analysis-fields.md` (read only the rows you need).

## Steps

1. Read `analysis.json`. An `error` variant stops the run before a report is drafted; surface
   its `error` and `detail`.
2. Translate each dimension for a non-technical reader:
   - UI/UX: "what catches the eye first", not "visual hierarchy"; friction points as concrete
     observations.
   - Performance: `lcp_estimate_seconds` → how fast the main content appears;
     `cls_estimate` → how stable the page feels; `ttfb_estimate_seconds` → how quickly the
     server responds; page weight and request count in everyday terms. Label all as estimates.
   - Security: surface-level only, no header names, keep the "not a full security audit" caveat.
   - SEO: in terms of helping people find the site.
3. Summarize the top P0/P1 rows of `findings.md` in the "Design and Search Audit Highlights"
   section, in plain words, citing the finding IDs.
4. Fill the template. Omit a line whose field is `null` and note the gap in Next Steps.
5. Accept: auto mode validates against the checks below and saves; review mode presents the
   draft with **Approve / Edit / Regenerate** and saves only after approval, looping on edits.
6. Write `report.md` with a file-writing tool, then re-read it.

## Phase checks

- Covers UI/UX, category, style, performance, security, SEO, audit highlights, next steps, or
  names each unavailable dimension.
- Every metric and observation traces to `analysis.json` or `findings.md`; nothing invented.
- Each technical term (LCP, CLS, TTFB, HSTS, CSP, canonical, JSON-LD, llms.txt) is replaced or
  explained where it first appears.
- The file records `Acceptance: auto | user`.

```text
◆ Phase 3 — Report (3 of 7)
  Inputs:          √ | × (reason)
  Dimensions:      √ translated | × partial (missing)
  Audit highlights: √ (N findings) | — skipped (no findings.md)
  Acceptance:      √ auto | √ user | × pending
  report.md:       √ (path) | — not approved
  Result:          PASS | BLOCKED | FAIL
```
