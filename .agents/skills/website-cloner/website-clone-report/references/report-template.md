# report.md Template

Use this as the only output template. Write in plain language: translate technical metrics, never just list them. Fill each section only with facts traceable to the analyzer JSON.

```markdown
# Website Analysis Report: <site name>
**URL:** <url>
**Acceptance:** auto | user
**Date:** <date>

---

## At a Glance

A plain-language summary: what this site is, who it's for, and its overall health.
Example: "This is a SaaS landing page targeting small businesses. It looks polished and modern,
but loads slowly on mobile connections and is missing key SEO elements that would help it
rank in search results."

## How It Looks and Works

Translate UI/UX findings into plain language:
- Layout style (e.g., "clean single-column layout with a large hero image")
- What draws attention first
- Any friction points (e.g., "the sign-up button is hidden below the fold")
- Responsive behavior

## What Kind of Site This Is

Category description in plain terms:
- "This is an e-commerce store selling handcrafted furniture"
- "This is a documentation site for a developer tool"

## Design and Style

Describe the visual identity accessibly:
- Typography feel (e.g., "modern sans-serif fonts that feel clean and professional")
- Color palette (e.g., "cool blues and grays with orange accents for calls to action")
- Spacing and density
- Motion and interactivity feel

## Performance

Translate metrics to plain language:
- **How fast content appears:** "The main content takes about X seconds to appear.
  For comparison, sites that load in under 2 seconds tend to keep visitors engaged."
- **Visual stability:** "The page layout is mostly stable while loading.
  You're unlikely to notice elements jumping around."
- **How quickly the server responds:** "The estimated server response delay is X seconds."
- **How much data it uses:** "The page weighs about X KB, roughly equivalent to
  loading Y average-sized images."
- **Number of resources:** "The page makes about X requests to load."

## Security Overview

Surface-level observations only, in plain language:
- "The site uses HTTPS, which means data between your browser and the site is encrypted."
- "The site sends a few security signals to browsers, but could strengthen them."

Always note this is not a full security audit.

## Search Engine Visibility

SEO findings translated:
- Overall score with context: "SEO score: X/100 — [excellent/good/fair/poor]"
- "The page has a title and description that search engines can read."
- "The heading structure could be improved to help search engines understand the content."
- "Images are missing alternative text, which helps with accessibility and search."

## Summary and Next Steps

A brief section with actionable takeaways:
- What's working well (2–3 points)
- What needs attention (2–3 points)
- What could be improved (2–3 points)

---

*This report was generated from automated analysis. All findings are based on a single-page crawl
and may not reflect the full site.*
```
