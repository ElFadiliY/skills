#!/usr/bin/env bash
# env.sh — put an API key into THIS repo's env file, from the terminal, safely.
#
# The house convention, identical in every Exiid Labs repo. Nothing is shared
# between repos except this script: no central store, no shared keys. Each repo
# owns its own values, and this is the one way they get set.
#
#   ./scripts/env.sh                 what's declared, what's set, what's missing
#   ./scripts/env.sh set NAME        hidden prompt -> writes the repo's env file
#                                    (NAME must be declared in the committed .env.example)
#   ./scripts/env.sh set --declare NAME   add a NEW key to .env.example (no value);
#                                    commit that edit before `set NAME`
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
# placeholder someone left commented out still counts as declared. This reads the
# WORKING TREE and is used only to show status; the security gate uses
# committed_keys below.
parse_declared_keys() {
  sed -E 's/^[[:space:]]*#[[:space:]]*//' \
    | grep -Eo '^(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=' \
    | sed -E 's/^export[[:space:]]+//; s/=$//' \
    | awk '!seen[$0]++'
}
declared_keys() {
  [ -f "$EXAMPLE" ] || return 0
  parse_declared_keys < "$EXAMPLE"
}

# The COMMITTED contract: key names in .env.example as it exists in HEAD, not the
# working tree. This is the real allowlist. Promoting a name into it therefore
# requires a commit that shows up in review; a working-tree-only `set --declare`
# cannot make a name storable (set) or loadable (exec). If .env.example is not
# committed yet (no HEAD, or file untracked), this is empty and both gates fail
# closed. This is what stops the agent-handoff self-promotion path where one
# working tree both declares a name and immediately stores/loads a value for it.
committed_keys() {
  git show "HEAD:$EXAMPLE" 2>/dev/null | parse_declared_keys
}

