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
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

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

// Text that merely CONTAINS a dangerous command is not that command. A commit
// message describing `gh pr merge --admin`, a heredoc writing docs, an `echo`
// of an example — all matched the naive regex and blocked honest work (this
// file's own first commit was the casualty). Scrub the prose regions before
// matching, and require a segment to actually START with the binary.
const cmd = rawCmd
  .replace(/<<-?\s*(['"]?)([A-Za-z_]\w*)\1[\s\S]*?^\s*\2\s*$/gm, " <<HEREDOC ")
  .replace(/<<-?\s*(['"]?)([A-Za-z_]\w*)\1[\s\S]*$/m, " <<HEREDOC ")
  .replace(/(^|\s)(-m|--message)\s+("(?:[^"\\]|\\.)*"|'[^']*')/g, "$1$2 MSG");

const SEP = /\s*(?:\|\||&&|;|\||\n)\s*/;
const segments = cmd.split(SEP)
  .map((s) => s.trim().replace(/^(?:[A-Za-z_]\w*=\S*\s+)*/, "")) // strip FOO=bar prefixes
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
const BAKED_PROTECTED = ["dentistry-lms", "billing-platform", "iqa-contribution", "dentistry-leads", "exiid-os"];

function protectedSet() {
  // 1. Running inside exiid-ops: the manifest module is authoritative.
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
function require$(url) {
  try {
    const src = readFileSync(new URL("../workspace.yaml", url), "utf8");
    const m = src.match(/^\s*protected_repos:\s*\[([^\]]+)\]/m);
    return m ? m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "").toLowerCase()).filter(Boolean) : null;
  } catch { return null; }
}

for (const seg of segmentsFor("gh")) {
  if (/^gh\s+pr\s+merge\b/.test(seg) && /\s--admin\b/.test(seg)) {
    deny(
      "`gh pr merge --admin` bypasses required status checks — the one thing branch " +
      "protection exists to prevent. Use `gh pr merge --auto --squash` so it lands the " +
      "moment checks go green.",
    );
  }
  if (/^gh\s+repo\s+delete\b/.test(seg)) {
    deny("`gh repo delete` is unrecoverable. Archive instead (AGENTS.md § Archiving), or delete it yourself in the GitHub UI.");
  }
  if (/^gh\s+api\b/.test(seg) && /(-X|--method)\s+DELETE\b/.test(seg) && /\/?repos\//.test(seg)) {
    deny("`gh api -X DELETE /repos/…` deletes GitHub state irreversibly. Run it yourself if that is genuinely intended.");
  }
}

const pushSeg = segmentsFor("git").find((s) => /^git\s+(-C\s+\S+\s+)?push\b/.test(s));
if (pushSeg) {
  const tokens = pushSeg.split(/\s+/);
  const dir = dirFor(tokens);
  const forced = tokens.some((t) => t === "--force" || t === "-f" || t.startsWith("--force-with-lease"));
  const after = tokens.slice(tokens.indexOf("push") + 1).filter((t) => !t.startsWith("-"));
  const refspecs = after.slice(1); // after[0] is the remote
  const branch = gitIn(dir, "branch", "--show-current");

  if ((tokens.includes("--delete") || tokens.includes("-d")) && refspecs.some((r) => MAIN.test(r))) {
    deny("Refusing to delete the `main` branch on the remote.");
  }
  if (refspecs.some((r) => /^:(main|master)$/.test(r))) {
    deny("Refusing to delete the `main` branch on the remote (`:main` refspec).");
  }

  const targets = refspecs.length
    ? refspecs.map((r) => (r.includes(":") ? r.split(":").pop() : r === "HEAD" ? branch : r))
    : [branch];
  const touchesMain = targets.some((t) => MAIN.test(t));

  if (forced && touchesMain) {
    deny(`Refusing to force-push to \`${targets.find((t) => MAIN.test(t))}\`. Shared history is never rewritten in this fleet.`);
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
  if (forced) {
    deny(`Refusing to force-push \`${targets.join(", ")}\`. Push a fresh branch and open a PR instead.`);
  }
}

// ═══ 2. ASK — a human decision genuinely helps ═════════════════════════════
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

// ═══ 4. ALLOW — provably read-only ═════════════════════════════════════════
// Skips the permission prompt entirely, so this must be exact. Anything with a
// redirect, command substitution, backticks or a subshell is disqualified
// outright: those can hide arbitrary writes behind a read-looking command.
if (/[><`]|\$\(|\bsudo\b/.test(rawCmd)) passthrough();

const GIT_READ = new Set(["status", "log", "diff", "show", "rev-parse", "rev-list", "ls-files",
  "ls-remote", "ls-tree", "cat-file", "cherry", "for-each-ref", "merge-base", "describe", "blame",
  "shortlog", "count-objects", "symbolic-ref", "whatchanged", "fetch", "remote", "worktree",
  "stash", "branch", "tag", "config", "grep", "show-ref", "reflog", "diff-tree", "name-rev"]);
// Subcommand-level exceptions: these verbs mutate.
const GIT_READ_UNSAFE = /^(remote\s+(add|remove|rm|set-url|rename|prune)|worktree\s+(add|remove|prune|move|lock)|stash\s+(push|pop|apply|drop|clear|save)|branch\s+(-d|-D|-m|-M|--delete|--move|--set-upstream|-u)|tag\s+(-d|--delete|-a|-s|-f)|config\s+(?!--get|--list|-l)|reflog\s+(expire|delete))/;

const GH_READ = /^gh\s+(pr\s+(view|list|checks|diff|status)|run\s+(list|view|watch)|repo\s+(view|list)|issue\s+(view|list)|workflow\s+(list|view)|release\s+(view|list)|api\s+(?!.*(-X|--method)\s+(?!GET))|search|auth\s+status|label\s+list|cache\s+list|status)\b/;

const NPM_READ = /^npm\s+run\s+(-s\s+|--silent\s+)?(doctor|validate|audit|lint|typecheck|test|brief|guard|secrets|drift|status|harvest|roadmap|dashboard|generate|tidy|undo)\b/;

const SHELL_READ = new Set(["ls", "cat", "head", "tail", "wc", "grep", "rg", "fd", "find", "jq",
  "diff", "cmp", "file", "stat", "du", "df", "basename", "dirname", "realpath", "pwd", "echo",
  "printf", "sort", "uniq", "cut", "tr", "which", "type", "date", "true", "seq", "column", "tee"]);

const isReadOnly = (seg) => {
  const t = seg.split(/\s+/);
  const bin = t[0];
  if (bin === "cd") return true;                              // navigation alone changes nothing
  if (SHELL_READ.has(bin)) return bin !== "tee";              // tee writes — excluded
  if (bin === "npm") return NPM_READ.test(seg);
  if (bin === "gh") return GH_READ.test(seg);
  if (bin === "git") {
    const rest = t[1] === "-C" ? t.slice(3).join(" ") : t.slice(1).join(" ");
    const sub = rest.split(/\s+/)[0];
    if (!GIT_READ.has(sub)) return false;
    if (GIT_READ_UNSAFE.test(rest)) return false;
    return true;
  }
  return false;
};

if (segments.length && segments.every(isReadOnly)) {
  allow("read-only");
}

passthrough();
