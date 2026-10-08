# Phase 7 — Before/after comparison (final-report.md)

Read this at Phase 7. Inputs: `analysis.json` (baseline), `builder-metadata.json` (after
snapshot and verification), `tasks.md`, `prd.md`, `optimization/findings.md`. Output:
`$PROJECT_DIR/final-report.md`, written with `references/final-report-template.md` as the only
template. No approval gate in either mode.

## Steps

1. Read the inputs and name each one present or missing. A planned task is not evidence of
   completion; use builder metadata, deviations and verification results.
2. Check `builder-metadata.json` has `after_snapshot_source`, `after_snapshot_status`, and the
   `performance`, `seo`, `security` objects.
3. Build one comparison record per field and run `scripts/compute_deltas.py`
   (contract and CLI: `references/delta-computation.md`). Never compute, round or count deltas in
   prose.

   | Metric | Baseline | After |
   |---|---|---|
   | LCP / CLS / TTFB estimates, page weight, requests | `analysis.performance.*` | `builder.performance.*` |
   | SEO score and five dimension scores | `analysis.seo.*` | `builder.seo.*` |
   | HTTPS, mixed content, header list, exposed metadata | `analysis.security.*` | `builder.security.*` |

4. Render the helper output directly: `zero_baseline` shows the absolute change and
   `N/A (zero baseline)`; a missing or null value is an unavailable cell. Security arrays render
   by `before_count` / `after_count`.
5. Write the Optimization Findings section from `builder-metadata.json` → `optimization`: each
   finding ID with its status (`verified`, `unverified`, `failed`, `out of scope`).
6. List deviations: tasks not completed, features built differently, assets not collected or
   created, scope changes. UI/UX and style changes are described from tasks.md versus the
   baseline and must cite a task, deviation or observation.
7. Write the file and re-read it.

An `error[delta-input]` diagnostic stops the phase until the records are corrected.

## Phase checks

`PASS` needs all five inputs (`findings.md` only when Phase 2 ran), a responsive Pages URL, `after_snapshot_status: complete`, every
required comparison computed, and every `build` finding `verified`. Any missing input, URL,
snapshot value, comparison, or unverified/failed finding makes it `PARTIAL`. A write failure is
`FAIL`.

```text
◆ Phase 7 — Final comparison (7 of 7)
  Inputs:          √ | × partial (missing)
  Deltas:          √ helper | × partial (unavailable fields)
  Findings:        √ N verified | × N/M (unverified, failed)
  Deviations:      √ compared
  final-report.md: √ (path)
  Result:          PASS | PARTIAL | FAIL
```
