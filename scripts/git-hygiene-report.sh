#!/usr/bin/env bash
# git-hygiene-report.sh — one-line branch/worktree drift summary for SessionStart.
# READ ONLY. Never deletes anything; just surfaces drift so it doesn't accumulate silently.
# (The origin/main fetch below only refreshes the remote-tracking ref — it never touches
# the working tree or any local branch.)
set -uo pipefail

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$ROOT" || exit 0

# Refresh origin/main so the behind-check is current. Bounded wait (~3.5s) so a slow or
# offline network never stalls a session start; a still-running fetch is left to finish
# in the background (all fds detached) and the next report benefits.
git fetch --quiet origin main >/dev/null 2>&1 </dev/null &
FETCH_PID=$!
for _ in $(seq 1 35); do kill -0 "$FETCH_PID" 2>/dev/null || break; sleep 0.1; done

wt=$(git worktree list 2>/dev/null | grep -c .)
gone=$(git for-each-ref --format='%(upstream:track)' refs/heads 2>/dev/null | grep -c '\[gone\]' || true)

# The PRIMARY checkout — first entry of the porcelain list (git guarantees the main
# worktree is listed first, from any vantage point). $ROOT is merely wherever this
# session happens to start, so any signal anchored to it flips meaning between the
# primary and a desk; everything below compares against PRIMARY instead.
PRIMARY=$(git worktree list --porcelain 2>/dev/null | head -1 | sed 's/^worktree //')
[ -n "$PRIMARY" ] || PRIMARY=$ROOT

# Desk count — informational only, never a nag trigger on its own: desks under the
# primary's .claude/worktrees/ ARE the sanctioned model, not drift.
desks=$(find "$PRIMARY/.claude/worktrees" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | grep -c . || true)

# Is `main` parked somewhere other than the primary checkout?
mainwt=$(git worktree list --porcelain 2>/dev/null \
  | awk '/^worktree /{p=substr($0,10)} /^branch refs\/heads\/main$/{print p}')
parked=""
[ -n "$mainwt" ] && [ "$mainwt" != "$PRIMARY" ] && parked=" · main parked in ${mainwt#$PRIMARY/}"

# Only nag when there's something to clean.
if [ "$gone" -gt 0 ] || [ -n "$parked" ]; then
  printf '⎇ hygiene: %s worktrees · %s gone-branch%s · %s desk%s%s  → scripts/git-tidy.sh\n' \
    "$wt" "$gone" "$([ "$gone" = 1 ] || echo es)" "$desks" "$([ "$desks" = 1 ] || echo s)" "$parked"
fi

# Behind-origin drift: local `main` vs origin/main (checked from any worktree — branch
# refs are shared). Report only; the human fast-forwards (never auto-mutate at SessionStart).
if git rev-parse --verify -q refs/heads/main >/dev/null 2>&1 \
  && git rev-parse --verify -q refs/remotes/origin/main >/dev/null 2>&1; then
  behind=$(git rev-list --count main..origin/main 2>/dev/null || echo 0)
  ahead=$(git rev-list --count origin/main..main 2>/dev/null || echo 0)
  if [ "${behind:-0}" -gt 0 ]; then
    extra=""; [ "${ahead:-0}" -gt 0 ] && extra=" (+$ahead unpushed)"
    # ROOT (not PRIMARY) on purpose: the fix is a command to paste from where this
    # session sits, so it needs -C only when main lives in a DIFFERENT worktree.
    if [ -n "$mainwt" ] && [ "$mainwt" = "$ROOT" ]; then
      fix="git pull --ff-only origin main"
    elif [ -n "$mainwt" ]; then
      fix="git -C $mainwt pull --ff-only origin main"
    else
      fix="git fetch origin main:main"
    fi
    printf '⎇ origin: main is %s commit%s behind origin/main%s  → %s\n' \
      "$behind" "$([ "$behind" = 1 ] || echo s)" "$extra" "$fix"
  fi
fi
