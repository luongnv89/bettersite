---
name: website-builder
description: "Build an approved Vite/React/Tailwind plan, collect assets, verify static output, deploy to GitHub Pages, and emit metadata. Use for implementing tasks.md. Don't use for design review, planning, or backend services."
license: MIT
effort: high
dependencies:
  - website-analyzer
metadata:
  version: 1.6.0
  author: "Luong NGUYEN <luongnv89@gmail.com>"
---

# Website Builder

Executes the approved implementation plan (tasks.md) to build a working improved website using Vite + React + shadcn/ui + Tailwind CSS, deployable to GitHub Pages.

## Execution Mode

Accept the umbrella's `--auto` or `--no-auto` and inherit its instructions and project boundary. An approved plan may be automatically accepted (`Acceptance: auto`) or user-approved (`Acceptance: user`); either is executable after input validation. A standalone build instruction authorizes implementation of the supplied plan.

In auto mode, resolve routine implementation choices from the PRD and source, record deviations, and continue without design or plan questions. Honor later user corrections or stop requests. External publication still requires a permitted, intended target; when access is unavailable, finish and deliver the verified local website.

## When to Use

Trigger when the user asks to:
- Build a website from an implementation plan
- Implement a PRD or tasks list
- Code a Vite/React website from a spec

Do **not** use for design review or planning — those are upstream phases.

## Prerequisites

- `tasks.md` (Phase 4 plan) exists and is accepted under the selected mode
- `prd.md` (Phase 3 proposal) exists for alignment reference
- Node.js and npm are available
- Git is available for repository management
- For the Step 7 re-audit: `website-analyzer` (bundled beside this skill), loaded through `asm` when available or directly otherwise. If the analyzer cannot be loaded, skip Step 7 and return `PARTIAL`.

## Tech Stack

- **Build tool**: Vite
- **Framework**: React (JSX)
- **UI components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Deployment**: GitHub Pages (static assets)
- **Serverless**: no backend, no server-side runtime

## Workflow

```
1. Read tasks.md and prd.md
2. Resolve and initialize the dedicated project directory
3. Execute tasks phase by phase (landing page first)
4. Collect or create assets as specified
5. Build and verify
6. Deploy to GitHub Pages when available
7. Re-audit the deployed URL for comparable after metrics
8. Emit builder metadata
```

## Dependency Preflight (mandatory)

Step 7 re-audits the deployed site with `website-analyzer`, declared in frontmatter
`dependencies`; Steps 1–6 never use it. Discover it when `asm` is available. Set `SKILL_DIR` to the directory holding this SKILL.md.

```bash
if command -v asm >/dev/null; then
  asm deps discover "$SKILL_DIR" --json
fi
```

Choose one session id for the run (for example `website-builder-<UTC timestamp>`). Only when
execution first reaches Step 7, acquire the analyzer, bundled sibling path first:

```bash
asm deps acquire "$SKILL_DIR/../website-analyzer" --session "<session-id>" --json \
  || asm deps acquire website-analyzer --session "<session-id>" --json
```

Read the returned `skillMdPath` immediately and follow it in Step 7. If `asm` is unavailable or both acquisitions fail, read the bundled sibling SKILL.md directly when available. If no analyzer can be loaded, skip Step 7, set `after_snapshot_status` to `unavailable`, and return `PARTIAL`. On every exit after an acquire
(success, failure, or stop), release from your own cleanup path; repeating it is harmless:

```bash
asm deps release --session "<session-id>" --json
```

## Repository Handling

Work only in the resolved project directory. When called by website-cloner, inherit its new-project boundary and repository handling; never sync or publish a containing repository. A new project or a local repository without a remote needs no fetch/pull.

For a standalone invocation targeting an existing dedicated repository with `origin`, sync the current branch once before edits when the worktree is clean. Preserve dirty user changes; do not automatically stash unrelated files or reset/rebase over them. Resolve recoverable issues locally and ask only if a conflict or ambiguous target prevents safe progress. Do not repeat repository sync for every phase artifact.

## Step 1: Read the Plan

Read `tasks.md` and `prd.md`:

```
Read file <path-to-tasks.md>
Read file <path-to-prd.md>
```

If either is missing, check the umbrella's PROJECT_DIR first. Report a concrete missing-input blocker only if it cannot be recovered.

## Step 2: Initialize Project

