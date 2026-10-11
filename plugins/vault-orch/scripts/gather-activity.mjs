#!/usr/bin/env node
/**
 * vault-orch :: gather-activity.mjs
 * -------------------------------------------------------------------------
 * Shared, read-only activity gatherer for a time window. Produces a single
 * JSON blob describing git commits, agent-orch sessions, and the distinct Jira
 * keys referenced — the raw material an exec-altitude summary is built from.
 *
 * `/vault-orch:exec-update` consumes this. It is written to be a REUSABLE
 * gather seam: `team-work:work-recap` covers the same git+session+Jira ground
 * at PM altitude (today via its own inline `git log` + MCP queries), and the
 * intent is that recap can migrate onto this gatherer so the two never drift.
 * As of now this script is the gatherer for exec-update only; work-recap has
 * not yet been refactored onto it. The two skills deliberately differ in
 * audience, altitude, surface, and charting (see
 * plugins/vault-orch/skills/exec-update/SKILL.md and the OVERLAP flag in the
 * discovery capability-catalog).
 *
 * WHAT THIS SCRIPT DOES (deterministic, no network):
 *   - `git log` within [--since, --until] with per-commit file stats.
 *   - Scans ssnc-agent-orch/** sessions touched in the window (by commit or
 *     by mtime), reads light metadata from PLAN.md / STATUS.md / prompt.md.
 *   - Extracts the set of Jira keys referenced by commits + sessions (the
 *     RELATIONSHIP layer — keys only, never status).
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *   - It does NOT call Jira. Live Jira enrichment (status, epic, assignee for
 *     the point-in-time frozen chart) is the skill's job via the MCP Jira
 *     tools, because MCP availability is a runtime concern. The skill feeds
 *     this JSON's `jiraKeys` into the MCP layer. If Jira is unreachable the
 *     exec-update still renders from git+session data alone.
 *
 * Usage:
 *   node gather-activity.mjs --since <ISO> --until <ISO> [--root <dir>]
 *                            [--keys RCONAI,AITOOLS] [--pretty]
 *
 *   --since / --until  Window bounds. Accept anything `git log --since` accepts
 *                      (ISO-8601, "7 days ago", "now"). Required.
 *   --root             Repo root (default: cwd).
 *   --keys             Restrict extracted Jira keys to these prefixes; default
 *                      is the generic /[A-Z]{2,}-\d+/ matcher.
 *   --pretty           Pretty-print the JSON (default: compact, one line).
 *
 * Output: a JSON object on stdout (schema documented at bottom of file).
 * Exit 0 on success including an empty window. Exit 1 only on hard failure
 * (e.g. not a git repo).
 * No dependencies — Node stdlib only.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, basename, sep } from "node:path";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { root: process.cwd(), since: null, until: "now", keys: [], pretty: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--root") a.root = argv[++i];
    else if (k === "--since") a.since = argv[++i];
    else if (k === "--until") a.until = argv[++i];
    else if (k === "--pretty") a.pretty = true;
    else if (k === "--keys") a.keys = (argv[++i] || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    else if (k === "--help" || k === "-h") a.help = true;
  }
  return a;
}

const HELP = `vault-orch gather-activity — read-only git+session+Jira-key gatherer

  node gather-activity.mjs --since <ISO|"7 days ago"> --until <ISO|now>
                           [--root <dir>] [--keys RCONAI,AITOOLS] [--pretty]

Emits a JSON activity blob on stdout. Does NOT call Jira (skill does that).`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function buildTicketRegex(keys) {
  if (keys.length) {
    const alt = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    return new RegExp(`\\b(?:${alt})-\\d+\\b`, "g");
  }
  return /\b[A-Z][A-Z0-9]+-\d+\b/g;
}

function extractKeys(text, re) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out;
}

// ---------------------------------------------------------------------------
// Git collection
// ---------------------------------------------------------------------------
function collectCommits(root, since, until, ticketRe) {
  // Unit separator (0x1f) between fields, record separator (0x1e) between commits.
  const FMT = ["%H", "%an", "%aI", "%s", "%b"].join("\x1f");
  let raw;
  try {
    raw = git(root, [
      "log",
      `--since=${since}`,
      `--until=${until}`,
      "--no-merges",
      `--pretty=format:${FMT}\x1e`,
    ]);
  } catch (err) {
    return { error: String(err && err.message ? err.message : err), commits: [] };
  }

  const commits = [];
  for (const rec of raw.split("\x1e")) {
    const line = rec.replace(/^\n/, "");
    if (!line.trim()) continue;
    const [sha, author, dateIso, subject, body] = line.split("\x1f");
    if (!sha) continue;
    // Per-commit stat summary (shortstat → "N files changed, A insertions(+), D deletions(-)").
    let filesChanged = 0, insertions = 0, deletions = 0;
    try {
      const stat = git(root, ["show", "--shortstat", "--format=", sha]).trim();
      const fm = stat.match(/(\d+) files? changed/);
      const im = stat.match(/(\d+) insertions?\(\+\)/);
      const dm = stat.match(/(\d+) deletions?\(-\)/);
      if (fm) filesChanged = +fm[1];
      if (im) insertions = +im[1];
      if (dm) deletions = +dm[1];
    } catch { /* empty/merge commit — leave zeros */ }

    const keys = [...new Set(extractKeys(`${subject}\n${body || ""}`, ticketRe))];
    commits.push({
      sha,
      shortSha: sha.slice(0, 7),
      author,
      date: dateIso,
      subject: (subject || "").trim(),
      jiraKeys: keys,
      filesChanged,
      insertions,
      deletions,
      netLoc: insertions - deletions,
    });
  }
  return { commits };
}

