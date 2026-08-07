#!/usr/bin/env node
// guard-fleet-writes.mjs — PreToolUse decision engine for Bash commands.
//
// v1 of this hook only ever said "no". That was the wrong instrument for the
// traffic: the rules that fire several times a day are the recoverable local
// ones (`reset --hard` on a dirty tree), while the rules that actually matter
// (pushing a protected main) fire about monthly. The result was a wall where
// most requests needed a turnstile.
//
// A PreToolUse hook can return `allow` as well as `deny`, and `allow` skips the
// permission prompt entirely. That makes this hook the only layer that can
// judge these commands accurately — permission patterns are prefix-matched and
// cannot see past the `-C <path>` that ~every fleet command carries, so
// `Bash(git -C:*)` has to be all-or-nothing while this can allow
// `git -C x log` and snapshot `git -C x reset --hard` in the same breath.
//
// Four verdicts:
//
//   allow     provably read-only (reads, status/log/diff, gh view/list, …).
//             No prompt. This is the bulk of all traffic.
//   snapshot  destructive but recoverable: `reset --hard`, `restore .`,
//             `checkout --`, `clean -fd`. Captured to refs/exiid/undo/<ts>
//             first, then ALLOWED. Never blocks; nothing is lost. `npm run undo`
//             lists and restores.
//   ask       genuinely wants a human: a bulk `add` that would stage a secret,
//             `clean -x` (deletes gitignored files, which no snapshot can hold).
//   deny      irreversible and outward-facing only — six rules, ~zero hits in a
//             normal week.
//
// Anything unrecognised gets no opinion (exit 0) and falls through to the
// normal permission flow. Deny is advisory-to-the-model, not a sandbox: it
// stops the accident and the autopilot, not a determined operator.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, dirname, resolve, sep } from "node:path";

const read = async () => {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
};

const emit = (permissionDecision, permissionDecisionReason) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision, permissionDecisionReason },
  }));
  process.exit(0);
};
const deny = (why) => emit("deny", why);
const ask = (why) => emit("ask", why);
const allow = (why) => emit("allow", why);
const passthrough = () => process.exit(0); // no opinion — normal permission flow

let payload;
try {
  payload = JSON.parse(await read());
} catch {
  passthrough(); // an unparseable payload is never a reason to block work
}

if (payload?.tool_name !== "Bash") passthrough();
const rawCmd = String(payload?.tool_input?.command ?? "");
if (!rawCmd) passthrough();

// After shellUnquote (below) has consumed every quote, `\`, and `$'…'`/`$"…"`, a
// token that STILL carries a `$`-expansion or a backtick is a runtime
// substitution whose value cannot be known statically. The heredoc scrub below
// applies the same fail-closed test to expandable heredoc bodies.
const DYNAMIC = /`|\$[\w({]/;

// Text that merely CONTAINS a dangerous command is not that command. A commit
// message describing `gh pr merge --admin`, a heredoc writing docs, an `echo`
// of an example — all matched the naive regex and blocked honest work (this
// file's own first commit was the casualty). Scrub the prose regions before
// matching, and require a segment to actually START with the binary.
// Scrub only heredoc bodies. The marker must not itself contain `<<` (or a
// second pass can eat later commands), and same-line operators after the
// closing tag must survive for the irreversible-action checks.
const HEREDOC = /<<-?[ \t]*(['"]?)([A-Za-z_]\w*)\1([^\n]*)(?:\n([\s\S]*?)^[ \t]*\2[ \t]*$|\n([\s\S]*)$|$)/gm;
let heredocDynamic = null;
const scrubHeredocs = (src) => src.replace(HEREDOC, (_m, quoted, _tag, suffix, body, unterminated) => {
  const text = body ?? unterminated ?? "";
  if (!quoted && !heredocDynamic && DYNAMIC.test(text)) {
    heredocDynamic = text.trim().split("\n")[0].slice(0, 120);
  }
  return ` HEREDOC_BODY ${suffix} `;
});

const cmd = scrubHeredocs(rawCmd)
  .replace(/(^|\s)(-m|--message)\s+("(?:[^"\\]|\\.)*"|'[^']*')/g, "$1$2 MSG");

const SEP = /\s*(?:\|\||&&|;|\||\n)\s*/;
// Split only on shell operators outside quotes. A bare regex split cuts the
// `|` inside `rg 'SECRET|TOKEN' .env` and can hide the sensitive path.
const splitSegments = (src) => {
  const out = [];
  let buf = "";
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      buf += c;
      if (quote === '"' && c === "\\" && i + 1 < src.length) buf += src[++i];
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "\\" && i + 1 < src.length) { buf += c + src[++i]; continue; }
    if (c === "'" || c === '"') { quote = c; buf += c; continue; }
    if (c === "\n" || c === ";") { out.push(buf); buf = ""; continue; }
    if (c === "|") { out.push(buf); buf = ""; if (src[i + 1] === "|") i++; continue; }
    if (c === "&" && src[i + 1] === "&") { out.push(buf); buf = ""; i++; continue; }
    buf += c;
  }
  out.push(buf);
  return quote ? null : out;
};

const segments = (splitSegments(cmd) ?? cmd.split(SEP))
  .map((s) => s.trim()
    .replace(/^(?:[A-Za-z_]\w*=\S*\s+)*/, "")          // strip FOO=bar prefixes
    // …and leading shell keywords. `;` ends a segment, so the body of a
    // compound command arrives as `do cat "$f"` / `then cat .env` and every
    // check below reads `do`/`then` as the binary — `cat .env` asked, but
    // `if true; then cat .env; fi` fell through to a generic prompt with the
    // secret gate never consulted. Same for `{`/`(` subshell openers.
    .replace(/^(?:(?:do|then|else|elif|while|until|if|\{|\()\s+)*/, ""))
  .filter(Boolean);
const segmentsFor = (bin) => segments.filter((s) => s === bin || s.startsWith(`${bin} `));

const gitIn = (d, ...a) => {
  try {
    return execFileSync("git", ["-C", d, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch { return ""; }
};
/** Like gitIn, but reports failure instead of swallowing it into "". */
const gitTry = (d, ...a) => {
  try {
    return { ok: true, out: execFileSync("git", ["-C", d, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(), err: "" };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? "").trim(), err: String(e.stderr ?? e.message).trim() };
  }
};

/** Resolve the directory a segment operates on: `-C <dir>`, `cd <dir> &&`, else cwd. */
function dirFor(tokens) {
  const ci = tokens.indexOf("-C");
  if (ci !== -1 && tokens[ci + 1]) return tokens[ci + 1].replace(/^["']|["']$/g, "");
  const cd = cmd.match(/(?:^|[;&]{1,2})\s*cd\s+("[^"]+"|'[^']+'|[^\s;&|]+)/);
  if (cd) return cd[1].replace(/^["']|["']$/g, "");
  return payload?.cwd || process.cwd();
}

// Reduce ONE shell token to the literal argv string bash would hand to git/gh,
// so the checks below compare against what actually runs — not the raw source.
// A single outer-quote `.replace` is not shell parsing: bash concatenates
// adjacent quoted runs (`''main''`, `'m''ain'`, `feature:'main'`), processes
// ANSI-C `$'…'` escapes (`$'.env'` → `.env`, `$'\x2e\x65\x6e\x76'` → `.env`),
// and strips backslash escapes (`\main` → `main`). Skipping any of these
// reopens the quoting bypass the deny/secret gates keep getting probed with.
// Word-splitting is out of scope (segments are already whitespace-split), so
// this only collapses quoting/escaping within a single token.
const shellUnquote = (tok) => {
  let out = "";
  for (let i = 0; i < tok.length; ) {
    const c = tok[i];
    if (c === "\\") {                       // backslash: next char is literal
      if (i + 1 < tok.length) { out += tok[i + 1]; i += 2; } else i += 1;
    } else if (c === "'") {                 // single quotes: everything literal
      const end = tok.indexOf("'", i + 1);
      if (end === -1) { out += tok.slice(i + 1); break; }
      out += tok.slice(i + 1, end); i = end + 1;
    } else if (c === '"') {                 // double quotes: `\` escapes a few chars
      i += 1;
      while (i < tok.length && tok[i] !== '"') {
        if (tok[i] === "\\" && /["\\$`]/.test(tok[i + 1] ?? "")) { out += tok[i + 1]; i += 2; }
        else out += tok[i++];
      }
      i += 1;
    } else if (c === "$" && tok[i + 1] === '"') {   // $"…" locale quoting == "…"
      i += 1;                                        // drop the `$`; next pass reads the `"`
    } else if (c === "$" && tok[i + 1] === "'") {   // ANSI-C quoting: $'…'
      i += 2;
      const simple = { n: "\n", t: "\t", r: "\r", a: "\x07", b: "\b", f: "\f", v: "\v", e: "\x1b", E: "\x1b", "\\": "\\", "'": "'", '"': '"', "?": "?" };
      while (i < tok.length && tok[i] !== "'") {
        if (tok[i] !== "\\") { out += tok[i++]; continue; }
        const n = tok[i + 1];
        if (n === "x") {                                   // \xHH
          const m = /^[0-9a-fA-F]{1,2}/.exec(tok.slice(i + 2));
          if (m) { out += String.fromCharCode(parseInt(m[0], 16)); i += 2 + m[0].length; continue; }
        }
        if (n >= "0" && n <= "7") {                        // \nnn octal
          const m = /^[0-7]{1,3}/.exec(tok.slice(i + 1));
          out += String.fromCharCode(parseInt(m[0], 8) & 0xff); i += 1 + m[0].length; continue;
        }
        if (n in simple) { out += simple[n]; i += 2; continue; }
        out += n ?? ""; i += 2;                            // unknown escape: drop the `\`
      }
      i += 1;                                              // closing '
    } else {
      out += c; i += 1;
    }
  }
  return out;
};

