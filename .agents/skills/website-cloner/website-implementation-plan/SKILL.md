---
name: website-implementation-plan
description: "Generate phased tasks.md from an approved website PRD, with landing page first, measurable tasks, and collect/create asset tracking. Use for implementation planning. Don't use for coding, design review, or direct deployment."
license: MIT
effort: high
metadata:
  version: 1.5.0
  author: "Luong NGUYEN <luongnv89@gmail.com>"
---

# Website Implementation Plan

Turns an approved improvement proposal (prd.md) into a phased implementation plan. Landing page first, then deeper pages. Asset collection vs. creation tracked. Writes `tasks.md` after approval.

## When to Use

Trigger when the user asks to:
- Plan the implementation of a website improvement proposal
- Break down a PRD into phased tasks
- Create an implementation plan for a site rebuild

Do **not** use for building or coding — that is Phase 5 (website-builder).

## Repo Sync Before Edits (mandatory)

The approved `tasks.md` is persisted with `Write`. When that output path lives inside a git worktree, sync before the write to avoid clobbering remote work:

```bash
branch="$(git rev-parse --abbrev-ref HEAD)"
git fetch origin
git pull --rebase origin "$branch"
```

If the working tree is dirty: stash → sync → pop. If `origin` is missing or a conflict occurs: **stop and ask the user.** Skip this section only when the output path is outside any git repository.

## Workflow

```
1. Read the approved prd.md
2. Identify phases: landing page first, then deeper content
3. For each task: define scope, outputs, acceptance criteria
4. Track assets: collect from original vs. create new
5. Assemble into tasks.md
6. Present for review
7. Incorporate edits (loop until approved)
8. Persist tasks.md
```

## Output: tasks.md Structure

Use [references/tasks-template.md](references/tasks-template.md) as the only output template. It fixes the order — Overview, Phase 1 Landing Page (project setup with the GitHub Actions Pages artifact workflow, then the landing layout), Phase 2 Core Pages, Phase 3 Optimization and Polish, Asset Summary, Deployment — with the per-task Scope, Outputs, Acceptance Criteria, and Assets Needed fields. Read it at Step 5, when drafting. Read only the PRD sections needed for the current phase to preserve the context budget.

## Step 1: Read prd.md

```
Read file <path-to-prd.md>
```

If missing, ask for the path. The orchestrator should have produced this in Phase 3.

## Step 2: Define Phases

Structure phases so something usable ships early:

| Phase | Focus | Rationale |
|-------|-------|-----------|
| Phase 1 | Landing/home page | Usable immediately, can be shown to users |
| Phase 2 | Core pages | About, features, contact, etc. |
| Phase 3 | Optimization | Performance, SEO, security polish |
| Phase 4 (optional) | Extra features | Nice-to-have improvements |

Phase 1 **must** produce an independently usable landing page.

## Step 3: Define Tasks

For each task:
- **Scope**: Clear, bounded description of what to build
- **Outputs**: Concrete deliverables
- **Acceptance Criteria**: Measurable pass/fail conditions
- **Assets Needed**: Distinguish `[Collect]` from `[Create]`

Keep each task to at most one page; split a task that covers several pages.

## Step 4: Asset Tracking

For every asset referenced in the plan:
- Mark as **[Collect]** if it exists on the original site (logos, images, copy, colors)
- Mark as **[Create]** if it needs to be newly produced (new icons, rewritten copy, generated images)

## Step 5: Write Draft tasks.md

Read [references/tasks-template.md](references/tasks-template.md) and fill it with the phases, tasks, and assets from Steps 2–4.

## Step 6: Present for Review

"Here is the implementation plan. Please:
1. **Approve** — save as tasks.md
2. **Edit** — specify changes
3. **Regenerate** — start over"

## Step 7: Incorporate Edits (loop)

If edits requested: update, re-present, repeat until approved.

Do **not** persist until explicit approval.

## Step 8: Persist tasks.md

Persist the assembled content using the `Write` tool with literal content only. If the `Write` tool is unavailable, stop with a descriptive error and do not use shell persistence or another output path.

Resolve the output path in this order:

1. If `$ARGUMENTS` includes `--output <path>`, use that path.
2. Otherwise, if `$PROJECT_DIR` is set, use `$PROJECT_DIR/tasks.md`.
3. Otherwise, use `~/workspace/clones/YYYY_MM_DD_<slug>/tasks.md`.

End every outcome with this summary (the **output contract**), result first and the status line last:

```text
Result:       PASS | BLOCKED | FAIL — tasks.md saved to <absolute-path> | not saved
Evidence:     <prd.md path; phase and task counts; Write result>
Uncertainty:  <estimated targets carried from prd.md, assumptions about pages or assets — or "none">
Decision:     Approve, edit, or regenerate the plan | No approval needed (plan saved)
STATUS: approved | pending | aborted
```

## Return Contract

When invoked by the `website-cloner` umbrella (Phase 4 gate), the orchestrator
gates Phase 5 on this skill's outcome. The contract:

| Outcome  | Signal                                                              |
|----------|---------------------------------------------------------------------|
| approved | `tasks.md` exists at the resolved output path AND final line of stdout reads `STATUS: approved` |
| pending  | no `tasks.md` written; final line reads `STATUS: pending` (user still iterating) |
| aborted  | no `tasks.md` written; final line reads `STATUS: aborted` (user declined) |

The orchestrator MUST NOT advance to Phase 5 unless the outcome is `approved`.
A standalone invocation may ignore the status line, but the file-existence rule
still holds: no approval, no `tasks.md`.

## Acceptance Criteria and Expected Output

Verify the complete plan before requesting approval:

- Every in-scope PRD requirement maps to at least one numbered task or an explicitly justified exclusion.
- Phase 1 produces an independently usable landing page; later phases preserve dependency order.
- Every task has bounded scope, concrete outputs, measurable acceptance criteria, and all required assets classified as `[Collect]` or `[Create]`.
- Project setup includes the artifact-based Pages workflow, deterministic Vite base-path behavior, and route/asset checks; no plan publishes Vite output from repository root or `/docs`.
- Asset Summary contains every asset named by a task exactly once with a source and action.
- The expected result is valid markdown at the approved path plus exactly one final `STATUS: approved`; pending or aborted outcomes write no file.
- The final summary follows the output contract, and `STATUS:` stays the final line.
- Reviewer understanding (evaluation guidance, not a runtime gate): the opening line states the result and status; estimates and assumptions are labeled; each task traces to a PRD change; the next decision is named. Without reviewer feedback, human understanding stays unconfirmed.

## Step Completion Report

```text
◆ Implementation Plan
··································································
  Approved PRD:         √ pass | × fail ([reason])
  Landing page first:  √ pass
  Tasks measurable:    √ pass ([count])
  Assets classified:   √ pass ([collect]/[create])
  User approved:       √ pass | × pending
  tasks.md saved:      √ pass ([absolute path]) | — not approved
  Result:              PASS | BLOCKED | FAIL
```

Report `PASS` only when the return contract's file and final status-line conditions both hold. Print this block before the output contract; the `STATUS:` line stays the final line of the run.

## Edge Cases and Error Handling

| Failure | Behavior |
|---|---|
| No prd.md provided | Ask for the PRD file path |
| Invalid PRD format | Report error and ask for valid file |
| Conflicting PRD requirements | Surface the conflict and ask before task decomposition |
| No assets required | Include an empty Asset Summary and state that no collection or creation is needed |
| User never approves | Keep looping; do not auto-save |
