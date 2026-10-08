---
name: website-cloner
description: "Rebuild a website from its URL and optional instructions into an improved, verified frontend clone. Run end to end with --auto by default; --no-auto enables review gates. Use for full rebuilds, not exact mirroring or backend apps."
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
  version: 1.5.0
  author: "Luong NGUYEN <luongnv89@gmail.com>"
---

# Website Cloner

Turn an original URL and optional instructions into a completed, improved website using Vite + React + shadcn/ui + Tailwind CSS. The cloned website is the primary deliverable; analysis and plans support its implementation.

## Invocation and Execution Mode

```text
$website-cloner <url> [optional instructions] [--auto | --no-auto] [--output <root>]
```

- **Auto (default):** Omitting the mode flag is equivalent to `--auto`. Validate and automatically accept the report, PRD, and implementation plan, save each artifact, then continue through build, verification, deployment when available, and final comparison. Do not ask for plan approval or end a turn at an intermediate phase.
- **Review:** `--no-auto`, or an explicit request to review/approve before proceeding, enables user approval gates after Phases 2, 3, and 4. Pause at each gate until the user approves or requests changes. A later instruction to pause, change scope, or stop takes precedence in either mode.
- Extract the URL and optional free-text instructions from the request. Carry those instructions into the report, PRD, tasks, and build. If none are supplied, preserve the original brand, purpose, essential content, and core journeys while improving observed weaknesses.
- Set one `MODE_FLAG` (`--auto` or `--no-auto`) and pass it explicitly to Phases 2–6. This overrides their standalone defaults. Record acceptance as `auto` or `user`; automatic acceptance must never be described as a human review.

The full workflow includes its planned GitHub Pages publication when existing account access and permissions allow it; do not ask again for routine deployment confirmation within that scope. Auto accepts workflow artifacts within the requested rebuild. It does not expand permissions, bypass tool approval, or authorize unrelated external changes. Ask only for genuinely missing required input or authorization; continue independent local work while deployment access is unavailable.

Examples:

```text
$website-cloner https://example.com
$website-cloner https://example.com Make it easier to read on mobile and keep the blue palette --auto
$website-cloner https://example.com --no-auto
```

## Setup

1. Require an `http://` or `https://` URL; ask for it only if missing or invalid.
2. Resolve the project root from `--output`, then `$CLONE_DIR`, then `./clones` in the current writable workspace. Use the default without a directory question or global config write.
3. Create a new `YYYY_MM_DD_<host-slug>/` directory under that root, adding a numeric suffix on collision. Bind its absolute path as `PROJECT_DIR`. Treat this as a new project even if a parent directory belongs to another repository; never sync or publish the parent repository.
4. Check Node/npm, local write access, and page-fetch/browser access. Use available equivalent tools rather than requiring a particular tool name. If a required capability is missing, report the concrete blocker. GitHub credentials are optional for the local build.

## Dependency Preflight and Phase Loading

The six phase skills are bundled as child folders beside this SKILL.md. Set `SKILL_DIR` to this folder. Load a phase only when reaching it; a bare slash command for a nested skill may not resolve.

When `asm` is available, discover dependencies before phase execution and choose one session id for the run:

```bash
asm deps discover "$SKILL_DIR" --json
```

Acquire the bundled phase first, falling back to an installed copy:

```bash
asm deps acquire "$SKILL_DIR/<phase-skill>" --session "<session-id>" --json \
  || asm deps acquire <phase-skill> --session "<session-id>" --json
```

Read the returned `skillMdPath` and follow that skill with the arguments below. If `asm` is unavailable or acquisition fails but the bundled SKILL.md is readable, load that file directly; no installation question is needed. If no copy can be loaded, name the skipped phase and continue where its missing output can be recovered from existing evidence; cap the overall result at `PARTIAL`. Never fabricate analysis, approval, or verification to fill a gap.

On every exit after using an `asm` session, including a review pause or error, release it from your cleanup path:

```bash
asm deps release --session "<session-id>" --json
```

## Workflow

```text
Analyze → Report → Propose → Plan → Build and verify → Final comparison and website delivery
```

Run phases in order. In auto mode, report concise progress and proceed immediately after artifact validation. In review mode, present the complete draft at each approval gate before saving it. Phase return summaries are progress information within this workflow; they do not end the umbrella run.

### Phase 1: Understand the Original — website-analyzer

```text
<url> --output "$PROJECT_DIR/analysis.json"
```

Verify parseable JSON covering UI/UX, category, style, performance, surface security, and SEO. When browser access is available, also inspect the rendered source at desktop and mobile widths to ground layout and interaction decisions. Record inaccessible sections and null measurements. An unreachable or access-protected source is a blocker; partial measurements are acceptable with caveats.

### Phase 2: End-User Report — website-clone-report

```text
"$PROJECT_DIR/analysis.json" --output "$PROJECT_DIR/report.md" <MODE_FLAG>
```

Translate evidence into a plain-language report and incorporate the user's focus. In auto mode, check the report, automatically accept it, and save immediately. In review mode, obtain user approval before saving. Require a non-empty `report.md` before proceeding.

### Phase 3: Improvement Proposal — website-improvement-prd

```text
"$PROJECT_DIR/report.md" "$PROJECT_DIR/analysis.json" --output "$PROJECT_DIR/prd.md" <MODE_FLAG>
```

