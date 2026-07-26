#!/usr/bin/env bash
# env.sh — put an API key into THIS repo's env file, from the terminal, safely.
#
# The house convention, identical in every Exiid Labs repo. Nothing is shared
# between repos except this script: no central store, no shared keys. Each repo
# owns its own values, and this is the one way they get set.
#
#   ./scripts/env.sh                 what's declared, what's set, what's missing
#   ./scripts/env.sh set NAME        hidden prompt -> writes the repo's env file
#   ./scripts/env.sh unset NAME
#   ./scripts/env.sh check           exit 1 if a declared key is missing
#   ./scripts/env.sh scan            keys used in code but not declared
#   ./scripts/env.sh exec -- CMD     run CMD with this repo's env loaded
#   ./scripts/env.sh path            print the target file
#
# Why it exists: the agent working with you cannot read or write .env files (its
# permissions deny it, deliberately) and a key pasted into a chat is a key in a
# transcript forever. So the agent works out WHICH key and WHICH name, and hands
# you one command. You paste at a hidden prompt here. It then confirms with
# `status`, which prints length, a public prefix and a hash — never a value.
#
# No dependencies beyond bash + coreutils, so it works the same in the Node,
# Python, bun and PHP repos.
set -uo pipefail

# ── locate the repo and pick the target file ────────────────────────────────
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || ROOT=""
if [ -z "$ROOT" ]; then echo "env.sh: not inside a git repository" >&2; exit 1; fi
cd "$ROOT" || exit 1

EXAMPLE=".env.example"
TARGET=""

# Highest-precedence local file that already exists, so a key lands next to the
# ones already there instead of splitting the config across two files. A repo
# with neither gets .env.local, which every framework here loads and every
# .gitignore here already covers.
pick_target() {
  if [ -n "$TARGET" ]; then return; fi
  for f in .env.local .env; do
    if [ -f "$f" ]; then TARGET="$f"; return; fi
  done
  TARGET=".env.local"
}

# ── output helpers ──────────────────────────────────────────────────────────
if [ -t 1 ]; then G=$'\033[32m'; R=$'\033[31m'; Y=$'\033[33m'; D=$'\033[2m'; N=$'\033[0m'
else G=""; R=""; Y=""; D=""; N=""; fi

sha() {
  if command -v shasum >/dev/null 2>&1; then printf '%s' "$1" | shasum -a 256 | cut -c1-8
  elif command -v sha256sum >/dev/null 2>&1; then printf '%s' "$1" | sha256sum | cut -c1-8
  else printf 'nohash'; fi
}

# A description safe to print anywhere: length, the leading public token if the
# value has a recognisable one, and 8 hex of sha256 as a rotation fingerprint.
# Short values get no hash — low entropy makes a digest guessable, and anything
# that short is not an API key.
describe() {
  v="$1"; out="${#v} chars"
  case "$v" in
    sk-ant-*)   out="$out · sk-ant-…" ;;
    sk_live_*)  out="$out · sk_live_…" ;;
    sk_test_*)  out="$out · sk_test_…" ;;
    pk_live_*)  out="$out · pk_live_…" ;;
    pk_test_*)  out="$out · pk_test_…" ;;
    whsec_*)    out="$out · whsec_…" ;;
    github_pat_*) out="$out · github_pat_…" ;;
    ghp_*)      out="$out · ghp_…" ;;
    eyJ*)       out="$out · JWT" ;;
    https://*)  out="$out · url" ;;
  esac
  if [ "${#v}" -ge 20 ]; then out="$out · #$(sha "$v")"; fi
  printf '%s' "$out"
}

