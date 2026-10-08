<!--
  DO NOT READ THIS FILE — This README.md is for human catalog browsing only.
  It ships inside the .skill package but is NEVER auto-loaded into agent context.
  The runtime loader only reads SKILL.md + references/ + scripts/ + agents/ when the skill triggers.
  If you're an AI agent, read the SKILL.md file instead for skill instructions.
-->

# Website Cloner

> 6-phase website cloning and improvement orchestrator. Takes a URL and produces an improved version built with Vite + React + shadcn/ui + Tailwind CSS, deployable to GitHub Pages.

## Highlights

- Orchestrates 6 sibling skills end-to-end: analyze, report, propose, plan, build, final report
- Approval gates after the report, proposal, and plan phases — never advances without user approval
- Produces `prd.md` (improvement proposal) and `tasks.md` (phased implementation plan)
- Targets serverless front-end deployment to GitHub Pages

## When to Use

| Say this... | Skill will... |
|---|---|
| "clone this site https://example.com" | Run the full 6-phase pipeline |
| "rebuild this website" | Start analysis and produce an improved version |
| "make a better version of <url>" | Analyze, propose improvements, and build |

## How It Works

```mermaid
graph TD
    A["Dependency preflight: discover + check bundled phase skills"] --> B["Phase 1: Analyze the URL with website-analyzer"]
    B --> C["Phase 2: Report with website-clone-report"]
    C --> D{"Report approved?"}
    D -->|Request changes| C
    D -->|Approve| E["Phase 3: Propose prd.md with website-improvement-prd"]
    E --> F{"prd.md approved?"}
    F -->|Request changes| E
    F -->|Approve| G["Phase 4: Plan tasks.md with website-implementation-plan"]
    G --> H{"tasks.md approved?"}
    H -->|Request changes| G
    H -->|Approve| I["Phase 5: Build and deploy with website-builder"]
    I --> J["Phase 6: Final report with website-clone-final-report"]
    style A fill:#4CAF50,color:#fff
    style J fill:#2196F3,color:#fff
```

## Usage

```
/website-cloner https://example.com
```

## Resources

| Path | Description |
|---|---|
| `website-analyzer/` | Phase 1: analyze the URL into `analysis.json` |
| `website-clone-report/` | Phase 2: plain-language `report.md`, approval gate |
| `website-improvement-prd/` | Phase 3: improvement proposal `prd.md`, approval gate |
| `website-implementation-plan/` | Phase 4: phased `tasks.md`, approval gate |
| `website-builder/` | Phase 5: build, deploy to GitHub Pages, and emit `builder-metadata.json` |
| `website-clone-final-report/` | Phase 6: before/after comparison `final-report.md` |
| `LICENSE` | MIT license |

## Output

- `analysis.json` — Phase 1 structured analysis
- `report.md` — Phase 2 plain-language report (approved)
- `prd.md` — Phase 3 improvement proposal with metrics
- `tasks.md` — Phase 4 phased implementation plan
- Built site — Vite + React + shadcn/ui + Tailwind CSS on GitHub Pages
- `final-report.md` — Phase 6 before/after comparison
