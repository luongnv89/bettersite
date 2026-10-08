# Analysis Field Translation Guide

Phase 3 reads `analysis.json` (written in Phase 1). Use this table to map each field to a plain-language report section.

## Input Shape

The canonical schema is in `references/analyze.md` → *Output schema*. An `error` variant
(`{"url": "<url>", "error": "unreachable", "detail": "<error>"}`) stops the run; never draft a
report from it.

## Field-to-Section Mapping

| Analyzer field | Report section | Translation rule |
|---|---|---|
| `ui_ux.layout` | How It Looks and Works | Spell out the layout name — "single-column" → "a single column down the page". |
| `ui_ux.visual_hierarchy` | How It Looks and Works | Restate as "what catches the eye first". Avoid the term "visual hierarchy". |
| `ui_ux.friction_points` | How It Looks and Works | Convert each to a concrete observation: "slow nav" → "the navigation is slow to respond". |
| `ui_ux.responsive` | How It Looks and Works | "mobile-first" → "designed for phones first; works well on small screens". |
| `category` + `category_confidence` | What Kind of Site This Is | Use confidence to soften: < 0.6 → "appears to be"; ≥ 0.9 → state plainly. |
| `style.typography` | Design and Style | Replace font-family jargon with feel: "modern sans-serif fonts that feel clean". |
| `style.palette` | Design and Style | Translate hex to color families: "cool blues and grays with orange accents". |
| `style.spacing` | Design and Style | "compact" → "densely packed"; "spacious" → "lots of breathing room". |
| `style.motion` | Design and Style | "heavy" → "lots of animation"; "minimal" → "very little movement". |
| `performance.lcp_estimate_seconds` | Performance | "How fast content appears". This is an estimate in seconds; benchmarks: < 2.5s good, 2.5–4s fair, > 4s slow. |
| `performance.cls_estimate` | Performance | "How stable the page feels while loading". This estimate is unitless; < 0.1 stable, ≥ 0.25 jumpy. |
| `performance.ttfb_estimate_seconds` | Performance | "How quickly the server responds". This is an estimate in seconds; label it as estimated. |
| `performance.total_page_weight_kb` | Performance | "How much data the page uses". Compare to images: "≈ N average photos worth". |
| `performance.request_count` | Performance | "Number of pieces the page needs to load". |
| `security.https` / `mixed_content` | Security Overview | HTTPS + no mixed content → "traffic between your browser and the website is encrypted". This is a transport observation, not a claim about encryption beyond that connection. |
| `security.security_headers` | Security Overview | Translate to "the site sends a few security signals to browsers" — never list header names. |
| `security.note` | Security Overview | Always include the "not a full security audit" caveat. |
| `seo.score` | Search Engine Visibility | Bucket: ≥ 90 excellent, 70–89 good, 50–69 fair, < 50 poor. |
| `seo.dimension_scores.*` | Search Engine Visibility | Translate each: low `image_alt_text` → "Images are missing alternative text, which helps search and accessibility". |
| `seo.title_tag` / `meta_description` | Search Engine Visibility | "missing" → "no title/description for search engines to read". |
| `seo.heading_structure` | Search Engine Visibility | If h1 ≠ 1 → "the heading structure could be improved". |

## Null Handling

Any analyzer field may be `null` when the metric couldn't be computed. Translation rule: omit the corresponding line from the report rather than writing "unknown" or "N/A". Note in the *Summary and Next Steps* section that some metrics were unavailable, if the omission affects the conclusions.
