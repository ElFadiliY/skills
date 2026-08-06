// context-guard · a UserPromptSubmit hook that says something when the session
// has grown past the point where continuing is the expensive option.
//
// Why a hook and not a habit: context growth is invisible from inside a session.
// Nothing in the transcript feels different at turn 700 than at turn 70 — the
// model answers the same, the work looks the same — but the prompt carried per
// turn has gone from ~100k to ~700k and every one of those tokens is re-billed
// on every subsequent turn. On 2026-08-02 that mechanism ate 95% of a weekly
// Max 20x cap in 2.6 days with a 98.1% cache hit rate. You cannot correct for a
// cost you cannot see, so this makes it visible at the moment it starts to matter.
//
// Deliberately silent below the threshold. A hook that speaks every turn is a
// hook you learn to scroll past — and since UserPromptSubmit stdout joins the
// context, a chatty guard would itself become the thing it warns about. It costs
// nothing until it has something to say.
//
// Never blocks, never throws, always exits 0. A budget advisory that can break a
// session is a worse trade than no advisory.
import { existsSync, openSync, readSync, closeSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Prompt tokens per turn past which context carry dominates. Override per-machine. */
const BUDGET = Number(process.env.EXIID_CONTEXT_BUDGET || 200_000);

/** Enough tail to hold the last few records; transcripts reach hundreds of MB. */
const TAIL_BYTES = 512 * 1024;

/** Reads the trailing bytes of a file without loading the whole thing. */
function readTail(path, bytes = TAIL_BYTES) {
  const size = statSync(path).size;
  const length = Math.min(bytes, size);
  const buffer = Buffer.alloc(length);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buffer, 0, length, size - length);
  } finally {
    closeSync(fd);
  }
  return buffer.toString("utf8");
}

/** Prompt tokens carried on the most recent assistant turn, or null. */
export function lastPromptTokens(text) {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (!line || line[0] !== "{" || !line.includes('"usage"')) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      // A truncated first line is expected — we sliced mid-file.
      continue;
    }
    const usage = record?.message?.usage;
    if (!usage || record.type !== "assistant") continue;
    return (
      (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0)
    );
  }
  return null;
}

/**
 * The advisory for a given context size, or null below the budget.
 *
 * Escalates by multiple rather than by absolute size so one env var tunes the
 * whole ladder. The wording targets the model, because for UserPromptSubmit the
 * model is what reads stdout — and relaying it is exactly the behaviour wanted.
 */
export function advisory(promptTokens, budget = BUDGET) {
  if (!promptTokens || promptTokens < budget) return null;
  const k = Math.round(promptTokens / 1000);
  const multiple = promptTokens / budget;
  const head = `[context-guard] This session now carries ~${k}k tokens per turn (budget ${Math.round(budget / 1000)}k).`;

  if (multiple >= 3) {
    return (
      `${head} Every turn re-bills all of it, so continuing here is roughly ${multiple.toFixed(1)}x the cost of the ` +
      `same work in a fresh session. Tell the operator plainly, and recommend checkpointing now — ` +
      `\`npm run ops -- task checkpoint <name> --done … --next …\` — then continuing in a new session from CONTEXT.md.`
    );
  }
  if (multiple >= 2) {
    return (
      `${head} Recommend \`/compact\` before the next substantial step, and mention that a checkpoint ` +
      `(\`npm run ops -- task checkpoint\`) is the cheaper option if the current unit of work is finished.`
    );
  }
  return `${head} Mention this once and suggest \`/compact\` at the next natural break. Do not repeat it every turn.`;
}

// stdin is a pipe, so statSync reports size 0 — read the descriptor directly
// rather than going through readTail.
function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

export function main() {
  try {
    let payload;
    try {
      payload = JSON.parse(readStdin() || "{}");
    } catch {
      return 0;
    }
    const path = payload.transcript_path;
    if (!path || !existsSync(path)) return 0;
    const message = advisory(lastPromptTokens(readTail(path)));
    if (message) console.log(message);
  } catch {
    // Any failure here is a non-event. The session continues either way.
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