// ═══ 1. DENY — irreversible and outward-facing ═════════════════════════════
const MAIN = /^(main|master)$/;

// This file is rolled out to every fleet repo, where `lib/manifest.mjs` and
// js-yaml do not exist. The first version imported the manifest and, on
// failure, left the protected list EMPTY — so the copy inside dentistry-lms
// would have silently allowed a push to its own main. A guard that degrades to
// "no protection" is worse than no guard, because it looks like one.
//
// So: prefer the live manifest, fall back to reading workspace.yaml directly
// (one regex, no yaml dependency), and only then to a baked-in list. Never to
// empty. The baked list is the last resort and can go stale, which is why it
// is checked last and named as such.
const BAKED_PROTECTED = ["dentistry-lms", "billing-platform", "iqa-contributions", "dentistry-leads", "exiid-os", "carwella"];

function protectedSet() {
  // 1. Running inside exiid-ops: the manifest module is authoritative, and
  //    deliberately independent of cwd — this file's own location fixes the
  //    root, so a session anywhere on the box gets the live protected set
  //    rather than the baked one. In a rolled-out copy (<repo>/.claude/) the
  //    sibling `lib/manifest.mjs` does not exist, so this tier is skipped
  //    outright and the walk-up below takes over.
  try {
    const url = new URL("./lib/manifest.mjs", import.meta.url);
    if (existsSync(url)) {
      const mod = require$(url);
      if (mod?.length) return mod;
    }
  } catch { /* fall through */ }

  // 2. Walk up for workspace.yaml — a fleet repo sits at <root>/<cluster>/<repo>,
  //    so the manifest is two levels above the repo it is guarding.
  let d = payload?.cwd || process.cwd();
  for (let i = 0; i < 6 && d && d !== "/"; i++) {
    const y = join(d, "workspace.yaml");
    if (existsSync(y)) {
      try {
        const m = readFileSync(y, "utf8").match(/^\s*protected_repos:\s*\[([^\]]+)\]/m);
        if (m) {
          const names = m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "").toLowerCase()).filter(Boolean);
          if (names.length) return names;
        }
      } catch { /* unreadable — keep walking */ }
    }
    d = dirname(d);
  }

  // 3. Last resort. Stale-able, but never empty.
  return BAKED_PROTECTED;
}

// Synchronous import of the manifest module is not possible from ESM, so read
// and regex the same file the module would have parsed. Keeps protectedSet()
// synchronous and dependency-free in every repo it lands in.
//
// `url` is the manifest MODULE (`<root>/scripts/lib/manifest.mjs`), so the
// manifest FILE is two levels up, exactly as manifest.mjs's own ROOT computes
// it. This read `../workspace.yaml` until 2026-07-27 — i.e. `scripts/
// workspace.yaml`, which cannot exist — so step 1 always returned null and the
// documented "the manifest module is authoritative" order was a fiction. It
// went unnoticed because step 2's walk up from cwd covers every in-tree
// session; only out-of-tree callers felt it, and they silently got the
// stale-able baked list instead.
function require$(url) {
  try {
    const src = readFileSync(new URL("../../workspace.yaml", url), "utf8");
    const m = src.match(/^\s*protected_repos:\s*\[([^\]]+)\]/m);
    return m ? m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "").toLowerCase()).filter(Boolean) : null;
  } catch { return null; }
}