Create evidence-backed what/why/value improvements and realistic targets. Preserve source identity and requested features; do not invent product claims, testimonials, prices, or backend functionality. Automatically accept after validation in auto mode; obtain approval in review mode. Require non-empty `prd.md` and final phase line `STATUS: approved` in either mode.

### Phase 4: Implementation Plan — website-implementation-plan

```text
"$PROJECT_DIR/prd.md" --output "$PROJECT_DIR/tasks.md" <MODE_FLAG>
```

Plan the landing page first, then essential pages/journeys and quality improvements. Track collected versus created assets and include measurable responsive, accessibility, interaction, routing, and static-build checks. Include base-aware Vite configuration and `.github/workflows/deploy-pages.yml` deploying `dist/` through GitHub Actions. Record whether live deployment access is available; its absence must not block implementation. Require non-empty `tasks.md` and `STATUS: approved` under the selected mode.

### Phase 5: Build, Verify, and Deploy — website-builder

```text
"$PROJECT_DIR/tasks.md" "$PROJECT_DIR/prd.md" --output "$PROJECT_DIR/" <MODE_FLAG>
```

Execute all in-scope tasks and verify the actual rendered website. Fix build, layout, interaction, accessibility, route, and asset defects before delivery. Compare the implementation to the source and PRD rather than assuming a successful build proves better quality. Allow up to two corrective passes for quality checks; if failures remain, deliver the usable result with a concrete `PARTIAL` explanation, or `FAIL` if no usable site exists.

Deploy the verified `dist/` artifact to a dedicated GitHub Pages repository when the requested workflow, available credentials, and environment permissions allow it. Do not overwrite an unrelated repository or change its visibility. Use the workflow-produced responsive URL, then re-run the analyzer into `after-analysis.json`. If deployment is unavailable, keep the completed source, verified `dist/`, and a local preview with a reproducible start command; record the deployment and after-snapshot gap in `builder-metadata.json` and continue to Phase 6.

### Phase 6: Comparison and Delivery — website-clone-final-report

```text
"$PROJECT_DIR/analysis.json" "$PROJECT_DIR/builder-metadata.json" --output "$PROJECT_DIR/final-report.md" <MODE_FLAG>
```

Save an evidence-backed before/after comparison using `prd.md` and `tasks.md`. Missing baseline, deployment, or after metrics keep this report `PARTIAL`; never invent improvements or relabel static estimates as measurements. Deliver the website even if the supporting comparison is partial.

## Delivery Contract

Lead the final response with a clickable link to the completed cloned website: the verified live URL when available, otherwise the working local preview URL plus its restart command. Also link the source project and built `dist/` directory. Summarize the concrete improvements and verification in a few sentences; link `final-report.md` for detail. Do not present the proposal or plan as the final result of an auto run.

Include:

```text
Website:      <verified live or local preview link; unavailable only if blocked>
Result:       PASS | PARTIAL | FAIL | BLOCKED — <delivered behavior, concrete blocker, or pending review gate>
Mode:         auto | review
Project:      <absolute source path>; <dist path>; <local preview restart command>
Evidence:     <phase outcomes; artifact links; build, render, interaction, and deployment checks>
Uncertainty:  <estimates, skipped phases, untested checks, unavailable comparisons, deviations — or none>
Decision:     <required user action only if blocked or in review mode> | No approval needed
```

For a completed run, the overall result is the worst phase result. Use `PARTIAL` when a usable site exists but a phase, required check, deployment, or comparison is incomplete. Use `FAIL` when no usable clone can be delivered. A review pause returns `BLOCKED` and names the awaiting gate instead of claiming a completed website or a failed build. Never report `PASS` from auto acceptance alone.

## Acceptance Criteria

- A URL-only invocation selects auto mode, uses the default local root, and passes `--auto` to each mode-aware phase without a setup or approval question.
- Auto mode saves a non-empty report, PRD, and plan after validation; the PRD and plan return `STATUS: approved` and record automatic acceptance before the next phase starts.
- Review mode pauses before saving each gated artifact until the user approves; a later stop instruction prevents further execution in either mode.
- Every in-scope task is completed or explained as a deviation. The source project, verified static build, preview/deployment evidence, and final comparison are delivered together.
- The website link is checked before it is presented as working; missing deployment or quality evidence is disclosed and prevents `PASS`.
- Dependency sessions are released on every exit and only the dedicated clone project is mutated or published.

## Completion and Recovery

- Require the report, PRD, and plan artifacts before consuming them; repair recoverable generation/write failures rather than prompting for routine approval in auto mode.
- Make reasonable implementation decisions within the source, PRD, and user's instructions, and record deviations. A material ambiguity that cannot be resolved from evidence may require clarification; no answer is required for optional stylistic choices.
- Missing source imagery: use an appropriate accessible substitute or create an asset and record it; never stall solely for optional assets.
- User declines a review gate or requests a stop: stop phase execution and preserve artifacts. Auto mode never overrides that instruction.
- Build/deploy failures: correct an actionable failure within the bounded repair loop. Do not retry denied actions unchanged or wait indefinitely for external services; preserve the verified local site and explain the remaining gap.
- Release dependency leases on every exit. A run is complete only after the website is delivered or a concrete blocker is reported with the work already completed.
