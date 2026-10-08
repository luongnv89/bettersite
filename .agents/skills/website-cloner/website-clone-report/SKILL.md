---
name: website-clone-report
description: "Generate a plain-language report from website-analyzer JSON and save it only after explicit approval. Use for non-technical summaries. Don't use for developer audits, raw SEO analysis, or penetration testing."
license: MIT
effort: high
metadata:
  version: 1.4.0
  author: "Luong NGUYEN <luongnv89@gmail.com>"
---

# Website Clone Report

Converts structured website analysis into a comprehensive, plain-language report for non-technical readers. Approval gate: persists only after explicit user validation.

## When to Use

Trigger when the user asks to:
- Create a report from website analysis results
- Translate technical website metrics into plain language
- Produce an end-user summary of a site assessment

Do **not** use for technical audit reports targeting developers — those belong to the analyzer skill.

## Prerequisites

1. Require valid website-analyzer JSON. Resolve an optional `--output <path>` using the documented fallback below.
2. Read `references/api_reference.md` when validating fields or translating metrics; use only the needed reference mappings to protect the context budget.
3. Confirm the user can review the draft and explicitly approve persistence.
4. Stop with a descriptive error when the JSON is invalid or contains an analyzer `error` variant.

## Repo Sync Before Edits (mandatory)

The approved report is persisted with `Write`. When that output path lives inside a git worktree, sync before the write to avoid clobbering remote work:

```bash
branch="$(git rev-parse --abbrev-ref HEAD)"
git fetch origin
git pull --rebase origin "$branch"
```

If the working tree is dirty: stash → sync → pop. If `origin` is missing or a conflict occurs: **stop and ask the user.** Skip this section only when the output path is outside any git repository.

## Workflow

```
1. Read the analyzer output (JSON)
2. Translate each dimension into plain language
3. Draft the report for non-technical readers
4. Present to user for review
5. Incorporate edits (loop until approved)
6. Persist final report to file
```

## Report Structure

Use [references/report-template.md](references/report-template.md) as the only output template. It fixes the section order — At a Glance, How It Looks and Works, What Kind of Site This Is, Design and Style, Performance, Security Overview, Search Engine Visibility, Summary and Next Steps — with example plain-language phrasings. Read it at Step 3, when drafting.

## Step 1: Read Analyzer Output

Read the JSON analysis file (or content passed via stdin/argument):

```
Read file <path-to-analysis.json>
```

If no file is provided and `$ARGUMENTS` contains a URL, note that this skill requires pre-existing analysis output (produced by `website-analyzer`), not raw URLs. The orchestrator should have already run Phase 1.

## Step 2: Translate to Plain Language

For each dimension:
- **UI/UX**: Describe layout and friction in terms a non-technical person understands. Avoid jargon like "visual hierarchy" — say "what catches the eye first."
- **Category**: Explain what kind of site it is in plain terms.
- **Style**: Describe the feel and look without needing CSS knowledge.
- **Performance**: Translate numbers to relatable comparisons:
  - `lcp_estimate_seconds`: "how fast the main content appears" (estimated seconds)
  - `cls_estimate`: "how stable the page feels while loading" (unitless)
  - `ttfb_estimate_seconds`: "how quickly the server responds" (estimated seconds)
  - Page weight: "how much data the page uses"
  - Request count: "how many pieces the page needs to load"
- **Security**: Surface-level observations only, no technical headers jargon.
- **SEO**: Explain each finding in terms of "helping people find this site on Google."

## Step 3: Draft the Report

Read [references/report-template.md](references/report-template.md) and fill each section with the translated content from Step 2.

## Step 4: Present for Review

Present the draft report to the user. Ask:

"Here is the analysis report. Please review it and let me know:
1. **Approve** — it looks good, save it
2. **Edit** — I'd like to change something (specify what)
3. **Regenerate** — start over with different focus"

## Step 5: Incorporate Edits (loop)

If the user requests edits:
- Update the report accordingly
- Re-present for review
- Repeat until approved

Do **not** persist the file until explicit approval.

## Step 6: Persist Final Report

Once approved, persist the assembled content using the `Write` tool with literal content only. If the `Write` tool is unavailable, stop with a descriptive error and do not use shell persistence or another output path.

- **Path:** the value passed via `--output <path>`. If absent, fall back to `$PROJECT_DIR/report.md` when the orchestrator set `$PROJECT_DIR`, otherwise to `report.md` in the current working directory.
- **Content:** the approved markdown report assembled in Step 3, with any edits from Step 5 applied.

After the `Write` call returns, confirm to the user:

```
Report saved to: <absolute-path>
```

## Acceptance Criteria and Expected Output

Verify the approved report before saving:

- It covers UI/UX, category, style, performance, surface security, SEO, and next steps, or names each unavailable dimension.
- Every metric and observation traces to the analyzer JSON; assert that no unsupported benchmark or claim was invented.
- Each technical term (for example LCP, CLS, TTFB, HSTS, CSP, canonical, JSON-LD) is replaced or explained in plain words where it first appears; the security and single-page-crawl caveats remain explicit.
- The expected result is a non-empty approved markdown file at the resolved path, written only after explicit approval such as `Approve`.
- Re-read the saved file state or Write result and report its absolute path.
- The final summary follows the output contract below.
- Reviewer understanding (evaluation guidance, not a runtime gate): the opening line states the result and status; estimates and assumptions are labeled; each material claim traces to an analyzer field; the next decision is named. Without reviewer feedback, human understanding stays unconfirmed.

## Edge Cases and Error Handling

| Failure | Behavior |
|---|---|
| No analyzer input provided | Ask for the analysis JSON file path |
| Invalid JSON | Report error and ask for valid input |
| Analyzer error variant | Surface its `error` and `detail`; do not draft a health report |
| Missing or null dimension | Omit unsupported specifics and identify the gap in next steps |
| User never approves | Keep the loop going; do not auto-save |

## Step Completion Report

```text
◆ Website Clone Report
··································································
  Analyzer JSON:        √ pass | × fail ([reason])
  Six dimensions:      √ translated | × partial ([missing])
  Draft reviewed:      √ pass
  User approved:       √ pass | × pending
  Report saved:        √ pass ([absolute path]) | — not approved
  Result:              PASS | BLOCKED | FAIL
```

Never report `PASS` before both explicit approval and a successful Write result.

End every outcome with this summary (the **output contract**). The result comes first:

```text
Result:       PASS | BLOCKED | FAIL — <saved path, or "not saved: awaiting approval">
Evidence:     <analyzer JSON path; dimensions translated; Write result>
Uncertainty:  <static-analysis estimates, dimensions missing from the analysis, single-page crawl — or "none">
Decision:     Approve, edit, or regenerate the draft | No approval needed (report saved)
```

