#!/usr/bin/env node
/**
 * vault-orch :: backfill-frontmatter.mjs
 * -------------------------------------------------------------------------
 * Variant-B frontmatter stamper for agent-orch session markdown.
 *
 * Adds a YAML frontmatter HEADER to each `ssnc-agent-orch/**` markdown file.
 * It NEVER rewrites the body. The Jira link is stored in the frontmatter as a
 * wikilink array so Obsidian Properties (v1.4+) treat it as a real graph edge
 * + backlink — a header-only diff, identical graph payoff to inline links.
 *
 *   ---
 *   type: session-plan
 *   session: 2026-05-31-recon-pipeline-cob-carryforward-matching
 *   date: 2026-05-31
 *   jira: ["[[RCONAI-427]]", "[[RCONAI-635]]"]
 *   status: in-progress        # only when confidently inferred
 *   skill: build               # only when discoverable from prompt.md
 *   ---
 *
 * Design contract (see plugins/vault-orch/README.md):
 *   - Store relationships, never state. We stamp the immutable fact "this file
 *     references ticket X" + structural metadata. We do NOT copy Jira status,
 *     assignee, or sprint. `status:` here is the session lifecycle, not Jira's.
 *
 * Guarantees:
 *   - IDEMPOTENT. Re-running with no source change produces no diff. Existing
 *     frontmatter is merged/refreshed, never duplicated or double-stamped.
 *   - SAFE PARSING. Ticket refs inside fenced code blocks (``` / ~~~),
 *     inline code (`...`), markdown links ([x](...)) and bare URLs are ignored
 *     — only prose references populate the jira list.
 *   - DRY-RUN by default. Pass --apply to write. One mechanical PR.
 *   - GENERIC. Project-key prefixes are configurable via --keys so it works
 *     for any Jira project, not just RCONAI.
 *
 * Usage:
 *   node backfill-frontmatter.mjs [--root <dir>] [--keys RCONAI,AITOOLS]
 *                                 [--apply] [--quiet] [--json]
 *
 *   --root <dir>   Repo root to scan (default: cwd). Scans <root>/ssnc-agent-orch.
 *   --keys <list>  Comma-separated Jira project-key prefixes. When omitted, any
 *                  uppercase key matching /[A-Z]{2,}-\d+/ is collected.
 *   --apply        Write changes. Without it, prints a dry-run plan only.
 *   --quiet        Suppress per-file output; print the summary only.
 *   --json         Emit a machine-readable JSON summary (used by the Stop hook).
 *   --only <glob>  Restrict to files whose path contains this substring
 *                  (used by the Stop hook to stamp a single session dir).
 *
 * Exit codes: 0 success (even with 0 changes). 1 only on hard error.
 * No dependencies — Node stdlib only.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, basename, sep } from "node:path";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { root: process.cwd(), keys: [], apply: false, quiet: false, json: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--quiet") args.quiet = true;
    else if (a === "--json") args.json = true;
    else if (a === "--root") args.root = argv[++i];
    else if (a === "--only") args.only = argv[++i];
    else if (a === "--keys") {
      args.keys = (argv[++i] || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    }
  }
  return args;
}

const HELP = `vault-orch backfill-frontmatter — variant-B frontmatter stamper

  node backfill-frontmatter.mjs [--root <dir>] [--keys RCONAI,AITOOLS] [--apply]
                                [--quiet] [--json] [--only <substr>]

Dry-run by default. Pass --apply to write. See file header for full docs.`;

// ---------------------------------------------------------------------------
// Ticket extraction — skips code fences, inline code, markdown links, URLs
// ---------------------------------------------------------------------------

/**
 * Build the ticket regex. When keys are supplied we anchor to them
 * (e.g. /\b(?:RCONAI|AITOOLS)-\d+\b/); otherwise any 2+ uppercase-letter key.
 */
function buildTicketRegex(keys) {
  if (keys.length) {
    const alt = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    return new RegExp(`\\b(?:${alt})-\\d+\\b`, "g");
  }
  return /\b[A-Z][A-Z0-9]+-\d+\b/g;
}