Resolve `PROJECT_DIR` from the requested `--output` directory; otherwise reuse the umbrella workflow's `PROJECT_DIR`, or the directory containing `tasks.md`. Bind that directory before running the block below. It can already contain `analysis.json`, `report.md`, `prd.md`, `tasks.md`, and user files.

Reuse an existing Vite project. For a new project, generate the React JavaScript scaffold in an empty temporary directory owned by this run, check **every** generated top-level name for collisions, then copy. A collision aborts before any generated file is copied; report the names and stop. Never pass `--overwrite` or remove existing project files.

```bash
: "${PROJECT_DIR:?Set PROJECT_DIR to the resolved output directory}"
mkdir -p -- "$PROJECT_DIR" || exit
PROJECT_DIR="$(cd -- "$PROJECT_DIR" && pwd -P)" || exit
export PROJECT_DIR
cd -- "$PROJECT_DIR" || exit
if node --input-type=module <<'JS'
import fs from "node:fs"
const pkg = fs.existsSync("package.json")
  ? JSON.parse(fs.readFileSync("package.json", "utf8")) : {}
process.exit(pkg.dependencies?.vite || pkg.devDependencies?.vite ? 0 : 1)
JS
then
  echo "Existing Vite project: skip scaffolding"
else
  (
    VITE_SCAFFOLD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/website-builder.XXXXXX")" || exit
    export VITE_SCAFFOLD_DIR
    trap 'rm -rf -- "$VITE_SCAFFOLD_DIR"' EXIT
    (cd -- "$VITE_SCAFFOLD_DIR" &&
      npm create vite@latest . -- --template react --no-interactive --no-immediate) || exit
    node --input-type=module <<'JS'
import fs from "node:fs"
import path from "node:path"
const source = process.env.VITE_SCAFFOLD_DIR
const target = process.env.PROJECT_DIR
if (!fs.existsSync(path.join(source, "package.json"))) process.exit(1)
const names = fs.readdirSync(source)
const collisions = names.filter(name =>
  fs.lstatSync(path.join(target, name), { throwIfNoEntry: false }))
if (collisions.length) {
  console.error("Scaffold collisions: " + collisions.join(", "))
  process.exit(1)
}
for (const name of names) {
  fs.cpSync(path.join(source, name), path.join(target, name), {
    recursive: true, force: false, errorOnExist: true,
  })
}
JS
  ) || exit
fi
npm install || exit
npm install tailwindcss @tailwindcss/vite || exit
```

