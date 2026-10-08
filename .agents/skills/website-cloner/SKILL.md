---
name: website-cloner
description: "Build an improved website clone from a URL via a 6-phase gated workflow (Vite/React/shadcn/Tailwind + GitHub Pages). Use for end-to-end site rebuilds. Don't use for one-phase work, exact site mirroring, or backend apps."
license: MIT
effort: high
dependencies:
  - website-analyzer
  - website-clone-report
  - website-improvement-prd
  - website-implementation-plan
  - website-builder
  - website-clone-final-report
metadata:
  version: 1.4.0
  author: "Luong NGUYEN <luongnv89@gmail.com>"
---

# Website Cloner

6-phase orchestrator that clones any website and produces an improved version — better performance, UI/UX, SEO, and security — built with Vite + React + shadcn/ui + Tailwind CSS, deployable to GitHub Pages.

## When to Use

Trigger when the user asks to:
- Clone, rebuild, or recreate a website ("clone this site", "make a better version of <url>")
- Improve a website's performance, UI/UX, or SEO by analyzing and rebuilding it
- Start a full website improvement workflow from a URL

Do **not** use for one-phase work (load that phase skill directly), exact site mirroring, or backend apps.

## Prerequisites

- A target URL (publicly reachable preferred).
- Write access to create a local project dir (defaults under `~/workspace/clones` or `$CLONE_DIR`).
- The six phase skills bundled in this folder (website-analyzer, website-clone-report, etc.).
- `asm` (agent-skill-manager) on PATH — it runs the phase-skill lifecycle in Dependency Preflight.
- Optional: GitHub token if you want Pages deploy automation in Phase 5.
- User approval at gates (explicit confirmation before Phases 3, 4, 5 advance).

If a prerequisite other than a phase skill is missing, stop and report it — do not guess paths or credentials. A missing phase skill is not a stop: see Edge Cases (skip the phase, cap the result at `PARTIAL`).

## Workflow

```
Phase 1 — Analyze        → website-analyzer
Phase 2 — Report (gate)  → website-clone-report
Phase 3 — Propose (gate) → website-improvement-prd  (outputs prd.md)
Phase 4 — Plan  (gate)   → website-implementation-plan  (outputs tasks.md)
Phase 5 — Build          → website-builder
Phase 6 — Final Report   → website-clone-final-report
```

Approval gates after Phase 2, 3, and 4: the orchestrator **must not advance** without explicit user approval.

**Artifacts** (each written once, then referenced by name in the phases below): `analysis.json` — Phase 1's structured findings; `report.md` — Phase 2's plain-language summary; `prd.md` — Phase 3's improvement proposal; `tasks.md` — Phase 4's phased implementation plan, including the approved GitHub Actions artifact-deployment task; `builder-metadata.json` — Phase 5's build metadata, workflow-produced Pages URL, and structured post-deployment performance/SEO/security snapshot consumed by Phase 6; `after-analysis.json` — the comparable Phase 5 re-audit source. Phase 5 also produces base-aware Vite configuration and `.github/workflows/deploy-pages.yml`, which builds and deploys `dist/` rather than publishing the repository root.

## Layout

This umbrella and its phase skills live together in a single suite folder:

```
website-cloner/                           ← this umbrella
├── SKILL.md                              ← orchestrator (you are here)
├── website-analyzer/                     ← Phase 1
├── website-clone-report/                 ← Phase 2
├── website-improvement-prd/              ← Phase 3
├── website-implementation-plan/          ← Phase 4
├── website-builder/                      ← Phase 5
└── website-clone-final-report/           ← Phase 6
```

Why nested: the phases are tightly coupled to this umbrella's data flow (analysis JSON → report → PRD → tasks → built site → final report). Keeping them in one folder makes the suite easy to browse, audit, and ship together. A phase skill also works on its own when its SKILL.md is loaded directly.

