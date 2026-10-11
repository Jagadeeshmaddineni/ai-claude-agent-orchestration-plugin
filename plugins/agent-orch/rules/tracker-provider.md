# Tracker Provider Contract (backend-neutral issue tracking)

This rule defines a **normalized issue-tracker interface** so orchestration skills
(`/make`, `/build`, `/make-clean`, the work queue, the advocate, the triage agent)
can talk to an issue tracker **without hard-coding Jira**. Two backends implement
the contract today — **Jira** (via the `mcp__jira__*` MCP tools) and **GitHub
Issues** (via the `gh` CLI against `code.ssnc.dev`) — and a repo selects which one
it uses with a single `tracker:` setting.

> **Hard invariant — zero behaviour change by default.**
> When `tracker` is `jira` (the default), every skill behaves **exactly** as it
> does today: it reads `.claude/rules/jira.md` and calls `mcp__jira__*` directly.
> This contract only changes behaviour for a repo that explicitly opts into a
> different backend. A repo that has never heard of this file is unaffected.

---

## 1. Selecting the backend

The active tracker is resolved, in precedence order:

1. `.claude/ssnc-agent-orch/tracker.yaml` → `tracker.provider:` (if present), else
2. `.make-config.md` → `tracker:` line (if present), else
3. **Back-compat**: `.make-config.md` → `jira_mode:` —
   `yes`/`ask-me` ⇒ `jira`, `no` ⇒ `none`, else
4. Default: **`jira`**.

Valid values: `jira` | `github` | `none`.

- `jira` — Jira backend. Context cached in `.claude/rules/jira.md` via `/agent-orch:jira`.
- `github` — GitHub Issues backend. Context cached in `.claude/rules/github.md` via
  `/agent-orch:github-issues`.
- `none` — no tracker. Skills skip all issue-tracker steps (same as `jira_mode: no`).

A repo **swaps** trackers by changing this one value; the rest of the workflow is
identical because skills only use the normalized verbs below.

---

## 2. The normalized verbs

Skills MUST express tracker work as these verbs, then dispatch to the active
backend's mapping in §3. Skills MUST NOT call `mcp__jira__*` or `gh issue` directly
when this contract is in play — they call "the tracker" and let the mapping resolve.

| Verb | Meaning |
|------|---------|
| `current_user` | Who is running this now (assignee / attribution). **Always resolved live, never cached.** |
| `get_issue(id)` | Fetch one issue: title, body, labels, assignee(s), state |
| `list_agent_ready([filter])` | List open issues labelled `claude-code-agent-harness` (optionally `assignee = me`) |
| `list_needs_review()` | List issues labelled `human-review-required` |
| `create_issue(type, title, body, [labels])` | Create an issue |
| `comment(id, body)` | Add a comment |
| `assign(id, user)` | Assign an issue (user defaults to `current_user`) |
| `set_status(id, status)` | Move lifecycle: `in_progress` \| `in_review` \| `done` |
| `link(id, target)` | Relate issues / link a PR to an issue |
| `add_label(id, label)` / `remove_label(id, label)` | Manage labels (governance harness lives here) |
| `transition_table()` | The lifecycle map this backend uses (for display) |

### Issue ID shapes
- **Jira**: `PROJ-123` (matches `[A-Z][A-Z0-9]+-\d+`).
- **GitHub**: `#123` or `owner/repo#123` (matches `(\S+/\S+)?#\d+`).

When parsing arguments, detect the shape that matches the **active** backend.

---

## 3. Backend mappings

### 3a. Jira (`tracker: jira`) — the current behaviour, unchanged

| Verb | Implementation |
|------|----------------|
| `current_user` | `mcp__jira__jira_getCurrentUser` (live; cache once per session, never in `jira.md`) |
| `get_issue` | `mcp__jira__jira_getIssue` |
| `list_agent_ready` | `mcp__jira__jira_searchIssues` with JQL `project = KEY AND labels = claude-code-agent-harness AND status != Done [AND assignee = currentUser()]` |
| `list_needs_review` | `searchIssues` JQL `… labels = human-review-required …` |
| `create_issue` | `mcp__jira__jira_createIssue` (issue-type/priority/required-field IDs from `jira.md`) |
| `comment` | `mcp__jira__jira_postIssueComment` |
| `assign` | `mcp__jira__jira_assignIssue` |
| `set_status` | `mcp__jira__jira_transitionIssue` with transition IDs from `jira.md` / `jira-workflow.yaml` |
| `link` | `mcp__jira__jira_linkIssues` |
| `add_label`/`remove_label` | `mcp__jira__jira_updateIssue` `update.labels.add/remove` |
| `transition_table` | Statuses & Transitions table in `jira.md` |

Status keys map to the transition IDs in `.claude/rules/jira.md` (or overridden by
`.claude/ssnc-agent-orch/jira-workflow.yaml`, see extensibility §4).