function repoMeta(root) {
  const safe = (fn, dflt = "") => { try { return fn(); } catch { return dflt; } };
  return {
    name: basename(safe(() => git(root, ["rev-parse", "--show-toplevel"]).trim(), root)),
    branch: safe(() => git(root, ["branch", "--show-current"]).trim()),
    origin: safe(() => git(root, ["remote", "get-url", "origin"]).trim()),
  };
}

// ---------------------------------------------------------------------------
// Session collection
// ---------------------------------------------------------------------------
function listSessionDirs(agentRoot) {
  // A "session" is the deepest dir that directly contains PLAN.md/STATUS.md/prompt.md.
  const found = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const hasSessionFile = entries.some(
      (e) => e.isFile() && /^(plan|status|prompt|conventions)\.md$/i.test(e.name)
    );
    if (hasSessionFile) found.push(dir);
    for (const e of entries) if (e.isDirectory() && e.name !== "node_modules" && e.name !== ".git") walk(join(dir, e.name));
  };
  walk(agentRoot);
  return found;
}

function firstHeading(text) {
  const m = text.match(/^#\s+(.+)$/m) || text.match(/^##\s+(?:Feature|Goal)\s*[:-]?\s*(.+)$/im);
  return m ? m[1].trim() : null;
}

function sessionDateFromPath(dir, agentRoot) {
  const rel = relative(agentRoot, dir);
  const parts = rel.split(sep).filter(Boolean);
  if (parts.length >= 3 && /^\d{4}$/.test(parts[0]) && /^\d{2}$/.test(parts[1]) && /^\d{2}$/.test(parts[2])) {
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }
  const m = (parts[0] || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function collectSessions(root, sinceMs, untilMs, ticketRe) {
  const agentRoot = join(root, "ssnc-agent-orch");
  if (!existsSync(agentRoot)) return [];
  const dirs = listSessionDirs(agentRoot);
  const sessions = [];
  for (const dir of dirs) {
    const files = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"));
    let newestMtime = 0;
    const keys = new Set();
    let feature = null;
    let status = null;
    for (const f of files) {
      const full = join(dir, f.name);
      let st;
      try { st = statSync(full); } catch { continue; }
      newestMtime = Math.max(newestMtime, st.mtimeMs);
      let text = "";
      try { text = readFileSync(full, "utf8"); } catch { /* ignore */ }
      for (const k of extractKeys(text, ticketRe)) keys.add(k);
      if (/^plan\.md$/i.test(f.name) && !feature) feature = firstHeading(text);
      if (/^status\.md$/i.test(f.name)) {
        const sm = text.match(/status[:\s]+(idea|planned|in[- ]progress|shipped|done|complete)/i);
        if (sm) status = sm[1].toLowerCase().replace(" ", "-");
      }
    }
    // Keep sessions whose newest file mtime falls in the window. (Commit-based
    // association is layered on by the skill via jiraKeys ∩ commit keys.)
    if (newestMtime >= sinceMs && newestMtime <= untilMs) {
      sessions.push({
        dir: relative(root, dir),
        session: basename(dir),
        date: sessionDateFromPath(dir, agentRoot),
        feature: feature || basename(dir),
        status,
        jiraKeys: [...keys],
        lastUpdate: new Date(newestMtime).toISOString(),
      });
    }
  }
  sessions.sort((a, b) => (a.lastUpdate < b.lastUpdate ? 1 : -1));
  return sessions;
}

// ---------------------------------------------------------------------------
// Window resolution (delegated to `git log` semantics via a probe)
// ---------------------------------------------------------------------------
function resolveToMs(root, expr) {
  // Use git's own date parser for consistency with the commit query.
  try {
    const out = git(root, ["log", "-1", "--format=%aI"]); // ensure repo ok
  } catch { /* handled by caller */ }
  // Try native Date first (ISO). Fall back to `date -d`/`date -v` is unreliable
  // cross-platform, so for relative phrases we approximate with Date where we
  // can and otherwise return null (the commit query still uses the raw phrase).
  const d = new Date(expr === "now" ? Date.now() : expr);
  return isNaN(d.getTime()) ? null : d.getTime();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); return 0; }
  if (!args.since) { console.error("--since is required (ISO-8601 or a phrase like \"7 days ago\")"); return 1; }

  // Verify we are in a git repo.
  try { git(args.root, ["rev-parse", "--is-inside-work-tree"]); }
  catch { console.error(`Not a git repository: ${args.root}`); return 1; }

  const ticketRe = buildTicketRegex(args.keys);
  const meta = repoMeta(args.root);

  const { commits, error: gitError } = collectCommits(args.root, args.since, args.until, ticketRe);

  // For session mtime filtering we need numeric bounds. Best-effort: if we
  // cannot parse the phrase, widen to [0, now] so sessions are never wrongly
  // dropped (commits already honour the exact phrase via git).
  const sinceMs = resolveToMs(args.root, args.since) ?? 0;
  const untilMs = resolveToMs(args.root, args.until) ?? Date.now();
  const sessions = collectSessions(args.root, sinceMs, untilMs, ticketRe);

  // Union of all referenced Jira keys (relationship layer — keys only).
  const jiraKeys = [...new Set([
    ...commits.flatMap((c) => c.jiraKeys),
    ...sessions.flatMap((s) => s.jiraKeys),
  ])].sort();

  const contributors = [...new Set(commits.map((c) => c.author))];
  const netLoc = commits.reduce((n, c) => n + c.netLoc, 0);

  const out = {
    ok: true,
    window: { since: args.since, until: args.until },
    repo: meta,
    keys: args.keys,
    summary: {
      commits: commits.length,
      contributors: contributors.length,
      sessions: sessions.length,
      jiraKeysReferenced: jiraKeys.length,
      netLoc,
      insertions: commits.reduce((n, c) => n + c.insertions, 0),
      deletions: commits.reduce((n, c) => n + c.deletions, 0),
    },
    contributors,
    jiraKeys,
    commits,
    sessions,
    notes: gitError ? [`git log error: ${gitError}`] : [],
  };

  console.log(args.pretty ? JSON.stringify(out, null, 2) : JSON.stringify(out));
  return 0;
}

/*
 * Output schema (consumed by /vault-orch:exec-update):
 * {
 *   ok: true,
 *   window: { since, until },
 *   repo: { name, branch, origin },
 *   keys: ["RCONAI"],
 *   summary: { commits, contributors, sessions, jiraKeysReferenced,
 *              netLoc, insertions, deletions },
 *   contributors: [ "name", ... ],
 *   jiraKeys: [ "RCONAI-427", ... ],   // relationship layer — keys only
 *   commits: [ { sha, shortSha, author, date, subject, jiraKeys[],
 *                filesChanged, insertions, deletions, netLoc } ],
 *   sessions: [ { dir, session, date, feature, status, jiraKeys[], lastUpdate } ],
 *   notes: [ ... ]
 * }
 *
 * The skill then (a) groups commits/sessions by theme/epic, (b) optionally
 * calls the MCP Jira tools on `jiraKeys` to build the FROZEN point-in-time
 * status chart, and (c) renders Mermaid + narrative into the dated vault node.
 */

process.exit(main());
