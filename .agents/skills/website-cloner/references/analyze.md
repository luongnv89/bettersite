# Phase 1 — Analyze the original

Read this at Phase 1, and again at Phase 6 for the after-deploy re-audit. Output:
`$PROJECT_DIR/analysis.json` (baseline) or `$PROJECT_DIR/after-analysis.json` (re-audit).
Never bypass authentication, paywalls, or bot protections.

## Steps

1. **Fetch.** Use an available page-fetch tool (WebFetch, TinyFish fetch, curl, or a browser);
   for a private host use a local tool (curl or a local browser), since remote fetchers cannot
   reach it.
   For a rendered SPA, use browser inspection when available and keep rendered observations
   separate from crawlable-HTML evidence. Also fetch `/robots.txt` and `/sitemap.xml` at the
   origin.
2. **Extract.** `<title>`, meta tags (description, keywords, Open Graph, Twitter), the heading
   hierarchy, images and their `alt`, links, script/style counts and sizes, JSON-LD, canonical
   URL, robots meta.
3. **Estimate performance** from static analysis (see table).
4. **Check surface security:** HTTPS, mixed content, the HSTS / X-Content-Type-Options /
   X-Frame-Options / CSP headers, exposed metadata (debug endpoints, secrets in comments).
   Always label it surface-level.
5. **Score SEO** with the rubric below and `scripts/score_seo.py`.
6. **Classify** layout, category, and style.
7. **Write JSON** to the output path, then parse it back to confirm it is valid.

When browser access is available at Phase 1, also inspect the source at 1440px and 390px wide
to ground layout and interaction decisions.

| Metric | Method |
|---|---|
| `total_page_weight_kb` | Sum of referenced resource sizes; estimate image sizes from layout |
| `request_count` | Count `<img>`, stylesheets, `<script>`, font references |
| `lcp_estimate_seconds` | From above-the-fold content size; minimum 0.5 s for bare HTML |
| `cls_estimate` (unitless) | From layout-shift signals (missing dimensions, late loaders) |
| `ttfb_estimate_seconds` | From hosting signals: static → low, dynamic → moderate |

## SEO scoring

Give each dimension an evidence-backed integer 0–100, or `null` when it cannot be computed.
Pass exactly the five-key `dimension_scores` map to `scripts/score_seo.py`; it renormalizes
weights over known dimensions and returns `score`, `status`, `availability`, `reason` and
`unavailable_dimensions`. CLI contract: `references/seo-scoring.md`. Never compute, round or
override the aggregate in prose.

| Dimension | Weight | Sub-score rubric |
|---|---|---|
| `meta_tags` | 20% | +50 title present and 10–60 chars; +50 description present and 50–160 chars. −25 each for title or description out of range, or a duplicate title. Floor 0. |
| `heading_structure` | 15% | 100: one `<h1>` and ≥1 `<h2>`. 70: one `<h1>`, no `<h2>`. 40: zero or several `<h1>`. −20 for a skipped level. Floor 0. |
| `image_alt_text` | 15% | `round(100 × non_empty_alt / total_img)`; 100 when there are no images. `alt=""` counts only with `role="presentation"`. |
| `structured_data` | 20% | 100 valid JSON-LD; 60 only Open Graph / Twitter Card; 30 only microdata/RDFa; 0 none. |
| `crawlability` | 30% | +40 absolute canonical; +30 robots.txt fetchable and not `Disallow: /`; +30 sitemap referenced or fetchable. Cap 100. |

An all-null map keeps `score: null`, `status: "PARTIAL"`, `availability: "unavailable"`; never
substitute 0 or 100.

## Output schema

```json
{
  "url": "https://example.com",
  "timestamp": "2026-05-07T12:00:00Z",
  "ui_ux": {
    "layout": "single-column | two-column | grid | ...",
    "visual_hierarchy": "what draws attention first",
    "components": ["nav", "hero", "cta", "footer"],
    "responsive": "desktop-first | mobile-first | adaptive | unknown",
    "friction_points": ["missing CTA"]
  },
  "category": "saas-landing | portfolio | e-commerce | blog | docs | dashboard | marketing-site | web-app | other",
  "category_confidence": 0.9,
  "style": {"typography": "", "palette": ["#hex"], "spacing": "compact | comfortable | spacious",
            "motion": "minimal | moderate | heavy", "aesthetic": ""},
  "performance": {"lcp_estimate_seconds": 2.5, "cls_estimate": 0.05, "ttfb_estimate_seconds": 0.3,
                  "total_page_weight_kb": 1200, "request_count": 45, "notes": "estimated from static analysis"},
  "security": {"https": true, "mixed_content": false, "security_headers": ["strict-transport-security"],
               "exposed_metadata": [], "note": "Surface-level check only. Not a full security audit."},
  "seo": {"score": 72, "status": "PASS | PARTIAL", "availability": "available | partial | unavailable",
          "reason": null, "title_tag": "present | missing | duplicate",
          "meta_description": "present | missing | too-short", "heading_structure": "h1:1 h2:4",
          "alt_text_coverage": 0.85, "structured_data": "present | missing",
          "canonical_url": "present | missing", "robots_sitemap": "robots=ok | sitemap=found",
          "dimension_scores": {"meta_tags": 80, "heading_structure": 60, "image_alt_text": 90,
                               "structured_data": 50, "crawlability": 75}}
}
```

Error variants stop the run: `{"url": "<url>", "error": "unreachable | paywall | redirect-loop |
empty", "detail": "<reason>"}`. A JS-heavy SPA is not an error: add
`"note": "SPA detected — crawlable content only"` and continue.

## Phase checks

- JSON parses and has `url`, `timestamp`, `ui_ux`, `category`, `style`, `performance`,
  `security`, `seo`.
- `seo.score` is the helper's output; all five `dimension_scores` keys are present (integer or
  `null`). An `error[seo-input]` diagnostic stops the phase until the map is corrected.
- Every unavailable measurement is `null`, never an invented value.

```text
◆ Phase 1 — Analyze (1 of 7)
  Input fetched:   √ | × (reason)
  Six dimensions:  √ | × partial (missing)
  SEO helper:      √ | × partial (null dimensions)
  analysis.json:   √ (path)
  Result:          PASS | PARTIAL | FAIL
```
