# tasks.md Template

Use this as the only output template. Keep the Phase 1 setup task's Pages-artifact acceptance criteria verbatim; fill the remaining phases and tasks from the approved PRD.

```markdown
# Implementation Plan: <site name>
**Source PRD:** prd.md
**Date:** <date>

---

## Overview

Brief summary of the implementation approach and phase ordering rationale.

## Phase 1: Landing Page

The landing/home page is built first so it can be shown to potential users early.

### Task 1.1: Project Setup

**Scope:** Initialize Vite + React + shadcn/ui + Tailwind CSS project. Configure build, base-aware routing/assets, and deterministic GitHub Actions Pages artifact deployment.

**Outputs:** Working project scaffold, base-aware Vite configuration, and `.github/workflows/deploy-pages.yml`.

**Acceptance Criteria:**
- `npm run dev` starts a local dev server
- `npm run build` produces `dist/index.html`
- `vite.config.*` consumes `VITE_BASE_PATH`; the workflow sets `/` for user/organization Pages and `/<repo>/` for project Pages
- Internal routes and public assets resolve under the configured base; the selected SPA route strategy has a direct-refresh check
- The Pages workflow runs `npm ci` and `npm run build`, uploads exactly `dist/` with `actions/upload-pages-artifact`, and deploys it with `actions/deploy-pages`
- Pages source is GitHub Actions, never repository-root, `/docs`, or branch-folder publishing

**Assets Needed:**
- [Collect] Logo, brand colors, brand name from original site
- [Create] Project repository on GitHub

### Task 1.2: Landing Page Layout

**Scope:** Build the hero section, nav, CTA, and footer based on the improvement proposal. Implement the improved layout, not a clone.

**Outputs:** Landing page component with improved structure.

**Acceptance Criteria:**
- Hero section with clear headline, subtext, primary CTA above the fold
- Responsive layout (mobile + desktop)
- Navigation matches the improved structure

**Assets Needed:**
- [Collect] Hero imagery, copy text, brand colors
- [Create] New CTA copy (if improvement proposes different messaging)

---

## Phase 2: Core Pages

Deeper pages beyond the landing page.

### Task 2.1: <Page Name>

**Scope:** ...
**Outputs:** ...
**Acceptance Criteria:** ...
**Assets Needed:**
- [Collect] ...
- [Create] ...

---

Repeat for each task across phases.

## Phase 3: Optimization and Polish

Performance, SEO, and security improvements from the PRD.

### Task 3.1: Performance Optimization

**Scope:** Image optimization, lazy loading, code splitting, font optimization.

**Acceptance Criteria:**
- LCP ≤ target (from prd.md metrics table)
- CLS ≤ target
- Page weight ≤ target

### Task 3.2: SEO Implementation

**Scope:** Meta tags, structured data, heading structure, alt text, canonical URLs.

**Acceptance Criteria:**
- SEO score ≥ target
- All pages have title, meta description, structured data

### Task 3.3: Security Hardening

**Scope:** HTTPS enforcement, security headers, mixed content fixes.

**Acceptance Criteria:**
- All resources loaded over HTTPS
- Key security headers present

## Asset Summary

| Asset | Source | Action |
|-------|--------|--------|
| Logo | Original site | Collect |
| Brand colors | Original site | Collect |
| Hero image | Original site | Collect |
| CTA copy | Improvement proposal | Create |
| New icons | Generated | Create |

## Deployment

1. Include `package-lock.json`, base-aware `vite.config.*`, and `.github/workflows/deploy-pages.yml` in the implementation tasks.
2. Push the approved project to the default branch and configure Repository Settings → Pages → Source as **GitHub Actions**.
3. Require the workflow to build and verify `dist/index.html`, upload exactly `dist/` as the Pages artifact, and deploy that artifact.
4. Verify project Pages at `https://<user>.github.io/<repo>/`; for a `<user>.github.io` repository, verify the root URL instead.

---

*This plan is derived from the approved improvement proposal. Actual task scope may need adjustment during implementation.*
```
