#!/usr/bin/env bash
# vault-orch :: Stop hook — promote a finished session's prompt.md metadata
#                           into variant-B frontmatter on its session files.
# ---------------------------------------------------------------------------
# This is the "part of Make's world" mechanism. After a /make or /build
# session ends, the agent-orch skills have already written a `## Metadata`
# block into the session's prompt.md (Session / Started / Invoking skill /
# Branch / Jira). This hook finds the most-recently-touched session directory
# and runs the SAME variant-B stamp the /vault-orch:backfill skill uses, so
# the vault stays current with ZERO forking of the agent-orch skills.
#
# It reuses scripts/backfill-frontmatter.mjs (single source of truth for the
# stamping logic) restricted to that one session via --only.
#
# DEFENSIVE BY CONTRACT — this hook must NEVER block or fail a session:
#   * Exits 0 in every branch (a Stop hook returning non-zero would surface as
#     a session error). The only signalling is informational stderr.
#   * No-ops cleanly when:
#       - not inside a git repo
#       - the repo has no ssnc-agent-orch/ directory
#       - the vault is not initialised (no .obsidian/app.json) — opt-in
#       - no session directory can be located
#       - node is unavailable
#   * Touches only files under the detected session dir, and only their
#     frontmatter header (the underlying script never rewrites bodies).
#
# Opt-in: installed by /vault-orch:init (which appends this to the repo's
# hook config) or wired manually. See plugins/vault-orch/README.md.
#
# Environment provided by Claude Code hooks:
#   CLAUDE_PROJECT_DIR   - repo/project root (preferred when present)
#   CLAUDE_PLUGIN_ROOT   - this plugin's root (…/plugins/vault-orch)
# ---------------------------------------------------------------------------

# Deliberately NOT using `set -e`: a non-zero from any probe must not abort the
# hook. We guard each step explicitly and always exit 0.
set -u

# Hard guarantee of the "never block or fail a session" contract: whatever
# happens below — an unexpected `set -u` abort, a command-not-found, anything —
# the EXIT trap forces a 0 exit code. A Stop hook returning non-zero would
# surface as a session error, so this is non-negotiable.
trap 'exit 0' EXIT

log() { printf 'vault-orch: %s\n' "$1" >&2; }

# --- Resolve repo root -----------------------------------------------------
ROOT="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$ROOT" ]; then
  ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi
[ -z "$ROOT" ] && exit 0                      # not in a git repo → no-op
[ -d "$ROOT" ] || exit 0

AGENT_DIR="$ROOT/ssnc-agent-orch"
[ -d "$AGENT_DIR" ] || exit 0                 # not an agent-orch repo → no-op

# --- Require an initialised vault (opt-in) ---------------------------------
# The vault is "initialised" once /vault-orch:init has written .obsidian/app.json.
if [ ! -f "$ROOT/.obsidian/app.json" ]; then
  exit 0                                      # vault not provisioned → no-op
fi

# --- Require node ----------------------------------------------------------
command -v node >/dev/null 2>&1 || { log "node not found; skipping frontmatter promotion"; exit 0; }

# --- Locate the stamper script ---------------------------------------------
SCRIPT=""
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "$CLAUDE_PLUGIN_ROOT/scripts/backfill-frontmatter.mjs" ]; then
  SCRIPT="$CLAUDE_PLUGIN_ROOT/scripts/backfill-frontmatter.mjs"
else
  # Fall back to this hook's own location: hooks/ → ../scripts/
  HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd 2>/dev/null || true)"
  if [ -n "$HERE" ] && [ -f "$HERE/../scripts/backfill-frontmatter.mjs" ]; then
    SCRIPT="$HERE/../scripts/backfill-frontmatter.mjs"
  fi
fi
[ -z "$SCRIPT" ] && { log "stamper script not found; skipping"; exit 0; }

# --- Find the most-recently-touched session directory ----------------------
# A session dir is one that directly contains a prompt.md (the provenance file
# the agent-orch skills always write). We pick the newest by mtime so the hook
# acts on the session that just finished.
NEWEST_PROMPT="$(find "$AGENT_DIR" -type f -name 'prompt.md' -print0 2>/dev/null \
  | xargs -0 ls -t 2>/dev/null | head -n 1 || true)"

if [ -z "$NEWEST_PROMPT" ]; then
  # No prompt.md anywhere — maybe a session that didn't write one. Fall back to
  # the newest dir containing a PLAN.md/STATUS.md.
  NEWEST_PROMPT="$(find "$AGENT_DIR" -type f \( -name 'PLAN.md' -o -name 'STATUS.md' \) -print0 2>/dev/null \
    | xargs -0 ls -t 2>/dev/null | head -n 1 || true)"
fi
[ -z "$NEWEST_PROMPT" ] && exit 0             # no session artifacts → no-op

SESSION_DIR="$(dirname "$NEWEST_PROMPT")"

# --- Derive project-key prefixes (optional) --------------------------------
# Prefer keys cached by agent-orch's Jira integration so the regex is tight.
# Best-effort only — absence just means the generic [A-Z]{2,}-\d+ matcher.
KEYS=""
JIRA_RULES="$ROOT/.claude/rules/jira.md"
if [ -f "$JIRA_RULES" ]; then
  KEYS="$(grep -oE '## Project:[[:space:]]*[A-Z][A-Z0-9]+' "$JIRA_RULES" 2>/dev/null \
    | grep -oE '[A-Z][A-Z0-9]+$' | sort -u | paste -sd, - 2>/dev/null || true)"
fi
# Also pick up a key embedded in the session folder name (e.g. rconai-427-…).
FOLDER_KEY="$(basename "$SESSION_DIR" | grep -oiE '^[A-Z]{2,}' | tr '[:lower:]' '[:upper:]' || true)"
if [ -n "$FOLDER_KEY" ]; then
  if [ -n "$KEYS" ]; then KEYS="$KEYS,$FOLDER_KEY"; else KEYS="$FOLDER_KEY"; fi
fi

# --- Run the stamper, scoped to this session, applying in place ------------
# --only restricts to files whose path contains the session dir name. We pass
# the basename so both flat and date-tree layouts match the right folder.
ONLY="$(basename "$SESSION_DIR")"

# Invoke the stamper with two explicit branches rather than expanding a bash
# array. Expanding an EMPTY array as "${arr[@]}" aborts under `set -u` on
# bash 3.2 (the /bin/bash shipped on macOS, and what hooks.json's "bash …"
# resolves to) — which would crash the hook on the common path where no Jira
# key is derivable (date-prefixed session folder + no .claude/rules/jira.md).
# Keeping the call array-free sidesteps that entirely; --keys is omitted when
# empty so the script falls back to its generic [A-Z]{2,}-\d+ matcher.
if [ -n "$KEYS" ]; then
  ok=0; node "$SCRIPT" --root "$ROOT" --only "$ONLY" --keys "$KEYS" --apply --quiet >/dev/null 2>&1 || ok=$?
else
  ok=0; node "$SCRIPT" --root "$ROOT" --only "$ONLY" --apply --quiet >/dev/null 2>&1 || ok=$?
fi

if [ "$ok" -eq 0 ]; then
  log "promoted session metadata → frontmatter for $ONLY"
else
  # Never escalate — just note it and move on (the EXIT trap forces exit 0).
  log "frontmatter promotion skipped (stamper returned $ok) for $ONLY"
fi

exit 0
