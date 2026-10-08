<!--
  DO NOT READ THIS FILE — This README.md is for human catalog browsing only.
  It ships inside the .skill package but is NEVER auto-loaded into agent context.
  The runtime loader only reads SKILL.md + references/ + scripts/ + agents/ when the skill triggers.
  If you're an AI agent, read the SKILL.md file instead for skill instructions.
-->

# Website Improvement PRD

> Turns approved end-user report into a full improvement proposal with what/why/value for each change. Writes prd.md after user approval.

## Highlights

- Every proposed change includes what, why, and measurable expected-value statement
- Metrics summary table: before/after targets per dimension
- Approval gate: persists prd.md only after explicit user approval
- Structured for downstream consumption by website-implementation-plan

## When to Use

| Say this... | Skill will... |
|---|---|
| "propose improvements for this site" | Create improvement proposal with metrics |
| "create a PRD for the website rebuild" | Write structured prd.md |
| "plan improvements with measurable metrics" | Pair each change with current vs. target values |

## How It Works

```mermaid
graph TD
    A["Read approved report.md and analysis.json"] --> B["Identify improvements per dimension"]
    B --> C["Define what, why, and expected value per change"]
    C --> D["Compute metrics summary: current vs target"]
    D --> E["Assemble draft prd.md"]
    E --> F["Present draft for review"]
    F --> G{"Approved?"}
    G -->|Edit| H["Incorporate edits"]
    H --> F
    G -->|Regenerate| B
    G -->|Approve| I["Persist prd.md and print STATUS: approved"]
    style A fill:#4CAF50,color:#fff
    style I fill:#2196F3,color:#fff
```

## Usage

```
/website-improvement-prd <report.md> <analysis.json>
```

The slash command applies when this skill is installed as a top-level skill. Inside the website-cloner suite, the orchestrator loads this SKILL.md directly.

## Output

`prd.md` — structured improvement proposal with what/why/value per change.