// The effective HTTP method of a `gh api` call. Explicit `-X`/`--method` wins in
// every spelling (`-X DELETE`, `-XDELETE`, `--method=DELETE`). With no method
// flag, gh sends POST when ANY body/param flag is present (`-f`/`-F`/`--field`/
// `--raw-field`/`--input`) and GET otherwise — so "no -X" does NOT imply a read.
const ghMethod = (seg) => {
  const m = seg.match(/(?:^|\s)(?:-X\s*|--method[=\s]+)([A-Za-z]+)/);
  if (m) return m[1].toUpperCase();
  return /(?:^|\s)(?:-f|-F|--field|--raw-field|--input)\b/.test(seg) ? "POST" : "GET";
};
// GraphQL is a POST transport whose mutations carry no REST `-X`, so it can never
// be proven read-only from the command line.
const ghIsGraphql = (seg) => /^gh\s+api\b/.test(seg) && /(^|\s)graphql(\s|$)/.test(seg);
// gh's global flags can sit BETWEEN `gh` and the subcommand — `gh -R o/r pr merge
// --admin` — so an anchored `^gh\s+pr\s+merge` misses them. Strip the value-taking
// globals (-R/--repo/--hostname) so the subcommand re-anchors to `gh`. The trailing
// flags the denies care about (`--admin`) sit after the subcommand and survive.
const ghCanon = (seg) => seg
  .replace(/(?:^|\s)(?:-R|--repo|--hostname)(?:=\S+|\s+\S+)/g, " ")
  .replace(/\s+/g, " ")
  .trim();

for (const raw of segmentsFor("gh")) {
  const seg = ghCanon(raw);
  if (/^gh\s+pr\s+merge\b/.test(seg) && /(^|\s)--admin\b/.test(seg)) {
    deny(
      "`gh pr merge --admin` bypasses required status checks — the one thing branch " +
      "protection exists to prevent. Use `gh pr merge --auto --squash` so it lands the " +
      "moment checks go green.",
    );
  }
  if (/^gh\s+repo\s+delete\b/.test(seg)) {
    deny("`gh repo delete` is unrecoverable. Archive instead (AGENTS.md § Archiving), or delete it yourself in the GitHub UI.");
  }
  if (/^gh\s+api\b/.test(seg)) {
    const method = ghMethod(seg);
    if (method === "DELETE" && /\/?repos\//.test(seg)) {
      deny("`gh api -X DELETE /repos/…` deletes GitHub state irreversibly. Run it yourself if that is genuinely intended.");
    }
    // A mutating `gh api` (any non-GET, or any graphql) must not slip through as
    // passthrough — the wide `Bash(gh api repos/:*)` grant would then run it with
    // no prompt. Ask so the hook, not the grant, is the gate.
    if (method !== "GET" || ghIsGraphql(seg)) {
      ask(
        `\`gh api\` here issues a ${ghIsGraphql(seg) ? "GraphQL" : method} request, which mutates GitHub state — ` +
        `the read path auto-allows only GET. Approve deliberately if this change is intended.`,
      );
    }
  }
}

