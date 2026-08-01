#!/usr/bin/env node
// fleet-cursor-guard.mjs — Cursor `beforeShellExecution` adapter for the fleet's
// one decision engine. Rolls into a repo as `.cursor/guard-cursor-adapter.mjs`.
//
// The rules (deny a protected-main push, a force-push, a repo delete, …) live in
// ONE place — .claude/guard-fleet-writes.mjs — and are tested by
// `npm run test:guard`. Duplicating that logic into a Cursor-native guard would
// be exactly the drift this fleet keeps warning about, so this does NOT re-decide
// anything: it translates Cursor's hook envelope to the guard's, runs the guard
// unchanged as a subprocess, and translates the verdict back.
//
//   Cursor  stdin : { "command": "...", "cwd": "...", "sandbox": false }
//   guard   stdin : { "tool_name":"Bash", "tool_input":{"command":"..."}, "cwd":"..." }
//   guard   stdout: { "hookSpecificOutput": { "permissionDecision":"allow|deny|ask",
//                                              "permissionDecisionReason":"..." } }
//   Cursor  stdout: { "permission":"allow|deny|ask", "user_message":"...", "agent_message":"..." }
//
// The guard's fourth verdict — "passthrough" (exit 0, no JSON) — means "no opinion,
// use the normal permission flow." We mirror it by emitting nothing and exiting 0,
// so Cursor's own permission system decides. Only the guard's explicit
// allow/deny/ask are forwarded.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const readStdin = async () => {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
};

// No opinion → emit nothing, exit 0. Cursor falls back to its own permission flow.
const passthrough = () => process.exit(0);

let input;
try { input = JSON.parse(await readStdin()); } catch { passthrough(); }
const command = String(input?.command ?? "");
if (!command) passthrough();
const cwd = input?.cwd || process.cwd();

// Locate the guard: next to this adapter (../.claude/…), else in the repo root.
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(here, "..", ".claude", "guard-fleet-writes.mjs"),
  join(cwd, ".claude", "guard-fleet-writes.mjs"),
];
const guard = candidates.find(existsSync);
if (!guard) passthrough(); // no guard rolled in → no opinion (pre-push hook still covers pushes)

// Run the guard unchanged, feeding it the Claude-shaped payload it expects.
let out = "";
try {
  out = execFileSync("node", [guard], {
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });
} catch (e) {
  // The guard shouldn't throw (it exits 0 on every path), but if it does, don't
  // convert a guard crash into a block that halts real work.
  out = String(e.stdout ?? "");
}

out = out.trim();
if (!out) passthrough(); // guard had no opinion

let verdict;
try { verdict = JSON.parse(out)?.hookSpecificOutput; } catch { passthrough(); }
const decision = verdict?.permissionDecision;
const reason = verdict?.permissionDecisionReason || "";
if (decision !== "allow" && decision !== "deny" && decision !== "ask") passthrough();

process.stdout.write(JSON.stringify({
  permission: decision,
  user_message: reason,
  agent_message: reason,
}));
process.exit(0);