/**
 * Return the prose-only text of a markdown body with code fences, inline code,
 * markdown link targets, and bare URLs blanked out (replaced by spaces of equal
 * length so we don't shift any offsets). We then run the ticket regex over the
 * blanked text — anything inside code/links is invisible to it.
 */
function blankNonProse(body) {
  let out = body;

  // 1. Fenced code blocks: ``` ... ``` or ~~~ ... ~~~ (multiline, non-greedy).
  out = out.replace(/(^|\n)([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\3[ \t]*(?=\n|$)/g, (m) =>
    blankPreservingNewlines(m)
  );

  // 2. Inline code spans: `...` (single or multi-backtick, single line).
  out = out.replace(/`+[^`\n]*`+/g, (m) => " ".repeat(m.length));

  // 3. Markdown links / images: [text](target) and ![alt](target).
  //    A ticket key that appears ONLY as a link (label OR target) is a
  //    clickable reference, not prose — blank the WHOLE construct so it is
  //    not collected. A key mentioned in prose elsewhere is still picked up.
  out = out.replace(/!?\[[^\]]*\]\([^)]*\)/g, (m) => " ".repeat(m.length));
  //    Reference-style link definitions:  [label]: https://...
  out = out.replace(/^[ \t]*\[[^\]]*\]:[ \t]*\S+.*$/gm, (m) => " ".repeat(m.length));

  // 4. Bare URLs / autolinks — blank the whole token.
  out = out.replace(/<[^>\s]+>/g, (m) => " ".repeat(m.length)); // <https://...>
  out = out.replace(/\bhttps?:\/\/\S+/g, (m) => " ".repeat(m.length));

  return out;
}

function blankPreservingNewlines(s) {
  // Replace every non-newline char with a space so line/column math is stable.
  return s.replace(/[^\n]/g, " ");
}

/**
 * Collect distinct ticket keys from prose, in first-seen order.
 */
function collectTickets(body, ticketRe) {
  const prose = blankNonProse(body);
  const seen = new Set();
  const ordered = [];
  let m;
  ticketRe.lastIndex = 0;
  while ((m = ticketRe.exec(prose)) !== null) {
    const key = m[0];
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}

// ---------------------------------------------------------------------------
// Frontmatter parse / serialize (minimal, dependency-free)
// ---------------------------------------------------------------------------

/**
 * Split a file into { fm, body } where fm is the raw YAML text (or null) and
 * body is everything after the closing `---`. Frontmatter must start on line 1.
 */
function splitFrontmatter(text) {
  if (!text.startsWith("---")) return { fm: null, body: text, eol: detectEol(text) };
  // Match leading --- ... --- block.
  const m = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { fm: null, body: text, eol: detectEol(text) };
  const fm = m[1];
  const body = text.slice(m[0].length);
  return { fm, body, eol: detectEol(text) };
}

function detectEol(text) {
  return /\r\n/.test(text) ? "\r\n" : "\n";
}

/**
 * Parse the small subset of YAML we emit: `key: scalar` and
 * `jira: ["[[X]]", "[[Y]]"]`. Unknown keys are preserved verbatim.
 * Returns { order:[keys], values:{key:rawString}, jira:[keys] }.
 */
function parseFm(fm) {
  const values = {};
  const order = [];
  let jira = [];
  if (!fm) return { values, order, jira };
  for (const rawLine of fm.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s?(.*)$/);
    if (!m) continue; // not a flat "key: value" line (e.g. nested YAML) — skip; only flat keys are parsed/managed
    const key = m[1];
    const val = m[2];
    if (!(key in values)) order.push(key);
    values[key] = val;
    if (key === "jira") jira = parseJiraValue(val);
  }
  return { values, order, jira };
}

/** Parse a jira: value into an array of bare keys (strip [[ ]] and quotes). */
function parseJiraValue(val) {
  const keys = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(val)) !== null) keys.push(m[1].trim());
  if (keys.length) return dedupe(keys);
  // Fallback: a plain inline-array of quoted strings without wikilinks.
  const re2 = /"([^"]+)"|'([^']+)'/g;
  while ((m = re2.exec(val)) !== null) keys.push((m[1] || m[2]).replace(/^\[\[|\]\]$/g, "").trim());
  return dedupe(keys);
}

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) if (!seen.has(x)) { seen.add(x); out.push(x); }
  return out;
}

function serializeJira(keys) {
  if (!keys.length) return "[]";
  return "[" + keys.map((k) => `"[[${k}]]"`).join(", ") + "]";
}

// ---------------------------------------------------------------------------
// Derivation: type / session / date / skill from path + content
// ---------------------------------------------------------------------------

function deriveType(fileName) {
  const lower = fileName.toLowerCase();
  if (lower === "plan.md") return "session-plan";
  if (lower === "status.md") return "session-status";
  if (lower === "prompt.md") return "session-prompt";
  if (lower === "conventions.md") return "session-conventions";
  return "session-doc";
}

/**
 * Given an absolute file path and the agent-orch root, derive the session
 * folder name and an ISO date. Supports BOTH layouts:
 *   flat:      ssnc-agent-orch/YYYY-MM-DD-slug/<file>.md
 *   date-tree: ssnc-agent-orch/YYYY/MM/DD/slug/<file>.md
 * Returns { session, date } (date may be null if undeterminable).
 */
function deriveSessionAndDate(absFile, agentRoot) {
  const rel = relative(agentRoot, absFile);
  const parts = rel.split(sep).filter(Boolean);
  // parts[last] is the filename; the dirs above are the session path.
  const dirs = parts.slice(0, -1);

  // date-tree: YYYY / MM / DD / slug ...
  if (dirs.length >= 4 && /^\d{4}$/.test(dirs[0]) && /^\d{2}$/.test(dirs[1]) && /^\d{2}$/.test(dirs[2])) {
    const date = `${dirs[0]}-${dirs[1]}-${dirs[2]}`;
    const slug = dirs.slice(3).join("-");
    return { session: slug || `${date}-session`, date };
  }

  // flat: YYYY-MM-DD-slug
  const top = dirs[0] || basename(agentRoot);
  const m = top.match(/^(\d{4})-(\d{2})-(\d{2})-(.*)$/);
  if (m) {
    return { session: top, date: `${m[1]}-${m[2]}-${m[3]}` };
  }
  // Fallback: a date-only prefix with no slug, or an undated dir.
  const m2 = top.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return { session: top, date: m2 ? `${m2[1]}-${m2[2]}-${m2[3]}` : null };
}

/**
 * Best-effort skill discovery from a sibling prompt.md `## Metadata` block:
 *   - **Invoking skill**: via /make (worktree)  -> "make"
 *   - **Invoking skill**: direct /build         -> "build"
 * Returns a short token or null.
 */
function discoverSkill(sessionDir) {
  const promptPath = join(sessionDir, "prompt.md");
  if (!existsSync(promptPath)) return null;
  let text;
  try { text = readFileSync(promptPath, "utf8"); } catch { return null; }
  const m = text.match(/^\s*-\s*\*\*Invoking skill\*\*:\s*(.+)$/im);
  if (!m) return null;
  const v = m[1].toLowerCase();
  if (v.includes("/make")) return "make";
  if (v.includes("/build")) return "build";
  return null;
}

// ---------------------------------------------------------------------------
// Per-file stamping
// ---------------------------------------------------------------------------

function buildDesiredFrontmatter(existing, derived, tickets) {
  // Start from existing values so unknown keys are preserved; then set/refresh
  // the managed keys. Managed: type, session, date, jira, status, skill.
  const values = { ...existing.values };
  const order = existing.order.slice();

  const ensure = (key, val) => {
    if (val === undefined || val === null || val === "") {
      // Do not introduce empty managed keys; but keep an existing one.
      return;
    }
    if (!(key in values)) order.push(key);
    values[key] = val;
  };

  ensure("type", values.type ?? derived.type);
  ensure("session", values.session ?? derived.session);
  if (derived.date) ensure("date", values.date ?? derived.date);

  // jira: union of existing + freshly-parsed tickets, first-seen order, deduped.
  const mergedJira = dedupe([...(existing.jira || []), ...tickets]);
  if (!("jira" in values)) order.push("jira");
  values.jira = serializeJira(mergedJira);

  // status: never invented here. Preserved if already present.
  // skill: only set if discovered AND not already present.
  if (derived.skill && !("skill" in values)) {
    order.push("skill");
    values.skill = derived.skill;
  }

  // Canonical key ordering for managed keys, then any preserved extras.
  const canonical = ["type", "session", "date", "jira", "status", "skill"];
  const extras = order.filter((k) => !canonical.includes(k));
  const finalOrder = [...canonical.filter((k) => k in values), ...extras];

  return { values, order: finalOrder, jira: mergedJira };
}

function renderFile(desired, body, eol) {
  const lines = desired.order.map((k) => `${k}: ${desired.values[k]}`);
  return ["---", ...lines, "---", ""].join(eol) + body;
}

/**
 * Decide whether the rendered file differs from the original (idempotency check
 * uses exact text equality so a no-op run yields a clean diff).
 */
function stampFile(absFile, agentRoot, ticketRe) {
  const original = readFileSync(absFile, "utf8");
  const { fm, body, eol } = splitFrontmatter(original);
  const existing = parseFm(fm);

  const fileName = basename(absFile);
  const sessionDir = absFile.slice(0, absFile.length - fileName.length - 1);
  const { session, date } = deriveSessionAndDate(absFile, agentRoot);
  const derived = {
    type: deriveType(fileName),
    session,
    date,
    skill: discoverSkill(sessionDir),
  };

  const tickets = collectTickets(body, ticketRe);
  const desired = buildDesiredFrontmatter(existing, derived, tickets);
  const rendered = renderFile(desired, body, eol);

  return {
    file: absFile,
    changed: rendered !== original,
    hadFrontmatter: fm !== null,
    tickets: desired.jira,
    rendered,
  };
}

// ---------------------------------------------------------------------------
// Directory walk
// ---------------------------------------------------------------------------

function walkMarkdown(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      walkMarkdown(full, acc);
    } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
      acc.push(full);
    }
  }
  return acc;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return 0;
  }

  const agentRoot = join(args.root, "ssnc-agent-orch");
  if (!existsSync(agentRoot)) {
    if (args.json) {
      console.log(JSON.stringify({ ok: false, reason: "no-agent-orch-dir", root: args.root, changed: 0, scanned: 0 }));
    } else {
      console.error(`No ssnc-agent-orch/ directory under ${args.root}. Nothing to backfill.`);
    }
    return 0; // not an error — vault-orch simply has nothing to do here
  }

  const ticketRe = buildTicketRegex(args.keys);
  let files = walkMarkdown(agentRoot);
  if (args.only) files = files.filter((f) => f.includes(args.only));

  const results = [];
  for (const f of files) {
    try {
      results.push(stampFile(f, agentRoot, ticketRe));
    } catch (err) {
      results.push({ file: f, error: String(err && err.message ? err.message : err) });
    }
  }

  const changed = results.filter((r) => r.changed);
  const errored = results.filter((r) => r.error);

  if (args.apply) {
    for (const r of changed) writeFileSync(r.file, r.rendered, "utf8");
  }

  if (args.json) {
    console.log(
      JSON.stringify({
        ok: true,
        root: args.root,
        applied: args.apply,
        scanned: results.length,
        changed: changed.length,
        errors: errored.length,
        keys: args.keys,
        files: changed.map((r) => ({
          file: relative(args.root, r.file),
          newFrontmatter: !r.hadFrontmatter,
          jira: r.tickets,
        })),
      })
    );
    return errored.length ? 0 : 0;
  }

  if (!args.quiet) {
    for (const r of changed) {
      const tag = r.hadFrontmatter ? "refresh" : "stamp  ";
      const tickets = r.tickets.length ? `jira=[${r.tickets.join(", ")}]` : "jira=[]";
      console.log(`  ${tag} ${relative(args.root, r.file)}  ${tickets}`);
    }
    for (const r of errored) console.error(`  ERROR  ${relative(args.root, r.file)}: ${r.error}`);
  }

  const mode = args.apply ? "applied" : "dry-run (no files written — pass --apply to write)";
  console.log(
    `\nvault-orch backfill: ${changed.length} of ${results.length} file(s) would change — ${mode}.`
  );
  if (!args.apply && changed.length) {
    console.log(`Run again with --apply to stamp the ${changed.length} file(s).`);
  }
  return 0;
}

process.exit(main());