### 3b. GitHub Issues (`tracker: github`) — via `gh` on `code.ssnc.dev`

All `gh` calls run with `GH_HOST=code.ssnc.dev` (the plugin already uses this in
`/make-validate`, `/make-clean`, `/release-me`). Use the **issue number only** — the
local git remote already points at the right repo; do NOT pass `--repo`.

| Verb | Implementation |
|------|----------------|
| `current_user` | The literal `@me` in `gh` flags (server-resolves the token's user). Do **NOT** call `gh api user` — the token may lack `read:user` scope. To read identity for display: `gh api user --jq .login` only if needed, else prefer `@me`. |
| `get_issue` | `gh issue view <N> --json number,title,body,labels,assignees,state,url` |
| `list_agent_ready` | `gh issue list --state open --label claude-code-agent-harness --json number,title,labels,assignees,url [--assignee @me] --limit 50` |
| `list_needs_review` | `gh issue list --state open --label human-review-required --json number,title,url` |
| `create_issue` | `gh issue create --title "…" --body "…" [--label …]` (the GitHub "type" is a label, e.g. `bug`/`enhancement`, from `github.md`) |
| `comment` | `gh issue comment <N> --body "…"` |
| `assign` | `gh issue edit <N> --add-assignee @me` (or a login) |
| `set_status` | **Per `status_model`** — see §4. Default `labels`: add the mapped status label (and remove the prior one); `done` closes via `gh issue close <N>`. |
| `link` | Put `Closes #<N>` in the PR body (GitHub auto-closes on merge); to relate without closing, `gh issue comment` with a `#<N>` reference. |
| `add_label`/`remove_label` | `gh issue edit <N> --add-label <L>` / `--remove-label <L>` |
| `transition_table` | The `statuses:` map in `github.md` / `github-workflow.yaml` |

> **GitHub Enterprise host**: every `gh`/`git` operation uses `GH_HOST=code.ssnc.dev`
> and `GH_ENTERPRISE_TOKEN`/`GH_TOKEN` as already configured for this repo. When
> citing blob URLs, the base is `https://code.ssnc.dev/`, not github.com.

---

## 4. GitHub status model (the one real impedance mismatch)

Jira has rich transitions; GitHub Issues has only **open/closed** plus labels and
(optionally) **Projects v2** status fields. The mapping is declared per repo in
`.claude/ssnc-agent-orch/github-workflow.yaml` (schema: `examples/ssnc-agent-orch/github-workflow.yaml`):

```yaml
github:
  enabled: true
  status_model: labels            # labels | project   (default: labels)
  statuses:                       # labels mode: lifecycle key → label (or `close`)
    in_progress: "status:in-progress"
    in_review:   "status:in-review"
    done:        close            # `close` ⇒ gh issue close
  # project mode (opt-in): drive a Projects v2 single-select Status field
  # project:
  #   number: 7
  #   field:  "Status"
  #   in_progress: "In Progress"
  #   in_review:   "In Review"
  #   done:        "Done"
```

- **`labels` (default)** — works on any repo, no Projects setup. `set_status(id, X)`
  adds `statuses[X]` and removes the other status labels; `done: close` closes the
  issue. If `github-workflow.yaml` is absent, the defaults shown above are used and
  the status labels are auto-created on first use (`gh label create` if missing).
- **`project`** — `set_status` sets the Projects v2 single-select field via
  `gh project item-edit` / GraphQL. Requires a project-scoped token. Only used when
  `status_model: project` is set.

If `enabled: false`, the GitHub backend is skipped entirely (same as `tracker: none`).

---

## 5. Governance harness (identical across backends)

The human-on-the-loop model is **label-based and backend-neutral**:

- `claude-code-agent-harness` — issue is agent-ready (appears in the work queue).
- `human-review-required` — a human must approve before agent work begins.

Both Jira and GitHub support labels natively, so `/agent-orch:jira-work` and
`/agent-orch:github-issues work` apply the **same** rules — only the underlying verb
mapping differs. The triage agent (`orchestrate-jira-triage`) classifies issues by
adding these labels via `add_label`, regardless of backend.

---

## 6. Resolution algorithm (for skills)

```
1. provider = resolve tracker per §1.
2. If provider == none → skip all tracker steps.
3. If provider == jira:
     - require .claude/rules/jira.md (else tell user to run /agent-orch:jira)
     - use §3a mappings; honour jira-workflow.yaml overrides (extensibility §4).
4. If provider == github:
     - require .claude/rules/github.md (else tell user to run /agent-orch:github-issues)
     - verify gh is authenticated for code.ssnc.dev (gh auth status)
     - use §3b mappings; honour github-workflow.yaml for status model.
5. current_user is ALWAYS resolved live (§2), never read from a cached rules file.
```

Everything not covered here (PR creation, branch naming, build/validate gates) is
**tracker-independent** and unchanged.