const pushSeg = segmentsFor("git").find((s) => /^git\s+(-C\s+\S+\s+)?push\b/.test(s));
if (pushSeg) {
  // Shell-unquote each token so `origin 'main'`, `''main''`, `'m''ain'`,
  // `feature:'main'`, `$'main'`, and `\main` all resolve to the branch bash
  // would pass — a naive quote strip leaves `$`/`\` behind and the deny misses.
  const tokens = pushSeg.split(/\s+/).map(shellUnquote);
  const dir = dirFor(tokens);
  const flags = tokens.filter((t) => t.startsWith("-"));
  const after = tokens.slice(tokens.indexOf("push") + 1).filter((t) => !t.startsWith("-"));
  const rawRefspecs = after.slice(1); // after[0] is the remote
  const branch = gitIn(dir, "branch", "--show-current");

  // Force takes four shapes, and the old check caught only two of them:
  //   --force / --force-with-lease* / --force-if-includes*   (long)
  //   -f, and short clusters that bury it (-fu, -uf)          (short)
  //   a leading '+' on any refspec forces just that ref       (per-refspec)
  const forced =
    flags.some((t) => t === "--force" || t.startsWith("--force-with-lease") || t.startsWith("--force-if-includes")) ||
    flags.some((t) => /^-[a-z]*f/.test(t)) ||
    rawRefspecs.some((r) => r.startsWith("+"));
  const deleting = flags.some((t) => t === "--delete") || flags.some((t) => /^-[a-z]*d/.test(t));

  // `--all`, `--mirror`, `--branches` push every local branch (main included)
  // with no explicit refspec, so the refspec-derived `targets` below stay empty
  // and fall back to the current branch — main slips past the protected deny.
  // Treat them as touching main so the protected-repo gate still fires.
  const pushAll = flags.some((t) => t === "--all" || t === "--mirror" || t === "--branches");

  // Normalise a refspec to its destination branch: drop a leading '+', take the
  // right side of a `src:dst`, resolve HEAD, and strip a `refs/heads/` prefix so
  // `+main`, `HEAD:refs/heads/main` and `main` all collapse to `main`.
  const destOf = (r) => {
    const bare = r.replace(/^\+/, "");
    const dst = bare.includes(":") ? bare.split(":").pop() : bare === "HEAD" ? branch : bare;
    return dst.replace(/^refs\/heads\//, "");
  };
  const refspecs = rawRefspecs.map(destOf);

  if (deleting && refspecs.some((r) => MAIN.test(r))) {
    deny("Refusing to delete the `main` branch on the remote.");
  }
  if (rawRefspecs.some((r) => /^:(refs\/heads\/)?(main|master)$/.test(r))) {
    deny("Refusing to delete the `main` branch on the remote (`:main` refspec).");
  }

  const targets = refspecs.length ? refspecs : [branch];
  const touchesMain = targets.some((t) => MAIN.test(t)) || pushAll;

  if (forced && touchesMain) {
    const mainTarget = targets.find((t) => MAIN.test(t)) ?? "main";
    deny(`Refusing to force-push to \`${mainTarget}\`. Shared history is never rewritten in this fleet.`);
  }
  if (touchesMain) {
    const protectedRepos = protectedSet();
    const repo = gitIn(dir, "remote", "get-url", "origin").replace(/\.git$/, "").split(/[/:]/).pop()?.toLowerCase();
    if (repo && protectedRepos.includes(repo)) {
      deny(
        `\`${repo}\` is a protected production repo — main takes changes only via PR + green CI.\n` +
        `Use the rail: branch → \`gh pr create\` → \`gh pr merge --auto --squash\`.`,
      );
    }
  }
  // Force-push to a NON-main branch. Denying this outright was wrong: updating
  // your own PR branch after a rebase is routine, and the deny made the normal
  // workflow impossible rather than safer (it blocked this very repo's
  // maintainer mid-session). `--force-with-lease`/`--force-if-includes` are the
  // safe forms — they refuse if the remote moved under you, so they cannot
  // silently clobber someone else's push. Bare `--force` has no such check, so
  // it still wants a human.
  if (forced) {
    const leased = flags.some((t) => t.startsWith("--force-with-lease") || t.startsWith("--force-if-includes"));
    if (!leased) {
      ask(
        `\`git push --force\` to \`${targets.join(", ")}\` overwrites the remote branch with no check ` +
        `that it still points where you think. Use \`--force-with-lease\`, which refuses if someone ` +
        `else pushed in the meantime, and needs no approval.`,
      );
    }
  }
  // A refspec whose destination is a runtime expansion (`$(…)`, `${…}`, `$VAR`,
  // backticks) can resolve to protected `main`, and the parse can't prove it
  // won't. Don't let it fall through to a silent `Bash(git push:*)` allow.
  if (rawRefspecs.some((r) => DYNAMIC.test(r))) {
    ask(
      "This push refspec resolves at runtime (`$…`, `$(…)`, `${…}`, or backticks), so its " +
      "destination — possibly protected `main` — can't be verified here. Approve only if it is not main.",
    );
  }
}

// ═══ 2. ASK — a human decision genuinely helps ═════════════════════════════

// An unquoted heredoc expands substitutions before execution. Because its body
// is scrubbed before path checks, fail closed here when the target is dynamic.
if (heredocDynamic) {
  ask(
    `This heredoc's delimiter is unquoted, so bash expands its body (\`${heredocDynamic}\`) before the ` +
    `command runs — that can read \`.env\` or a private key with no path argument for the secret gate ` +
    `to check. Quote the delimiter (\`<<'EOF'\`) if no expansion is wanted; approve only if it is.`,
  );
}

const SENSITIVE = [
  [/\.pdf$/i,                             "personal document (the class swept into #6)"],
  [/(^|\/)\.env(\.|$)/i,                  "environment file — secrets"],
  [/\.(pem|key|p12|pfx|jks|keystore)$/i,  "private key / keystore"],
  [/(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/i,  "SSH private key"],
  [/(^|\/)\.(npmrc|netrc|pypirc)$/i,      "registry auth token"],
  [/(^|\/)credentials?(\.json)?$/i,       "credentials file"],
  [/service[-_]account.*\.json$/i,        "service-account key"],
  [/(^|\/)\.terraform(rc)?$|\.tfstate$/i, "terraform state — often contains secrets"],
];

const addSeg = segmentsFor("git").find((s) => /^git\s+(-C\s+\S+\s+)?add\b/.test(s));
if (addSeg) {
  const at = addSeg.split(/\s+/);
  // `-u` only refreshes already-tracked files and can never introduce anything new.
  const bulk = at.some((t) => t === "-A" || t === "--all" || t === "." || t === "*");
  if (bulk) {
    const ad = dirFor(at);
    const dry = gitTry(ad, "add", "--dry-run", "--all", "--", ".");
    if (!dry.ok) {
      // Fail closed on the enumeration itself — the usual cause is an embedded
      // checkout, which is precisely what is worth catching.
      ask(
        `\`git add --dry-run\` failed, so what this would stage is unknown:\n\n` +
        dry.err.split("\n").slice(0, 5).map((l) => `  ${l}`).join("\n") +
        `\n\nUsually an embedded git checkout. Proceed only if you know what is in there.`,
      );
    }
    const paths = dry.out.split("\n").map((l) => l.match(/^add '(.+)'$/)?.[1]).filter(Boolean);
    const hits = [];
    for (const p of paths) {
      const why = SENSITIVE.find(([re]) => re.test(p))?.[1];
      if (why) hits.push(`${p}  — ${why}`);
      else if (existsSync(join(ad, p, ".git"))) hits.push(`${p}  — nested git checkout (stages as a gitlink)`);
    }
    if (hits.length) {
      ask(
        `This \`git add\` would stage ${paths.length} path(s); ${hits.length} look like they should not enter git:\n` +
        hits.slice(0, 12).map((h) => `  • ${h}`).join("\n") +
        (hits.length > 12 ? `\n  … and ${hits.length - 12} more` : "") +
        `\n\nStaging by name avoids this — it is what would have prevented #6.`,
      );
    }
  }
}

// `fetch <src>:<dst>` writes local refs and bare `stash` moves the working tree.
// Neither is a read, so the read path (§4) leaves them as passthrough — but the
// wide `Bash(git -C:*)` grant would then run them with no prompt. Ask here so the
// hook is the gate. `git fetch` with no refspec (updates only remote-tracking
// refs) and `stash list`/`show` stay silent.
const fetchSeg = segmentsFor("git").find((s) => /^git\s+(-C\s+\S+\s+)?fetch\b/.test(s));
if (fetchSeg) {
  const rest = fetchSeg.replace(/^git\s+(-C\s+\S+\s+)?fetch\b/, "");
  if (/(^|\s)\+?[^\s:]*:[^\s]+/.test(rest) || /--update-head-ok\b/.test(rest)) {
    ask(
      "`git fetch` with a `src:dst` refspec updates local branches (and a leading `+` or " +
      "--update-head-ok force-updates them). Approve deliberately; a bare `git fetch` only " +
      "moves remote-tracking refs and needs no prompt.",
    );
  }
}
const stashSeg = segmentsFor("git").find((s) => /^git\s+(-C\s+\S+\s+)?stash\b/.test(s));
if (stashSeg) {
  const sub = stashSeg.replace(/^git\s+(-C\s+\S+\s+)?stash\b/, "").trim().split(/\s+/)[0] || "";
  // Only the forms that DESTROY stashed work need a human. `push`/`save` (and
  // bare `stash`) are the opposite of destructive — the stash is a recovery
  // mechanism, and this hook's own deny/ask messages tell you to "stash first".
  // Gating the remedy it recommends is the friction this guard exists to remove.
  // `pop`/`apply` can conflict but never lose data; git refuses rather than
  // clobbering.
  if (/^(drop|clear)$/.test(sub)) {
    ask(
      "`git stash drop` / `clear` permanently discards stashed work — it is not in any branch, " +
      "so there is nothing to recover it from. `git stash list` / `show` inspect it first.",
    );
  }
}

// ═══ 3. SNAPSHOT then ALLOW — destructive but recoverable ══════════════════
// Capture the working tree to refs/exiid/undo/<ts> WITHOUT touching the real
// index or worktree (a temp GIT_INDEX_FILE), then get out of the way. This is
// the rule that used to block several times a day; now it costs ~40 ms and
// `npm run undo` brings the state back.
function snapshot(dir, label) {
  const head = gitIn(dir, "rev-parse", "--verify", "-q", "HEAD");
  if (!head) return null;
  const idx = join(process.env.TMPDIR || "/tmp", `exiid-undo-${process.pid}.idx`);
  // A synthetic identity so `commit-tree` succeeds even when the caller has no
  // global git identity configured (e.g. CI, a fresh box). The undo ref is
  // internal and never pushed, so it must not depend on the operator's config.
  // Inheriting it means commit-tree fails there and the snapshot silently
  // degrades to a block — the exact friction this path exists to remove.
  const env = {
    ...process.env,
    GIT_INDEX_FILE: idx,
    GIT_AUTHOR_NAME: "exiid-undo", GIT_AUTHOR_EMAIL: "undo@exiid.local",
    GIT_COMMITTER_NAME: "exiid-undo", GIT_COMMITTER_EMAIL: "undo@exiid.local",
  };
  const run = (...a) => {
    try {
      return execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", env, stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch { return null; }
  };
  if (run("read-tree", "HEAD") === null) return null;
  run("add", "-A", "--", ".");                       // respects .gitignore; ok if partial
  const tree = run("write-tree");
  if (!tree) return null;
  // No timestamp in the subject: it read as the snapshot time but was actually
  // HEAD's commit date, which is misleading precisely when someone is trying to
  // pick the right snapshot to recover. `npm run undo` shows the real one, from
  // the ref's own committerdate.
  const sha = run("commit-tree", tree, "-p", head, "-m", `undo snapshot before \`${label}\``);
  if (!sha) return null;
  const ref = `refs/exiid/undo/${sha.slice(0, 12)}`;
  if (run("update-ref", ref, sha) === null) return null;
  return { ref, sha };
}

const localSeg = segmentsFor("git").find((s) => /^git\s+(-C\s+\S+\s+)?(reset|restore|clean|checkout)\b/.test(s));
if (localSeg) {
  const lt = localSeg.split(/\s+/);
  const ld = dirFor(lt);
  const gi = lt.indexOf("git");
  const sub = lt[gi + 1] === "-C" ? lt[gi + 3] : lt[gi + 1];

  // `clean -x` removes gitignored files. Those are exactly what a git snapshot
  // cannot hold (.env, local certs), so this one still wants a human.
  if (sub === "clean" && lt.some((t) => /^-[a-wyz]*[xX]/.test(t))) {
    ask(
      "`git clean -x` deletes gitignored files — in this fleet that means .env files and local " +
      "credentials that exist in no other copy, and that no snapshot can recover. " +
      "`git clean -fd` (respects .gitignore) is the safe form if you only want build output gone.",
    );
  }

  const discards =
    (sub === "reset" && lt.includes("--hard")) ||
    (sub === "restore" && !lt.includes("--staged")) ||
    (sub === "checkout" && (lt.includes("--") || lt.includes("-f") || lt.includes("--force"))) ||
    (sub === "clean" && lt.some((t) => /^-[a-z]*f/.test(t)));

  if (discards && gitIn(ld, "status", "--porcelain")) {
    const snap = snapshot(ld, `git ${sub}`);
    if (snap) {
      allow(
        `Snapshotted the working tree to ${snap.ref} before \`git ${sub}\` — ` +
        `restore with \`npm run undo\` (or \`git -C ${ld} checkout ${snap.sha.slice(0, 12)} -- .\`).`,
      );
    }
    // Snapshot failed — say so rather than silently proceeding or silently blocking.
    ask(
      `\`git ${sub}\` would discard uncommitted changes in ${ld}, and the undo snapshot could not ` +
      `be written (unreadable HEAD or an embedded checkout), so this would not be recoverable.`,
    );
  }
}

// ── `git worktree remove --force` — the one discard with no snapshot ───────
// Every other destructive-but-recoverable command lands in the block above.
// This one escaped it, and it is the worst of the set: it deletes the whole
// worktree directory, untracked files included, and those exist in no branch,
// no stash and no remote.
//
// Plain `worktree remove` is already safe — git refuses a dirty worktree with
// "contains modified or untracked files, use --force to delete it". So the only
// form that can lose work is the one where git's own guard is being overridden
// explicitly. Snapshot that, then get out of the way, exactly as with
// `reset --hard`.
//
// The undo ref lives in the shared ref store, not the worktree, so it survives
// the removal it is protecting against.
const wtSeg = segmentsFor("git").find((s) => /^git\s+(-C\s+\S+\s+)?worktree\s+remove\b/.test(s));
if (wtSeg) {
  const wt = wtSeg.split(/\s+/);
  const forced = wt.some((t) => t === "-f" || t === "--force");
  const ri = wt.indexOf("remove");
  const target = wt.slice(ri + 1).find((t) => !t.startsWith("-"))?.replace(/^["']|["']$/g, "");
  if (forced && target) {
    const base = dirFor(wt);
    const abs = target.startsWith("/") ? target : join(base, target);
    // Only snapshot when there is something to lose; a clean worktree removal is
    // routine tidying and should not pay 40ms or produce an undo ref.
    if (existsSync(abs) && gitIn(abs, "status", "--porcelain")) {
      const snap = snapshot(abs, "git worktree remove --force");
      if (snap) {
        allow(
          `Snapshotted ${abs} to ${snap.ref} before \`git worktree remove --force\` — ` +
          `untracked files included. Restore with \`npm run undo\`.`,
        );
      }
      ask(
        `\`git worktree remove --force\` would delete ${abs} including uncommitted and UNTRACKED ` +
        `files, and the undo snapshot could not be written — so this would not be recoverable. ` +
        `\`git -C ${abs} status --porcelain\` shows what would be lost.`,
      );
    }
  }
}

// ═══ 4. ALLOW — provably read-only ═════════════════════════════════════════
// Skips the permission prompt entirely, so this must be exact. Anything with a
// redirect, command substitution, backticks or a subshell is disqualified
// outright: those can hide arbitrary writes behind a read-looking command.
// `2>&1`, `>/dev/null` and `2>/dev/null` are not writes — they discard or merge
// streams. Treating every `>` as a file write disqualified the single most
// common shape in agent sessions (`cmd 2>&1 | tail`), which then fell through to
// a prompt for what was a pure read. Strip those three forms first, then apply
// the real check: any REMAINING redirect can create or truncate a file.
const redirectProbe = rawCmd
  .replace(/\d?>&\d/g, " ")
  .replace(/\d?>>?\s*\/dev\/(null|stderr|stdout)\b/g, " ");
if (/[><`]|\$\(|\bsudo\b/.test(redirectProbe)) passthrough();

const GIT_READ = new Set(["status", "log", "diff", "show", "rev-parse", "rev-list", "ls-files",
  "ls-remote", "ls-tree", "cat-file", "cherry", "for-each-ref", "merge-base", "describe", "blame",
  "shortlog", "count-objects", "symbolic-ref", "whatchanged", "fetch", "remote", "worktree",
  "stash", "branch", "tag", "config", "grep", "show-ref", "reflog", "diff-tree", "name-rev"]);
// Subcommand-level exceptions: these verbs mutate.
// `stash` alone means `stash push` in modern git — it moves the working tree.
// Only `stash list` / `stash show` are reads, so treat every other stash form
// (bare `stash` included) as unsafe.
const GIT_READ_UNSAFE = /^(remote\s+(add|remove|rm|set-url|rename|prune)|worktree\s+(add|remove|prune|move|lock)|stash(?!\s+(list|show)\b)|branch\s+(-d|-D|-m|-M|--delete|--move|--set-upstream|-u)|tag\s+(-d|--delete|-a|-s|-f)|config\s+(?!--get|--list|-l)|reflog\s+(expire|delete))/;

const GH_READ = /^gh\s+(pr\s+(view|list|checks|diff|status)|run\s+(list|view|watch)|repo\s+(view|list)|issue\s+(view|list)|workflow\s+(list|view)|release\s+(view|list)|search|auth\s+status|label\s+list|cache\s+list|status)\b/;

// `npm test` and `npm t` are npm's own aliases for `npm run test`, which is
// already read here. The alias must not cost an approval the spelled-out form
// does not — that difference is invisible from the operator's side and it was
// worth 23 prompts in a 50-transcript sample.
//
// `check` covers the house's read-only checkers (`check:spacing`,
// `check-memory-links`, `check:mapping-drift`, `check-brand-canon`, …), 113
// calls in that same sample and the largest single Bash gap left. It is one
// alternation entry rather than a `check.*` because the trailing `\b` is what
// keeps it honest: `check` then `:` or `-` is a boundary and matches, while
// `checkout-staging` is not a boundary and still falls through to a prompt.
const NPM_READ = /^npm\s+(?:test|t|run\s+(?:-s\s+|--silent\s+)?(?:doctor|validate|audit|lint|typecheck|test|check|brief|guard|secrets|drift|status|harvest|roadmap|dashboard|generate|tidy|undo))\b/;

const SHELL_READ = new Set(["ls", "cat", "head", "tail", "wc", "grep", "rg", "jq",
  "diff", "cmp", "file", "stat", "du", "df", "basename", "dirname", "realpath", "pwd", "echo",
  "printf", "sort", "uniq", "cut", "tr", "which", "type", "date", "true", "seq", "column", "tee"]);

// npm resolves package.json from the cwd, so a preceding `cd` retargets it
// exactly like `--prefix` does: `cd /tmp/evil && npm test` would run a foreign
// `test` script under a read-only name. A plain relative hop (`cd packages/api`)
// stays under the repo and keeps its allowance; an absolute path, a `..`, a
// bare `cd`/`cd -`, or anything carrying expansion is an unknown destination.
//
// The path STRING is not enough: `ln -s /tmp/evil escape && cd escape` reads as
// a tidy relative hop and lands outside the tree, so the destination is
// realpath-resolved and required to sit under the repo root. Anything that
// cannot be resolved (missing dir, unreadable, no git root) fails closed.
const CD_INSIDE_REPO = /^cd\s+(?:\.\/)?(?![-/])[\w.@][\w.@/-]*$/;
const BASE_DIR = payload?.cwd || process.cwd();
const realOrNull = (p) => { try { return realpathSync(p); } catch { return null; } };
const REPO_REAL = realOrNull(gitIn(BASE_DIR, "rev-parse", "--show-toplevel") || BASE_DIR);
const cdStaysInRepo = (seg) => {
  if (!CD_INSIDE_REPO.test(seg) || /(^|[\s/])\.\.(\/|$)/.test(seg)) return false;
  if (!REPO_REAL) return false;
  const dest = realOrNull(resolve(BASE_DIR, seg.slice(3).trim()));
  return !!dest && (dest === REPO_REAL || dest.startsWith(REPO_REAL + sep));
};
const cdLeavesRepo = segments.some((s) =>
  (s === "cd" || s.startsWith("cd ")) && !cdStaysInRepo(s));

const isReadOnly = (seg) => {
  const t = seg.split(/\s+/);
  const bin = t[0];
  if (bin === "cd") return true;                              // navigation alone changes nothing
  // find/fd are not reads — they can run arbitrary commands (-exec/-x) and delete
  // (-delete). Auto-allow only the pure-traversal form; a segment carrying any
  // action flag falls through to the normal permission prompt.
  if (bin === "find") return !/(^|\s)-(exec(dir)?|ok(dir)?|delete|fprintf?|fls)\b/.test(seg);
  if (bin === "fd")   return !/(^|\s)(-x|-X|--exec(-batch)?)\b/.test(seg);
  // `sort -o FILE` / `sort -oFILE` / `sort --output` overwrites a file in place.
  if (bin === "sort") return !t.slice(1).some((a) => /^--output(=|$)/.test(a) || /^-[a-z]*o/.test(a));
  if (SHELL_READ.has(bin)) return bin !== "tee";              // tee writes — excluded
  if (bin === "npm") {
    // The NPM_READ allowlist is only defensible for scripts in THIS repo's
    // package.json. Retargeting flags (`--prefix`, `-C`, `--workspace`/`-w`)
    // point npm at a foreign package.json, so `npm test --prefix /tmp/evil`
    // would run arbitrary scripts under a read-only name. Prompt for those.
    if (!NPM_READ.test(seg)) return false;
    // The grant covers the BARE invocation only. Retargeting flags
    // (`--prefix`, `-C`, `--workspace`/`-w`) point npm at a foreign
    // package.json, and arguments handed to the script are ones no
    // script-name allowlist can judge: `npm run check-layout-canon --
    // --update-baseline` rewrites scripts/layout-canon-baseline.json under a
    // name the `check` token reads as safe. Anything trailing prompts.
    //
    // A redirection is not an argument to the script, and `npm run lint 2>&1 |
    // tail -20` is the single most common shape in the fleet. Counting `2>&1`
    // as argv cost 113 auto-allows on bare `npm run lint`/`typecheck`/`test`
    // in a 50-transcript replay — more than this whole grant gives back. Strip
    // redirections with the same two shapes the global probe above already
    // vetted, so what remains is genuinely argv. Any OTHER `>` has passed
    // through that probe by now, so this cannot hide a file write.
    const bare = seg.replace(/\d?>&\d/g, " ")
      .replace(/\d?>>?\s*\/dev\/(null|stderr|stdout)\b/g, " ")
      .split(/\s+/).filter(Boolean);
    const extra = bare.slice(bare[1] === "run" ? (/^(-s|--silent)$/.test(bare[2] ?? "") ? 4 : 3) : 2);
    if (extra.length) return false;
    if (cdLeavesRepo) return false;                           // cwd retargeting — same threat
    return true;
  }
  if (bin === "gh") {
    // Canonicalise away global flags (`-R o/r`, `--hostname …`) so a GET behind
    // them still reads as read-only. `gh api` is read-only only for a REST GET
    // (explicit or bodyless default); graphql and any body/method that implies
    // non-GET mutate. Every other GH_READ verb is inherently read.
    const g = ghCanon(seg);
    if (/^gh\s+api\b/.test(g)) return !ghIsGraphql(g) && ghMethod(g) === "GET";
    return GH_READ.test(g);
  }
  if (bin === "git") {
    const rest = t[1] === "-C" ? t.slice(3).join(" ") : t.slice(1).join(" ");
    const sub = rest.split(/\s+/)[0];
    if (!GIT_READ.has(sub)) return false;
    if (GIT_READ_UNSAFE.test(rest)) return false;
    // `git fetch` with a colon refspec (`main:main`, `+main:main`) or
    // --update-head-ok updates local refs — that is a write, not a read.
    if (sub === "fetch" && (/(^|\s)\+?[^\s:]*:[^\s]+/.test(rest) || /--update-head-ok\b/.test(rest))) return false;
    return true;
  }
  return false;
};

// A content-dumping read (cat/head/rg/grep/…) aimed at a secret path would
// otherwise be auto-allowed below and skip the prompt — the very files the
// Read(**/.env*) and key denials block. The deny list must not have a Bash side
// door, so route these to a human. `ask` restores exactly the gate that
// auto-allow removed; a deliberate operator can still approve.
const SECRET_READ_PATHS = SENSITIVE.filter(([, why]) => !/personal document/.test(why)).map(([re]) => re);
const isSecretPath = (p) => SECRET_READ_PATHS.some((re) => re.test(p));

// Concrete names the SENSITIVE shapes are meant to protect. Used to decide
// whether a shell PATTERN could land on one of them — see globCouldHitSecret.
// Names, not paths: the patterns above are anchored on `(^|/)`, so a bare
// filename exercises them exactly as a nested one would.
const SECRET_EXEMPLARS = [
  ".env", ".env.local", ".env.production",
  "server.pem", "tls.key", "cert.p12", "store.pfx", "keys.jks", "a.keystore",
  "id_rsa", "id_ed25519", "id_ecdsa", "id_dsa",
  ".npmrc", ".netrc", ".pypirc",
  "credentials", "credentials.json", "credential.json",
  "service_account.json", "service-account-key.json",
  ".terraformrc", ".terraform", "main.tfstate",
];

// Does this token contain shell pathname-expansion metacharacters?
const HAS_GLOB = /[*?[\]{}]/;

/**
 * True when `tok` is a shell pattern that could expand onto a secret file.
 *
 * Translating the glob to a regex and testing it against known secret names is
 * deliberately narrower than "any pattern is suspicious": `scripts/*.mjs`
 * matches no exemplar and stays silent, while `.en*`, `.en{v}`, `*.pem` and
 * `id_*` all match and fail closed. Bounded and allocation-free — no filesystem
 * access, so it cannot be defeated by the file being absent at check time and
 * cannot hang on a large tree.
 */
function globCouldHitSecret(tok) {
  if (!tok || !HAS_GLOB.test(tok)) return false;
  const base = tok.split("/").pop() ?? tok;
  if (!HAS_GLOB.test(base)) return false; // pattern is in a directory part only

  let re = "";
  for (let i = 0; i < base.length; i++) {
    const c = base[i];
    if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else if (c === "[") {                       // character class: pass through
      const end = base.indexOf("]", i + 1);
      if (end === -1) { re += "\\["; continue; }
      re += `[${base.slice(i + 1, end).replace(/^!/, "^")}]`;
      i = end;
    } else if (c === "{") {                     // brace list -> alternation
      const end = base.indexOf("}", i + 1);
      if (end === -1) { re += "\\{"; continue; }
      const parts = base.slice(i + 1, end).split(",").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      re += `(?:${parts.join("|")})`;
      i = end;
    } else re += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  let pattern;
  try { pattern = new RegExp(`^${re}$`, "i"); } catch { return true; } // unparseable -> fail closed
  return SECRET_EXEMPLARS.some((name) => pattern.test(name));
}
// A git pathspec can carry a rev prefix — `HEAD:.env`, `:0:.env`, `:.env` — that
// hides the real path from the `(^|/)\.env` shapes. Shell-unquote first so any
// quoting/escaping bash would collapse (`HEAD:''.env''`, `HEAD:.en''v`,
// `HEAD:$'.env'`) is gone, then drop the rev prefix so only the bare path is
// left to match.
const bareGitPath = (a) => shellUnquote(a).replace(/^[^:]*:(?:[0-3]:)?/, "");

const CONTENT_READERS = new Set(["cat", "head", "tail", "less", "more", "nl", "tac",
  "xxd", "od", "strings", "hexdump", "grep", "rg", "jq", "sort", "cut", "tr", "wc"]);
// git verbs that print file CONTENTS (not just names/status). `git show HEAD:.env`
// and `git grep SECRET -- .env` are reads that GIT_READ would otherwise auto-allow,
// so they need the same secret gate as the shell dumpers above.
const GIT_CONTENT_READERS = new Set(["show", "grep", "cat-file", "diff", "diff-tree", "blame", "log"]);

for (const seg of segments) {
  const st = seg.split(/\s+/);
  const bin = st[0];
  let cands = null;
  if (CONTENT_READERS.has(bin)) {
    cands = st.slice(1).filter((a) => !a.startsWith("-")).map(shellUnquote);
  } else if (bin === "git") {
    const rest = st[1] === "-C" ? st.slice(3) : st.slice(1);
    if (GIT_CONTENT_READERS.has(rest[0])) {
      // Treat every non-flag arg as a candidate pathspec (positional `<file>`,
      // `<rev>:<path>`, and args after `--` all count). `grep`'s search pattern
      // is swept in too, but it only trips the gate if the pattern itself looks
      // like a secret path — a rare, harmless extra prompt.
      cands = rest.slice(1)
        .filter((a) => !a.startsWith("-") && a !== "--")
        .map(bareGitPath);
    }
  }
  if (!cands) continue;
  const hit = cands.find(isSecretPath);
  if (hit) {
    ask(
      `Reading \`${hit}\` via \`${bin}\` would expose a file the Read/.env deny list forbids — ` +
      `secrets get no Bash side door. Approve deliberately only if you genuinely need it.`,
    );
  }
  // A path arg that still expands at runtime (`$(…)`, `${…}`, `$VAR`, backticks)
  // after shellUnquote could resolve to `.env`/a key — the exact obfuscation
  // this gate stops. Fail closed rather than let it reach the read-only `allow`
  // that skips the prompt entirely.
  //
  // The overwhelmingly common trigger is not obfuscation, it is an agent
  // writing `for f in a b c; do cat "$f"; done` out of shell habit. That is a
  // prompt with no security value on either side: the operator learns nothing
  // from approving it, and the same read spelled literally is auto-allowed. So
  // the message names the fix, the way the glob branch below already does —
  // otherwise every session rediscovers the wall and nobody rediscovers the door.
  const dyn = cands.find((p) => DYNAMIC.test(p));
  if (dyn) {
    ask(
      `A path arg to \`${bin}\` expands at runtime (\`${dyn}\`), so it can't be checked against the ` +
      `secret deny list — it may resolve to \`.env\` or a key. Name the paths literally ` +
      `(\`${bin} a b c\` reads them all in one auto-allowed call), or approve only if you know it does not.`,
    );
  }
  // PATHNAME expansion is the same hole by another route, and it was open:
  // `cat .env` correctly asked while `cat .en*` and `cat .en{v}` were ALLOWED
  // outright — allow skips the prompt entirely, so a glob read a secret with
  // nothing shown to the operator. (Found by probing this guard against
  // dentistry-lms's copy, which had already closed it in #1072/#1074.)
  //
  // Blanket-asking on every `*` would undo the ergonomics rule this file exists
  // for — `cat scripts/*.mjs` must stay silent. So ask only when the pattern
  // could actually REACH something sensitive: expand it as a regex and test it
  // against the canonical secret filenames. `.en*` -> /^\.en.*$/ matches
  // `.env`; `scripts/*.mjs` matches none of them.
  const globby = cands.find((p) => globCouldHitSecret(p));
  if (globby) {
    ask(
      `A path arg to \`${bin}\` is a shell pattern (\`${globby}\`) that could expand onto a file the ` +
      `secret deny list forbids (\`.env\`, a key, credentials). Name the file explicitly, or approve ` +
      `only if you know what it matches.`,
    );
  }
}

// ═══ 5. ALLOW — safe writes, including in a chain ══════════════════════════
// Permission patterns are prefix-matched against the WHOLE command string, so
// `gh pr merge 23 --squash` matches `Bash(gh pr merge:*)` but
// `cd /repo && gh pr merge 23 --squash` matches nothing and falls to the
// classifier. That one difference is the single biggest source of "blocked
// again" in agent sessions, and no allowlist entry can fix it — only something
// that parses the chain can.
//
// Every dangerous form of these verbs has already been denied or asked above,
// so what reaches here is the residue: the safe cases. Granting them is not a
// new permission, it is the same policy applied to a chain instead of a bare
// command.
const SAFE_WRITE = (seg) => {
  const t = seg.split(/\s+/);
  if (t[0] === "gh") {
    const g = ghCanon(seg);
    // --admin was denied in §1; everything reaching here respects the checks.
    return /^gh\s+(pr\s+(create|merge|edit|comment|ready|close|reopen)|issue\s+(create|comment|edit)|run\s+(rerun|cancel))\b/.test(g);
  }
  if (t[0] === "git") {
    const rest = t[1] === "-C" ? t.slice(3).join(" ") : t.slice(1).join(" ");
    const sub = rest.split(/\s+/)[0];
    // Pushes to a protected main, force-pushes and main deletions are already
    // denied/asked in §1 — a push still standing here targets a feature branch.
    if (sub === "push") return true;
    // add/commit: a bulk add staging a secret was asked in §2.
    if (sub === "add" || sub === "commit") return true;
    if (sub === "checkout" || sub === "switch" || sub === "restore" || sub === "reset") return true;
    if (sub === "merge" || sub === "rebase" || sub === "cherry-pick" || sub === "revert") return true;
    if (sub === "pull") return true;                  // fetch + merge; recoverable
    if (sub === "stash") return true;                 // drop/clear asked above
    if (sub === "fetch") return true;
    // Creating/listing branches, tags and worktrees is routine; DELETING them
    // is not, and a `-D` can drop unmerged commits (reflog-only recovery). Let
    // the destructive subforms fall through to a prompt rather than riding in
    // on the chain grant.
    if (sub === "branch")   return !/(^|\s)(-d|-D|--delete|-m|-M|--move)\b/.test(rest);
    if (sub === "tag")      return !/(^|\s)(-d|--delete)\b/.test(rest);
    if (sub === "worktree") return !/(^|\s)(remove|prune)\b/.test(rest);
    return false;
  }
  return false;
};

if (segments.length && segments.every((s) => isReadOnly(s) || SAFE_WRITE(s))) {
  allow(segments.every(isReadOnly) ? "read-only" : "read-only + already-vetted git/gh writes");
}

if (segments.length && segments.every(isReadOnly)) {
  allow("read-only");
}

passthrough();