# ── process-control variables ───────────────────────────────────────────────
# Some names are not data to a child process, they are code. Three classes, all
# valid identifiers, so identifier validation alone does not stop them; a value
# stored for any of them executes in the child on the next `exec`:
#   shell    — BASH_ENV/ENV point a non-interactive shell at a file it sources;
#              SHELL, IFS, CDPATH, PROMPT_COMMAND and exported BASH_FUNC_*
#              functions hijack or redirect later commands.
#   loader   — LD_PRELOAD, LD_LIBRARY_PATH, LD_AUDIT, DYLD_*, GCONV_PATH,
#              LOCPATH, NLSPATH and PATH make the dynamic loader / libc / PATH
#              lookup run attacker code.
#   runtime  — NODE_OPTIONS/NODE_PATH and every npm_config_* (Node/npm),
#              BUN_OPTIONS (Bun), ELECTRON_RUN_AS_NODE (Electron as raw Node),
#              PYTHON{PATH,STARTUP,HOME,EXECUTABLE,BREAKPOINT} (Python),
#              PERL5OPT/PERL5LIB/PERL5DB (Perl), RUBYOPT/RUBYLIB/JRUBY_OPTS (Ruby),
#              JAVA_TOOL_OPTIONS/_JAVA_OPTIONS/JDK_JAVA_OPTIONS/ANT_OPTS plus
#              JAVA_HOME/JRE_HOME/JDK_HOME (JVM),
#              DART_VM_OPTIONS (Dart), ERL_FLAGS (Erlang), DOTNET_STARTUP_HOOKS
#              plus CORECLR_ENABLE_PROFILING/CORECLR_PROFILER/CORECLR_PROFILER_PATH
#              (.NET) and LUA_INIT (Lua) inject flags,
#              import paths or startup hooks into the interpreter. Go reads GOFLAGS
#              (which can carry -toolexec=CMD) plus GOROOT/GOTOOLCHAIN/GOPROXY/GOBIN/
#              GOENV/GOPATH (toolchain, module proxy and code/tool paths), and
#              GEM_HOME/BUNDLE_PATH relocate where Ruby loads gems from. Rust runs
#              RUSTC/RUSTC_WRAPPER/RUSTC_WORKSPACE_WRAPPER as the compiler and takes
#              RUSTFLAGS/RUSTDOCFLAGS/RUSTC_BOOTSTRAP (plus CARGO_HOME,
#              CARGO_ENCODED_RUSTFLAGS and every CARGO_BUILD_*/CARGO_TARGET_*);
#              LUA_PATH/LUA_CPATH are Lua module search paths;
#              MAVEN_OPTS/GRADLE_OPTS/SBT_OPTS inject JVM build flags.
#   tools    — git runs several env values as commands (GIT_SSH/GIT_SSH_COMMAND,
#              GIT_PROXY_COMMAND, GIT_EXTERNAL_DIFF, GIT_PAGER, GIT_EDITOR,
#              GIT_SEQUENCE_EDITOR), relocates its binaries (GIT_EXEC_PATH), or
#              takes injected config that can set an executing hook (every
#              GIT_CONFIG_*); OPENSSL_CONF/OPENSSL_ENGINES/OPENSSL_MODULES load
#              native code; PHPRC/PHP_INI_SCAN_DIR inject PHP ini; SSLKEYLOGFILE
#              exfiltrates TLS key material. SVN_SSH/CVS_RSH/RSYNC_RSH run a
#              transport command like GIT_SSH does, and GIT_SSL_NO_VERIFY /
#              GIT_SSL_CAINFO / GIT_SSL_CAPATH disable or redirect git's TLS trust.
#   compiler : LIBRARY_PATH, LD_RUN_PATH, CPATH, C_INCLUDE_PATH,
#              CPLUS_INCLUDE_PATH, OBJC_INCLUDE_PATH and OBJCPLUS_INCLUDE_PATH feed
#              the C/C++ toolchain attacker headers or libraries; CC/CXX/CPP/MAKE
#              and every CMAKE_* (compiler, toolchain file, module/prefix path)
#              pick the compiler or build binary that runs;
#              PKG_CONFIG names the pkg-config binary and PKG_CONFIG_PATH/
#              PKG_CONFIG_LIBDIR add .pc files whose flags run; CFLAGS/CXXFLAGS/
#              CPPFLAGS/LDFLAGS/COMPILER_PATH/GCC_EXEC_PREFIX steer what is invoked.
#   runners  : DOCKER_HOST and KUBECONFIG point the docker CLI or kubectl at an
#              attacker-controlled daemon or cluster.
#   config   — HOME, XDG_CONFIG_HOME, ZDOTDIR and HOSTALIASES relocate where
#              tools read rc / config / hosts files from (e.g. npm reads
#              $HOME/.npmrc); FPATH and CLASSPATH are code search paths;
#              SHELLOPTS/BASHOPTS apply shell options at startup; GIT_DIR /
#              GIT_WORK_TREE / *_ASKPASS / BROWSER / PIP_INDEX_URL and the CA
#              vars (CURL_CA_BUNDLE, SSL_CERT_FILE, NODE_EXTRA_CA_CERTS) point a
#              tool at an attacker repo, helper binary, package index or trust
#              root.
#   network  : HTTP_PROXY, HTTPS_PROXY, ALL_PROXY, FTP_PROXY and NO_PROXY divert
#              or unshield the child's traffic;
#              PIP_EXTRA_INDEX_URL, PIP_FIND_LINKS, PIP_TRUSTED_HOST, PIP_CONFIG_FILE,
#              UV_INDEX_URL, UV_EXTRA_INDEX_URL, UV_FIND_LINKS and UV_CONFIG_FILE
#              point pip/uv at attacker package sources or config.
#   pager    : EDITOR, VISUAL, PAGER, MANPAGER, LESSOPEN and LESSCLOSE are run as
#              commands by git, less and other tools, as are DIFFPROG, FCEDIT and
#              any *EDITOR (merge/hg/svn, including no-underscore names like
#              HGEDITOR) or *_ASKPASS (passphrase) helper.
# This list is defence in depth, NOT the primary control: it refuses such names
# on `set` and skips them on load even when declared. The primary control is
# cmd_exec's allowlist (only names declared in .env.example are exported at all),
# because any denylist of "names a child treats as code" is inherently
# incomplete. Matching is case-insensitive: npm and others read both NPM_CONFIG_*
# and npm_config_*, so a case variant must not slip past (over-refusing a case
# variant of one of these is harmless).
is_dangerous_name() {
  n="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  case "$n" in
    bash_env|env|bash_func_*|shell|ifs|cdpath|prompt_command|shellopts|bashopts) return 0 ;;
    ld_preload|ld_library_path|ld_audit|dyld_*|gconv_path|locpath|nlspath|path) return 0 ;;
    home|xdg_config_home|zdotdir|fpath|classpath|hostaliases) return 0 ;;
    node_options|node_path|npm_config_*|bun_options|node_extra_ca_certs|node_tls_reject_unauthorized|electron_run_as_node) return 0 ;;
    pythonpath|pythonstartup|pythonhome|pythonexecutable|pythonuserbase|pythonbreakpoint|pip_index_url) return 0 ;;
    perl5opt|perl5lib|perl5db|perllib|rubyopt|rubylib|jruby_opts|lua_init|lua_path|lua_cpath|gem_path|gem_home|bundle_bin_path|bundle_path) return 0 ;;
    java_tool_options|_java_options|jdk_java_options|maven_opts|gradle_opts|sbt_opts|ant_opts|dart_vm_options|erl_flags|dotnet_startup_hooks|java_home|jre_home|jdk_home) return 0 ;;
    coreclr_enable_profiling|coreclr_profiler|coreclr_profiler_path|cor_enable_profiling|cor_profiler|cor_profiler_path) return 0 ;;
    composer_home|phprc|php_ini_scan_dir) return 0 ;;
    git_ssh|git_ssh_command|git_proxy_command|git_external_diff|git_pager|git_editor|git_sequence_editor|git_askpass|git_exec_path|git_dir|git_work_tree|git_template_dir|git_config|git_config_*|git_ssl_no_verify|git_ssl_cainfo|git_ssl_capath) return 0 ;;
    ssh_askpass|browser|openssl_conf|openssl_engines|openssl_modules|curl_ca_bundle|ssl_cert_file|ssl_cert_dir|requests_ca_bundle|aws_ca_bundle|sslkeylogfile) return 0 ;;
    http_proxy|https_proxy|all_proxy|ftp_proxy|no_proxy) return 0 ;;
    editor|visual|pager|manpager|lessopen|lessclose) return 0 ;;
    goflags|goroot|gotoolchain|goproxy|gobin|goenv|gopath) return 0 ;;
    pip_extra_index_url|pip_find_links|pip_trusted_host|pip_config_file|uv_index_url|uv_extra_index_url|uv_find_links|uv_config_file) return 0 ;;
    svn_ssh|cvs_rsh|rsync_rsh) return 0 ;;
    rustc|rustc_wrapper|rustc_workspace_wrapper|rustc_bootstrap|rustflags|rustdocflags|cargo_home|cargo_encoded_rustflags|cargo_build_*|cargo_target_*) return 0 ;;
    library_path|ld_run_path|cpath|c_include_path|cplus_include_path|objc_include_path|objcplus_include_path|pkg_config_path|pkg_config_libdir|pkg_config) return 0 ;;
    cc|cxx|cpp|make|cflags|cxxflags|cppflags|ldflags|compiler_path|gcc_exec_prefix|cmake_*) return 0 ;;
    docker_host|kubeconfig) return 0 ;;
    # value-is-a-command families: any *_askpass (passphrase helper) or *editor
    # (git/hg/svn/merge editor, incl. no-underscore names like HGEDITOR) plus
    # FCEDIT and DIFFPROG are run as commands by some tool.
    *_askpass|*editor|fcedit|diffprog) return 0 ;;
  esac
  return 1
}

