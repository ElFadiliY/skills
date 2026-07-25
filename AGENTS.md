# AGENTS.md — skills

Public Claude skills and plugins, published under **`ElFadiliY/skills`** (a personal remote,
not the Exiid-Labs org).

## ⚠ This repo is public

Everything committed here is world-readable the moment it lands. Before writing a line:

- **No client or customer names**, no revenue or lead numbers, no internal URLs, no
  screenshots of internal tooling, no Supabase/Vercel project ids, no secrets or tokens —
  not even in an example, a fixture, or a code comment.
- **No content derived from a denylisted project.** business-os, billing-platform,
  dentistry-leads, and rankup are structurally off-limits for anything outward-facing; the
  same rule applies here. A skill may teach a *pattern* learned inside the fleet, but the
  private specifics that make it identifiable stay out.
- The test is the workspace's build-in-public rule: **if stripping the private detail kills
  the skill, it was never a skill — it was a changelog.**

## Layout

One directory per skill/plugin:

```
<skill-name>/
  SKILL.md                 the skill itself (frontmatter: name, description)
  plugin.json              plugin manifest
  .claude-plugin/
  references/              supporting docs the skill loads on demand
  README.md · LICENSE
```

Currently: `business-model-lifecycle-auditor`.

## Conventions

- `SKILL.md` frontmatter `description` is what a model matches against to decide whether to
  load the skill — write it as concrete trigger phrases a user would actually say, not as a
  summary of the contents.
- Keep the always-loaded part small; push detail into `references/` so it loads only when
  needed.
- Each skill carries its own LICENSE. Don't vendor third-party content without checking its
  license first.
- No build step, no CI. Plain markdown + JSON.

## Fleet rules

Part of the Exiid Labs workspace (`labs/` cluster); conventions in `exiid-ops/AGENTS.md`.

- Branch → PR → merge. Never `git add -A`.
- Fill `.github/PULL_REQUEST_TEMPLATE.md` — the summary is the review surface.
