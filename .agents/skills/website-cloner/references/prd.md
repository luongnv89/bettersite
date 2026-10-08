# Phase 4 — Improvement proposal (prd.md)

Read this at Phase 4. Inputs: `report.md`, `analysis.json`, `optimization/findings.md` (absent
with `--no-optimize`), the user's instructions. Output: `$PROJECT_DIR/prd.md`.

## Rules

- Every change has a specific **What**, an evidence-backed **Why** (cite the analysis field or
  finding ID), and a measurable **Expected Value**.
- Every `build` row of `findings.md` maps to a change. A row may be excluded only with a written
  reason in the coverage table; `out of scope` rows are carried over with their reason.
- Keep the source's brand, purpose, essential content, and core journeys. Do not invent product
  claims, testimonials, prices, or backend functionality.
- Targets need units, the current value, and a realistic target; label estimates. A missing
  baseline gets a qualitative change or `target unavailable`, never an invented number.
- If `report.md` and `analysis.json` disagree, auto mode uses `analysis.json` for measurements
  and the user's latest instructions for intent, citing the discrepancy; review mode asks.

Target logic: LCP > 3 s → ≤ 2.0 s; CLS > 0.1 → ≤ 0.05; SEO < 80 → ≥ 90; page weight > 1 MB →
≤ 800 KB.

## Structure

```markdown
# Improvement Proposal: <site name>
**Source URL:** <url> · **Date:** <date> · **Acceptance:** auto | user

## Executive Summary
2–3 sentences on the main improvement themes and expected impact.

## Current State
Category and audience; performance, SEO and security highlights; top audit findings.

## Proposed Improvements
### UI/UX Improvements
#### Change 1: <title>
**What:** Replace the hero with a centered headline, subtext and one primary CTA above the fold.
**Why:** The sign-up CTA sits below two sections (analysis `ui_ux.friction_points`; F-01).
**Expected Value:** CTA visible without scrolling (measured scroll distance → 0 px). Conversion
impact is not measurable from a static crawl; measure it after launch.
**Findings:** F-01
### Performance Improvements
### SEO and AI-Search Improvements
### Accessibility Improvements
### Security Improvements
### Style Enhancements

## Optimization Findings Coverage
| Finding | Pri | Change | Status |
|---|---|---|---|
| F-01 | P0 | Change 1 | build |
| F-03 | P2 | — | out of scope — GitHub Pages cannot negotiate content types |

## Metrics Summary
| Metric | Current | Target | Delta |
|---|---|---|---|
| LCP (s, estimate) | 4.3 | ≤ 2.0 | −53% |
| SEO score | 62/100 | ≥ 90/100 | +45% |

## Next Steps
The accepted proposal feeds tasks.md.

*Based on a single crawl of the source site; results depend on implementation.*
```

Omit the coverage section when the audits were skipped, and say so in Current State.

## Acceptance

Auto mode validates against the checks below and saves. Review mode presents the draft with
**Approve / Edit / Regenerate** and saves only after approval. Write with a file-writing tool and
re-read the file.

## Phase checks

- Every change has What, Why, Expected Value; every finding ID in `findings.md` appears once in
  the coverage table.
- Every baseline issue from the report maps to a change or an out-of-scope reason.
- Deltas are computed correctly and labeled as estimates where they are.

```text
◆ Phase 4 — Proposal (4 of 7)
  Inputs:            √ | × (reason)
  Changes evidenced: √ (N changes)
  Findings mapped:   √ N/N | — skipped (no findings.md)
  Targets:           √ measurable
  Acceptance:        √ auto | √ user | × pending
  prd.md:            √ (path) | — not approved
  Result:            PASS | BLOCKED | FAIL
```
