---
name: website-clone-final-report
description: "Generate a website-clone closure report comparing baseline analysis, builder metadata, planned tasks, and implemented results. Use after a completed rebuild. Don't use for live audits, ongoing monitoring, or implementation."
license: MIT
effort: high
metadata:
  version: 1.7.0
  author: "Luong NGUYEN <luongnv89@gmail.com>"
---

# Website Clone Final Report

Produces a before/after comparison report closing the loop on a website clone project. Uses Phase 1 analysis as the baseline and the builder's post-deployment re-audit as the comparable "after" snapshot.

Accept the umbrella's `--auto` or `--no-auto` flag. This phase has no approval gate in either mode; save the report and return to website-cloner for website delivery. Its summary is supporting evidence, not the umbrella's primary deliverable.

## When to Use

Trigger when the user asks to:
- Generate a final report for a website clone project
- Compare before/after metrics of a site rebuild
- Produce a project closure summary for a website improvement

Do **not** use for ongoing monitoring or live site audits — those are separate activities.

## Repository Handling

Work only in the resolved project directory. When called by website-cloner, inherit its new-project boundary and repository handling; never sync or publish a containing repository. A new project or a local repository without a remote needs no fetch/pull.

For a standalone invocation targeting an existing dedicated repository with `origin`, sync the current branch once before edits when the worktree is clean. Preserve dirty user changes; do not automatically stash unrelated files or reset/rebase over them. Resolve recoverable issues locally and ask only if a conflict or ambiguous target prevents safe progress. Do not repeat repository sync for every phase artifact.

## Workflow

```
1. Read Phase 1 analysis (baseline) and validate builder metadata's post-deployment after snapshot
2. Read tasks.md for planned tasks; use builder metadata and verification evidence for actual delivery
3. Read prd.md for what was planned
4. Compute before/after deltas per dimension
5. List deviations from the plan
6. Write final report
7. Present to user
```

## Output: final-report.md Structure

Use `references/final-report-template.md` as the only output template. It fixes the section order — What Was Implemented, Before/After Comparison (Performance, SEO, Security, UI/UX, Style), Deviations from Plan, Summary — with example table shapes. Read only the source sections needed for each comparison to preserve the context budget.

## Step 1: Read Inputs

Read the analysis baseline and builder metadata:

```
Read file <path-to-analysis.json>
Read file <path-to-builder-metadata.json>
```

Also read `tasks.md` for planned tasks and `prd.md` for intended improvements. Establish what was implemented from builder metadata, deviations, verification results, and source artifacts where necessary; a planned task is not evidence of completion:

```
Read file <path-to-tasks.md>
Read file <path-to-prd.md>
```

Validate `builder-metadata.json` has `after_snapshot_source`, `after_snapshot_status`, and the
embedded `performance`, `seo`, and `security` objects copied from the post-deployment analyzer run.
If any input is missing, note it and proceed only to produce a clearly `PARTIAL` report.

## Step 2: Compute Deltas

Extract matching baseline and after-snapshot fields:

| Metric | Baseline source | After source |
|--------|-----------------|--------------|
| LCP estimate (seconds) | `analysis.performance.lcp_estimate_seconds` | `builder.performance.lcp_estimate_seconds` |
| CLS estimate (unitless) | `analysis.performance.cls_estimate` | `builder.performance.cls_estimate` |
| TTFB estimate (seconds) | `analysis.performance.ttfb_estimate_seconds` | `builder.performance.ttfb_estimate_seconds` |
| Page weight (KB), requests (count) | `analysis.performance.*` | `builder.performance.*` |
| SEO score and five dimension scores | `analysis.seo.*` | `builder.seo.*` |
| HTTPS, mixed content, header list, exposed metadata | `analysis.security.*` | `builder.security.*` |

Build one comparison record per field — `{"kind": "numeric|boolean|array", "before": <value>,
"after": <value>}`, plus `before_unit`/`after_unit` on numeric records when the snapshots state
units — keyed by the canonical dotted field names, and pass `{"comparisons": {...}}` to the local
pure-stdlib [`scripts/compute_deltas.py`](scripts/compute_deltas.py). It validates kinds and units,
computes `absolute_change` and `percent_change` (Decimal `ROUND_HALF_UP`, nearest whole percent),
compares booleans directly, and counts array elements. Read
[references/delta-computation.md](references/delta-computation.md) for the exact contract and CLI.
Do not calculate, round, or count deltas in prose.

