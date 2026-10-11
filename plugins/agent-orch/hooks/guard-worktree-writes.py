#!/usr/bin/env python3
"""PreToolUse guard: hard-block writes into the PRIMARY repo tree while a
worktree-mode /make session is active.

This is the mechanical enforcement layer behind
plugins/agent-orch/rules/worktree-context.md.

Why this exists:
  The worktree/branch "anchor" was previously instruction-only. Prose in
  SKILL.md asked agents to stay inside their worktree, and /make claimed an
  exported $MAKE_SESSION_FILE made the anchor "sticky". Neither is
  enforceable: `export` in an ephemeral Bash tool call does not persist onto
  the Claude process, and a prompt instruction is something a model can simply
  ignore by writing to an absolute path that resolves into the sibling primary
  checkout. The result was agents creating files in the main tree instead of
  the worktree. A PreToolUse hook returning exit 2 is the only thing an agent
  cannot ignore.

Contract:
  - No-op (exit 0) when there is no active worktree-mode session.
  - No-op for branch-mode sessions (in-place edits are legitimate there).
  - No-op for writes OUTSIDE the primary repo entirely (../, /tmp, $HOME) —
    /release-me and /work-recap legitimately write to the parent dir.
  - No-op for writes under <primary>/.claude/ and <primary>/.git/.
  - BLOCK (exit 2) when the write lands inside the primary repo tree but
    outside the active worktree path.

Fails OPEN on any internal error so it can never wedge a host.
Exit codes: 0 = allow, 2 = block (stderr feedback is surfaced to the agent).
"""

import json
import os
import re
import subprocess
import sys


def fail_open():
    sys.exit(0)


def canon(path, base):
    if not path:
        return None
    path = os.path.expanduser(path)
    if not os.path.isabs(path):
        path = os.path.join(base, path)
    if os.path.exists(path):
        return os.path.normpath(os.path.realpath(path))
    return os.path.normpath(os.path.abspath(path))


def is_inside(child, parent):
    try:
        return os.path.commonpath([child, parent]) == parent
    except ValueError:
        return False


def collect_targets(tool, tool_input):
    targets = []
    if tool in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
        fp = tool_input.get("file_path") or tool_input.get("notebook_path")
        if fp:
            targets.append(fp)
    elif tool == "Bash":
        cmd = tool_input.get("command") or ""
        # Best-effort: catch the common file-creating Bash idioms. The dominant
        # drift vector is Write/Edit; Bash is a secondary net.
        for m in re.finditer(r">>?\s*([^\s|&;<>]+)", cmd):  # > file / >> file
            tok = m.group(1)
            if tok and not tok.isdigit():
                targets.append(tok)
        for m in re.finditer(r"\btee\b\s+((?:-[a-zA-Z]+\s+)*)([^\s|&;]+)", cmd):
            targets.append(m.group(2))
        for m in re.finditer(r"\bmkdir\b\s+((?:-[a-zA-Z]+\s+)*)([^\s|&;]+)", cmd):
            targets.append(m.group(2))
        for m in re.finditer(r"\btouch\b\s+((?:-[a-zA-Z]+\s+)*)([^\s|&;]+)", cmd):
            targets.append(m.group(2))
    return targets


def git_worktrees(cwd):
    try:
        out = subprocess.run(
            ["git", "-C", cwd, "worktree", "list", "--porcelain"],
            capture_output=True, text=True, timeout=10,
        )
    except Exception:
        return None
    if out.returncode != 0:
        return None
    worktrees = []
    for line in out.stdout.splitlines():
        if line.startswith("worktree "):
            worktrees.append(os.path.normpath(line[len("worktree "):].strip()))
    return worktrees or None


def active_worktree_sessions(primary_root, worktrees):
    session_dir = os.path.join(primary_root, ".claude")
    paths = []
    try:
        names = os.listdir(session_dir)
    except FileNotFoundError:
        return paths
    for name in names:
        if not (name.startswith(".make-session") and name.endswith(".json")):
            continue
        try:
            with open(os.path.join(session_dir, name)) as fh:
                sess = json.load(fh)
        except Exception:
            continue
        if sess.get("mode") != "worktree":
            continue
        wt = sess.get("worktree_path")
        if not wt:
            continue
        wt = os.path.normpath(wt)
        if wt in worktrees and wt != primary_root:
            paths.append(wt)
    return paths