# ── gitignore safety ────────────────────────────────────────────────────────
# A secret must never land in a tracked file. If the target is not ignored we
# add the line rather than dead-ending: it is one trivially reversible edit, and
# refusing here just moves the mistake somewhere less visible.
ensure_ignored() {
  file="$1"
  # Inspect the link itself, not what it points at: a gitignored path that is a
  # symlink to a tracked file passes `git check-ignore` yet writes through the
  # link into that tracked file. Refuse the symlink rather than resolve it, so
  # no dependency on realpath/readlink -f (absent on stock macOS) is needed.
  if [ -L "$file" ]; then
    echo "${R}✗${N} $file is a symlink — refusing to write a secret through it." >&2
    echo "  ${D}Remove the link and let this script create a real file: rm $file${N}" >&2
    return 1
  fi
  # A hard link shares its inode with the tracked file, so the path is neither a
  # symlink nor tracked under its own name, yet a write still lands in that file.
  # Refuse any existing target with more than one link. (GNU stat -c %h, BSD /
  # macOS stat -f %l; if neither is available, treat it as suspect and refuse.)
  if [ -e "$file" ]; then
    links="$(stat -c %h "$file" 2>/dev/null || stat -f %l "$file" 2>/dev/null || echo unknown)"
    case "$links" in
      1) : ;;
      *) echo "${R}✗${N} $file has multiple hard links — refusing to write a secret through it." >&2
         echo "  ${D}Remove it and let this script create a fresh file: rm $file${N}" >&2
         return 1 ;;
    esac
  fi
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
  # An optional leading --declare says "add this NEW key to the tracked contract".
  # With --declare, set ONLY appends a placeholder to .env.example and stops; it
  # never prompts for or writes a value. Without --declare, set stores a value for
  # a name already declared there. Declaring (a reviewable edit to a tracked file)
  # is thus fully separate from storing a secret; see the two branches below.
  declare_new=0
  if [ "${1:-}" = "--declare" ]; then declare_new=1; shift; fi
  reject_extra set "$#" || return 1
  name="${1:-}"
  # The name becomes a shell assignment in the env file which cmd_exec later
  # loads, so anything other than a strict identifier ([A-Za-z_][A-Za-z0-9_]*)
  # could smuggle $(...), backticks, pipes or newlines into that file. A pattern
  # like [A-Za-z_]* constrains only the first character, so EVIL$(cmd) and
  # FOO|BAR would slip through. Validate the whole name before any write: reject
  # a bad first character or any non-identifier character anywhere.
  case "$name" in
    "" ) echo "${R}✗${N} set needs a key name: ./scripts/env.sh set STRIPE_SECRET_KEY" >&2; return 1 ;;
    [!A-Za-z_]* | *[!A-Za-z0-9_]* ) echo "${R}✗${N} '$name' is not a valid env var name (letters, digits and underscore only; no leading digit)" >&2; return 1 ;;
  esac
  if is_dangerous_name "$name"; then
    echo "${R}✗${N} '$name' controls how the shell or loader runs child processes — refusing to store it (it would run as code on exec)." >&2
    return 1
  fi
  declared_wt=0
  if declared_keys | grep -qx "$name"; then declared_wt=1; fi
  committed=0
  if committed_keys | grep -qx "$name"; then committed=1; fi

  # --declare edits the contract only: append a placeholder to .env.example and
  # stop. No prompt, no value, no write to the secrets file. A declaration becomes
  # effective only once committed (the write gate below and cmd_exec's allowlist
  # both read HEAD, not the working tree), so no single command in one working
  # tree can both promote a name into the allowlist and store a value for it. (A
  # process-control name never reaches here: is_dangerous_name refused it above.)
  if [ "$declare_new" -eq 1 ]; then
    if [ "$committed" -eq 1 ]; then
      echo "${D}$name is already declared in committed $EXAMPLE. Store its value with: ./scripts/env.sh set $name${N}"
      return 0
    fi
    if [ "$declared_wt" -eq 1 ]; then
      echo "${D}$name is declared in $EXAMPLE but not committed yet. Commit that edit, then: ./scripts/env.sh set $name${N}"
      return 0
    fi
    [ -f "$EXAMPLE" ] || printf '# Every env var this repo reads. No real values.\n' > "$EXAMPLE"
    printf '\n# TODO describe %s\n%s=\n' "$name" "$name" >> "$EXAMPLE"
    echo "${Y}+${N} declared $name in $EXAMPLE ${D}(no value written).${N}"
    echo "  ${D}Add a one-line comment and commit it, then store the value: ./scripts/env.sh set $name${N}"
    return 0
  fi

  # Without --declare, set only writes a value for a name declared in the
  # COMMITTED contract (HEAD:.env.example), not merely the working tree. Requiring
  # the declaration to be committed is what closes the self-promotion path: a
  # working-tree-only `set --declare NAME` cannot be followed by `set NAME` in the
  # same tree, so promoting a name into the allowlist always passes through a
  # reviewable commit. cmd_exec applies the same committed allowlist on load.
  if [ "$committed" -eq 0 ]; then
    if [ "$declared_wt" -eq 1 ]; then
      echo "${R}✗${N} '$name' is declared in $EXAMPLE but that declaration is not committed yet." >&2
      echo "  ${D}Commit the $EXAMPLE change (it is reviewable), then store the value:${N}" >&2
      echo "  ${D}git add $EXAMPLE && git commit -m \"declare $name\"  &&  ./scripts/env.sh set $name${N}" >&2
    else
      echo "${R}✗${N} '$name' is not declared in committed $EXAMPLE." >&2
      echo "  ${D}Declare it (value-free), commit that edit, then set it:${N}" >&2
      echo "  ${D}./scripts/env.sh set --declare $name  &&  git commit $EXAMPLE  &&  ./scripts/env.sh set $name${N}" >&2
    fi
    return 1
  fi
  pick_target

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

  # Only now, with a value in hand, touch anything on disk. Doing the gitignore
  # edit before the prompt meant aborting at the prompt still left a stray line
  # behind — a write with nothing to show for it.
  ensure_ignored "$TARGET" || return 1

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
  return 0
}