Render the helper's results directly. When a numeric result carries `reason: "zero_baseline"`,
show the absolute `after - before` change and label the percentage `N/A (zero baseline)`; when a
value was missing or null, mark the cell unavailable rather than inventing it — every such field
keeps the report `PARTIAL`. Render security arrays by the helper's `before_count`/`after_count`
and never invent qualitative ratings. For UI/UX, describe changes based on tasks.md versus the
Phase 1 analysis — that remains model judgment.

## Step 3: Identify Deviations

Compare tasks.md (what was planned) against what the builder actually delivered:

- Tasks that weren't completed
- Features implemented differently than specified
- Assets that weren't collected or created as planned
- Any scope changes

## Step 4: Write Draft Report

Assemble the report using the structure above.

## Step 5: Present to User

"Here is the final comparison report. Review it for completeness and accuracy."

No approval gate is required for this phase — it's the last step and informational only.

## Step 6: Save Report

Persist the assembled Markdown as literal content using an available file-writing tool such as `Write` or `apply_patch`. If no safe file-writing capability is available, stop with a descriptive error. Verify the saved content at the resolved path.

Resolve the output path in this order:

1. If `$ARGUMENTS` includes `--output <path>`, use that path verbatim.
2. Otherwise, if `$PROJECT_DIR` is set, use `$PROJECT_DIR/final-report.md`.
3. Otherwise, use `~/workspace/clones/YYYY_MM_DD_<slug>/final-report.md`.

End the run with this summary (the **output contract**). The result comes first:

```text
Result:       PASS | PARTIAL | FAIL — final-report.md saved to <absolute-path> | not saved
Evidence:     <inputs present or missing; compute_deltas.py exit status; Pages URL check>
Uncertainty:  static-analysis estimates; <unavailable comparisons, missing inputs — or "none">
Decision:     No approval needed
GitHub Pages URL: <url | unavailable>
```

## Acceptance Criteria and Expected Output

Verify the report before saving:

- Every source file is named as present or missing; no absent input is silently treated as evidence.
- Required comparison data comprises all five performance fields, SEO overall score plus all five dimension scores, and the four security fields (`https`, `mixed_content`, `security_headers`, `exposed_metadata`) in both snapshots.
- For each numeric metric, show the deterministic unit and the helper-computed delta — the signed whole percent, or the absolute change labeled `N/A (zero baseline)`; label estimates and never invent unavailable values.
- Each qualitative claim cites an implemented task, builder deviation, or baseline observation.
- `final-report.md` contains implementation summary, performance, SEO, security, UI/UX, deviations, caveats, and Pages URL sections.
- `PASS` requires valid baseline, builder metadata, tasks, and PRD inputs; a responsive Pages URL; `after_snapshot_status: complete`; every required comparison supported; and a non-empty saved report.
- `PARTIAL` is mandatory when the report is saved but any required input, URL, snapshot, metric, or comparison is missing, null, invalid, or unavailable. A report write failure or inability to produce a valid report is `FAIL`.
- The final summary follows the output contract in Step 6.
- Reviewer understanding (evaluation guidance, not a runtime gate): the opening line states the result and status; estimates and assumptions are labeled; each claim traces to a snapshot field, task, or deviation; the next decision is named. Without reviewer feedback, human understanding stays unconfirmed.

## Step Completion Report

```text
◆ Final Comparison Report
··································································
  Inputs accounted for: √ pass | × partial ([missing])
  Deltas verified:      √ pass | × partial ([unavailable/helper diagnostic])
  Deviations compared:  √ pass
  Report saved:         √ pass ([absolute path])
  Pages URL:            √ pass | × unavailable
  Result:               PASS | PARTIAL | FAIL
```

Use `PASS` only when every required comparison above is supported. Any unavailable required before/after value forces `PARTIAL`, even when the report can explain the gap; never promote unavailable comparisons to `PASS`. Print this block before the Step 6 output contract, which ends the run.

## Edge Cases and Error Handling

| Failure | Behavior |
|---|---|
| No analysis input | Produce a qualitative report only if useful; result is `PARTIAL` |
| No builder metadata | Request builder metadata from the orchestrator; any saved report is `PARTIAL` |
| Missing/incomplete after snapshot | Preserve unavailable values and analyzer errors; result is `PARTIAL` |
| Invalid delta input | Stop before writing the report; surface the helper's `error[delta-input]` diagnostic and correct the comparison records |
| No tasks.md or prd.md | Describe only supported implementation/deviation facts; result is `PARTIAL` |
