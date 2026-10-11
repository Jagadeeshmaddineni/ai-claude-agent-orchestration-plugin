---
name: build
description: Multi-agent implementation WITHOUT spec-kit. Gathers requirements through conversation, creates PLAN.md, uses CLAUDE.md as constitution. Same powerful agents, no .specify/ required. Usage: /agent-orch:build [description|JIRA-ID] (optional)
---

# Standalone Multi-Agent Build

You are orchestrating a multi-agent implementation **without requiring spec-kit**. This command gathers requirements through conversation and uses project-root files instead of `.specify/`.

## Agent Team Support

This skill supports both **subagent mode** (traditional) and **agent team mode** (experimental) for coordination.

**Agent Teams** use Anthropic's native coordination tools:
- `TeamCreate` / `TeamDelete` for team lifecycle management
- `Agent` tool with `team_name` parameter for spawning teammates into a team
- `SendMessage` for direct inter-agent messaging (no orchestrator bottleneck)
- `TaskCreate` / `TaskUpdate` for shared task management with file locking
- `mode: "plan"` parameter for requiring plan approval before implementation
- `TeammateIdle` / `TaskCompleted` hooks for enforcing verification gates

**Enable agent teams** by setting:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**See Phase 0 below** for automatic detection of when agent teams provide benefit.

---

## How This Differs from `/agent-orch:implement`

| Aspect | Spec-Kit Mode | Standalone Mode (this) |
|--------|---------------|------------------------|
| Requirements | `specs/[feature]/spec.md` | Gathered through conversation |
| Plan | `specs/[feature]/plan.md` | `ssnc-agent-orch/[session]/PLAN.md` |
| Constitution | `.specify/memory/constitution.md` | `CLAUDE.md` in project root |
| Status | `specs/[feature]/status.md` | `ssnc-agent-orch/[session]/STATUS.md` |
| Coordination | Subagents only | Subagents OR Agent Teams (auto-detected) |

## File Structure Used

```
project-root/
├── ssnc-agent-orch/
│   ├── 2026/                       # Year
│   │   ├── 05/                     # Month
│   │   │   └── 26/                 # Day
│   │   │       └── auth-feature/   # Session directory (slugified feature name)
│   │   │           ├── prompt.md   # Original prompt + clarifying exchange (provenance)
│   │   │           ├── PLAN.md     # Requirements + implementation plan
│   │   │           ├── STATUS.md   # Agent progress tracking
│   │   │           └── COORDINATION.md  # Agent team metadata (if using teams)
│   │   └── 05/27/jwt-rotation/...  # Sessions from a different day
│   ├── 2026-01-18-auth-feature/    # Legacy flat layout (still readable)
│   │   └── ...
│   └── README.md                   # Auto-created on first session
├── CLAUDE.md                       # Project standards (constitution)
└── ... (your code)
```

**Layout history**: Sessions before this scheme used the flat
`ssnc-agent-orch/<YYYY-MM-DD>-<slug>/` layout. Those still work for reading.
NEW sessions go under the date tree.

**About `prompt.md`**: Written immediately after the session directory is
created, BEFORE `PLAN.md`. Captures the verbatim prompt the user passed
(`$ARGUMENTS`), the clarifying Q&A that runs in Phase 1 before the plan is
drafted, and a final scope summary. It is the provenance record — if later
you need to dig into why a plan looked a certain way, `prompt.md` shows what
was asked, what was clarified, and what was agreed before implementation
began. See Phase 1 Step 5.5 for the template.

