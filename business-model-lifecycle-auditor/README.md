# Business Model Lifecycle Auditor

Full lifecycle business model auditor for AI agents. Design, diagnose, fix, and test any business model — from first canvas to re-audit.

## Install

```bash
# skills.sh (Claude Code, Cursor, Windsurf, OpenCode, Copilot)
npx skills add ElFadiliY/skills --skill business-model-lifecycle-auditor

# Claude Code plugin
claude plugin install business-model-lifecycle-auditor@ElFadiliY/skills

# Manual (any agent)
Copy this directory to your agent's skills folder
```

## What It Does

Give it your business numbers (or best guesses) and get back:

- **15-component composite score** (0–10) pinpointing where your model is strong and broken
- **#1 constraint** identified using Goldratt's Theory of Constraints
- **Prioritized action plan** — this week, this month, this quarter — with emotional barriers named
- **Experiment designs** with sample sizes, success criteria, and lag windows
- **Scenario models** — worst/base/best 12-month projections

## How It Works

```
Phase 0: DESIGN    → Canvas (Lean/BMC/VPC), Value-Market Fit, Revenue Model
Phase 1: DIAGNOSE  → Unit Economics, Retention, Channels, Concentration, Time, Stress Test, Moat, Team, Risks
Phase 2: FIX       → Complexity, Pricing Architecture, Discounts, THE Constraint (TOC)
Phase 3: TEST      → Experiments, Scenarios, Composite Score, Action Plan, Re-Audit
```

**4 phases, 20 steps, adaptive.** Quick audit needs 3 questions. Full audit runs 2 sessions. Jump to any step.

## Supported Models

SaaS · Marketplace · E-commerce/DTC · Agency · Info Products · Usage-Based/API

## Built On

Osterwalder (Business Model Canvas) · Ash Maurya (Lean Canvas) · Alex Hormozi (Scale & Leverage) · Eliyahu Goldratt (Theory of Constraints) · OpenView/Bessemer/KeyBanc SaaS Benchmarks · Van Westendorp Price Sensitivity

## Quick Start

Just tell your agent:

> "Audit my business model"

Or for the fastest path:

> "Quick audit: I charge $180/mo, spend 2 hours per customer, and have 45 customers"

## File Structure

```
business-model-lifecycle-auditor/
├── .claude-plugin/
│   └── plugin.json              ← Claude Code Plugin metadata
├── SKILL.md                     ← Core instructions (374 lines)
├── plugin.json                  ← Plugin manifest
├── references/
│   ├── phase0-design.md         ← Steps 0–2: Canvas, Fit, Classification
│   ├── phase1-diagnose-economics.md   ← Steps 3–6: Unit Economics, Retention, Channels, Concentration
│   ├── phase1-diagnose-operations.md  ← Steps 7–11: Time, Stress Test, Moat, Team, Assumptions
│   ├── phase2-fix.md            ← Steps 12–15: Complexity, Pricing, Discounts, TOC Constraint
│   ├── phase3-test.md           ← Steps 16–19: Experiments, Scenarios, Composite, Re-Audit
│   └── examples.md              ← Worked examples: CloudDash (SaaS) + BrightCopy (Agency)
├── LICENSE                      ← MIT
└── README.md                    ← This file
```

## Compatibility

| Platform | Status |
|----------|--------|
| skills.sh | ✅ |
| Claude Code (plugin) | ✅ |
| Claude Code (skill) | ✅ |
| GitHub Copilot | ✅ |
| OpenCode | ✅ |
| Cursor / Windsurf | ✅ |

## License

MIT © [Yassine El Fadili](https://github.com/ElFadiliY)
