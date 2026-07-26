# API keys in this repo

Every key this repo needs lives **in this repo**. Nothing is shared with the other Exiid
Labs repos except the script below — no central store, no keyring. Full convention:
`exiid-ops/docs/ENV-CONVENTION.md`.

```bash
./scripts/env.sh                          # declared / set / missing (never a value)
./scripts/env.sh set STRIPE_SECRET_KEY    # hidden prompt → this repo's env file
./scripts/env.sh check                    # exit 1 if a declared key is missing
./scripts/env.sh scan                     # keys the code reads but .env.example never declared
./scripts/env.sh exec -- npm run dev      # run something with this repo's env loaded
```

A key must be **declared in a committed `.env.example`** before a value can be stored for it.
A brand-new key is two steps:

```bash
./scripts/env.sh set --declare NEW_KEY    # writes the name, never a value
git commit .env.example -m "declare NEW_KEY"
./scripts/env.sh set NEW_KEY              # now the value
```

`set` reads the value at a hidden prompt: no echo, no shell history. Piping works too, for a
password manager:

```bash
op read "op://Private/Stripe/live secret" | ./scripts/env.sh set STRIPE_SECRET_KEY
```

## Handing a key to an agent

**Never paste a key into a chat.** A key in a transcript is a key in every summary of that
transcript, and rotation is the only remedy.

The flow instead: the agent works out which key and which name — it needs the codebase for
that, not the value — and gives you one `./scripts/env.sh set NAME` to run. You paste in the
terminal. The agent then runs `./scripts/env.sh` and sees

```
✓ STRIPE_SECRET_KEY    107 chars · sk_live_… · #a3f19c2b
```

Length, a public prefix, and 8 hex of a SHA-256: enough to confirm the right key is present
and that a rotation changed it, never enough to reconstruct it. Agents are denied read and
write on `.env*` on purpose, and this flow means that never has to be relaxed.

## Rules

- **`.env.example` is the contract — and the allowlist.** Every variable this repo reads, no
  real values, a one-line comment each. A name that isn't committed there can neither be `set`
  nor loaded by `exec`.
- **`exec` never sources the env file.** It parses line by line and exports only committed,
  declared names. Sourcing would run every value as shell code — and the file it would run is
  exactly the one this tool writes, which is the attack the whole design is guarding against.
  A denylist of dangerous names is unbounded; your `.env.example` is finite and shows up in a
  diff.
- **Never commit a real value.** The script gitignores its target before writing, and refuses
  outright if the target is tracked, symlinked, or hard-linked.
- **Fail loudly at startup** on a missing required key, never deep inside a request.
- **`NEXT_PUBLIC_` / `VITE_` / `PUBLIC_` ships to the browser.** Not a secret; never put one
  there.
- **Production values do not come from here.** The env file is a developer-machine artifact.
  Production goes to Vercel env vars, Supabase project secrets, or GitHub Actions secrets.