**Note:** Each build session creates a new dated directory to preserve history. See [Session Management](#session-management) below.

---

## Session File Contract

Every `/build` session directory MUST contain only these files:

| File | When written | Owner |
|------|--------------|-------|
| `prompt.md` | Phase 1 Step 5.5 | Orchestrator (frozen after Step 5.5c) |
| `PLAN.md` | Phase 1 Step 6 / Phase 2 | Orchestrator → Architect |
| `STATUS.md` | Phase 3+ (every agent appends) | All agents (single sink) |
| `conventions.md` (optional) | Phase 2 | Architect (when stack-relevant) |
| `ADVOCATE-REVIEW.md` (optional) | Phase 1.5 | Advocate (sole side-file exception) |
| `COORDINATION.md` (optional) | Phase 3 | Lead (only in Agent Teams mode) |

No other files are sanctioned. Reviewer/specialist agents append to STATUS.md under a `## <Agent> Findings` header — see each agent's "STATUS.md Output Contract" section.

Why this matters: when every agent writes its findings to a single STATUS.md, the orchestrator (and any future review tooling) has a deterministic place to look. Side-files like `VALIDATOR-STATUS.md`, `SPEC-REVIEW.md`, `POSTMORTEM.md`, etc. fragment the audit trail and break observability.

---

## Conventions Ownership

The Architect agent owns `${SESSION_DIR}/conventions.md` generation during Phase 2. After Phase 2 completes, the orchestrator MUST verify the file exists; if missing, print a one-line warning to STATUS.md ("Architect did not generate conventions.md — proceeding without stack-specific rules") but continue. Some sessions don't need stack-specific conventions (e.g. pure prose changes).

---

## Phase Map (what the user sees)

`/build` has these user-visible phases. At the START of every phase, print a
banner so the user always knows where we are. Use this exact format:

```
═══════════════════════════════════════════════════════
/build phase <label>: <phase name>
<one-line description of what happens in this phase>
═══════════════════════════════════════════════════════
```

| Label  | Phase name                              |
|--------|------------------------------------------|
| pre    | Worktree/branch anchor pre-flight        |
| 0      | Coordination mode (subagents vs teams)   |
| 0.5    | Detect JIRA-ID argument                  |
| 0.6    | Detect existing DESIGN.md (brainstorm)   |
| 1      | Gather requirements (brainstorming)      |
| 1.5    | Advocate review (optional)               |
| 2      | Architect analysis + PLAN.md             |
| 3      | Parallel implementation                  |
| 3.5    | Integration verification                 |
| 4      | Two-stage code review                    |
| 4.5    | Out-of-scope / blockers                  |
| 5      | Finalize + summary                       |

When spawning any subagent, also print a one-line update like:
```
→ Launching agent-orch:orchestrate-<name> (<purpose>)…
```
so the user can see coordination decisions as they happen.

---

## Phase pre: Worktree / Branch Anchor Pre-Flight

**CRITICAL**: This runs BEFORE Phase 0. Every /build invocation (whether from
`/make` or direct) MUST start with this check.

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase pre: Worktree/branch anchor pre-flight
Reading the per-Claude session state file so every agent stays anchored to the right tree.
═══════════════════════════════════════════════════════
```

### Step 1: Locate and read the session state file

`/agent-orch:make` writes a per-Claude session file named
`.make-session-<UTC_TS>-<PID>.json` and exports its path via
`$MAKE_SESSION_FILE`. Resolve the file with this lookup order:

1. **Env var (preferred)** — if `$MAKE_SESSION_FILE` is set and the file exists,
   use it directly. This is the sticky path set by the spawning Claude's `/make`.

2. **Discovery by branch** — list `<primary-repo-root>/.claude/.make-session-*.json`
   newest first, read each candidate's `branch` field, and pick the file whose
   branch matches `git branch --show-current` from the agent's cwd.

3. **Legacy fallback (v1)** — if no v2 file matches, check for the old single
   path `<primary-repo-root>/.claude/.make-session.json`. If present, treat
   it as the anchor (read-side compatibility for sessions started before the
   per-Claude scheme).

4. **No session file** — `/build` was invoked directly (not via `/make`). Set
   the anchor to the current working directory and skip to Step 3.

```bash
PRIMARY_REPO_ROOT=$(git worktree list --porcelain | awk '/^worktree / {print $2; exit}')

# 1. Prefer the env var
if [ -n "$MAKE_SESSION_FILE" ] && [ -f "$MAKE_SESSION_FILE" ]; then
  SESSION_FILE="$MAKE_SESSION_FILE"
else
  # 2. Discover by branch among per-Claude files
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
  SESSION_FILE=""
  for f in $(ls -t "$PRIMARY_REPO_ROOT/.claude/.make-session-"*.json 2>/dev/null); do
    f_branch=$(python3 -c "import json,sys; print(json.load(open('$f')).get('branch',''))" 2>/dev/null)
    if [ "$f_branch" = "$CURRENT_BRANCH" ]; then
      SESSION_FILE="$f"
      break
    fi
  done
  # 3. Legacy fallback
  if [ -z "$SESSION_FILE" ] && [ -f "$PRIMARY_REPO_ROOT/.claude/.make-session.json" ]; then
    SESSION_FILE="$PRIMARY_REPO_ROOT/.claude/.make-session.json"
  fi
fi
```

**If `$SESSION_FILE` resolves to a real file**, read it (Read tool) and extract:
- `mode` (worktree|branch)
- `branch`
- `worktree_path`
- `repo_root`
- `jira_key`
- `session_id` (v2 only — propagate to subagents)

**If no session file is found**: `/build` was invoked directly (not via
`/make`). Set the anchor to the current working directory and skip to Step 3.

### Step 2: Anchor to `worktree_path`

- Verify `pwd` is inside `worktree_path`. If not, `cd` to `worktree_path`.
- Verify `git rev-parse --show-toplevel` equals `worktree_path`. If it does not
  after the `cd`, STOP and report to the user:
  ```
  [worktree-context] DRIFT DETECTED.
  Session says: <worktree_path> (branch <branch>)
  But git toplevel resolves to: <actual>

  This means /make set up a session but the shell is not pointing at it.
  Fix: cd to <worktree_path> and re-run /build. Aborting to avoid writing to
  the wrong branch.
  ```
  Exit. Do not continue to Phase 0.

- Verify the current branch equals `branch` from the session file. If not,
  report the mismatch and ask the user whether to continue (they may have
  deliberately changed branches inside the worktree).

### Step 3: Print the anchor banner

Tell the user exactly what anchor this /build run is bound to:

```
[worktree-context] Anchored.
  mode:          <worktree|branch|direct>
  branch:        <branch or current>
  worktree_path: <absolute path>
  jira_key:      <key or none>
  session_id:    <session_id or "none">
  session_file:  <relative path to session file or "none">

All spawned subagents will receive this anchor and refuse to operate outside it.
```

### Step 4: Prepare the anchor block for subagent prompts

Store the anchor block for use in every `Task` / `Agent` tool call made in
Phase 1.5, 2, 3, 3.5, 4, and 5. Every subagent prompt MUST begin with this
block (verbatim) before any other instructions:

```
[worktree-context]
mode: <worktree|branch|direct>
branch: <branch>
worktree_path: <absolute path>
jira_key: <key or none>
session_id: <session_id or "none">
session_file: <absolute path of .make-session-<...>.json or "none">

STRICT RULE: All file reads, writes, edits, and shell commands MUST occur
inside worktree_path. Before your first tool call, verify pwd is inside
worktree_path and that git rev-parse --show-toplevel resolves to it. If not,
cd to worktree_path. If resolution still fails, STOP and report — do not
silently edit files in the wrong tree. See the rule at
plugins/agent-orch/rules/worktree-context.md for full details.
```

Refer to this block as `${ANCHOR_BLOCK}` below.

---

## Phase 0: Determine Coordination Mode

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 0: Coordination mode
Deciding between subagents (simple) and agent teams (complex, multi-agent chat).
═══════════════════════════════════════════════════════
```

**CRITICAL**: Before Phase 2, analyze the feature complexity to choose between subagents and agent teams.

### Detection Logic

After gathering requirements and getting initial architect analysis, evaluate:

**Use Agent Teams if ANY of:**
1. **Complex coordination needed**
   - Feature requires >3 specialists simultaneously
   - Tight integration between layers (API + DB + Frontend + Tests)
   - Expected review iterations >2 rounds
   - Multiple interdependent tasks requiring back-and-forth

2. **Iterative work expected**
   - Uncertain requirements requiring exploration
   - Complex debugging scenarios
   - Progressive refinement needed

3. **Cross-domain collaboration**
   - Frontend + Backend + Database changes all needed
   - API contracts need coordination between services
   - Security + Performance both critical and may conflict

**Use Subagents if ALL of:**
1. Feature is well-defined with clear spec
2. <3 specialists needed
3. Single domain (just API, or just UI, or just DB)
4. Expected to complete in <2 review rounds
5. Tasks are independent (parallel but don't need to communicate)

### Decision Point

After architect analysis in Phase 2, you will:

1. **Count complexity indicators:**
   ```
   Specialists recommended: [count from architect]
   Cross-layer changes: [yes/no]
   Expected iterations: [estimated from uncertainty]
   Task interdependencies: [count from PLAN.md]
   ```

2. **Calculate score:**
   ```
   Score = specialists + (cross_layer ? 2 : 0) + iterations + dependencies

   Score >= 6: STRONGLY recommend agent teams
   Score 4-5: Recommend agent teams, ask user
   Score 2-3: Recommend subagents, mention teams as option
   Score 0-1: Use subagents (no need to mention teams)
   ```

3. **Present recommendation:**

   **If score >= 6:**
   ```
   This feature is complex and would benefit significantly from agent teams.

   Token cost estimate: Agent Teams use ~3-5x more tokens than subagents.
   - Subagent mode: ~50K-100K tokens estimated
   - Agent Teams mode: ~150K-400K tokens estimated
   Benefit: Faster iteration, fewer orchestrator roundtrips, better coordination.

   With agent teams:
   - Security can message Builder directly with vulnerabilities to fix
   - Reviewers can iterate with Builder without my mediation
   - Specialists coordinate database/API contracts directly

   Agent teams require: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

   Current status: [ENABLED/DISABLED - check env]

   Options:
   (a) Use agent teams (recommended for this complexity)
   (b) Use traditional subagents (may require more orchestrator mediation)
   ```

   **If score 4-5:**
   ```
   This feature has moderate complexity. Agent teams could help with [specific reason].

   Token cost: Agent Teams use ~2-3x more tokens for this complexity level.

   Options:
   (a) Use agent teams (better for iterative work)
   (b) Use subagents (sufficient for this feature)
   ```

   **If score 2-3:**
   ```
   This feature is straightforward. Using subagents (traditional mode).

   [Continue to Phase 1]
   ```

4. **Store decision in session:**
   Add to PLAN.md:
   ```markdown
   ## Coordination Mode
   Mode: [AGENT_TEAMS | SUBAGENTS]
   Reason: [brief explanation]
   Complexity Score: [number]
   ```

---

## How to Launch Agents

**CRITICAL**: Agent launching differs based on coordination mode.

### Worktree-Context Propagation (applies to ALL modes)

Every subagent prompt MUST begin with the `${ANCHOR_BLOCK}` computed in
Phase pre. This is non-optional — it's how the orchestration enforces the
worktree/branch contract set by `/make`. A subagent that doesn't see the
anchor block will happily edit files in the wrong checkout.

Before spawning any agent, announce it to the user on one line:

```
→ Launching agent-orch:orchestrate-<name> (<purpose>)…
```

### Subagent Mode (Traditional)

Use the **Task tool** to launch agents as subagents. Every prompt is
structured as `${ANCHOR_BLOCK}\n\n<actual instructions>`:

```
Task tool call:
  subagent_type: "agent-orch:orchestrate-<agent-name>"
  prompt: "${ANCHOR_BLOCK}

           <the prompt for the agent>"
  description: "<short 3-5 word description>"
```

**For parallel execution**: Send a SINGLE message with MULTIPLE Task tool calls.

### Agent Team Mode (Native Tools)

**Pre-launch: Reduce Permission Friction**

Before spawning teammates, recommend the user pre-approve common operations to prevent silent permission stalls. Teammate permission requests bubble up to the lead, which creates friction:
```
Tip: To reduce permission prompts that can stall agents, consider running
with broader permissions or pre-approving common file operations in your
permission settings before we start.
```

**Step 1: Create Team**

Use the `TeamCreate` tool:
```
TeamCreate:
  name: "build-[feature-name]"
```

**Step 2: Spawn Teammates**

Use the `Agent` tool with `team_name` parameter for each teammate:

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-builder"
  team_name: "build-[feature-name]"
  isolation: "worktree"
  prompt: "${ANCHOR_BLOCK}

           Read ${SESSION_DIR}/PLAN.md and CLAUDE.md. Implement assigned tasks.
           Start coding immediately - do not over-plan.
           Use SendMessage to notify @validator when ready for testing.
           Use SendMessage to @lead after completing each task.
           Use TaskUpdate to update task status."
  description: "Implement assigned tasks"
```

> Note on `isolation: "worktree"`: Claude's Task tool supports creating a
> temporary git worktree per agent for file-conflict isolation. This is
> DIFFERENT from the `/make` worktree. A Task-level isolated worktree is
> transient and merged back by the Task tool; the `/make` worktree is the
> durable branch the user is building on. The `${ANCHOR_BLOCK}` rules apply
> to the `/make` worktree — Task-level isolation is fine to leave on for
> the reasons documented upstream.

Repeat for each teammate (validator, scribe, specialists).

**Step 3: Teammates Self-Coordinate**

Teammates use native tools automatically:
- `SendMessage` to message each other directly
- `TaskUpdate` to claim and complete tasks (with file locking)
- Automatic idle notifications to lead when work finishes
- Lead only intervenes for blockers or phase transitions

### Available Agents

**Available agents** (use these exact subagent_type values for subagent mode):
- `agent-orch:orchestrate-architect` - Planning and coordination
- `agent-orch:orchestrate-builder` - Implementation
- `agent-orch:orchestrate-validator` - Testing
- `agent-orch:orchestrate-scribe` - Documentation
- `agent-orch:orchestrate-spec-reviewer` - Stage 1 review
- `agent-orch:orchestrate-quality-reviewer` - Stage 2 review
- `agent-orch:orchestrate-debugger` - Debugging
- `agent-orch:orchestrate-security` - Security audit
- `agent-orch:orchestrate-performance` - Performance analysis
- `agent-orch:orchestrate-devops` - CI/CD, Docker, K8s
- `agent-orch:orchestrate-telemetry` - Observability, OTel, dashboards
- `agent-orch:orchestrate-database` - Schema, migrations
- `agent-orch:orchestrate-api` - API design
- `agent-orch:orchestrate-uiux` - UI/UX, design system
- `agent-orch:orchestrate-refactorer` - Code improvements
- `agent-orch:orchestrate-migration` - Upgrades, migrations
- `agent-orch:orchestrate-c4-scribe` - C4 architecture docs
- `agent-orch:orchestrate-enforcer` - Enforcement rule generation
- `agent-orch:orchestrate-advocate` - Architecture challenge, cross-team impact, Jira tickets

---

## Phase 0.5: Detect JIRA-ID Argument

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 0.5: Detect JIRA-ID argument
Checking if the user passed a JIRA key; if so, pulling requirements from Jira.
═══════════════════════════════════════════════════════
```

**Goal**: If the user provided a tracker issue key, pull requirements from the tracker instead of brainstorming.

**Tracker-neutral**: This flow is written for Jira. If the active tracker is
`github` (per `plugins/agent-orch/rules/tracker-provider.md` §1), apply the same
steps using the GitHub verb mappings (§3b): detect `#123` / `OWNER/REPO#123` instead
of `PROJ-123`, require `.claude/rules/github.md`, and replace `mcp__jira__*` calls
(`get_issue`, `assign`, `set_status` to in-progress) with their `gh` equivalents run
with `GH_HOST=code.ssnc.dev`. Everything else below is unchanged.

**Detection**: Check if `$ARGUMENTS` matches the active backend's ID shape —
`[A-Z]+-\d+` for Jira (e.g. `PROJ-123`), or `(\S+/\S+)?#\d+` for GitHub (e.g. `#42`).

**If a tracker ID is detected** (Jira flow shown; GitHub substitutes verbs as above):

1. Read `.claude/rules/jira.md` to verify Jira context exists
   - If no jira.md: "Jira context not found. Run `/agent-orch:jira` first, then retry." Exit.

**Pluggable Jira workflow (optional)**: If `.claude/ssnc-agent-orch/jira-workflow.yaml` exists and `jira.enabled` is set, use its `transitions`/`fields`/`lifecycle` values in place of the hard-coded IDs from `jira.md` (falling back to `jira.md` for any key it doesn't specify). When lifecycle hooks are defined, run their targets at the matching lifecycle events per `plugins/agent-orch/rules/extension-resolver.md`. If absent, use the current flow (read `jira.md` values). Zero behaviour change by default. See `plugins/agent-orch/rules/extensibility.md` §4 for full protocol.

2. Fetch the issue:
   ```
   mcp__jira__jira_getIssue with:
     issueKey: "[JIRA-ID]"
   ```

3. Extract from the issue:
   - **Summary** (becomes the feature name)
   - **Description** (becomes the requirements)
   - **Acceptance Criteria** (look for "Acceptance Criteria", "AC:", "Given/When/Then" patterns in description)
   - **Type**, **Priority**, **Labels**, **Linked Issues**
   - **Comments** (last 5, for additional context)

4. Check label governance:
   - If issue does NOT have `claude-code-agent-harness` label:
     ```
     This issue doesn't have the `claude-code-agent-harness` label.

     (a) Add the label and proceed (marks this as agent-ready work)
     (b) Proceed without labeling
     (c) Cancel
     ```
     If (a): add label via `mcp__jira__jira_updateIssue`

   - If issue has `human-review-required`:
     ```
     This issue is marked `human-review-required`.
     Has a human reviewed and approved this for agent work?
     (a) Yes, proceed
     (b) Cancel
     ```

5. Present requirements to user:
   ```
   Requirements from Jira [JIRA-ID]:

   Summary: [summary]
   Type: [type] | Priority: [priority]

   Description:
     [full description]

   [If acceptance criteria]:
   Acceptance Criteria:
     [criteria]

   [If linked issues]:
   Dependencies:
     [list]

   Proceed with these requirements, or modify?
   (a) Proceed as-is
   (b) I want to add/change requirements
   (c) Cancel
   ```

   - **(a)**: Skip Phase 1 brainstorming entirely. Use summary as feature name, description as requirements. Continue to Phase 1 Step 4 (session name) with auto-suggested name from issue summary.
   - **(b)**: Enter Phase 1 Step 2 (iterative questioning) with the Jira description as starting context.
   - **(c)**: Exit.

6. Set session tracking:
   - The Jira issue becomes the **session ticket** automatically
   - In Phase 1.5, the Advocate uses this issue instead of creating a new one
   - **Cache the Jira context** (summary, description, AC, type, priority,
     labels, linked issues) for Phase 1 Step 5.5a — it will be appended to
     `prompt.md` once the session directory is created.
   - Add to PLAN.md:
     ```markdown
     ## Coordination
     Mode: Jira
     Session Ticket: [JIRA-ID]
     Label: claude-code-agent-harness
     Source: /build JIRA-ID (requirements pulled from Jira)
     ```

7. Transition the issue to In Progress:
   ```
   mcp__jira__jira_transitionIssue with:
     issueKey: "[JIRA-ID]"
     transitionId: "[In Progress transition ID from jira.md Transitions table]"
   ```

8. Add session start comment. Resolve the engineer identity live via
   `mcp__jira__jira_getCurrentUser` — never use a user/email cached in `jira.md`:
   ```
   mcp__jira__jira_getCurrentUser   # → { accountId, displayName }
   mcp__jira__jira_postIssueComment with:
     issueKey: "[JIRA-ID]"
     body: "Agent-assisted /build session started.

     Engineer: <displayName from getCurrentUser>
     Session: ${SESSION_DIR}

     Requirements pulled from this issue. Progress will be tracked here."
   ```

**If NO JIRA-ID detected**: Continue to Phase 0.6.

---

## Phase 0.6: Detect Existing DESIGN.md (Brainstorm Output)

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 0.6: Detect existing design
Checking for a DESIGN.md from /agent-orch:brainstorm; if found, consuming it instead of re-asking.
═══════════════════════════════════════════════════════
```

**Goal**: If the user already ran `/agent-orch:brainstorm`, a `DESIGN.md` exists with the scope,
approach, and key decisions already agreed. Consume it as the requirements source instead of
re-running the Phase 1 questioning — the same way a JIRA-ID skips Phase 1.

**Skip this phase if requirements were already pulled from Jira in Phase 0.5.**

**Detection** (in order):

1. **Explicit path** — `$ARGUMENTS` is (or contains) a path ending in `DESIGN.md`, or names a
   session directory containing one. Use that file.
2. **Discovery** — otherwise glob `ssnc-agent-orch/**/DESIGN.md` (newest first). If one or more
   exist, offer the most recent:
   ```
   Found a design document: <path> (Status: <APPROVED|DRAFT>, <feature name>)

   (a) Use this design — skip requirements gathering, go straight to planning
   (b) Ignore it and gather requirements fresh
   (c) This isn't the right one — let me point you at another / start fresh
   ```

**If a DESIGN.md is selected:**

1. Read it fully. Treat `## Problem & Goal`, `## Approach`, `## Architecture`, `## Key Decisions`,
   and `## Out of Scope` as the agreed requirements. If `## Status` is `DRAFT` (not yet approved),
   warn the user and confirm they want to build from an unapproved design before proceeding.
2. **Skip Phase 1 iterative questioning.** Go to Phase 1 Step 4 (session name) — reuse the design's
   feature slug and, ideally, **its existing session directory** so DESIGN.md, prompt.md, PLAN.md,
   and STATUS.md live together.
3. When you create `prompt.md` (Step 5.5), record provenance:
   ```markdown
   ## Original Prompt

   Requirements sourced from design document: <relative path to DESIGN.md>

   ## Clarifying Exchange

   (No clarifying questions — requirements taken from an approved /brainstorm design.)
   ```
   and copy the design's `## Out of Scope` into the Final Scope Summary's "Explicit out-of-scope".
4. Carry the design's open questions/risks into PLAN.md so the Architect resolves them in Phase 2.

**If no DESIGN.md is found or the user declines it**: Continue to Phase 1 as normal.

---

## Phase 0.7: Preliminary Complexity Assessment

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 0.7: Preliminary complexity assessment
Scoring complexity from prompt + context before Architect runs.
═══════════════════════════════════════════════════════
```

**Goal**: Calculate preliminary complexity score BEFORE Phase 1.5 to determine if Advocate gate is mandatory.

**Scoring inputs** (run immediately after requirements are gathered or Jira issue is loaded, before Phase 1.5):

1. **Tech-stack breadth** (detect from cwd):
   - Count distinct stacks detected (TypeScript, Python, Go, Rust, Java, C#, etc.)
   - Score: +1pt per stack beyond the first (e.g., 2 stacks = 1pt, 3 stacks = 2pt)

2. **Keyword scan** (from `$ARGUMENTS` or Jira description):
   - Keywords: 'auth', 'security', 'migration', 'cross-team', 'infra', 'infrastructure', 'deploy', 'deployment', 'database schema', 'api contract', 'breaking change', 'multi-service', 'distributed'
   - Score: +1pt per keyword match, capped at 3pt

3. **Specialist hints** (multiple domains in prompt):
   - Detect >=2 of: 'frontend', 'backend', 'database', 'api', 'devops', 'ui', 'server', 'client'
   - Score: +2pt if >=2 domains mentioned

4. **Jira-linked issues** (if Jira mode):
   - Count linked issues from Phase 0.5 Jira fetch
   - Score: +1pt if >=2 linked issues

**Calculate `PRELIMINARY_COMPLEXITY_SCORE`** (integer 0-10):
```
PRELIMINARY_COMPLEXITY_SCORE = tech_stack_points + keyword_points + specialist_hints_points + linked_issues_points
```

**Store in PLAN.md** (append to Coordination Mode block after Phase 0 determination):
```markdown
## Coordination Mode
Mode: [SUBAGENTS / AGENT_TEAMS]
Reason: [brief]
Complexity Score: [final score from Architect — set in Phase 2]
Preliminary Complexity Score: [PRELIMINARY_COMPLEXITY_SCORE from Phase 0.7]
```

**Decision**: This score feeds into Phase 1.5 gate logic (see Phase 1.5 below).

---

## Phase 1: Gather Requirements (Brainstorming)

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 1: Gather requirements
Brainstorming scope, asking clarifying questions, writing PLAN.md and prompt.md.
═══════════════════════════════════════════════════════
```


> **Attribution**: The requirements gathering methodology in this phase (ask one question at a time, YAGNI ruthlessly, 200-300 word design sections with incremental approval) is derived from the [superpowers plugin](https://github.com/obra/superpowers) brainstorming pattern by Jesse Vincent (MIT License).

**Goal**: Understand what to build through conversation

**CRITICAL**: Ask questions ONE AT A TIME. Prefer multiple choice when possible.

**Skip this phase if requirements were pulled from Jira in Phase 0.5, or from a DESIGN.md in Phase 0.6** -- go directly to Step 4 (session name).

### Step 1: Initial Context

1. Read `CLAUDE.md` if it exists (project standards)
2. Examine existing codebase structure
3. If `$ARGUMENTS` provided, use as starting point

### Step 2: Iterative Questioning

**prompt.md note**: Every question you ask here AND the user's answer MUST
be appended to `${SESSION_DIR}/prompt.md` under `## Clarifying Exchange`
(see Step 5.5b for format). Append after each Q&A pair — do NOT batch.
If the session directory doesn't exist yet (typical on first question), you
are effectively gathering before Step 5 runs; buffer the Q&A and flush to
prompt.md immediately after Step 5.5 creates the file.

Ask focused questions to understand:

1. **What** - What feature/functionality is needed?
2. **Why** - What problem does this solve?
3. **Who** - Who will use this?
4. **How** - Any specific implementation preferences?
5. **Constraints** - Performance, security, compatibility requirements?

**Example questions:**
```
What type of feature are you building?
(a) New API endpoint
(b) Frontend component
(c) Database/data layer
(d) Background job/service
(e) Other - please describe
```

### Step 3: Present Design

After gathering requirements, present the design in **200-300 word sections**.

After EACH section, ask:
> "Does this look right so far? Any changes needed?"

**prompt.md note**: Each design-section confirmation is also a clarifying
exchange — append the design summary you presented and the user's response
to `${SESSION_DIR}/prompt.md` under `## Clarifying Exchange` per Step 5.5b.

### Step 4: Determine Session Name

Once design is approved, determine the session directory name:

**Extract feature name from conversation:**
- Look for key terms in user's requests
- Suggest a concise name (2-4 words max)

**Ask user:**
```
What should I call this build session?

Suggested: [auto-detected-name]

Options:
(a) Use suggested name
(b) Let me type a different name
(c) Just use the slug `session` (the date is already in the dir tree)
```

**Process user choice:**
- If (a) or (b): slugify the name
  - Convert to lowercase
  - Replace spaces with hyphens
  - Remove special characters except hyphens
  - Example: "Auth Feature" → "auth-feature"
  - Example: "API Refactor & Tests" → "api-refactor-and-tests"

- If (c): use the slug `session` (the date is already in the directory tree).

**Generate session directory** (date-tree layout, v2):
```
Format: ssnc-agent-orch/YYYY/MM/DD/[slugified-name]/
Example: ssnc-agent-orch/2026/05/26/auth-feature/

If name is empty (option c):
Format: ssnc-agent-orch/YYYY/MM/DD/session/
Example: ssnc-agent-orch/2026/05/26/session/
```

The date components come from today's local date at the start of the session.
Use UTC if the project's CLAUDE.md or constitution specifies UTC for filesystem
naming; otherwise local date is fine.

### Step 5: Create Session Directory

**Check for legacy files first:**
```
If PLAN.md or STATUS.md exist in project root:
  Show warning: "⚠️  Found legacy PLAN.md/STATUS.md in project root from previous session."

  Options:
  (a) Move to ssnc-agent-orch/legacy/ (recommended)
  (b) Delete them (I'll create new ones)
  (c) Leave as-is (new session will use ssnc-agent-orch/)

  If user chooses (a):
    Create ssnc-agent-orch/legacy/
    Move PLAN.md → ssnc-agent-orch/legacy/PLAN.md
    Move STATUS.md → ssnc-agent-orch/legacy/STATUS.md
```

**Create session directory** (date-tree, v2):
```
1. Check if ssnc-agent-orch/ exists
   - If not, create it
   - Create ssnc-agent-orch/README.md (see template below)

2. Compute date components from today (or UTC, per Step 4):
   YYYY=$(date +%Y)
   MM=$(date +%m)
   DD=$(date +%d)

3. Check if session directory exists
   - Path: ssnc-agent-orch/${YYYY}/${MM}/${DD}/[name]/
   - If exists, append -2, -3, etc.
   - Example: ssnc-agent-orch/2026/05/26/auth-feature-2/

4. Create session directory (parents created automatically):
   mkdir -p ssnc-agent-orch/${YYYY}/${MM}/${DD}/[name]/

5. Store session directory path for all agents:
   SESSION_DIR=ssnc-agent-orch/${YYYY}/${MM}/${DD}/[name]
```

**Read-side compatibility note**: When discovering existing session artifacts
(e.g., for `/make-clean` Phase 1.5 Jira detection, or for `/team-work:work-recap`),
agents MUST use a recursive glob `ssnc-agent-orch/**/PLAN.md` to find both the
new date-tree layout AND any legacy flat `ssnc-agent-orch/<YYYY-MM-DD>-<slug>/`
sessions from before this scheme. Only NEW sessions use the date-tree layout —
existing flat dirs are preserved and remain readable.

### Step 5.5: Create prompt.md (Session Provenance)

**CRITICAL**: Create `${SESSION_DIR}/prompt.md` IMMEDIATELY after the session
directory is created, BEFORE `PLAN.md`. This file is the durable record of
what the user asked for and how the scope evolved before the plan was
written. It is written to progressively — new sections get appended as the
conversation advances.

**Detect invoking context:**

- Check the current working directory:
  - If `$PWD` contains `.claude/worktrees/` → `invoking_skill = "via /make (worktree)"`
  - Else if `$PWD` is the repo root and the branch name differs from the
    default branch → `invoking_skill = "via /make (feature branch)"`
  - Otherwise → `invoking_skill = "direct /build"`

- Capture UTC timestamp: `date -u +"%Y-%m-%dT%H:%M:%SZ"`

- Capture the raw argument string passed to `/build` as `$ARGUMENTS` (the
  prompt the user typed, minus any extracted JIRA-ID). If `/make` invoked
  `/build`, this is the prompt `/make` forwarded.

**Write the initial prompt.md:**

```markdown
# Session Provenance

## Metadata
- **Session**: [session-dir name]
- **Started**: [UTC timestamp]
- **Invoking skill**: [direct /build | via /make (worktree) | via /make (feature branch)]
- **Branch**: [current git branch]
- **Worktree**: [absolute path of $PWD]
- **Jira**: [JIRA-ID or "(none)"]

## Original Prompt

Verbatim arguments passed to `/build`:

```
[$ARGUMENTS as received — preserve newlines and formatting]
```

[If Phase 0.5 detected a JIRA-ID, the Jira context block gets appended here
by Phase 0.5 — see that phase.]

## Clarifying Exchange

[This section stays empty until Phase 1 Step 2/3 runs. Each clarifying
question the orchestrator asks, and the user's answer, is appended here in
order as the conversation happens. Format:

### Q1: [short topic]
**Orchestrator**: [full question text, including multiple-choice options if used]

**User**: [user's answer, verbatim]

If Phase 1 is skipped (Jira path with "Proceed as-is"), write:
"(No clarifying questions — requirements pulled from Jira and accepted as-is.)"
]

## Final Scope Summary

[Populated by Phase 1 Step 6 after PLAN.md is drafted. 3-8 bullets covering
the agreed scope, explicit out-of-scope items, and any notable decisions
made during the clarifying exchange.]
```

**Tell the user:**
```
Created provenance file: ${SESSION_DIR}/prompt.md
This captures the original prompt and will record clarifying questions as
they come up. See it later if you need to review why this session was
scoped the way it was.
```

### Step 5.5a: Appending Jira Context to prompt.md

**This step only runs if Phase 0.5 detected a JIRA-ID** (i.e., the session
started with a Jira issue). After fetching the issue in Phase 0.5 and
before drafting PLAN.md, append the Jira block to prompt.md under the
Original Prompt section:

```markdown

### Jira Context ([JIRA-ID])

- **Summary**: [issue summary]
- **Type**: [Story|Task|Bug|...] | **Priority**: [priority name]
- **Status at session start**: [current status]
- **Labels**: [comma-separated labels]
- **Linked issues**: [key + link type, or "(none)"]

**Description** (verbatim from Jira):

```
[full description body]
```

[If acceptance criteria were detected:]
**Acceptance Criteria**:

```
[AC block, verbatim]
```

[If user accepted "Proceed as-is" in Phase 0.5:]
**User decision**: Accepted Jira requirements as-is — no modifications.

[If user chose "add/change requirements":]
**User decision**: Modified Jira requirements — see Clarifying Exchange below.
```

### Step 5.5b: Appending Clarifying Exchange

**This step runs throughout Phase 1 Step 2 and Step 3.** Every time the
orchestrator asks a clarifying question and receives an answer, append a
Q&A block to the `## Clarifying Exchange` section of prompt.md:

```markdown

### Q[N]: [short topic — e.g., "Auth mechanism" or "Coverage target"]
**Orchestrator**: [full question, including multiple-choice options if used]

**User**: [user's answer, verbatim — if they selected option (b), write
"(b) <option label>" and their follow-up, if any]
```

Append in chronological order as the conversation happens — do NOT batch
at the end. This preserves the real sequence for efficacy review.

### Step 5.5c: Appending Final Scope Summary

**This step runs at the end of Phase 1 Step 6, after PLAN.md is drafted
and presented to the user.** Append a summary of the agreed scope to the
`## Final Scope Summary` section of prompt.md:

```markdown

- [Scope item 1 — from PLAN.md Requirements]
- [Scope item 2]
- ...
- **Explicit out-of-scope**: [items the user said "not now" to, or that were
  YAGNI-ed during the exchange]
- **Key decisions**: [any notable architectural/scope choices made during
  clarifying exchange — e.g., "chose library X over Y because of Z"]
- **Specialists approved**: [list from PLAN.md, or "none"]
```

This closes the loop: `prompt.md` now shows what was asked, what was
clarified, and what was committed to. From here on, `PLAN.md` is the active
execution document and `prompt.md` is frozen provenance.

**README.md template (created once):**
```markdown
# Agent Orchestration Build Sessions

This directory contains build session history from `/agent-orch:build`.

## Structure

Sessions are organised by date: `ssnc-agent-orch/<YYYY>/<MM>/<DD>/<feature-name>/`

Example:
```
2026/05/26/auth-feature/
├── prompt.md        # Original prompt + clarifying exchange (provenance)
├── PLAN.md          # Requirements and implementation plan
├── STATUS.md        # Agent progress and completion status
└── COORDINATION.md  # Agent team metadata (if teams enabled)
```

Older sessions may use the legacy flat layout (`ssnc-agent-orch/<YYYY-MM-DD>-<slug>/`) — both layouts coexist and are readable.

## Usage

**List sessions for today:**
```bash
ls -lt ssnc-agent-orch/$(date +%Y/%m/%d)/
```

**List all sessions for a month:**
```bash
ls -ltR ssnc-agent-orch/2026/05/
```

**Find a session by feature name (works across both layouts):**
```bash
find ssnc-agent-orch/ -type d -name "*auth-feature*"
```

**View specific session:**
```bash
cat ssnc-agent-orch/2026/05/26/auth-feature/PLAN.md
cat ssnc-agent-orch/2026/05/26/auth-feature/STATUS.md
```

**Clean old sessions:**
```bash
# Remove session dirs (containing PLAN.md) older than 30 days
find ssnc-agent-orch/ -type d -name "*" -mtime +30 \
  -exec test -f "{}/PLAN.md" \; -exec rm -rf {} \;
```

## Git

To exclude from version control, add to `.gitignore`:
```
ssnc-agent-orch/
```

To commit sessions as documentation, don't add to .gitignore.
```

### Step 6: Create PLAN.md

Create `${SESSION_DIR}/PLAN.md`:

```markdown
# Implementation Plan

## Feature
[Feature name]

## Goal
[1-2 sentence goal]

## Requirements
[Bulleted list from conversation]

## Architecture
[2-3 sentence overview]

## Tasks

### Phase 1: [Name]
- [ ] Task 1 (assigned: Builder)
- [ ] Task 2 (assigned: Builder)
- [ ] Write tests (assigned: Validator)

### Phase 2: [Name]
- [ ] Task 3 (assigned: Builder)
- [ ] Documentation (assigned: Scribe)

## Quality Targets

| Target | Value | Override |
|--------|-------|---------|
| Coverage | 100% | Set `COVERAGE_TARGET` in `.claude/rules/build-overrides.md` to override |
| Branch Coverage | 100% | Set `BRANCH_COVERAGE_TARGET` in `.claude/rules/build-overrides.md` to override |
| Pass Rate | 100% | Set `PASS_RATE_TARGET` in `.claude/rules/build-overrides.md` to override |
| TDD Mode | enforced | Set `TDD_MODE: optional` in `.claude/rules/build-overrides.md` to disable |
| Playwright E2E | required for UI | Set `PLAYWRIGHT_TESTS: optional` in `.claude/rules/build-overrides.md` to disable |
| Integration Verification | required | Set `INTEGRATION_VERIFICATION: optional` in `.claude/rules/build-overrides.md` to skip |

## Implementation Standards

- **TDD**: Builder follows RED-GREEN-REFACTOR for each feature
- **No Scaffolding**: All code must be fully functional (no TODOs, stubs, placeholders)
- **Full Coverage**: Validator targets 100% line + branch coverage (or `.claude/rules/build-overrides.md` override)
- **Playwright**: UI features require e2e tests with accessibility checks
- **Integration Verified**: Build, migrations, seeds, and app startup verified before review

## Specialists Recommended
- [x] Security Auditor - [reason]
- [ ] Performance Analyst - not needed
- [x] API Designer - [reason]

## Coordination
Mode: [Jira / Markdown / None — set by Advocate in Phase 1.5]
Session Ticket: [KEY-NNN or "TEAM-BOARD.md" or "none"]
Label: claude-code-agent-harness

## Coordination Mode
Mode: [To be determined in Phase 0]
Complexity Score: [To be calculated]

## Constitution Reference
Using standards from: CLAUDE.md

## Session Directory
${SESSION_DIR}
```

**Important:** Inform user of session location:
```
Created build session: ${SESSION_DIR}
All agents will write to this directory.
```

**Finalize prompt.md**: Now that PLAN.md is drafted and confirmed, run Step
5.5c to append the `## Final Scope Summary` block to `${SESSION_DIR}/prompt.md`.
After this append, `prompt.md` is frozen — later phases should NOT modify
it. From here on, PLAN.md and STATUS.md are the active execution documents.

---

## Phase 1.5: Advocate Review (Hard-Gated)

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 1.5: Advocate review (HARD GATE)
Challenging architectural decisions and flagging cross-team impact before build starts.
═══════════════════════════════════════════════════════
```

**Goal**: Challenge assumptions and identify alternatives before the Architect creates the plan

**When to run (Hard Gate Triggers)**:

**Mandatory** when ANY of:
- `PRELIMINARY_COMPLEXITY_SCORE` >= 4 (from Phase 0.7)
- Prompt or Jira description mentions: 'infra', 'infrastructure', 'security', 'auth', 'cross-team', 'multi-service', 'breaking change'
- User explicitly requests advocate review

**Bypass** only via `ADVOCATE_ENFORCE: false` in `.claude/rules/build-overrides.md`. Bypass MUST log a single warning line to STATUS.md:
```
## Advocate Gate Bypassed
ADVOCATE_ENFORCE: false override detected in .claude/rules/build-overrides.md.
Proceeding without Advocate review. Complexity score: [N].
```

**Skipped automatically** for trivial changes:
- `PRELIMINARY_COMPLEXITY_SCORE` <= 1 AND
- No infra/security/cross-team keywords detected AND
- User did not request advocate review

**Actions**:

### Step 1: Launch Advocate Agent

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-advocate`
- **description**: "Challenge architecture and find alternatives"
- **prompt**:
  ```
  Read ${SESSION_DIR}/PLAN.md for proposed requirements and approach.
  Read CLAUDE.md for project standards and context.
  Check ADVOCATE_ENFORCE setting in `.claude/rules/build-overrides.md` or CLAUDE.md. If not found, ask the user which
  mode they prefer (advisory with hard-block for CRITICAL vs fully advisory).

  TEAM COORDINATION (run your full Jira Coordination Protocol):
  Check .claude/rules/jira.md — if it exists, use Jira mode. If not, ask
  the user whether to set up Jira, use local markdown board
  (ssnc-agent-orch/TEAM-BOARD.md), or skip coordination for this session.
  Do NOT hardcode any project key or assignee.
  Phase A: Check what the team is currently building (Jira: search
  claude-code-agent-harness label; Markdown: read TEAM-BOARD.md).
  Phase B: Check for conflicts with in-progress work. If conflicts found,
  BLOCK and present to user. In Jira mode, comment on the conflicting issue.
  Phase C: Ensure this build session is tracked (Jira: create/link ticket
  with claude-code-agent-harness label; Markdown: add row to TEAM-BOARD.md).
  Phase D: Write lifecycle instructions into PLAN.md so the orchestrator
  knows how to update tracking on completion, abort, or scope changes.

  Scan codebase for existing patterns that could be reused.
  Check ../totalis/ for existing platform components (if available).
  Run your full Challenge Checklist against the proposed approach.
  Write findings to ${SESSION_DIR}/ADVOCATE-REVIEW.md.
  Present decision points directly -- the user needs to see and respond to these.
  If cross-team work is identified and Jira is available, prepare ticket
  proposals with the claude-code-agent-harness label. Otherwise note
  dependencies in ADVOCATE-REVIEW.md for manual tracking.
  ```

### Step 2: User Reviews Decision Points

The Advocate presents its findings directly to the user. Wait for the user to respond to each decision point.

- **If CRITICAL findings with ADVOCATE_ENFORCE=true**: Advocate blocks until user acknowledges
- **If user accepts recommendations**: Update PLAN.md to reflect the revised approach
- **If user overrides recommendations**: Note the decisions in ADVOCATE-REVIEW.md and proceed
- **If user wants deeper analysis**: Allow the Advocate to investigate specific items further

### Step 3: Feed into Architect

After user decisions are recorded:
1. `${SESSION_DIR}/ADVOCATE-REVIEW.md` is available for the Architect
2. The Phase 2 Architect prompt includes instructions to read and incorporate it

---

## Phase 2: Architect Analysis

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 2: Architect analysis
Architect reviews requirements, picks specialists, and finalizes PLAN.md.
═══════════════════════════════════════════════════════
```


**Goal**: Analyse codebase and finalize agent assignments

**Actions**:

### Step 0: Advocate Gate Verification (Hard Gate)

**CRITICAL**: Before launching the Architect, check if Phase 1.5 Advocate gate was mandatory:

1. Read `PRELIMINARY_COMPLEXITY_SCORE` from PLAN.md (set in Phase 0.7)
2. Re-scan prompt/Jira description for infra/security/cross-team keywords
3. Determine if gate was triggered:
   - `PRELIMINARY_COMPLEXITY_SCORE` >= 4 OR
   - Keywords detected ('infra', 'infrastructure', 'security', 'auth', 'cross-team', 'multi-service', 'breaking change')

**If gate was triggered**:
- Check if `${SESSION_DIR}/ADVOCATE-REVIEW.md` exists
- Check if `ADVOCATE_ENFORCE: false` is set in `.claude/rules/build-overrides.md`

**Gate enforcement logic**:
```
IF gate_triggered AND ADVOCATE-REVIEW.md does NOT exist AND ADVOCATE_ENFORCE != false:
  STOP with this message:
  
  [advocate-gate] Phase 1.5 Advocate review was required but ${SESSION_DIR}/ADVOCATE-REVIEW.md
  does not exist. Aborting before Architect to avoid making decisions without cross-team /
  risk review.
  
  Complexity indicators:
  - Preliminary score: [N]
  - Keywords detected: [list]
  
  Fix options:
  (a) Re-run /build - Phase 1.5 will run automatically
  (b) Set ADVOCATE_ENFORCE: false in .claude/rules/build-overrides.md to bypass with audit logging
  
  Exit immediately. Do NOT launch Architect.
```

**If gate bypassed** (ADVOCATE_ENFORCE: false):
- Log warning to STATUS.md (as shown in Phase 1.5)
- Continue to Step 1

**If gate not triggered** (trivial change):
- Continue to Step 1

### Step 1: Launch Architect Agent

Use the **Task tool** (subagent mode) with the following parameters:
- **subagent_type**: `agent-orch:orchestrate-architect`
- **description**: "Analyse codebase and plan"
- **prompt**:
  ```
  Read ${SESSION_DIR}/PLAN.md for requirements.
  Read CLAUDE.md for project standards.
  If ${SESSION_DIR}/ADVOCATE-REVIEW.md exists, read it and incorporate accepted
  recommendations into your plan. The user has already reviewed and decided on the
  Advocate's decision points -- respect those decisions. Note any overridden
  recommendations and proceed with the user's chosen approach.
  Analyse codebase patterns and structure.
  Update ${SESSION_DIR}/PLAN.md with detailed task assignments.
  Recommend which specialists to activate.
  Assess coordination complexity:
    - Count cross-layer dependencies
    - Estimate iteration rounds
    - Identify potential conflicts between specialists
  Return 10-15 most important files to understand.
  ```

### Step 2: Review Architect Output

Wait for the architect agent to complete, then:
1. Read files identified by Architect
2. Review updated ${SESSION_DIR}/PLAN.md
3. Review specialist recommendations
4. **Assess coordination needs** (see Phase 0 detection logic)

### Step 3: Coordination Mode Decision

**Apply Phase 0 detection logic** to determine mode:

1. Count complexity indicators from architect's analysis
2. Calculate complexity score
3. Present recommendation to user
4. Update PLAN.md with decision

### Step 4: User Approval

**Ask user to approve:**
- Implementation plan
- Specialist selection
- Coordination mode (teams vs subagents)

---

## Pre-Phase 3: Enforcement Rule Injection

**Goal**: Inject project-level enforcement rules into agent prompts before launching.

**CRITICAL**: This step runs BEFORE launching any implementation agents.

### Step 1: Check for Enforcement Rules

Check if `.claude/enforce/rules.json` exists in the project root.

- **If not exists**: Skip to Phase 3 (no enforcement rules configured)
- **If exists**: Read the registry and proceed to Step 2

### Step 2: Build Enforcement Prompt Sections

For EACH agent about to be launched:

1. Get the agent's role name (e.g., `builder`, `uiux`, `security`, `validator`, `scribe`)
2. Filter rules from `rules.json` where:
   - `enabled` is `true`
   - The `agents` array includes this agent's role name
3. For each matching rule:
   - Read `.claude/enforce/prompts/[rule-id].md`
   - Collect into an enforcement section

4. Build the enforcement block to append to the agent's spawn prompt:

```markdown
## Enforcement Rules

The following rules MUST be followed. Violations will be caught by automated
linting and will block task completion.

### [rule-id]: [description]
[contents of prompts/[rule-id].md]

### [rule-id-2]: [description-2]
[contents of prompts/[rule-id-2].md]
```

5. Append this block to the agent's spawn prompt (after the existing prompt content)

### Step 3: Plan Post-Implementation Check

After ALL agents complete in Phase 3 (before Phase 4 review):

1. Run `.claude/enforce/hooks/enforce-check.sh` against changed files
2. If violations found:
   - Report violations to the user
   - Launch Builder agent to fix violations
   - Re-run enforcement check until clean
3. Only proceed to Phase 4 (review) when enforcement checks pass

---

## Phase 3: Parallel Implementation

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 3: Parallel implementation
Launching builders, validator, scribe, and specialists in parallel. Each agent
receives the worktree anchor and MUST stay inside it.
═══════════════════════════════════════════════════════
```

Before launching any agent: confirm the `${ANCHOR_BLOCK}` (from Phase pre) is
prepended to every subagent prompt. The block is non-negotiable.


**Goal**: Build, test, document simultaneously

**CRITICAL**: Launch strategy depends on coordination mode.

### Subagent Mode Launch

Launch ALL approved agents IN PARALLEL using a SINGLE message with MULTIPLE Task tool calls.

**Agent 1 - Builder**
- **subagent_type**: `agent-orch:orchestrate-builder`
- **description**: "Implement assigned tasks"
- **prompt**:
  ```
  Implement the tasks assigned to Builder in ${SESSION_DIR}/PLAN.md.
  Read CLAUDE.md for project standards.
  Read ${SESSION_DIR}/PLAN.md "Quality Targets" section for TDD mode, coverage targets.
  Read ${SESSION_DIR}/conventions.md for code conventions.

  MANDATORY: Follow TDD (RED-GREEN-REFACTOR) unless TDD_MODE is "optional".
  For each feature: write failing test FIRST, then implement until it passes.
  Report RED→GREEN→REFACTOR status for each task.

  MANDATORY: NO SCAFFOLDING. Every feature must be fully functional.
  No TODOs, no stubs, no placeholders, no "coming soon" pages.
  Full error handling, loading states, validation, and edge cases.

  After each task: update STATUS.md with TDD evidence, then move to next task.
  Verify your work with tests before marking tasks complete.
  ```

**Agent 2 - Validator**
- **subagent_type**: `agent-orch:orchestrate-validator`
- **description**: "Write and run tests"
- **prompt**:
  ```
  Read ${SESSION_DIR}/PLAN.md for requirements AND quality targets.
  Read CLAUDE.md for test standards.
  Read ${SESSION_DIR}/conventions.md for code conventions.

  QUALITY TARGETS (from PLAN.md, or defaults):
  - Coverage: 100% (or COVERAGE_TARGET from CLAUDE.md/PLAN.md)
  - Pass Rate: 100% (or PASS_RATE_TARGET from CLAUDE.md/PLAN.md)

  Write COMPREHENSIVE tests: happy path, error paths, edge cases, boundary
  conditions, negative tests, integration points.
  DO NOT write rudimentary tests. Cover ALL code paths.

  If feature includes UI: write Playwright e2e tests covering user flows,
  error states, loading states, and accessibility (axe-core).

  Run coverage report. If below target, write MORE tests until target met.

  PROGRESS: Update ${SESSION_DIR}/STATUS.md BEFORE each test run
  ("Validator: Running tests for [area]") and AFTER
  ("Validator: [N] passed, [N] failed, [N]% coverage").
  VERIFICATION GATE: Show actual test output with pass/fail counts AND coverage %.
  ```

**Agent 3 - Scribe**
- **subagent_type**: `agent-orch:orchestrate-scribe`
- **description**: "Document features"
- **prompt**:
  ```
  Read ${SESSION_DIR}/PLAN.md for requirements.
  Document completed features.
  Update README if needed.
  Create usage examples.
  PROGRESS: Update ${SESSION_DIR}/STATUS.md when starting and completing
  each document ("Scribe: Writing [doc name]", "Scribe: Completed [doc name]").
  ```

**Specialists**: Include in same parallel message if approved (see lines 360-402 of original for specialist prompts)

### Agent Team Mode Launch

**Step 1: Create Team**

Use the `TeamCreate` tool:
```
TeamCreate:
  name: "build-[feature-name]"
```

**Step 2: Create COORDINATION.md**

Create `${SESSION_DIR}/COORDINATION.md`:
```markdown
# Agent Team Coordination

## Team Name
build-[feature-name]

## Team Members
- Lead: Orchestrator
- Builder (teammate)
- Validator (teammate)
- Scribe (teammate)
- [Approved specialists as teammates]

## Shared Task List
Location: ${SESSION_DIR}/PLAN.md

## Communication Channels
- Direct messages between teammates
- Broadcast for team-wide announcements
- Lead notifications for blockers

## Coordination Protocol

### Task Claiming
1. Check PLAN.md for available tasks
2. Verify dependencies are complete
3. Claim task by updating PLAN.md: `[claimed by: AgentName]`
4. Notify dependencies when complete

### Cross-Agent Communication
**Builder ↔ Validator:**
- Builder notifies Validator when feature ready
- Validator messages Builder with test failures
- Builder fixes and notifies for retest

**Builder ↔ Specialists:**
- Security messages Builder with vulnerabilities
- Performance messages Builder with bottlenecks
- Database coordinates schema with Builder and API

**Reviewers ↔ Builder:**
- Reviewers message Builder directly with issues
- Builder fixes and notifies reviewer
- Reviewers verify without lead mediation

### Escalation
Message lead (@lead) when:
- Blocked by external dependency
- Architectural decision needed
- Conflict between agents
- Ready for phase completion

## Status Updates
All agents update ${SESSION_DIR}/STATUS.md with:
- Task progress
- Blockers
- Coordination events (who messaged whom)

## Agent Session IDs
Track agent IDs for session resumption:
| Agent | Agent ID | Status |
|-------|----------|--------|
| Builder | [set after spawn] | active |
| Validator | [set after spawn] | active |
| Scribe | [set after spawn] | active |

To resume a specific agent:
```
Agent tool call:
  resume: "[agent-id-from-table]"
  prompt: "Continue your previous work. Check STATUS.md for current state."
```
```

**Step 3: Spawn Teammates**

Use the `Agent` tool with `team_name` parameter for each teammate:

**Core Team:**

**NOTE**: For tasks where multiple agents edit code, use `isolation: "worktree"` to give each agent an isolated copy of the repository. This prevents file conflicts.

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-builder"
  team_name: "build-[feature-name]"
  isolation: "worktree"
  prompt: "Implement the tasks assigned to Builder in ${SESSION_DIR}/PLAN.md.
           Read CLAUDE.md for standards. Read PLAN.md Quality Targets section.
           Read ${SESSION_DIR}/conventions.md for code conventions.
           MANDATORY TDD: Write failing test FIRST, then implement (RED-GREEN-REFACTOR).
           Report RED→GREEN→REFACTOR evidence for each task.
           MANDATORY NO SCAFFOLDING: Every feature fully functional. No TODOs,
           stubs, placeholders. Full error handling, loading states, validation.
           After each task: update STATUS.md with TDD evidence, SendMessage @lead
           with what you built, SendMessage @validator when ready for testing.
           Verify with tests before marking complete.
           Do NOT go idle while tasks remain - check PLAN.md for next task."
  description: "Implement assigned tasks"

Agent tool call:
  subagent_type: "agent-orch:orchestrate-validator"
  team_name: "build-[feature-name]"
  mode: "plan"
  prompt: "Read ${SESSION_DIR}/PLAN.md and CLAUDE.md. Read PLAN.md Quality Targets.
           Read ${SESSION_DIR}/conventions.md for code conventions.
           TARGETS: 100% coverage, 100% pass rate (or overrides from PLAN.md/CLAUDE.md).
           Write COMPREHENSIVE tests: happy path, error paths, edge cases,
           boundary conditions, negative tests. NO rudimentary tests.
           If UI feature: write Playwright e2e tests with accessibility checks.
           Run coverage report. If below target, write MORE tests.
           Use SendMessage to message @builder with test failures.
           Use TaskUpdate to track progress. VERIFICATION GATE required.
           PROGRESS: Update ${SESSION_DIR}/STATUS.md BEFORE each test run
           and AFTER with results including coverage %. Use SendMessage to @lead
           after each test run with pass/fail counts and coverage.
           LIFECYCLE: Do NOT go idle while you have incomplete tasks in PLAN.md.
           After each task, check PLAN.md for next task AND check your inbox.
           Only go idle when ALL your assigned tasks are complete.
           If blocked, SendMessage to @lead explaining what you need.
           Read ${SESSION_DIR}/COORDINATION.md for team protocols."
  description: "Write and run tests"

Agent tool call:
  subagent_type: "agent-orch:orchestrate-scribe"
  team_name: "build-[feature-name]"
  prompt: "Read ${SESSION_DIR}/PLAN.md and CLAUDE.md. Document completed features.
           Use SendMessage to coordinate with @builder and @validator.
           PROGRESS: Update ${SESSION_DIR}/STATUS.md when starting and
           completing each doc. Use SendMessage to @lead when each doc is done.
           LIFECYCLE: Do NOT go idle while you have incomplete tasks in PLAN.md.
           After each task, check PLAN.md for next task AND check your inbox.
           Only go idle when ALL your assigned tasks are complete.
           Read ${SESSION_DIR}/COORDINATION.md for team protocols."
  description: "Document features"
```

Add approved specialists to the same team with similar prompts.

**Step 4: Monitor Team Progress**

As lead, you MUST actively report progress to the user. See [Progress Reporting](#progress-reporting-mandatory) below.

### Wait for All Agents

After launching (either mode), you MUST actively poll and report progress. **DO NOT go silent.**

See [Progress Reporting](#progress-reporting-mandatory) for the mandatory polling loop.

---

## Phase 3.5: Integration Verification

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 3.5: Integration verification
DevOps agent checks Dockerfiles, CI, env files — wired inside this worktree.
═══════════════════════════════════════════════════════
```


**Goal**: Verify the full system works before code review

**CRITICAL**: This phase runs AFTER Phase 3 (implementation) and BEFORE Phase 4 (review). Do NOT skip this phase.

**Check `.claude/rules/build-overrides.md` or PLAN.md for `INTEGRATION_VERIFICATION: optional` to skip this phase.**

### When to Run

Run this phase when ANY of these are true:
- Database migrations were created or modified
- Significant code changes were made (new features, refactors)
- Build configuration changed
- Dependencies were added or updated
- Infrastructure code changed

### Subagent Mode

Launch DevOps agent for integration verification:

- **subagent_type**: `agent-orch:orchestrate-devops`
- **description**: "Run integration verification"
- **prompt**:
  ```
  Run Post-Implementation Integration Verification.
  Read ${SESSION_DIR}/STATUS.md to understand what was built.

  Verify IN ORDER (stop on first failure):
  1. FULL BUILD: Run build command. Zero errors required.
  2. DB MIGRATIONS: Run all pending migrations. Must complete without error.
  3. DB SEEDS: Run seeds if they exist. Must complete without error.
  4. APP STARTUP: Start app, verify it boots and responds to health check.
  5. LINT & TYPE CHECK: Run linter and type checker. Zero errors.

  Write verification report to ${SESSION_DIR}/STATUS.md.
  If ANY check fails: report failure with full error output.
  ```

### Agent Team Mode

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-devops"
  team_name: "build-[feature-name]"
  prompt: "Run Post-Implementation Integration Verification.
           Read ${SESSION_DIR}/STATUS.md for what was built.
           Verify: build, migrations, seeds, app startup, lint.
           Write report to STATUS.md.
           SendMessage @lead with PASSED/FAILED and details.
           If FAILED: SendMessage @builder or @database with specific fix needed."
  description: "Integration verification"
```

### Verification Gate

**Only proceed to Phase 4 when integration verification PASSES.**

If verification FAILS:
1. Report failure to user with specific errors
2. Launch Builder/Database agent to fix issues
3. Re-run integration verification
4. Maximum 3 attempts before escalating to user

---

## Phase 4: Two-Stage Code Review

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 4: Two-stage code review
Stage 1: spec compliance (does it match requirements?). Stage 2: code quality.
═══════════════════════════════════════════════════════
```

Within this phase, also print a sub-banner before each stage:
```
→ phase 4 stage 1/2: spec-reviewer (spec compliance)
```
and
```
→ phase 4 stage 2/2: quality-reviewer (patterns, maintainability)
```


**Goal**: Validate through sequential review stages

**CRITICAL**: Stage 1 and Stage 2 are SEQUENTIAL, not parallel. Stage 2 cannot start until Stage 1 passes.

### Subagent Mode Review

**Stage 1: Spec Compliance Review**

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-spec-reviewer`
- **description**: "Verify spec compliance"
- **prompt**:
  ```
  Read ${SESSION_DIR}/PLAN.md for requirements (your PRIMARY reference).
  DISTRUST implementer claims - verify by reading actual code.
  For EACH requirement:
    - Locate the implementation code
    - Verify it exists and is correct
    - Note file:line as evidence
  Check for scope creep.
  Document findings in ${SESSION_DIR}/STATUS.md.
  If ALL requirements verified: 'Spec Compliance - PASSED'
  If gaps found: Create tasks in ${SESSION_DIR}/PLAN.md, DO NOT proceed to Stage 2
  ```

**If Stage 1 FAILS**:
1. Read spec-reviewer's findings from ${SESSION_DIR}/STATUS.md
2. Launch `agent-orch:orchestrate-builder` to fix gaps
3. Launch `agent-orch:orchestrate-debugger` if tests are failing
4. After fixes, **re-run Stage 1**

**Stage 2: Code Quality Review**

**PREREQUISITE**: Stage 1 must show "PASSED" in ${SESSION_DIR}/STATUS.md

Use the **Task tool** with:
- **subagent_type**: `agent-orch:orchestrate-quality-reviewer`
- **description**: "Review code quality"
- **prompt**:
  ```
  Verify Stage 1 passed in ${SESSION_DIR}/STATUS.md.
  Read CLAUDE.md for project standards.
  Review ALL code for quality, patterns, tests, docs.
  Categorize issues by severity.
  If approved: 'Code Quality Review - APPROVED'
  If issues: Create refinement tasks in ${SESSION_DIR}/PLAN.md
  ```

**If Stage 2 FAILS**:
1. Read quality-reviewer's findings from ${SESSION_DIR}/STATUS.md
2. Launch appropriate agents to fix issues (builder, validator, scribe)
3. After fixes, **re-run Stage 2** (Stage 1 status preserved)

### Agent Team Mode Review

**Stage 1: Spawn Spec Reviewer Teammate**

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-spec-reviewer"
  team_name: "build-[feature-name]"
  prompt: "Read ${SESSION_DIR}/PLAN.md for requirements. DISTRUST claims.
           Verify each requirement by reading code. If gaps found, use
           SendMessage to @builder with specific requirements and file
           locations. @builder fixes and uses SendMessage to notify you.
           Re-verify without lead mediation.
           PROGRESS: Use SendMessage to @lead after checking each requirement
           (e.g. 'Verified 3/8 requirements. 2 gaps found, sent to Builder.').
           Use SendMessage to @lead when PASSED or when iteration round
           completes. Document in STATUS.md."
  description: "Verify spec compliance"
```

**Reviewer-Builder Iteration (automatic):**
```
Spec Reviewer finds gap → messages @builder: "Missing email validation in
auth.ts per PLAN.md line 42"

Builder fixes → messages @spec-reviewer: "Email validation added in
auth.ts:105-112, please verify"

Spec Reviewer re-verifies → either messages @builder with more issues OR
messages @lead: "Stage 1 PASSED"
```

**Stage 2: Spawn Quality Reviewer Teammate**

Only after Stage 1 PASSED notification:
```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-quality-reviewer"
  team_name: "build-[feature-name]"
  prompt: "Wait for Stage 1 PASSED. Read CLAUDE.md for standards. Review code
           quality. If issues found, use SendMessage to @builder, @scribe,
           @validator with specific problems. They fix and use SendMessage to
           notify you. Re-verify without lead mediation.
           PROGRESS: Use SendMessage to @lead with issue counts as you review
           (e.g. 'Reviewed 4/7 files. Found 2 issues, sent to Builder.').
           Use SendMessage to @lead when APPROVED or when iteration round
           completes. Document in STATUS.md."
  description: "Review code quality"
```

**Reviewer-Team Iteration (automatic):**
```
Quality Reviewer finds issues →
  messages @builder: "Inconsistent error handling in auth.ts"
  messages @scribe: "Missing API docs for new endpoint"

Builder fixes → notifies @quality-reviewer
Scribe updates docs → notifies @quality-reviewer

Quality Reviewer verifies → messages @lead: "Stage 2 APPROVED"
```

### Debugger (When Needed)

**Subagent Mode:**
Launch when tests fail or issues persist using Task tool.

**Agent Team Mode:**
```
When agent messages lead about persistent issues:

Agent tool call:
  subagent_type: "agent-orch:orchestrate-debugger"
  team_name: "build-[feature-name]"
  prompt: "Read ${SESSION_DIR}/STATUS.md for issue details. NO FIXES WITHOUT
           ROOT CAUSE. Use 4-phase methodology. Use SendMessage to @builder
           with findings. Use SendMessage to @lead when resolved or if
           architectural change needed."
  description: "Debug failing tests"
```

### Refinement Loop Limits

- Maximum 3 rounds per stage
- If still failing after 3 rounds, present remaining issues to user for decision
- User can: force approve, continue refining, or abort
- **If user aborts**: See Phase 5 Step 1.5 note on Jira lifecycle — comment on session ticket but do NOT transition to Done

---

## Phase 4.5: Out-of-Scope Work and Blockers (Coordination Lifecycle)

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 4.5: Out-of-scope + blockers
Advocate files Jira tickets for out-of-scope work so they don't get lost.
═══════════════════════════════════════════════════════
```


**During Phases 2-4**, if out-of-scope work or blockers are identified, check `## Coordination` in PLAN.md for the mode.

### Out-of-Scope Work

If an agent or the user identifies work that is needed but outside the scope of this session:

**Jira Mode**:
1. Create a backlog issue:
   ```
   mcp__jira__jira_createIssue with:
     projectKey: "[KEY from jira.md]"
     summary: "[Backlog] [description of out-of-scope work]"
     issueType: "[Story or Task ID from jira.md]"
     description: "Discovered during agent-assisted build session [session ticket].
       Context: [why this was identified]"
     customFields: { "labels": ["claude-code-agent-harness"] }
   ```
2. Link to session ticket: `mcp__jira__jira_linkIssues` with linkType "Relates"
3. Comment on session ticket noting the new issue
4. The new issue stays Open — it's backlog for a future session

**Markdown Mode**:
1. Add a row to `## Backlog` in `ssnc-agent-orch/TEAM-BOARD.md`:
   ```
   | [description] | [current session-dir] | [priority] | [context] |
   ```

**No coordination**: Note in STATUS.md only.

### Build Blocked

**Jira Mode**:
1. Comment on session ticket with blocker details
2. If blocker needs its own ticket, create with `claude-code-agent-harness` label and "Blocks" link type

**Markdown Mode**:
1. Update the session row in TEAM-BOARD.md status to "Blocked — [reason]"

**All modes**: Present the situation to the user — they may need to coordinate out-of-band

---

## Phase 5: Finalize

**Print phase banner:**
```
═══════════════════════════════════════════════════════
/build phase 5: Finalize
Summary, STATUS.md, next-step recommendations. /build hands back to /make if invoked from there.
═══════════════════════════════════════════════════════
```


**Goal**: Complete the implementation

**Actions**:

### Step 1: Verify Reviews Passed

Read ${SESSION_DIR}/STATUS.md and confirm:
- "Spec Compliance - PASSED"
- "Code Quality Review - APPROVED"

### Step 1.5: Session Tracking — Mark Done

Check `## Coordination` in PLAN.md for the mode and session ticket.

**Jira Mode** (Session Ticket is a Jira issue key like KEY-NNN):
1. Transition to Done:
   ```
   mcp__jira__jira_transitionIssue with:
     issueKey: "[session ticket from PLAN.md]"
     transitionId: "[Done transition ID from .claude/rules/jira.md Transitions table]"
   ```
2. Add completion comment:
   ```
   mcp__jira__jira_postIssueComment with:
     issueKey: "[session ticket]"
     body: "🤖 Agent-assisted build session completed.
     [summary of what was built, files modified, test results, review rounds]
     Session: ${SESSION_DIR}"
   ```

**Markdown Mode** (Session Ticket is "TEAM-BOARD.md"):
1. Read `ssnc-agent-orch/TEAM-BOARD.md`
2. Move this session's row from `## Active Sessions` to `## Completed Sessions`
3. Add the completion date and update status to "Done"

**No coordination / no session ticket**: Skip this step.

### Step 2: Team Cleanup (Agent Team Mode Only)

If using agent teams:

1. Send shutdown requests to each teammate:
```
SendMessage to each teammate: "Please shut down gracefully"
```

2. After all teammates confirm shutdown, clean up:
```
TeamDelete:
  name: "build-[feature-name]"
```

**IMPORTANT**: Only the lead should run TeamDelete.

### Step 3: Final Summary

**For Subagent Mode:**
Use Task tool to launch `agent-orch:orchestrate-architect` for final summary.

**For Agent Team Mode:**
Synthesize from STATUS.md and COORDINATION.md.

### Step 4: Present Summary

Present to user:
- What was implemented
- Files created/modified
- Tests added
- Review rounds completed
- **Coordination mode used** (teams vs subagents)
- **Session location**: `${SESSION_DIR}`
- **Agent team benefits realized** (if teams used):
  - Number of direct agent-agent messages
  - Iterations handled without orchestrator
  - Time saved from parallel coordination

### Step 5: Next Steps

Ask if user wants to:
- Commit changes
- Create PR
- Continue with more features
- Abort this session

**If user chooses to abort**, check `## Coordination` in PLAN.md:

**Jira Mode**:
```
mcp__jira__jira_postIssueComment with:
  issueKey: "[session ticket]"
  body: "🛑 Build session aborted. Progress: [phase reached]. Can be reopened."
```
Do NOT transition to Done — leave In Progress or use "Cancelled" if available.

**Markdown Mode**: Update session row in TEAM-BOARD.md status to "Aborted".

**No coordination**: No action needed.

**Session Resumption (Known Limitation):**

In-process teammates cannot be resumed after going idle or after the lead session ends. This is a known platform limitation. If a session is interrupted:
1. The lead should spawn fresh replacement teammates
2. New teammates read STATUS.md and PLAN.md to pick up where the previous agents left off
3. COORDINATION.md preserves what was accomplished for context

**Inform user about session files:**
```
Build session complete!

Coordination mode: [AGENT_TEAMS | SUBAGENTS]

Session files saved to: ${SESSION_DIR}
- prompt.md: Original prompt + clarifying exchange (provenance, frozen after Phase 1)
- PLAN.md: Requirements and tasks
- STATUS.md: Agent progress and findings
- COORDINATION.md: Team metadata (if teams used)

To review this session later:
  cat ${SESSION_DIR}/prompt.md   # why was it scoped this way?
  cat ${SESSION_DIR}/PLAN.md
  cat ${SESSION_DIR}/STATUS.md

To commit session files for team visibility:
  git add ${SESSION_DIR}
  git commit -m "Add build session: [feature-name]"

To exclude from git:
  echo "ssnc-agent-orch/" >> .gitignore
```

---

## STATUS.md Format

**Subagent Mode:**
```markdown
# Implementation Status

## Current Phase
Phase 4: Code Review

## Agent Progress

### Builder
- [x] Implemented user registration
- [x] Added password validation
- [ ] Waiting for review feedback

### Validator
- [x] Unit tests: 12 passing
- [x] Coverage: 87%

### Spec Reviewer
- Stage 1: PASSED
- All 8 requirements verified

### Quality Reviewer
- Stage 2: Round 1
- Issues found: 2 (HIGH: 1, MEDIUM: 1)

## Review History

### Round 1
| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| QR-001 | HIGH | Missing error handling | Fixed |
| QR-002 | MEDIUM | Inconsistent naming | In progress |
```

**Agent Team Mode:**
```markdown
# Implementation Status

## Coordination Mode
Agent Teams (5 teammates active)

## Current Phase
Phase 4: Code Review - Stage 2

## Team Activity Log

### 2026-02-22 14:23
Builder → Validator: "Auth endpoint ready for testing"
Validator → Builder: "Test failure: Missing null check at auth.ts:105"
Builder → Validator: "Fixed, please retest"
Validator → Lead: "All tests passing (12/12)"

### 2026-02-22 14:45
Security → Builder: "HIGH: SQL injection risk in query builder"
Builder → Security: "Fixed using parameterized queries"
Security → Builder: "Verified - secure"

### 2026-02-22 15:10
Spec Reviewer → Builder: "Missing requirement: email validation (PLAN.md:42)"
Builder → Spec Reviewer: "Added at auth.ts:115, uses regex from CLAUDE.md"
Spec Reviewer → Lead: "Stage 1 PASSED - all 8 requirements verified"

## Agent Status

### Builder (teammate)
- Status: Idle (awaiting Stage 2 feedback)
- Completed: 8/8 tasks
- Messages sent: 12
- Messages received: 15

### Validator (teammate)
- Status: Idle
- Tests: 12 passed, 0 failed
- Coverage: 92%

### Security (teammate)
- Status: Complete
- Issues found: 1 HIGH (fixed)
- Audited: 5 files

### Spec Reviewer (teammate)
- Status: Complete - PASSED
- Requirements verified: 8/8
- Iterations: 2 rounds

### Quality Reviewer (teammate)
- Status: In progress - Round 1
- Issues: 2 (HIGH: 1, MEDIUM: 1)

## Direct Coordination Events
Total agent-to-agent messages: 24
Orchestrator interventions: 2 (both for phase transitions)
Iterations handled autonomously: 4
```

---

## Agent Model Selection

Default models are configured per agent in `.agent-orch-models.json` (repo root). Each agent maps to a vendor-neutral alias:

| Agent | Alias | Plan Mode | Rationale |
|-------|-------|-----------|-----------|
| Architect | `thinking` | N/A | Complex planning and coordination decisions |
| Spec Reviewer | `thinking` | Yes | Skeptical verification requires deep reasoning |
| Quality Reviewer | `thinking` | Yes | Constitution compliance and pattern analysis |
| Debugger | `thinking` | N/A | Root cause analysis requires systematic reasoning |
| Builder | `instruct` | **NO** | Must start coding immediately. Architect already planned. |
| Validator | `instruct` | Yes | Test plan approval before execution |
| Scribe | `instruct` | No | Documentation from clear requirements |
| All Specialists | `instruct` | No | Domain review within defined scope |

The bootstrap resolves each alias to a concrete model via `aliases.thinking` and `aliases.instruct` in the config. Shipped defaults: `thinking` → `opus`, `instruct` → `sonnet` (Claude Code). OpenCode users set these to their full model IDs (e.g., `ssnc-gateway/zai-org/GLM-5.2-FP8`).

### Override Per Session

To override a model for a specific agent, add to `.claude/rules/build-overrides.md`:

```markdown
## Agent Model Overrides
- orchestrate-builder: opus  # Use for complex implementations
- orchestrate-security: opus  # Use for critical security reviews
```

The orchestrator reads these overrides and passes them when launching agents. Overrides stack on top of `.agent-orch-models.json` (the config is the base layer).

**Do NOT add overrides to CLAUDE.md** -- use `.claude/rules/build-overrides.md` instead. Files in `.claude/rules/` are auto-loaded by all agents and keep CLAUDE.md lean.

---

## Progress Reporting (MANDATORY)

**CRITICAL**: You MUST report progress to the user at regular intervals during agent execution. **NEVER go silent** while agents are working. The user cannot see agent activity - YOU are their only window into what is happening.

### STATUS.md is the Single Source of Truth

**CRITICAL**: You MUST only report what is actually written in STATUS.md or received via SendMessage. **NEVER fabricate, infer, or guess agent status.**

- If STATUS.md says Builder has completed 2 tasks, report 2 tasks - not "Builder is probably working on task 3"
- If STATUS.md hasn't been updated recently, say so: "STATUS.md last updated at [time]. Checking with agents."
- If an agent hasn't written to STATUS.md, report: "[Agent] has not reported progress yet" - do NOT invent what they might be doing
- **Never say "slightly outdated"** and then make up current status. If the file is outdated, that IS the problem to report.

### Agent STATUS.md Update Requirements

All agents MUST update STATUS.md at these points:
1. **Before starting a task**: Write "[Agent]: Starting [task name]"
2. **After completing a task**: Write "[Agent]: Completed [task name] - [brief result]"
3. **When blocked**: Write "[Agent]: BLOCKED on [reason]"
4. **When waiting for permission**: Write "[Agent]: WAITING_PERMISSION - [what action needs approval] - blocking [downstream tasks/agents]"
5. **When messaging another agent**: Write "[Agent] -> [Other]: [brief message summary]"

This is enforced through agent spawn prompts (see PROGRESS instructions in each prompt).

### Permission Requests & Approval Blockers

**CRITICAL**: When agents need user permission (file writes, shell commands, tool calls requiring approval), the orchestrator MUST immediately surface these to the user. Pending permissions are the #1 cause of silent stalls.

**Rules:**
1. **Proactively check for pending permissions** during every polling cycle
2. **Immediately tell the user** when an agent is blocked on approval - do NOT wait for the user to ask
3. **Explain what the permission is for** and why it's blocking progress
4. **Show the dependency chain** - which agents are waiting on the blocked agent

**Format for surfacing permission blockers:**
```
### Action Required: Permission Requests Pending

**[Agent]** needs approval to proceed:
- [What tool/action needs permission] - [why it's needed]
- **Blocking**: [Agent] cannot continue, which blocks [downstream agents]

Please approve or deny in the [Agent] terminal/pane to unblock the pipeline.
```

**Example:**
```
### Action Required: 2 Permissions Pending

1. **Database** needs approval to run: `CREATE TABLE break_patterns ...`
   - Blocking: Builder waiting for schema before Phase 3 implementation

2. **Builder** needs approval to modify: `src/index.ts` (add exports)
   - Blocking: Type system incomplete, Validator cannot write tests

Approve these in the agent panes to unblock the pipeline.
```

**If no progress AND no STATUS.md updates**: The most likely cause is a pending permission. Say so:
```
No progress detected. This usually means agents are waiting for permission
approval. Check agent panes for pending permission prompts.
```

### Reporting Rules

1. **After launching agents**: Immediately tell the user what was launched and what to expect
2. **While agents work**: Report progress every time you check status (at minimum after each agent completes)
3. **Never say "working autonomously" and go silent** - this makes the user think the system crashed
4. **Show concrete progress** - file names, task counts, test results - not vague "still working" messages
5. **Only report verified information** - read STATUS.md or agent messages, never guess
6. **Surface permission blockers immediately** - pending approvals are the most common cause of silent stalls

### Subagent Mode Reporting

After launching subagents, you will receive their results as they complete. **Report each result to the user immediately**:

```
**Architect** completed - identified 12 key files, assigned 8 tasks across 3 phases.

**Builder** completed - implemented 3 features:
- auth.ts (new, 145 lines)
- middleware.ts (modified, added token validation)
- routes.ts (modified, 2 new endpoints)

**Validator** still running...
```

### Agent Team Mode Reporting

In Agent Teams mode, messages from teammates arrive **automatically** - the lead does NOT need to poll. The platform delivers `SendMessage` messages and idle notifications to the lead natively.

**Lead Event Loop (message-driven, not polling):**
```
WAIT for incoming events (messages arrive automatically):

  On teammate SendMessage to @lead:
    1. Report the message content to the user immediately
    2. If message contains WAITING_PERMISSION or BLOCKED:
       - Surface to user with what approval is needed
       - Show dependency chain
    3. If message is a task completion report:
       - Report what was accomplished (files, results)
       - Check task list for remaining work

  On teammate idle notification:
    1. Check task list for incomplete tasks assigned to that teammate
    2. If tasks remain → Idle Agent Recovery (re-spawn, see below)
    3. If all tasks done → Report: "[Agent] completed all tasks and is idle."
    4. Check if ALL teammates are idle + all tasks done → phase complete

  On permission request bubbling up from teammate:
    1. IMMEDIATELY tell user: "ACTION REQUIRED: [Agent] needs approval for [action]"
    2. Show what's blocked downstream
    3. Teammate permission requests bubble up to the lead automatically

  On prolonged silence (no events received):
    1. This likely means agents are blocked on permissions
    2. Tell user: "No agent activity. Check for pending permission prompts in agent panes."
    3. Read ${SESSION_DIR}/STATUS.md as fallback to check last known state
```

**CRITICAL**: "All agents idle" does NOT mean "all work complete". Always check the task list for incomplete tasks before concluding a phase is done.

**Pre-approve common operations**: To reduce permission friction, recommend users pre-approve common tool calls in their permission settings before spawning teammates. This is the #1 way to prevent silent permission stalls.

**Progress update format:**
```
### Progress Update

| Agent | Status | Current Task |
|-------|--------|-------------|
| Builder | Working | Implementing auth middleware (3/8 tasks done) |
| Validator | Waiting | Ready to test when Builder completes auth |
| Security | Complete | Found 1 MEDIUM issue, sent to Builder |
| Scribe | Working | Documenting API endpoints |

**Recent activity:**
- Security messaged Builder about input validation gap
- Builder completed database schema (task 2/8)
- Validator wrote 4 test stubs, waiting for implementation

**Next milestone:** Builder completing auth middleware, then Validator begins testing.
```

**After each agent completes**: Always report what it accomplished:
```
**Security** finished audit:
- Reviewed 5 files
- Found 1 MEDIUM issue (input validation in auth.ts:42)
- Sent fix request to Builder via SendMessage
- No CRITICAL or HIGH issues
```

**When all agents complete**: Provide a full summary before moving to the next phase.

### What to Report

| Event | Report |
|-------|--------|
| Agent launched | "Launched [Agent] to [task description]" |
| Agent completed | "**[Agent]** completed: [specific results with file names]" |
| Agent messaged another | "[Agent] sent [issue type] to [Agent]: [brief description]" |
| Agent idle | "[Agent] finished and is idle. [N] agents still working." |
| Agent blocked | "[Agent] is blocked on [reason]. [Taking action / asking user]" |
| **Permission needed** | **"ACTION REQUIRED: [Agent] needs approval for [action]. Blocking [downstream]. Check agent pane."** |
| **Stall detected** | **"No progress for [duration]. Likely cause: pending permission. Check agent panes."** |
| Phase transition | "Phase [N] complete. Moving to Phase [N+1]: [description]" |
| Review pass/fail | "Stage [N] [PASSED/FAILED]: [details]" |
| No activity detected | "Agents still working. [Current state summary]. [N] tasks remaining." |

### Anti-Patterns (NEVER DO THESE)

- "The team is now working autonomously. Updates will appear as teammates complete phases." **NO** - this abandons the user
- "Let me check on progress..." followed by silence. **NO** - always follow through with actual status
- Going silent for more than one polling cycle without reporting. **NO** - always report something
- "Agents are coordinating directly, no need for my intervention." **NO** - the user still needs to see what's happening
- "STATUS.md is slightly outdated. Here's the actual current status: [made-up info]" **NO** - if STATUS.md is outdated, that means agents aren't updating it. Report what STATUS.md actually says, then investigate why it's stale
- Claiming to know agent status without reading STATUS.md or receiving a SendMessage. **NO** - you have no other source of truth
- "Builder is probably working on..." or "Validator should be..." **NO** - only report confirmed status from STATUS.md or agent messages
- Agents blocked on permissions without telling the user. **NO** - permission blockers must be surfaced IMMEDIATELY, not discovered when the user asks why nothing is happening
- "These permission requests are why it looks quiet!" **NO** - you should have told the user about pending permissions the moment they appeared, not after they asked

---

## Idle Agent Recovery (Agent Teams Mode)

**CRITICAL**: In-process teammates can go idle (stop running) even when tasks remain incomplete. Messages sent to idle agents sit unread in their inbox. This is the most common cause of long stalls with no progress.

### Detection

An agent is "idle with pending work" when:
1. Agent has not updated STATUS.md or sent messages recently
2. PLAN.md still has incomplete tasks assigned to that agent
3. Agent received a TeammateIdle notification OR you received an idle notification about them

### Recovery Protocol

When you detect an idle agent with incomplete tasks:

**Step 1: Tell the user immediately**
```
**[Agent] has gone idle but still has [N] incomplete tasks.**
Spawning replacement now.
```

**Step 2: Spawn a replacement teammate**

**IMPORTANT**: In-process teammates cannot be resumed after going idle (`/resume` does not restore in-process teammates - this is a known platform limitation). You must spawn a fresh replacement:

```
Agent tool call:
  subagent_type: "agent-orch:orchestrate-[role]"
  team_name: "build-[feature-name]"
  prompt: "Previous [role] agent went idle with incomplete tasks.
           Read ${SESSION_DIR}/STATUS.md for current state.
           Read ${SESSION_DIR}/PLAN.md for incomplete tasks assigned to [role].
           Check your inbox for messages from other agents.
           Pick up where they left off. Do NOT go idle while tasks remain."
  description: "Replace idle [role]"
```

**Step 3: Report to user**
```
**[Agent] replacement spawned** and picking up remaining tasks:
- [Task 1] (incomplete)
- [Task 2] (incomplete)
```

### Prevention

To reduce idle agent issues:

1. **Agent spawn prompts must include**: "Do NOT go idle while you have incomplete tasks in PLAN.md. If blocked, use SendMessage to @lead explaining what you need."
2. **Use TeammateIdle hook**: The `check-teammate-tasks.sh` hook (see Quality Gate Hooks) returns exit code 2 to keep agents working when tasks remain.
3. **Agent prompts must include**: "After completing a task, check PLAN.md for your next task. Also check your inbox for messages. Only go idle when ALL your assigned tasks are complete."

### Stall Diagnosis Flowchart

When no progress is detected:
```
No STATUS.md updates for 2+ cycles
  │
  ├── Check: Are agents still running?
  │     ├── YES → Check for WAITING_PERMISSION in STATUS.md
  │     │          └── Surface permission blockers to user
  │     └── NO (agents idle) → Check: Are there incomplete tasks?
  │           ├── YES → Idle Agent Recovery: re-spawn agents
  │           └── NO → Phase complete, proceed to next phase
  │
  └── Tell user what you found and what action you're taking
```

**NEVER**: Assume "agents idle" means "work is done". ALWAYS cross-reference with PLAN.md.

---

## Key Principles

1. **One question at a time** - Don't overwhelm with multiple questions
2. **Validate incrementally** - Check understanding after each design section
3. **YAGNI ruthlessly** - Remove unnecessary features
4. **Verification gates** - No completion claims without evidence
5. **Two-stage review** - Spec compliance before code quality
6. **Choose right coordination mode** - Teams for complexity, subagents for simplicity
7. **Let teams self-coordinate** - Don't mediate when teammates can talk directly
8. **Always report progress** - The user cannot see agent activity; you are their only visibility
9. **Recover idle agents** - If an agent is idle but has tasks remaining, re-spawn it immediately

---

## Observability & Diagnostics

### Agent Activity Tracking

**CRITICAL**: After EACH phase, update STATUS.md with agent activity log.

### Phase Completion Checklist

After each phase, add to STATUS.md:

**Subagent Mode:**
```markdown
## Phase [N] Completion

### Agents Launched
| Agent | subagent_type | Status | Output |
|-------|---------------|--------|--------|
| Architect | agent-orch:orchestrate-architect | ✅ Completed | Updated PLAN.md |
| Builder | agent-orch:orchestrate-builder | ✅ Completed | 3 features |
| Validator | agent-orch:orchestrate-validator | ✅ Completed | 8 tests pass |
```

**Agent Team Mode:**
```markdown
## Phase [N] Completion

### Team Activity
| Teammate | Status | Messages Sent | Messages Received | Autonomous Iterations |
|----------|--------|---------------|-------------------|----------------------|
| Builder | ✅ Complete | 12 | 15 | 4 |
| Validator | ✅ Complete | 8 | 6 | 2 |
| Security | ✅ Complete | 5 | 4 | 3 |

### Coordination Efficiency
- Total direct messages: 47
- Orchestrator interventions: 3
- Autonomous iterations: 9
- Time saved: ~40% (estimated from reduced orchestrator mediation)
```

---

## Session Management

[Keep all existing session management content from original - lines 696-861]

### Agent Team Session Notes

When using agent teams, sessions include additional metadata:

**COORDINATION.md tracks:**
- Team members and roles
- Message counts between agents
- Autonomous iteration counts
- Coordination efficiency metrics

**To review team coordination:**
```bash
cat ssnc-agent-orch/2026-01-18-auth-feature/COORDINATION.md
```

**Cleanup after team sessions:**
Always use lead to clean up agent teams:
```
"Clean up the team" (only after all teammates shut down)
```

Never let teammates run cleanup - only the lead should clean up.

---

## Display Mode Recommendation

When using Agent Teams, configure split-pane display for visibility:

### Setup (one-time)

**macOS with tmux (recommended):**
```bash
brew install tmux
```

**iTerm2:**
Install the `it2` CLI and enable Python API in iTerm2 Settings.

### Configuration

Add to your settings.json:
```json
{
  "teammateMode": "tmux"
}
```

Or force in-process mode (works in any terminal):
```json
{
  "teammateMode": "in-process"
}
```

**In-process mode controls:**
- `Shift+Down` - Cycle through teammates
- `Enter` - View a teammate's session
- `Escape` - Interrupt current turn
- `Ctrl+T` - Toggle task list

### Recommendation

- **3-5 agents**: Split panes (tmux) - see all agents simultaneously
- **6+ agents**: In-process mode - less terminal clutter
- **VS Code terminal**: In-process mode only (split panes not supported)

---

## Troubleshooting

### Agent Team Specific Issues

**Problem: Teammates not spawning**
- Verify CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 is set
- Check that you explicitly requested team creation
- Try spawning teammates one at a time if parallel spawn fails

**Problem: Teammates not messaging each other**
- Check COORDINATION.md for communication protocol
- Verify teammates have correct spawn prompts with message instructions
- Try explicitly instructing: "@builder message @validator when ready"

**Problem: Too many orchestrator interventions in team mode**
- Review spawn prompts - ensure they emphasize direct messaging
- Check if teammates are waiting for orchestrator unnecessarily
- Update COORDINATION.md with clearer protocols

**Problem: Team mode slower than expected**
- May need more complex feature to see benefits
- Check complexity score - should be >=4 for teams to help
- Consider switching to subagent mode for simpler features

**Problem: Agents idle with incomplete tasks (no progress for extended period)**
- Agents have gone idle but PLAN.md still has incomplete tasks
- Messages in agent inboxes are unread because agents stopped running
- **Fix**: Use Idle Agent Recovery protocol - re-spawn agents with `resume` or fresh spawn
- **Prevention**: Ensure TeammateIdle hook is configured, agent prompts include "do not go idle with incomplete tasks"
- See [Idle Agent Recovery](#idle-agent-recovery-agent-teams-mode)

**Problem: Messages sent to agents but no response**
- Agent likely went idle after completing initial work
- In-process teammates stop polling their inbox when idle
- **Fix**: Re-spawn the agent - it will check inbox on startup
- **Do NOT** keep sending messages to an idle agent - they won't be read

### Subagent Mode Issues

[Keep existing troubleshooting from original - lines 682-693]

---

## Quality Gate Hooks (Agent Teams)

Use Claude Code hooks to enforce verification gates when using agent teams:

### TeammateIdle Hook

Runs when a teammate is about to go idle. Exit code 2 sends feedback and keeps them working:

```json
{
  "hooks": {
    "TeammateIdle": [{
      "command": "check-teammate-tasks.sh",
      "description": "Verify teammate completed all assigned tasks before going idle"
    }]
  }
}
```

### TaskCompleted Hook

Runs when a task is marked complete. Exit code 2 prevents completion:

```json
{
  "hooks": {
    "TaskCompleted": [{
      "command": "verify-task-evidence.sh",
      "description": "Ensure verification gate evidence exists before marking task complete"
    }]
  }
}
```

These hooks enforce the plugin's verification gates automatically - agents must provide evidence before claiming completion.

---

## Appendix: Coordination Mode Decision Matrix

| Feature Type | Specialists | Layers | Iterations | Score | Recommendation |
|--------------|-------------|---------|------------|-------|----------------|
| Simple bug fix | 0-1 | 1 | 1 | 1 | Subagents |
| New API endpoint | 1-2 | 1-2 | 1-2 | 3 | Subagents |
| Auth system | 3-4 | 2-3 | 2-3 | 7 | Agent Teams |
| Multi-service feature | 4+ | 3+ | 3+ | 10+ | Agent Teams |
| Database migration | 2-3 | 2 | 2-3 | 5 | Agent Teams (ask) |
| UI component | 1-2 | 1 | 1 | 2 | Subagents |
| Full-stack feature | 3-5 | 3 | 2-4 | 9 | Agent Teams |

**Key:**
- Specialists: Number of specialist agents recommended
- Layers: How many architectural layers affected (frontend, backend, database, etc.)
- Iterations: Expected review/refinement rounds
- Score: specialists + (layers > 1 ? 2 : 0) + iterations

## Extensibility

This skill is extensible via `.claude/ssnc-agent-orch/skills.yaml`. If that file is
absent, has no `skills.build:` entry, or the entry is empty, **`/build` runs exactly as
documented above — no behaviour change.** This is the default and most common case.

`/build` exposes four hook points:

| Hook point | When it runs |
|------------|--------------|
| `before_plan` | Before Phase 2 Architect analysis (inject repo standards/context) |
| `after_plan` | After PLAN.md is finalized, before Phase 3 implementation |
| `before_review` | Before Phase 4 two-stage review |
| `after_build` | After Phase 5 finalize (e.g. run `/agent-orch:simplify`) |

Example:

```yaml
skills:
  build:
    before_plan:  [docs/standards/architecture.md]
    after_build:  [/agent-orch:simplify]
```

At each hook point, read `.claude/ssnc-agent-orch/skills.yaml`; if `skills.build.<hook>`
lists targets, run them in order per `plugins/agent-orch/rules/extension-resolver.md`. Tell
the user when you run an extension target; a failing target is surfaced but does not abort
the build unless the user aborts.

The **agents** `/build` launches are independently extensible via
`.claude/ssnc-agent-orch/agents.yaml` (`before`/`replace`/`after` per agent) — each agent
honours its own entry. The **pluggable Jira workflow** note already documented in Phase 0.5
applies. Full contract: `plugins/agent-orch/rules/extensibility.md`.

