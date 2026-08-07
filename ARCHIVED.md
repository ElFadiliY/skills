# Archived — superseded by `.claude/skills/` in cortex

Moved to `Workspace/archive/skills` on 2026-07-30.

**Successor:** `cortex/.claude/skills/` — the live, maintained skill set
(`ship-a-pr-across-repos`, `release-basecommerce`, `rotate-shared-secret`,
`onboard-billing-consumer`, `draft-angles`, `supabase-tier-audit`).

The defect here was never staleness — it was having **two sources of truth for
one artifact**. Skills are only useful where the agent sessions actually run,
which is inside the ops repo, so that copy is the one that got maintained and
this one drifted: last commit 2026-02-25, five months behind every other repo in
the fleet at the time of archival.

`business-model-lifecycle-auditor` is the one skill that lived only here. If it
is wanted again, port it into `cortex/.claude/skills/` rather than reviving
this repo — that keeps the single source of truth intact.

The GitHub repo stays **archived, not deleted**: it is public (`publicity:
nameable`), so its URL may be linked from elsewhere.

GitHub remote: `ElFadiliY/skills`.
