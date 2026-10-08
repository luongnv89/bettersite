# Phase 5 — Implementation plan (tasks.md)

Read this at Phase 5. Input: `prd.md` (read only the sections the current phase needs). Output:
`$PROJECT_DIR/tasks.md`, written with `references/tasks-template.md` as the only template.

## Rules

1. **Phases ship early.** Phase 1 is an independently usable landing page (project setup first,
   then layout). Phase 2 is the core pages. Phase 3 is performance, SEO, AI-search, accessibility
   and security polish. An optional Phase 4 holds nice-to-have features.
2. **Tasks are bounded.** Each task covers at most one page and has Scope, Outputs, measurable
   Acceptance Criteria, Assets Needed, and Findings (the finding IDs it resolves, or `—`).
3. **Assets are classified.** `[Collect]` exists on the original site (logo, images, copy,
   colors). `[Create]` is new (icons, rewritten copy, generated images). The Asset Summary lists
   every asset once.
4. **Findings are planned.** Every PRD change with a finding ID has a task naming that ID, with
   an acceptance criterion the build can check (for example "`dist/llms.txt` exists and lists every
   route", "hero CTA visible at 390 px without scrolling").
5. **Deployment is planned.** Task 1.1 keeps the template's Pages-artifact criteria verbatim:
   base-aware Vite config and `.github/workflows/deploy-pages.yml` deploying `dist/` through
   GitHub Actions. Record whether deployment access is available; its absence never blocks work.
6. **Conflicts.** Auto mode follows the user's latest constraints and the source intent and
   records the resolution; review mode asks before decomposing.

## Acceptance

Auto mode validates against the checks below and saves. Review mode presents the draft with
**Approve / Edit / Regenerate** and saves only after approval. Write with a file-writing tool and
re-read the file.

## Phase checks

- Every in-scope PRD change maps to at least one task or a justified exclusion.
- Every `build` finding ID in the PRD coverage table appears in at least one task's Findings.
- No plan publishes Vite output from the repository root or `/docs`.

```text
◆ Phase 5 — Plan (5 of 7)
  PRD read:          √ | × (reason)
  Landing first:     √
  Tasks measurable:  √ (N tasks)
  Findings planned:  √ N/N | — skipped (no findings)
  Assets classified: √ (C collect / K create)
  Acceptance:        √ auto | √ user | × pending
  tasks.md:          √ (path) | — not approved
  Result:            PASS | BLOCKED | FAIL
```