Nested phase skills are not registered as top-level skills, so a bare `/website-analyzer` call may not resolve. Every phase below uses the **run a phase skill** steps in Dependency Preflight instead.

See the individual phase skill docs for their full references/ and scripts/. This orchestrator stays short to fit the agent's context budget.

## Dependency Preflight (mandatory)

This skill runs six phase skills bundled in its own folder and declared in frontmatter
`dependencies`: `website-analyzer` (Phase 1), `website-clone-report` (Phase 2),
`website-improvement-prd` (Phase 3), `website-implementation-plan` (Phase 4), `website-builder`
(Phase 5), and `website-clone-final-report` (Phase 6). Run these checks **before** the repo sync
below, the first step that changes anything. Set `SKILL_DIR` to the directory holding this SKILL.md.

```bash
command -v asm >/dev/null || { echo "Missing installer: npm install -g agent-skill-manager" >&2; exit 1; }
asm deps discover "$SKILL_DIR" --json   # pass the path: a bare name can resolve to another installed copy
for s in website-analyzer website-clone-report website-improvement-prd website-implementation-plan website-builder website-clone-final-report; do
  [ -f "$SKILL_DIR/$s/SKILL.md" ] || echo "Missing bundled phase skill: $s" >&2
done
```

A missing `asm` stops the run, like any prerequisite that is not a phase skill. A missing phase
skill is **not a stop** — this suite is fail-soft (#251): name the phases that may be skipped and
continue. Choose one session id for the run (for example `website-cloner-<UTC timestamp>`) and reuse
that literal value below.

**Run a phase skill** — only when execution first reaches that phase:

1. Acquire the phase skill, bundled path first, then any installed copy:
   ```bash
   asm deps acquire "$SKILL_DIR/<phase-skill>" --session "<session-id>" --json \
     || asm deps acquire <phase-skill> --session "<session-id>" --json
   ```
2. Read the returned `skillMdPath` immediately and follow that SKILL.md with the phase's arguments.
3. If both acquires exit non-zero, skip the phase, name it in the final summary, and cap the result
   at `PARTIAL`. Never acquire a phase that execution does not reach.

**Release** — on every exit (PASS, PARTIAL, FAIL, a denied gate, an unreachable URL, or any other
stop), run this from your own cleanup path. Repeating it is harmless, and it never deletes bundled
phase skills:

```bash
asm deps release --session "<session-id>" --json
```

## Repo Sync Before Edits (mandatory)

Before modifying files in a repository:

```bash
branch="$(git rev-parse --abbrev-ref HEAD)"
git fetch origin
git pull --rebase origin "$branch"
```

If dirty, stash first:

```bash
git stash push -u -m "website-cloner: pre-sync"
branch="$(git rev-parse --abbrev-ref HEAD)"
git fetch origin && git pull --rebase origin "$branch"
git stash pop
```

If `origin` is missing or rebase conflicts occur, stop and ask.

## Setup

0. **Resolve working directory** — the directory where the cloned website will be built. If `$CLONE_DIR` is set, use it. Otherwise ask the user once and save to `~/.config/website-cloner-dir.txt`. Default: `~/workspace/clones`.
1. **Create project folder** under resolved root: `YYYY_MM_DD_<slug_from_url>/`
2. **Set `$PROJECT_DIR`** to the created folder path.
3. If no URL provided in `$ARGUMENTS`, ask the user for one.

## Phase 1: Understand the Website

Run phase skill `website-analyzer` with:

```text
<url> --output "$PROJECT_DIR/analysis.json"
```

The analyzer produces a structured analysis covering: UI/UX, category, style, performance (`lcp_estimate_seconds`, unitless `cls_estimate`, `ttfb_estimate_seconds`, page weight in KB, and request count), surface-level security, and SEO (overall score + per-dimension breakdown).

**Check:** Analysis file exists and covers all 6 dimensions. If any dimension is missing, note it but continue — partial results are acceptable for Phase 2.

**Step Completion Report:**

```
◆ Analyze (step 1 of 6 — <site name>)
······································································
  UI/UX profile:        √ pass | × partial — <gap>
  Category detected:    √ pass (<category>)
  Style analysis:       √ pass | × partial — <gap>
  Performance metrics:  √ pass (LCP=<val> CLS=<val>)
  Security surface:     √ pass | × partial — <gap>
  SEO score:            √ pass (<score>/100)
  ____________________________
  Result:               PASS | PARTIAL
```

## Phase 2: End-User Report (GATE)

Run phase skill `website-clone-report` with:

```text
"$PROJECT_DIR/analysis.json" --output "$PROJECT_DIR/report.md"
```

This skill produces a plain-language report for non-technical readers and **prompts for approval** before persisting. The orchestrator waits for user approval here.

**Check:** `report.md` exists. The report skill writes it only after explicit approval, so a missing file means not approved.

**Step Completion Report:**

```
◆ Report (step 2 of 6 — <site name>)
······································································
  Report written:       √ pass (report.md)
  User approved:        √ pass | × pending
  ____________________________
  Result:               PASS | BLOCKED
```

If not approved, do not advance. Ask the user to review the report and approve or request changes.

## Phase 3: Improvement Proposal (GATE)

Run phase skill `website-improvement-prd` with:

```text
"$PROJECT_DIR/report.md" "$PROJECT_DIR/analysis.json" --output "$PROJECT_DIR/prd.md"
```

This skill produces a full improvement proposal with what/why/value for each change and writes `prd.md` after user approval.

**Check:** `prd.md` exists and the phase skill's final line reads `STATUS: approved`.

**Step Completion Report:**

```
◆ Proposal (step 3 of 6 — <site name>)
······································································
  prd.md written:       √ pass
  User approved:        √ pass | × pending
  Changes catalogued:   √ pass (<N> proposed changes)
  ____________________________
  Result:               PASS | BLOCKED
```

## Phase 4: Implementation Plan (GATE)

Run phase skill `website-implementation-plan` with:

```text
"$PROJECT_DIR/prd.md" --output "$PROJECT_DIR/tasks.md"
```

This skill produces a phased implementation plan with landing page first, asset collection vs. creation, individual tasks, and a deterministic GitHub Actions Pages artifact deployment from base-aware Vite `dist/` output — written to `tasks.md` after user approval.

**Check:** `tasks.md` exists and the phase skill's final line reads `STATUS: approved`.

**Step Completion Report:**

```
◆ Plan (step 4 of 6 — <site name>)
······································································
  tasks.md written:     √ pass
  User approved:        √ pass | × pending
  Phases defined:       √ pass (≥ 2 phases)
  Landing page first:   √ pass
  Pages artifact task:  √ pass (base-aware dist/)
  ____________________________
  Result:               PASS | BLOCKED
```

## Phase 5: Build

Run phase skill `website-builder` with:

```text
"$PROJECT_DIR/tasks.md" "$PROJECT_DIR/prd.md" --output "$PROJECT_DIR/"
```

This skill executes the plan, builds the site (Vite + React + shadcn/ui + Tailwind), and deploys the verified `dist/` artifact through `.github/workflows/deploy-pages.yml`. The workflow sets the Vite base to `/` for a user/organization Pages repository or `/<repo>/` for project Pages; repository-root and branch-folder publishing are forbidden. It then re-runs `website-analyzer` against the responsive workflow-produced Pages URL and emits the structured after snapshot in metadata for Phase 6. If deployment or the re-audit is incomplete, Phase 5 must return `PARTIAL` and preserve nulls/errors rather than inventing metrics.

**Step Completion Report:**

```
◆ Build (step 5 of 6 — <site name>)
······································································
  Landing page built:   √ pass
  Assets collected:     √ pass (<N> assets)
  Assets created:       √ pass (<N> assets)
  Pages dist artifact:  √ pass | × unavailable
  GitHub Pages URL:     √ pass (<url>) | × unavailable
  After metrics:        √ complete | × partial ([performance/SEO/security gaps])
  ____________________________
  Result:               PASS | PARTIAL | FAIL
```

## Phase 6: Final Comparison Report

Run phase skill `website-clone-final-report` with:

```text
"$PROJECT_DIR/analysis.json" "$PROJECT_DIR/builder-metadata.json" --output "$PROJECT_DIR/final-report.md"
```

This skill validates the baseline and structured post-deployment snapshot, then produces a before/after comparison covering performance, SEO, security, UI/UX changes, deviations, and the GitHub Pages URL. It must propagate `PARTIAL` when any required performance, SEO, or security comparison is unavailable.

**Step Completion Report:**

```
◆ Final Report (step 6 of 6 — <site name>)
······································································
  final-report.md:      √ pass
  Performance delta:    √ pass (before→after) | × partial ([missing])
  SEO delta:            √ pass (before→after) | × partial ([missing])
  Security comparison:  √ pass (before→after) | × partial ([missing])
  Deviations listed:    √ pass | × none
  ____________________________
  Result:               PASS | PARTIAL | FAIL
```

## Expected Output

End every run, including a stop at a gate, with this summary (the **output contract**). The result comes first:

```
◆ Website Cloner — <site name>
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  Overall Result:       PASS | PARTIAL | FAIL — <what was built, or where the run stopped>
  Phase 1  Analyze      √ pass
  Phase 2  Report       √ approved
  Phase 3  Proposal     √ approved (prd.md)
  Phase 4  Plan         √ approved (tasks.md)
  Phase 5  Build        √ pass | × partial
  Phase 6  Final Report √ pass | × partial | × fail
  Evidence:     <artifact paths in $PROJECT_DIR and the checks each phase ran>
  Uncertainty:  <static-analysis estimates, skipped phases, null metrics, untested checks — or "none">
  Decision:     <the gate awaiting approval> | No approval needed

  GitHub Pages: https://<user>.github.io/<repo>/
  Project:      <project_dir>
```

The overall result is the worst Phase 1–6 result. Never report overall `PASS` when the Phase 5 after snapshot or any Phase 6 required comparison is partial, unavailable, or failed. Label performance values as static-analysis estimates, and name every skipped phase under Uncertainty.

## Acceptance Criteria

- `report.md`, `prd.md`, and `tasks.md` each exist in `$PROJECT_DIR` before the next phase starts; a gate without its file stops the run.
- The final summary follows the output contract, and its overall result equals the worst phase result.
- `asm deps release` ran for the run's session on every exit path, including a stop at a gate.
- Reviewer understanding (evaluation guidance, not a runtime gate): the opening line states the result and status; estimates and assumptions are labeled; each material claim traces to an artifact or URL; the next decision is named. Without reviewer feedback, human understanding stays unconfirmed.

## Edge Cases

- **Unreachable URL**: Stop Phase 1, report error, do not continue. Ask user for a different URL.
- **JS-heavy SPA with no crawlable content**: Note the limitation in Phase 1, proceed with best-effort analysis. The build phase may need user-supplied assets to compensate.
- **User denies approval at any gate**: Stop the pipeline. Do not auto-proceed. The user can re-run the skill to resume.
- **Phase skill unavailable**: If both acquires for a phase skill fail (Dependency Preflight), skip that phase and name it under Uncertainty. Continue where possible, but the overall result cannot exceed `PARTIAL`.
- **Partial Phase 1 results**: If the analyzer returns partial data (e.g., no SEO score), proceed to Phase 2 with a note; Phase 6 and the overall workflow remain `PARTIAL` when a required baseline comparison is unavailable.
- **Partial Phase 5 re-audit**: Continue to Phase 6 so it can document the gaps, but both Phase 6 and the overall workflow must return `PARTIAL` unless report creation itself fails.