# Read one KEY's value out of a file. Never echoed by any caller except through
# describe(); kept in a variable and dropped.
value_of() {
  name="$1"; file="$2"
  [ -f "$file" ] || return 1
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${name}=" "$file" 2>/dev/null | tail -n 1)"
  [ -n "$line" ] || return 1
  v="${line#*=}"
  # strip one matching pair of surrounding quotes
  case "$v" in
    \"*\") v="${v#\"}"; v="${v%\"}" ;;
    \'*\') v="${v#\'}"; v="${v%\'}" ;;
  esac
  [ -n "$v" ] || return 1
  printf '%s' "$v"
}

# The declared contract: every key name in .env.example, commented or not, so a
# placeholder someone left commented out still counts as declared.
declared_keys() {
  [ -f "$EXAMPLE" ] || return 0
  sed -E 's/^[[:space:]]*#[[:space:]]*//' "$EXAMPLE" \
    | grep -Eo '^(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=' \
    | sed -E 's/^export[[:space:]]+//; s/=$//' \
    | awk '!seen[$0]++'
}

# ── gitignore safety ────────────────────────────────────────────────────────
# A secret must never land in a tracked file. If the target is not ignored we
# add the line rather than dead-ending: it is one trivially reversible edit, and
# refusing here just moves the mistake somewhere less visible.
ensure_ignored() {
  file="$1"
  if git check-ignore -q "$file" 2>/dev/null; then return 0; fi
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    echo "${R}✗${N} $file is TRACKED by git — refusing to write a secret into it." >&2
    echo "  Untrack it first: git rm --cached $file && echo '$file' >> .gitignore" >&2
    return 1
  fi
  printf '\n# secrets — never commit (added by scripts/env.sh)\n%s\n' "$file" >> .gitignore
  echo "${Y}!${N} $file was not gitignored — added it to .gitignore. ${D}Commit that change.${N}"
}

# ── commands ────────────────────────────────────────────────────────────────
cmd_status() {
  pick_target
  echo ""
  echo "Env for ${D}$(basename "$ROOT")${N} · target ${D}${TARGET}$([ -f "$TARGET" ] || echo " (not created yet)")${N}"
  echo ""
  keys="$(declared_keys)"
  if [ -z "$keys" ]; then
    echo "  ${Y}!${N} no $EXAMPLE — this repo declares no keys."
    echo "    ${D}Run ./scripts/env.sh scan to see what the code actually reads.${N}"
    echo ""
    return 0
  fi
  missing=0
  while IFS= read -r k; do
    [ -n "$k" ] || continue
    if v="$(value_of "$k" "$TARGET")"; then
      printf '  %s✓%s %-38s %s\n' "$G" "$N" "$k" "$(describe "$v")"
    elif [ -n "${!k:-}" ]; then
      printf '  %s✓%s %-38s %s  %s\n' "$G" "$N" "$k" "$(describe "${!k}")" "${D}from the shell env${N}"
    else
      missing=$((missing + 1))
      printf '  %s✗%s %-38s %snot set%s\n' "$R" "$N" "$k" "$D" "$N"
    fi
  done <<EOF
$keys
EOF
  echo ""
  if [ "$missing" -gt 0 ]; then
    echo "  ${D}Set one:${N} ./scripts/env.sh set NAME"
  fi
  echo ""
  return 0
}

cmd_set() {
  name="$1"
  case "$name" in
    "" ) echo "${R}✗${N} set needs a key name: ./scripts/env.sh set STRIPE_SECRET_KEY" >&2; return 1 ;;
    [A-Za-z_]*) : ;;
    *) echo "${R}✗${N} '$name' is not a valid env var name" >&2; return 1 ;;
  esac
  pick_target
  ensure_ignored "$TARGET" || return 1

  if [ -t 0 ]; then
    printf 'Value for %s (input hidden, not echoed): ' "$name"
    old_stty="$(stty -g)"
    trap 'stty "$old_stty" 2>/dev/null' EXIT INT TERM
    stty -echo
    IFS= read -r value
    stty "$old_stty"; trap - EXIT INT TERM
    printf '\n'
  else
    IFS= read -r value            # piped, e.g. from a password manager
  fi
  value="$(printf '%s' "$value" | tr -d '\r\n')"
  if [ -z "$value" ]; then echo "${R}✗${N} empty value — nothing written." >&2; return 1; fi

  # Quote only when the value contains something a dotenv parser could misread.
  # Plain API keys and URLs stay unquoted, which every parser here handles.
  case "$value" in
    *[!A-Za-z0-9._:/+=~@-]*) esc="${value//\'/\'\\\'\'}"; entry="$name='$esc'" ;;
    *) entry="$name=$value" ;;
  esac

  touch "$TARGET"; chmod 600 "$TARGET"
  if grep -qE "^[[:space:]]*(export[[:space:]]+)?${name}=" "$TARGET" 2>/dev/null; then
    tmp="$(mktemp)"
    # Rewrite the line without ever putting the value on a command line, where
    # it would be visible in `ps` to every other process on the machine.
    ENV_SH_NAME="$name" ENV_SH_ENTRY="$entry" awk '
      BEGIN { name = ENVIRON["ENV_SH_NAME"]; entry = ENVIRON["ENV_SH_ENTRY"]; done = 0 }
      $0 ~ "^[[:space:]]*(export[[:space:]]+)?" name "=" { if (!done) { print entry; done = 1 } ; next }
      { print }
    ' "$TARGET" > "$tmp" && mv "$tmp" "$TARGET"
    chmod 600 "$TARGET"
    action="updated"
  else
    printf '%s\n' "$entry" >> "$TARGET"
    action="added"
  fi

  echo "${G}✓${N} $name $action in $TARGET  ${D}$(describe "$value")${N}"

  # Keep the contract honest: a key that exists but is undeclared is invisible to
  # the next clone, and forgetting this step is the whole failure mode.
  if ! declared_keys | grep -qx "$name"; then
    [ -f "$EXAMPLE" ] || printf '# Every env var this repo reads. No real values.\n' > "$EXAMPLE"
    printf '\n# TODO describe %s\n%s=\n' "$name" "$name" >> "$EXAMPLE"
    echo "${Y}+${N} declared $name in $EXAMPLE ${D}— add a comment and commit it.${N}"
  fi
  return 0
}