Before running shadcn/ui initialization, configure Tailwind and the import aliases as required by the [Vite installation guide](https://ui.shadcn.com/docs/installation/vite). For a fresh scaffold, replace `src/index.css` with the following; in an existing project, retain its styles and add this import if absent:

```css
@import "tailwindcss";
```

Ensure `src/main.jsx` imports `./index.css`. For this JavaScript template, create `jsconfig.json` if absent; otherwise merge this alias into its existing `compilerOptions.paths`, preserving other settings. For an existing TypeScript project, merge the alias into its existing `tsconfig.json` and app config instead:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Configure `vite.config.js` (or the existing Vite config) with both the Tailwind plugin and Vite's matching alias. This example is for a fresh scaffold; merge its imports, plugin, alias, and base into an existing config, preserving other plugins, aliases, and settings. Keep these settings when configuring the GitHub Pages build base; the workflow selects `/` for a user/organization Pages repository and `/<repo>/` for a project Pages repository:

```js
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
```

Only after this configuration is in place, initialize shadcn/ui with an explicit Vite template and preset to avoid interactive choices, then install the shared utilities. Consult the [CLI options](https://ui.shadcn.com/docs/cli) if the available CLI version differs. If `components.json` already exists, retain its configuration and verify its CSS path and aliases instead of reinitializing:

```bash
if [ ! -f components.json ]; then
  npx shadcn@latest init --template vite --preset nova --yes --no-monorepo || exit
fi
npm install class-variance-authority clsx tailwind-merge lucide-react || exit
```

Use `import.meta.env.BASE_URL` for public asset URLs. For a client-routed SPA, prefer `HashRouter`; if the approved plan requires `BrowserRouter`, set its `basename` from `import.meta.env.BASE_URL` and provide a tested Pages 404 fallback. Do not leave root-relative asset or route URLs that bypass the configured base.

## Step 3: Execute Tasks Phase by Phase

Preserve the original site's brand, substantive content, and core journeys while implementing the specified improvements and user instructions. Use real source assets when accessible; create suitable substitutes for optional missing assets and record them. Do not invent testimonials, business claims, or nonfunctional backend actions.

Process each phase from tasks.md in order. For each task:

1. Implement the specified components/features
2. Follow the PRD for improvement alignment
3. Collect assets from the original site as specified in the plan
4. Create new assets where specified
5. Verify the build succeeds: `npm run build`

### Phase 1: Landing Page

Build the landing/home page first. This must be independently usable:

- Hero section with headline, subtext, CTA
- Navigation
- Footer
- Responsive layout (mobile + desktop)
- Applied style from the PRD (colors, typography, spacing)

### Phase 2: Core Pages

Build additional pages per the plan:

- About, features, contact, or other specified pages
- Shared components (nav, footer, buttons)
- Routing between pages

### Phase 3: Optimization

Apply performance, SEO, and security improvements:

- Image optimization (compress, lazy load)
- Code splitting (Vite handles this by default)
- SEO meta tags, structured data, Open Graph tags
- Security controls supported by the static host; record unsupported response-header changes instead of claiming meta tags implement them

## Step 4: Asset Management

For each asset listed in tasks.md:

- **[Collect]**: Fetch from the original site using `WebFetch` or direct URL access. Save to `public/assets/` or `src/assets/`.
- **[Create]**: Generate or write new assets. This includes:
  - Rewritten copy/text content
  - New component code
  - Generated SVG icons
  - Brand color values from the PRD

## Step 5: Build and Verify

After all tasks are complete, verify the rendered result as well as the build:

```bash
npm run build
```

Verify each item and record the observed result:
- `npm run build` exits 0 and `dist/index.html` exists.
- `dist/` holds only static files; it has no server entry point or API route.
- `npm run preview` serves `/` with HTTP 200.
- In an available browser, the hero headline from tasks.md is visible at `/`, and every planned route renders after a direct load.
- Inspect desktop and mobile layouts (for example 1440px and 390px when viewport control is available): text is readable, navigation and CTAs remain usable, no horizontal overflow occurs, and images have correct dimensions.
- Exercise navigation, mobile menu, primary CTAs, and any forms or other in-scope interactions. Preserve the original destination for externally served actions; never label an unconnected submission successful.
- Check heading order, image alternatives, form labels, visible keyboard focus, and keyboard operation of menus/dialogs.
- Compare screenshots or observed rendered states against the source and PRD. Fix concrete layout, content, asset, or interaction regressions; document qualitative improvements and any unmet targets.
- Allow up to two corrective passes for failed quality checks, rebuilding and repeating affected checks. Record remaining defects and mark the result `PARTIAL` if the site remains usable, or `FAIL` otherwise.
- If browser or viewport control is unavailable, record the specific render/interaction checks as untested; do not claim them as passed.
- Keep a working preview when possible and record its URL and exact restart command, including the project directory and chosen port.

## Step 6: Deploy to GitHub Pages

Create `.github/workflows/deploy-pages.yml`. Pages must deploy the verified Vite `dist/` artifact through GitHub Actions—not the repository root or a branch folder:

```yaml
name: Deploy Vite site to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: npm
      - uses: actions/configure-pages@v5
      - run: npm ci
      - name: Configure Vite base path
        shell: bash
        run: |
          repo_name="${GITHUB_REPOSITORY#*/}"
          if [[ "$repo_name" == *.github.io ]]; then
            echo "VITE_BASE_PATH=/" >> "$GITHUB_ENV"
          else
            echo "VITE_BASE_PATH=/$repo_name/" >> "$GITHUB_ENV"
          fi
      - run: npm run build
      - name: Verify static artifact
        run: test -f dist/index.html
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy Pages artifact
        id: deployment
        uses: actions/deploy-pages@v4
```

Resolve the intended deployment target from explicit user instructions, an existing dedicated clone remote, or a new dedicated repository in the authenticated user's account when publishing this clone is authorized. Check name availability and choose a unique name for a new repository; never overwrite an unrelated repository or change repository visibility to enable Pages. Use available credential tools; do not request or expose tokens in chat.

Before using a discovered git remote, verify that the worktree root is the resolved clone project. If git discovers a containing repository, ignore that repository and initialize a dedicated repository in the clone directory before commit/push. Never stage or publish files from the containing worktree.

If authorized deployment access is unavailable, save the workflow, retain the verified local `dist/` and preview, record `deployment_status: unavailable` and its reason, skip the deployed re-audit, emit metadata, and continue to the final report. Do not block the local build on a repository question.

When deployment is available, run any repository-required secret scan, then commit and push only this project's source, lockfile, Vite configuration, and workflow. Exclude analysis/reports, builder metadata, screenshots, and other local artifacts from the uploaded `dist/`. In Repository Settings → Pages, select **GitHub Actions** as the source; never select `main / (root)` or `/docs` for this Vite build. Allow at most two attempts to correct actionable deployment failures; do not retry unchanged failures or wait indefinitely for an external service.

Verify the completed workflow uploaded `dist/`, the deploy job succeeded, and its `page_url` responds. Confirm project Pages uses `https://<user>.github.io/<repo>/`, while `<user>.github.io` repositories use the root URL. Report the deployed URL from the workflow output.

## Step 7: Re-audit the Deployed Site

After the GitHub Pages URL responds successfully, run the same analyzer used for the baseline: follow the acquired `website-analyzer` SKILL.md (Dependency Preflight) with:

```text
"https://<user>.github.io/<repo>/" --output "$PROJECT_DIR/after-analysis.json"
```

Require the analyzer's structured `performance`, `seo`, and `security` objects. The comparable
performance fields are `lcp_estimate_seconds`, unitless `cls_estimate`,
`ttfb_estimate_seconds`, `total_page_weight_kb`, and `request_count`. Preserve analyzer `null`
values and caveats; do not turn estimates into measured values. If deployment or the re-audit
fails, record the error and return `PARTIAL` rather than inventing an after snapshot.

## Step 8: Emit Builder Metadata

Write a JSON metadata file for the final report phase. Copy the post-deployment analyzer objects
without changing their field names or units:

```json
{
  "url": "https://<user>.github.io/<repo>/",
  "execution_mode": "auto | review",
  "plan_acceptance": "auto | user",
  "project_dir": "<absolute local source directory>",
  "dist_dir": "<absolute local dist directory>",
  "preview_url": "<verified local preview URL or null>",
  "preview_command": "<exact command to restart preview>",
  "deployment_status": "complete | unavailable | failed",
  "deployment_reason": null,
  "verification": { "build": "pass", "render": "pass | untested | fail", "interactions": "pass | untested | fail", "accessibility": "pass | untested | fail" },
  "timestamp": "2026-05-07T12:00:00Z",
  "tasks_completed": 12,
  "tasks_total": 12,
  "assets_collected": ["logo.png", "brand-colors.json", ...],
  "assets_created": ["cta-copy.txt", "hero-icon.svg", ...],
  "deviations": [],
  "build_output_size_kb": 450,
  "after_snapshot_source": "after-analysis.json",
  "after_snapshot_status": "complete | partial | unavailable",
  "performance": {
    "lcp_estimate_seconds": 1.8,
    "cls_estimate": 0.03,
    "ttfb_estimate_seconds": 0.2,
    "total_page_weight_kb": 650,
    "request_count": 32,
    "notes": "estimated from static analysis"
  },
  "security": {
    "https": true,
    "mixed_content": false,
    "security_headers": ["strict-transport-security"],
    "exposed_metadata": [],
    "note": "Surface-level check only. Not a full security audit."
  },
  "seo": {
    "score": 94,
    "title_tag": "present",
    "meta_description": "present",
    "heading_structure": "h1:1 h2:4",
    "alt_text_coverage": 1.0,
    "structured_data": "present",
    "canonical_url": "present",
    "robots_sitemap": "robots=ok | sitemap=found",
    "dimension_scores": {
      "meta_tags": 95,
      "heading_structure": 85,
      "image_alt_text": 100,
      "structured_data": 100,
      "crawlability": 90
    }
  },
  "tech_stack": {
    "bundler": "vite",
    "framework": "react",
    "ui": "shadcn/ui",
    "css": "tailwindcss"
  }
}
```

`build_output_size_kb` is the complete build artifact size, not page weight; never use it as
`performance.total_page_weight_kb`. Use actual observed values, not the example values. If no live deployment exists, set `url: null`, `after_snapshot_source: null`, and `after_snapshot_status: unavailable`, with a concrete deployment reason. Retain the structured `performance`, `seo`, and `security` objects and their field names; set unavailable metric/check values to JSON `null`, including `seo.score` and each of the five `seo.dimension_scores` values. Keep explanatory notes about the missing deployment. Local preview checks are separate evidence and must not masquerade as a post-deployment audit. Write metadata to `$PROJECT_DIR/builder-metadata.json`.

## Acceptance Criteria

Verify the expected output before deployment is marked complete:

- `npm run build` exits 0 and `dist/index.html` exists.
- `.github/workflows/deploy-pages.yml` runs `npm ci` and `npm run build`, uploads exactly `dist/` as a Pages artifact, and deploys it with the required Pages permissions and environment.
- The workflow-derived `VITE_BASE_PATH` is `/` for user/organization Pages and `/<repo>/` for project Pages; Vite, internal routes, and asset URLs use that base consistently.
- Every approved task is represented in `tasks_completed` or named in `deviations`; assert `tasks_completed <= tasks_total`.
- Internal routes and collected asset paths resolve under the GitHub Pages base path, including a direct-refresh check for every supported route strategy.
- `builder-metadata.json` parses and contains the live URL or null, execution mode, acceptance source, source/dist paths, local preview URL and restart command, deployment status/reason, observed verification results, task counts, asset lists, deviations, output size, exact tech stack, after-snapshot status, and structured performance/SEO/security objects.
- A `PASS` result requires successful applicable quality checks, a responsive Pages URL and a complete comparable after snapshot with every required performance field, SEO overall/dimension score, and security check non-null.
- Deployment, analyzer, required after-value, or required quality-check gaps (including untested browser checks) are recorded and force `PARTIAL`; a metadata write failure is `FAIL`.
- No credentials or secret environment values appear in generated assets or metadata. Local paths are permitted only in local delivery metadata; exclude that metadata from the public artifact.
- The final summary follows the output contract below.
- Reviewer understanding (evaluation guidance, not a runtime gate): the opening line states the result and status; estimates, assumptions, and untested checks are labeled; each material claim traces to a command result, file, or URL; the next decision is named. Without reviewer feedback, human understanding stays unconfirmed.

## Edge Cases

- Existing repository or remote: inspect `git status` and `git remote -v`; use the already authorized dedicated target without another confirmation. Ask only if the target is ambiguous or unrelated.
- Dirty working tree: preserve user changes and follow Repository Handling; never discard them.
- Build succeeds but deployment fails: keep the verified local build, record the error, set the after snapshot unavailable, and return `PARTIAL`.
- Deployment succeeds but the re-audit is incomplete: preserve nulls and analyzer caveats, set `after_snapshot_status` to `partial`, and return `PARTIAL`.
- A task conflicts with the PRD: in auto mode, use the latest user instructions and PRD intent, document the adaptation, and continue if scope stays clear. Ask only for an unresolved material ambiguity; in review mode, request clarification.

## Step Completion Reports

```
◆ Build Phase 1 — Landing Page
······································································
  Project initialized:    √ pass
  Landing page built:     √ pass
  Assets collected:       √ pass (<N>)
  Build succeeds:         √ pass
  ____________________________
  Result:                 PASS

◆ Build Phase 2 — Core Pages
······································································
  Pages built:            √ pass (<pages>)
  Routing configured:     √ pass
  ____________________________
  Result:                 PASS

◆ Build Phase 3 — Optimization
······································································
  Performance applied:    √ pass
  SEO applied:            √ pass
  Security applied:       √ pass
  ____________________________
  Result:                 PASS

◆ Deploy
······································································
  Repository created:     √ pass
  GitHub Pages configured: √ pass (<url>)
  After snapshot:         √ complete | × partial ([missing])
  Metadata emitted:       √ pass
  ____________________________
  Result:                 PASS | PARTIAL | FAIL
```

End the run with this summary (the **output contract**). The result comes first:

```text
Result:       PASS | PARTIAL | FAIL — <deployed URL, or where the build stopped>
Evidence:     <build, preview, deploy, and re-audit checks with observed results; builder-metadata.json path>
Uncertainty:  <static-analysis estimates, untested render/route checks, null after-metrics — or "none">
Website:      <verified Pages or local preview URL; preview restart command>
Decision:     <required action for a concrete blocker> | No approval needed
```