def choose_anchor(cwd, active_paths):
    env_session = os.environ.get("MAKE_SESSION_FILE")
    if env_session and os.path.isfile(env_session):
        try:
            with open(env_session) as fh:
                s = json.load(fh)
            if s.get("mode") == "worktree" and s.get("worktree_path"):
                wt = os.path.normpath(s["worktree_path"])
                if wt in active_paths:
                    return wt
        except Exception:
            pass
    for wt in active_paths:
        if cwd == wt or is_inside(cwd, wt):
            return wt
    if len(active_paths) == 1:
        return active_paths[0]
    return None


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        fail_open()

    tool = data.get("tool_name") or ""
    tool_input = data.get("tool_input") or {}
    cwd = data.get("cwd") or os.getcwd()

    if tool not in ("Write", "Edit", "MultiEdit", "NotebookEdit", "Bash"):
        fail_open()

    targets = collect_targets(tool, tool_input)
    if not targets:
        fail_open()

    worktrees = git_worktrees(cwd)
    if not worktrees:
        fail_open()

    primary_root = worktrees[0]  # first porcelain entry is always the primary
    active_paths = active_worktree_sessions(primary_root, worktrees)
    if not active_paths:
        fail_open()  # no worktree-mode session active -> nothing to enforce

    anchor = choose_anchor(cwd, active_paths)
    if anchor is None:
        # Multiple sessions and this agent is not inside any of them. We cannot
        # safely tell which Claude this is, so warn rather than risk a false
        # positive across parallel /make runs.
        sys.stderr.write(
            "[worktree-guard] Multiple worktree sessions active and this "
            "agent cwd is not inside any of them; skipping hard block to avoid "
            "a false positive. Verify you are writing into the right worktree.\n"
        )
        fail_open()

    allow_prefixes = [
        os.path.join(primary_root, ".claude"),
        os.path.join(primary_root, ".git"),
    ]

    for raw in targets:
        tgt = canon(raw, cwd)
        if tgt is None:
            continue
        # Outside the primary repo entirely -> legitimate external write.
        if not (tgt == primary_root or is_inside(tgt, primary_root)):
            continue
        # Inside the anchor worktree -> allowed.
        if tgt == anchor or is_inside(tgt, anchor):
            continue
        # Inside a sibling active worktree -> allowed.
        if any(tgt == wt or is_inside(tgt, wt) for wt in active_paths):
            continue
        # Under primary .claude/ or .git/ -> allowed (bookkeeping).
        if any(tgt == pre or is_inside(tgt, pre) for pre in allow_prefixes):
            continue

        # Drift: inside the primary tree but outside the worktree. Block.
        rel = os.path.relpath(tgt, primary_root)
        wt_rel = os.path.relpath(anchor, primary_root)
        sys.stderr.write(
            "[worktree-guard] BLOCKED: write to the primary repo tree while a "
            "worktree session is active.\n\n"
            "  tool:          {tool}\n"
            "  target:        {tgt}\n"
            "  primary repo:  {primary}\n"
            "  your worktree: {anchor}\n\n"
            "This write targets the PRIMARY checkout, not your worktree.\n"
            "Rewrite the path so it lands inside your worktree, e.g.:\n"
            "  {anchor}/{rel}\n\n"
            "(worktree-relative: {wt_rel}/{rel})\n\n"
            "If you genuinely must write outside the worktree, use an explicit "
            "path OUTSIDE the primary repo (../ or /tmp). See "
            "plugins/agent-orch/rules/worktree-context.md.\n".format(
                tool=tool, tgt=tgt, primary=primary_root, anchor=anchor,
                rel=rel, wt_rel=wt_rel,
            )
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        # Never wedge a host on an unexpected error.
        sys.exit(0)