cmd_unset() {
  name="$1"
  [ -n "$name" ] || { echo "${R}✗${N} unset needs a key name" >&2; return 1; }
  pick_target
  [ -f "$TARGET" ] || { echo "${D}$TARGET does not exist.${N}"; return 0; }
  if ! grep -qE "^[[:space:]]*(export[[:space:]]+)?${name}=" "$TARGET"; then
    echo "${D}$name is not set in $TARGET.${N}"; return 0
  fi
  tmp="$(mktemp)"
  grep -vE "^[[:space:]]*(export[[:space:]]+)?${name}=" "$TARGET" > "$tmp" && mv "$tmp" "$TARGET"
  chmod 600 "$TARGET"
  echo "${G}✓${N} removed $name from $TARGET"
}

cmd_check() {
  pick_target
  missing=""
  while IFS= read -r k; do
    [ -n "$k" ] || continue
    value_of "$k" "$TARGET" >/dev/null 2>&1 && continue
    [ -n "${!k:-}" ] && continue
    missing="$missing $k"
  done <<EOF
$(declared_keys)
EOF
  if [ -n "$missing" ]; then
    echo "${R}✗${N} missing:$missing" >&2
    echo "  ${D}Set each with: ./scripts/env.sh set NAME${N}" >&2
    return 1
  fi
  echo "${G}✓${N} every key declared in $EXAMPLE is set."
}

# Names the code actually reads, minus the ones declared. Catches the drift that
# turns a fresh clone into a guessing game.
#
# The file list comes from `git ls-files`, not a tree walk: it is the only cheap
# way to skip node_modules, build output, vendored code AND — in a repo that has
# other checkouts sitting inside it, like the ops root — every ignored sibling
# repo. A plain `grep -r .` there takes minutes and reports other repos' keys.
cmd_scan() {
  used="$(git ls-files -z \
      -- '*.js' '*.mjs' '*.cjs' '*.jsx' '*.ts' '*.tsx' '*.py' '*.php' '*.go' '*.rb' '*.sh' \
    | xargs -0 grep -hoE '(process\.env\.[A-Za-z_][A-Za-z0-9_]*|process\.env\[["'"'"'][A-Za-z_][A-Za-z0-9_]*|import\.meta\.env\.[A-Za-z_][A-Za-z0-9_]*|os\.environ(\.get)?[\[(]["'"'"'][A-Za-z_][A-Za-z0-9_]*|getenv\(["'"'"'][A-Za-z_][A-Za-z0-9_]*|Deno\.env\.get\(["'"'"'][A-Za-z_][A-Za-z0-9_]*)' 2>/dev/null \
    | grep -oE '[A-Za-z_][A-Za-z0-9_]*$' \
    | grep -vE '^(env|environ|get|process|meta|NODE_ENV|CI|HOME|PATH|PWD|SHELL|TMPDIR|USER|TZ|LANG|TERM)$' \
    | sort -u)"
  undeclared=""
  for k in $used; do
    declared_keys | grep -qx "$k" || undeclared="$undeclared $k"
  done
  if [ -z "$undeclared" ]; then
    echo "${G}✓${N} every env var the code reads is declared in $EXAMPLE."
  else
    echo "${Y}!${N} read in code but missing from $EXAMPLE:"
    for k in $undeclared; do echo "    $k"; done
    echo "  ${D}Declare each one (a name and a comment, no value) so a fresh clone can run.${N}"
  fi
}

cmd_exec() {
  [ "${1:-}" = "--" ] && shift
  [ $# -gt 0 ] || { echo "${R}✗${N} exec needs a command: ./scripts/env.sh exec -- npm run dev" >&2; return 1; }
  pick_target
  if [ -f "$TARGET" ]; then
    set -a
    # shellcheck disable=SC1090
    . "./$TARGET"
    set +a
  fi
  exec "$@"
}

usage() {
  cat >&2 <<'USAGE'
usage: ./scripts/env.sh [command]

  (none)          what's declared, what's set, what's missing (never a value)
  set NAME        store a value from a hidden prompt (no echo, no shell history)
  unset NAME      remove a key
  check           exit 1 if a key declared in .env.example is missing
  scan            env vars read in code but not declared in .env.example
  exec -- CMD     run CMD with this repo's env loaded
  path            print the target file

Values live only in this repo. Nothing is shared between repos but this script.
USAGE
}

# A silently-ignored argument is how a secret ends up in the wrong file, so an
# unexpected one is an error rather than a shrug. ($# is counted before shifting
# rather than expanding "$@" — bash 3.2, which macOS still ships, mishandles an
# empty "$@" under `set -u`.)
reject_extra() {
  [ "$2" -le 1 ] && return 0
  echo "${R}✗${N} $1 takes one key name and nothing else." >&2
  echo "  ${D}The target file is chosen automatically; ./scripts/env.sh path shows it.${N}" >&2
  return 1
}

case "${1:-status}" in
  status|"")  cmd_status ;;
  set)        shift; reject_extra set $# && cmd_set "${1:-}" ;;
  unset)      shift; reject_extra unset $# && cmd_unset "${1:-}" ;;
  check)      cmd_check ;;
  scan)       cmd_scan ;;
  exec)       shift; cmd_exec "$@" ;;
  path)       pick_target; echo "$ROOT/$TARGET" ;;
  -h|--help|help) usage ;;
  *)          echo "${R}✗${N} unknown command: $1" >&2; echo "" >&2; usage; exit 1 ;;
esac