cmd_unset() {
  name="$1"
  # Same strict identifier check as cmd_set: the name is interpolated into the
  # grep -E patterns below, so an unvalidated value like '.*KEY' would match and
  # delete unrelated secrets. A plain identifier carries no regex metacharacters.
  case "$name" in
    "" ) echo "${R}✗${N} unset needs a key name" >&2; return 1 ;;
    [!A-Za-z_]* | *[!A-Za-z0-9_]* ) echo "${R}✗${N} '$name' is not a valid env var name (letters, digits and underscore only; no leading digit)" >&2; return 1 ;;
  esac
  pick_target
  [ -f "$TARGET" ] || { echo "${D}$TARGET does not exist.${N}"; return 0; }
  if ! grep -qE "^[[:space:]]*(export[[:space:]]+)?${name}=" "$TARGET"; then
    echo "${D}$name is not set in $TARGET.${N}"; return 0
  fi
  tmp="$(mktemp)"
  grep -vE "^[[:space:]]*(export[[:space:]]+)?${name}=" "$TARGET" > "$tmp"
  rc=$?
  # grep exits 1 when it selects NOTHING — which is the ordinary result of
  # unsetting the file's only key, not a failure. Gating `mv` on grep's exit
  # status (`… > "$tmp" && mv …`) therefore skipped the move in exactly that
  # case and left the secret in place while printing "removed". Only >1 is a
  # real error.
  if [ "$rc" -gt 1 ]; then
    rm -f "$tmp"
    echo "${R}✗${N} could not rewrite $TARGET — left untouched." >&2
    return 1
  fi
  mv "$tmp" "$TARGET"
  chmod 600 "$TARGET"
  echo "${G}✓${N} removed $name from $TARGET"
}

