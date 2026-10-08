# Phase 6b — Deploy, re-audit, metadata

Read this after `references/build.md` verification passes or ends `PARTIAL`.

## Pages workflow

Create `.github/workflows/deploy-pages.yml`. Pages deploys the verified `dist/` artifact through
GitHub Actions, never the repository root or a branch folder:

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

## Deploy

1. **Target.** Use explicit user instructions, an existing dedicated clone remote, or a new
   repository in the authenticated account. Check name availability and pick a unique name.
   Never overwrite an unrelated repository or change visibility to enable Pages. Use available
   credential tools; never request or print tokens.
2. **Dedicated repo.** If `git rev-parse --show-toplevel` inside `PROJECT_DIR` is not
   `PROJECT_DIR`, ignore that containing repository and run `git init` in `PROJECT_DIR`. Never
   stage or publish files from a containing worktree.
3. **Source policy.** Before any publication, rerun `references/source-policy.md` on the
   original URL and every observed redirect. Publish only if all are public and the saved run
   has no earlier non-public verdict. Unknown/unresolved sources also stay local. Deliver the
   preview with `deployment_status: unavailable` and the reason; this applies with `--no-optimize`.
4. **No access.** Keep the workflow, the verified `dist/` and the preview; set
   `deployment_status: unavailable` with the reason; skip the re-audit; go to metadata. Never
   block the local build on a repository question.
5. **Publish.** Run any required secret scan. Commit and push only source, lockfile, Vite config
   and workflow. Keep `analysis.json`, `after-analysis.json`, `report.md`, `prd.md`, `tasks.md`,
   `final-report.md`, `builder-metadata.json`, `run-state.json`, `scan-attempt.json`,
   `optimization/` and screenshots out of commits and
   out of `dist/` (add them to `.gitignore`). Set Pages source to **GitHub Actions**. At most two
   correction attempts for actionable failures; never retry an unchanged failure or wait without a
   limit.
6. **Check.** The workflow uploaded `dist/`, the deploy job succeeded, and `page_url` responds.
   Project Pages live at `https://<user>.github.io/<repo>/`; `<user>.github.io` repos at the root.

## Re-audit

When the Pages URL responds, run Phase 1 again (`references/analyze.md`) on it with output
`$PROJECT_DIR/after-analysis.json`. Keep its `null` values and caveats. A failed re-audit sets
`after_snapshot_status: partial | unavailable` and caps the run at `PARTIAL`. Do not re-run
design-optimizer, search-optimizer, or the isitagentready.com scan on the clone; findings are
verified against `dist/` in `references/build.md` step 3.

## builder-metadata.json

Write `$PROJECT_DIR/builder-metadata.json`. Copy the re-audit's `performance`, `seo` and
`security` objects unchanged (field names and units as in `references/analyze.md`):

```json
{
  "url": "https://<user>.github.io/<repo>/",
  "execution_mode": "auto | review",
  "plan_acceptance": "auto | user",
  "project_dir": "<abs path>", "dist_dir": "<abs path>",
  "preview_url": "<url or null>", "preview_command": "<exact restart command>",
  "deployment_status": "complete | unavailable | failed", "deployment_reason": null,
  "verification": {"build": "pass", "render": "pass | untested | fail",
                   "interactions": "pass | untested | fail", "accessibility": "pass | untested | fail"},
  "optimization": {"status": "complete | partial | skipped",
                   "verified": ["F-01"], "unverified": [], "failed": [], "out_of_scope": ["F-03"]},
  "timestamp": "<UTC ISO>", "tasks_completed": 12, "tasks_total": 12,
  "assets_collected": [], "assets_created": [], "deviations": [],
  "build_output_size_kb": 450,
  "after_snapshot_source": "after-analysis.json",
  "after_snapshot_status": "complete | partial | unavailable",
  "performance": {}, "security": {}, "seo": {},
  "tech_stack": {"bundler": "vite", "framework": "react", "ui": "shadcn/ui", "css": "tailwindcss"}
}
```

- `build_output_size_kb` is the whole artifact, never `performance.total_page_weight_kb`.
- With no deployment: `url: null`, `after_snapshot_source: null`,
  `after_snapshot_status: unavailable`, and the three objects keep their keys with `null` values
  (including `seo.score` and all five `seo.dimension_scores`). Local preview checks are separate
  evidence, never a post-deployment audit.
- `tasks_completed <= tasks_total`; every task not completed is named in `deviations`.
- No credentials or secret values in assets or metadata.

```text
◆ Phase 6b — Deploy (6 of 7)
  Workflow:        √ deploys dist/ via Actions
  Pages URL:       √ (url) | — unavailable (reason) | × failed (reason)
  After snapshot:  √ complete | × partial | — unavailable
  Metadata:        √ builder-metadata.json parses
  Result:          PASS | PARTIAL | FAIL
```

`PASS` needs a responsive Pages URL and a complete after snapshot. A metadata write failure is
`FAIL`.