cmd_check() {
  pick_target
  # No contract to check against is not the same as a passing check. Saying "✓"
  # here would be a vacuous truth, and a green that means nothing is worse than
  # a red — it teaches you to stop reading the output.
  if [ ! -f "$EXAMPLE" ]; then
    echo "${Y}!${N} no $EXAMPLE — nothing declared, so there is nothing to check."
    echo "  ${D}./scripts/env.sh scan lists what the code actually reads.${N}"
    return 0
  fi
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
  # Two independent controls decide what reaches the child, because either one
  # alone loses:
  #   1. Allowlist. Only export names declared in the COMMITTED .env.example
  #      (committed_keys reads HEAD, not the working tree). A denylist of "names a
  #      child treats as code" (HOME, GIT_CONFIG_*, npm_config_*, LD_*, …) is
  #      unbounded and keeps growing, so it cannot be the primary control. `set`
  #      already declares every key it writes, so this does not restrict normal
  #      use; it just means a name planted only in .env.local (the classic
  #      agent-handoff attack) is never loaded, and promoting one to loadable
  #      requires a COMMIT to a tracked file that shows up in review, not just a
  #      working-tree edit in the same session.
  #   2. Denylist. is_dangerous_name still filters, so even a declared entry for
  #      a process-control name is refused — defence in depth, not the backstop.
  # And it parses line by line rather than sourcing: `. "$TARGET"` would run the
  # file as bash, executing any hand-edited $(...)/backtick line; assigning an
  # already-expanded value never re-evaluates it.
  if [ -f "$TARGET" ]; then
    allowed="$(committed_keys)"
    while IFS= read -r line || [ -n "$line" ]; do
      # strip leading whitespace, skip blanks and comments
      line="${line#"${line%%[![:space:]]*}"}"
      case "$line" in ''|'#'*) continue ;; esac
      # drop an optional `export ` prefix, then re-trim
      case "$line" in
        export[[:space:]]*) line="${line#export}"; line="${line#"${line%%[![:space:]]*}"}" ;;
      esac
      case "$line" in *=*) : ;; *) continue ;; esac
      k="${line%%=*}"; v="${line#*=}"
      # trim trailing whitespace from the key (handles `KEY = value`)
      k="${k%"${k##*[![:space:]]}"}"
      # only export strict identifiers; ignore anything malformed
      case "$k" in ''|[!A-Za-z_]*|*[!A-Za-z0-9_]*) continue ;; esac
      # 1. allowlist: skip anything not declared in the tracked contract
      printf '%s\n' "$allowed" | grep -Fxq -- "$k" || continue
      # 2. denylist: never load a process-control variable, even if declared —
      # a value for one of these runs as code in the child on exec.
      if is_dangerous_name "$k"; then continue; fi
      # strip one matching pair of surrounding quotes
      case "$v" in
        \"*\") v="${v#\"}"; v="${v%\"}" ;;
        \'*\') v="${v#\'}"; v="${v%\'}" ;;
      esac
      export "$k=$v"
    done < "$TARGET"
  fi
  exec "$@"
}

usage() {
  cat >&2 <<'USAGE'
usage: ./scripts/env.sh [command]

  (none)          what's declared, what's set, what's missing (never a value)
  set NAME        store a value from a hidden prompt (no echo, no shell history)
                  NAME must already be declared in the COMMITTED .env.example
  set --declare NAME  add a new key to .env.example (no value); commit that edit,
                  then run set NAME
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
  set)        shift; cmd_set "$@" ;;
  unset)      shift; reject_extra unset $# && cmd_unset "${1:-}" ;;
  check)      cmd_check ;;
  scan)       cmd_scan ;;
  exec)       shift; cmd_exec "$@" ;;
  path)       pick_target; echo "$ROOT/$TARGET" ;;
  -h|--help|help) usage ;;
  *)          echo "${R}✗${N} unknown command: $1" >&2; echo "" >&2; usage; exit 1 ;;
esac
