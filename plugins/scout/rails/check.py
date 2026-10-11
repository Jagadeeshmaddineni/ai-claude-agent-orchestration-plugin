#!/usr/bin/env python3
"""Scout rails engine — reference checker.

A small, dependency-light reference implementation of the ordered decision
algorithm specified in RAILS.md, plus a test harness that runs the trap-case
fixtures under tests/ and asserts each produces its expected decision.

This is a REFERENCE implementation for verifying the contract, not the production
engine. It is deliberately faithful to RAILS.md so the fixtures document an
unambiguous, executable contract that a future slice can wire into any surface.

Run:  python check.py            # runs all fixtures under tests/, prints PASS/FAIL
      python check.py -v         # also prints each emitted DecisionRecord

Requires: pyyaml.
"""
from __future__ import annotations

import glob
import os
import re
import sys

import yaml

# ---------------------------------------------------------------------------
# Tier rights (RAILS.md §5 schema defaults). A repo's role_map binds these to
# real roles; the engine enforces these rights regardless of role names.
# ---------------------------------------------------------------------------
TIERS = ("developer", "support", "business", "admin")
CAN_CONFIRM_NEEDS_APPROVAL = {"developer", "admin"}

CONFIDENCE_RANK = {"unknown": 0, "likely": 1, "confirmed": 2}
# §6.2 — liveness labels a step's produced_output can carry. `data` = the
# capability returned usable rows/spans/log lines; `empty`/`no-op` = it came back
# with no usable evidence (empty result set, a no-op/absent telemetry source);
# `unknown` = not determinable. The liveness guardrail only ever DOWNGRADES
# confidence (never fabricates/upgrades). An empty/no-op load-bearing step caps a
# conclusion at "likely — verify"; `unknown` alone does NOT downgrade (don't over-fire).
LIVENESS_LABELS = {"data", "empty", "no-op", "unknown"}
_LIVENESS_DOWNGRADES = {"empty", "no-op"}
EXECUTABLE_KINDS = {"api-read", "query", "diagnostic-query", "shell-read",
                    "skill-call", "time-travel"}
# Query-family kinds that resolve to a `kind: query` manifest capability and are
# subject to the free-form safety check (Gate A.1).
QUERY_KINDS = {"query", "diagnostic-query"}


def _record(step, kind, tier, outcome, gate, reason,
            capability=None, redactions=None, confirm_by=None, resolved_env=None,
            resolved_from=None, liveness=None):
    rec = {
        "step_id": step.get("id"),
        "kind": kind,
        "caller_tier": tier,
        "outcome": outcome,
        "gate": gate,
        "reason": reason,
        "capability": capability,
        "resolved_env": resolved_env,   # G2: environment the capability bound to
        # v0.4 §4: which manifest section the capability resolved from
        # (capabilities | investigation_toolbox). Code-controlled label, never a
        # secret; lets an audit distinguish a toolbox-resolved cap from a declared one.
        "resolved_from": resolved_from,
        # v0.4 §6.2: liveness label of this step's produced_output (data|empty|
        # no-op|unknown), a code-controlled enum the confidence gate keys on.
        "liveness": liveness,
        "redactions": redactions or [],
    }
    if confirm_by is not None:
        rec["requires_confirmation_by"] = confirm_by
    return rec


def _resolved_env(cap):
    """G2 — the environment a capability binds to, for the DecisionRecord.

    Reads the manifest capability's environment marker: an explicit `env` string
    if present, else `production: true` -> "production", else "non-production".
    Returns None when there is no bound capability (nothing resolved)."""
    if cap is None:
        return None
    env = cap.get("env")
    if isinstance(env, str) and env:
        return env
    if cap.get("production") is True:
        return "production"
    return "non-production"


def _manifest_capability(manifest, name):
    """Gate B resolution (RAILS.md §4) — resolve a capability name against the
    UNION of `capabilities[]` and `investigation_toolbox[]`, capabilities-FIRST.

    v0.4: a `request.capability` resolves against `capabilities[] ∪
    investigation_toolbox[]`. `capabilities[]` is scanned first, so a name present
    in both wins from `capabilities[]` (declared beats ambient on collision). A
    toolbox tool resolves EXACTLY like a declared capability — same kind check,
    same Gate A.1 free-form check, same audience gate, same resolved_env. An
    unmapped name (in neither list) returns (None, None) and the step is `inert`.

    Backward compat: a manifest with no `investigation_toolbox` key behaves
    identically to v0.3 (`.get("investigation_toolbox") or []` -> empty scan).

    Returns (cap_dict, source) where source is "capabilities" or
    "investigation_toolbox", or (None, None) when unmapped.
    """
    for cap in manifest.get("capabilities") or []:
        if cap.get("name") == name:
            return cap, "capabilities"
    for cap in manifest.get("investigation_toolbox") or []:
        if cap.get("name") == name:
            return cap, "investigation_toolbox"
    return None, None


def _manifest_skill(manifest, name):
    for sk in manifest.get("skills") or []:
        if sk.get("name") == name:
            return sk
    return None


def _looks_free_form(step, cap):
    """Gate A.1 — is a MAPPED query's bound endpoint free-form (vs. a named proc)?

    G9: this runs ONLY after Gate B has already resolved `cap` from the manifest
    (an unmapped query is `inert`, never reaches here). So `cap` is a bound
    `kind: query` capability; the question is purely whether its binding looks
    like free-form SQL / a raw connection rather than an allowlisted proc.
    """
    req = step.get("request") or {}
    # Inline query text on the step is free-form by definition, even when mapped.
    if any(k in req for k in ("sql", "query", "query_text", "statement")):
        return True
    endpoint = str(cap.get("endpoint") or "")
    if not endpoint:
        # A bound query capability with no named endpoint cannot be proven to be
        # an allowlisted proc -> unsafe.
        return True
    free_markers = ("select ", "insert ", "update ", "delete ", "free-form",
                    "raw connection", "${", "connection string")
    low = endpoint.lower()
    if any(m in low for m in free_markers):
        return True
    return False


def decide(playbook, manifest, caller_tier, step, produced_output=None):
    """Return a DecisionRecord dict per RAILS.md §1 ordered gates.

    G9 gate ordering: for query-family kinds, capability resolution (Gate B) runs
    BEFORE the free-form safety check (Gate A.1), so an UNMAPPED query is `inert`
    (portable playbook degrades gracefully) and only a MAPPED-but-free-form query
    is `reject`. An explicit `safety: forbidden` still hard-rejects at Gate A.0
    regardless of mapping.
    """
    kind = step.get("kind")
    tier = caller_tier
    # §6.2 — liveness label the runner attaches to produced_output (data|empty|
    # no-op|unknown). Captured on the record so the confidence gate (Gate D) can
    # correlate a conclusion's from_steps. Absent -> None (v0.3-identical: no
    # downgrade from this rule). Only the code-controlled label is retained.
    liveness = None
    if isinstance(produced_output, dict):
        lv = produced_output.get("liveness")
        if lv in LIVENESS_LABELS:
            liveness = lv

    # note steps: non-executable commentary, always allowed, no gates.
    if kind == "note":
        return _record(step, kind, tier, "allow", None, "note (non-executable commentary)")

    safety = step.get("safety")

    # ---- Gate A.0: explicit forbidden is an unconditional hard reject ---
    # An author who explicitly tags a step `forbidden` rejects it regardless of
    # mapping (even before capability resolution) — a forbidden action must never
    # be silently downgraded to inert.
    if safety == "forbidden":
        return _record(step, kind, tier, "reject", "A-safety",
                       "step classified forbidden — hard reject")

    # ---- Gate B: Capability resolution (inert, never error) -------------
    # G9: resolve FIRST so an unmapped capability/skill is `inert` before any
    # safety heuristic can fail-closed to `reject`.
    resolved_env = None
    resolved_from = None
    if kind in ("api-read", "query", "diagnostic-query", "shell-read", "time-travel"):
        name = (step.get("request") or {}).get("capability")
        cap, resolved_from = _manifest_capability(manifest, name)
        if cap is None:
            return _record(step, kind, tier, "inert", "B-capability",
                           f"capability '{name}' not bound in this repo's manifest",
                           capability=None, liveness=liveness)
        # time-travel wraps api-read/query; accept either bound kind. A
        # diagnostic-query resolves to a `kind: query` capability (same binding).
        if kind == "time-travel":
            pass  # accept whatever the wrapped capability's kind is
        elif kind == "diagnostic-query":
            if cap.get("kind") != "query":
                return _record(step, kind, tier, "inert", "B-capability",
                               f"capability '{name}' kind mismatch (want query, got {cap.get('kind')})",
                               capability=name, resolved_from=resolved_from, liveness=liveness)
        elif cap.get("kind") != kind:
            return _record(step, kind, tier, "inert", "B-capability",
                           f"capability '{name}' kind mismatch (want {kind}, got {cap.get('kind')})",
                           capability=name, resolved_from=resolved_from, liveness=liveness)
        resolved_cap = name
        resolved_env = _resolved_env(cap)
    elif kind == "skill-call":
        name = (step.get("request") or {}).get("skill")
        if _manifest_skill(manifest, name) is None:
            return _record(step, kind, tier, "inert", "B-capability",
                           f"skill '{name}' not available in this repo",
                           capability=None, liveness=liveness)
        resolved_cap = name
        cap = None
    else:
        resolved_cap = None  # guided-human
        cap = None

    # ---- Gate A.1: mapped-but-free-form query is forbidden --------------
    # Only reachable for a MAPPED query-family step (Gate B resolved it above).
    if kind in QUERY_KINDS and _looks_free_form(step, cap):
        return _record(step, kind, tier, "reject", "A-safety",
                       "forbidden: mapped query binding is free-form (not an allowlisted proc)",
                       capability=resolved_cap, resolved_env=resolved_env,
                       resolved_from=resolved_from, liveness=liveness)

    # ---- Gate A.2: authored needs-approval blocks pending confirmation --
    if safety == "needs-approval":
        return _record(step, kind, tier, "needs-approval", "A-safety",
                       "sensitive step blocked pending confirmation; dry-run preview first",
                       capability=resolved_cap, resolved_env=resolved_env,
                       resolved_from=resolved_from, liveness=liveness,
                       confirm_by=sorted(CAN_CONFIRM_NEEDS_APPROVAL))

    # ---- Gate C: Audience / tier ---------------------------------------
    step_aud = step.get("audience") or []
    pb_aud = playbook.get("audience") or []
    if not set(step_aud).issubset(set(pb_aud)):
        return _record(step, kind, tier, "reject", "C-audience",
                       "step audience widens playbook audience",
                       capability=resolved_cap, resolved_env=resolved_env,
                       resolved_from=resolved_from, liveness=liveness)
    if tier not in step_aud:
        return _record(step, kind, tier, "reject", "C-audience",
                       f"tier '{tier}' not in step audience {step_aud}",
                       capability=resolved_cap, resolved_env=resolved_env,
                       resolved_from=resolved_from, liveness=liveness)

    # ---- Gate E: Secret handling (asserted) + Gate F: Redaction ---------
    redactions = _redact(playbook, tier, step, produced_output)
    if any(r["action"] == "blocked" for r in redactions):
        return _record(step, kind, tier, "reject", "F-redaction",
                       "output contained a never_return/secret value — blocked",
                       capability=resolved_cap, resolved_env=resolved_env,
                       resolved_from=resolved_from, liveness=liveness,
                       redactions=redactions)

    return _record(step, kind, tier, "allow", None, "passed all gates",
                   capability=resolved_cap, resolved_env=resolved_env,
                   resolved_from=resolved_from, liveness=liveness,
                   redactions=redactions)


def _liveness_downgrade(conclusion, step_records):
    """§6.2 — DB/telemetry-liveness guardrail (feeds Gate D). Mirrors §6.1.

    A conclusion whose `from_steps` includes a load-bearing step that came back
    `empty` or `no-op` CANNOT be presented above `likely — verify`. Returns the
    step_id of the first such step, or None if no downgrade applies.

    SAFE by construction: this ONLY ever downgrades (empty/no-op caps confidence
    at likely-verify); it never fabricates or upgrades. `unknown` liveness does
    NOT trigger a downgrade on this rule alone (don't over-fire). Absent liveness
    on a step (v0.3 produced_output) is treated as unknown -> no downgrade. It
    reuses the same from_steps + per-step DecisionRecord plumbing as §6.1.
    """
    if not step_records:
        return None
    for sid in conclusion.get("from_steps") or []:
        rec = step_records.get(sid)
        if rec and rec.get("liveness") in _LIVENESS_DOWNGRADES:
            return sid
    return None


def decide_conclusion(playbook, caller_tier, conclusion, presented_confidence=None,
                      step_records=None):
    """Gate D — confidence gate for a conclusion presentation (RAILS.md §6).

    `step_records` (optional): a map of step_id -> that step's DecisionRecord,
    used by the §6.2 liveness guardrail to correlate `conclusions[].from_steps`
    with the liveness of the evidence steps. Absent -> §6.2 does not fire
    (v0.3-identical behavior).
    """
    tier = caller_tier
    aud = conclusion.get("audience") or playbook.get("audience") or []
    if tier not in aud:
        return _record(conclusion, "conclusion", tier, "reject", "C-audience",
                       f"tier '{tier}' not in conclusion audience {aud}")
    authored = conclusion.get("confidence")
    presented = presented_confidence or authored
    if tier == "business" and CONFIDENCE_RANK.get(presented, 0) > CONFIDENCE_RANK.get(authored, 0):
        return _record(conclusion, "conclusion", tier, "reject", "D-confidence",
                       "confidence upgrade forbidden for business tier "
                       f"(authored {authored}, attempted {presented})")

    # §6.2 liveness guardrail — downgrade-only. If a load-bearing from_steps step
    # came back empty/no-op, the conclusion cannot present above likely-verify.
    effective = presented
    dead_step = _liveness_downgrade(conclusion, step_records)
    if dead_step is not None and CONFIDENCE_RANK.get(effective, 0) > CONFIDENCE_RANK.get("likely", 0):
        return _record(conclusion, "conclusion", tier, "allow", "D-confidence",
                       "liveness guardrail (§6.2): load-bearing step returned "
                       "empty/no-op — downgraded to 'likely — verify' "
                       f"(was '{effective}')",
                       liveness="empty-or-no-op")

    return _record(conclusion, "conclusion", tier, "allow", None,
                   f"rendered at authored confidence '{authored}'")


# ---------------------------------------------------------------------------
# G10 — robust redaction matching + built-in credential patterns.
# ---------------------------------------------------------------------------

# Credential KEY tokens. A value is a credential when a key from this set appears
# either as a field name (`password: ...`) or as a `key=value` inside the value
# (`...user=svc;password=...`). Matching is token-boundary aware (see _tokens),
# so singular/plural/casing/punctuation drift does not defeat it.
# Canonical (stemmed) credential key tokens — compared against _tokens(field),
# which stems + collapses, so include only forms _tokens can produce.
_CRED_KEY_TOKENS = {
    "password", "passwd", "pwd", "token", "secret", "apikey",
    "dsn", "credential", "connectionstring", "connstr",
    "privatekey", "accesskey", "secretkey", "authtoken", "bearer",
}
# Canonicalize collapsed multi-word spellings that simple plural-stemming can't
# reach on its own, so "connection strings", "connection string" and
# "connectionString" all fold to one token before matching (INV-6 hardening).
_TOKEN_ALIASES = {
    "connectionstrings": "connectionstring",
    "connstrings": "connstr",
}

# key=value credential shape:  password=..., api_key: ..., token = ...
_KV_CRED_RE = re.compile(
    r"(?i)\b(pass(?:word|wd)?|pwd|token|secret|api[_-]?key|dsn|access[_-]?key|"
    r"secret[_-]?key|auth[_-]?token|bearer)\b\s*[:=]\s*\S+"
)
# connection-string shapes:  scheme://user:pass@host   or   ...password=...;...
_CONNSTR_URL_RE = re.compile(r"[a-z][a-z0-9+.\-]*://[^\s:@/]+:[^\s@/]+@[^\s/]+", re.I)


def _stem(tok):
    """Normalize one token: apply an alias, then fold a trailing plural 's'."""
    t = _TOKEN_ALIASES.get(tok, tok)
    if t.endswith("s") and len(t) > 3:
        t = _TOKEN_ALIASES.get(t[:-1], t[:-1])
    return t


def _tokens(text):
    """Stemmed, lower-case word tokens (non-alphanumerics are boundaries), PLUS a
    collapsed stemmed form of the whole string. This makes matching boundary-aware
    and resistant to casing / pluralization / punctuation drift (G10): e.g.
    "connection strings", "connection string", "connectionString" and
    "connection_strings" all reduce to the same collapsed token."""
    raw = re.split(r"[^a-z0-9]+", str(text).lower())
    out = {_stem(t) for t in raw if t}
    # collapsed form: stem each word then join, so a multi-word phrase like
    # "connection strings" -> "connectionstring" matches a "connectionString" field.
    collapsed = "".join(_stem(t) for t in raw if t)
    if collapsed:
        out.add(_TOKEN_ALIASES.get(collapsed, collapsed))
    return out


def _term_matches(term, field, value):
    """True if a never_return TERM matches a field name or value using
    token-boundary matching (not naive substring). A multi-word term matches when
    its collapsed stemmed form is present, or when every stemmed word token is
    present, in the field's OR the value's token set."""
    raw = [t for t in re.split(r"[^a-z0-9]+", str(term).lower()) if t]
    if not raw:
        return False
    word_tokens = {_stem(t) for t in raw}
    collapsed = _TOKEN_ALIASES.get("".join(_stem(t) for t in raw),
                                   "".join(_stem(t) for t in raw))
    field_tokens = _tokens(field)
    value_tokens = _tokens(value) if isinstance(value, str) else set()
    for pool in (field_tokens, value_tokens):
        if collapsed in pool:
            return True
        if word_tokens.issubset(pool):
            return True
    return False


def _looks_like_credential(field, value):
    """G10 built-in patterns — True if this field/value looks like a credential
    regardless of the author's never_return wording."""
    # 1) field name is a credential key token
    if _tokens(field) & _CRED_KEY_TOKENS:
        return True
    if not isinstance(value, str):
        return False
    # 2) connection-string URL shape (scheme://user:pass@host)
    if _CONNSTR_URL_RE.search(value):
        return True
    # 3) key=value credential shape inside the value
    if _KV_CRED_RE.search(value):
        return True
    return False


def _redact(playbook, tier, step, produced_output):
    """Gate F — return the list of redaction actions (RAILS.md §7). Never
    returns the sensitive value itself, only its name + action.

    G10: never_return matching is token-boundary aware (singular/plural/casing/
    punctuation cannot defeat it); the structured {field_path} form blocks an
    exact output path; and built-in credential patterns (honoring
    redaction.builtins, default on) block credential-shaped values even when the
    author's never_return list is empty or mis-worded."""
    red = playbook.get("redaction") or {}
    actions = []
    if produced_output is None:
        return actions
    out = produced_output if isinstance(produced_output, dict) else {}
    blocked_fields = set()

    def _block(field, why):
        if field in blocked_fields:
            return
        blocked_fields.add(field)
        actions.append({"field": field, "action": "blocked",
                        "strategy": None, "why": why})

    # Secret elision (§3): any value equal to an env value referenced by the step
    # is an implicit never_return. Fixtures pass env values under _test_env_values
    # for testing; the real engine holds them transiently and never surfaces them.
    env_vals = (step.get("_test_env_values") or {})
    for field, val in list(out.items()):
        for _env_name, env_val in env_vals.items():
            if env_val and env_val == val:
                _block(field, "secret-elided")

    # never_return — string terms (token-boundary) and {field_path} structured form.
    for nr in red.get("never_return") or []:
        if isinstance(nr, dict):
            fp = nr.get("field_path")
            if fp:
                # Deterministic: block the exact dotted output path if present.
                if _field_path_present(out, fp):
                    _block(fp, "never_return")
            continue
        # string term: token-boundary match against field names AND values.
        for field, val in out.items():
            if _term_matches(nr, field, val):
                _block(field, "never_return")

    # Built-in credential patterns (G10). Default on; author sets builtins: off
    # to permit a value a built-in would otherwise catch. Note: unquoted YAML
    # `off`/`on` parse as booleans False/True, so normalize both spellings.
    if _builtins_enabled(red.get("builtins", "on")):
        for field, val in out.items():
            if field in blocked_fields:
                continue
            if _looks_like_credential(field, val):
                _block(field, "builtin-credential")

    # mask (only fields not already blocked)
    for m in red.get("mask") or []:
        f = m.get("field")
        if f in out and f not in blocked_fields:
            actions.append({"field": f, "action": "masked",
                            "strategy": m.get("strategy"), "why": "mask-rule"})

    return actions


def _builtins_enabled(val):
    """G10 — is redaction.builtins on? Default on. Accepts `on`/`off` strings and
    the booleans YAML coerces unquoted on/off into (True/False). Only an explicit
    off/false disables the built-in credential layer (fail-safe: default on)."""
    if val is False:
        return False
    if isinstance(val, str) and val.strip().lower() in ("off", "false", "no", "0"):
        return False
    return True


def _field_path_present(out, dotted):
    """True if a dotted path (a.b.c) resolves to a present value in the output."""
    cur = out
    for part in str(dotted).split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return False
    return True


# ---------------------------------------------------------------------------
# Test harness
# ---------------------------------------------------------------------------
def _run_fixture(path):
    with open(path) as fh:
        fx = yaml.safe_load(fh)
    playbook = fx["playbook"]
    manifest = fx["manifest"]
    tier = fx["caller_tier"]
    expected = fx["expected"]

    if "conclusion" in fx:
        # A conclusion fixture may carry `step_records`: a map of step_id -> that
        # step's DecisionRecord, so the §6.2 liveness guardrail can correlate the
        # conclusion's from_steps. Only code-controlled labels (liveness /
        # resolved_env) are read from it; it is optional (absent -> §6.2 no-op).
        rec = decide_conclusion(playbook, tier, fx["conclusion"],
                                fx.get("presented_confidence"),
                                fx.get("step_records"))
    else:
        rec = decide(playbook, manifest, tier, fx["step"], fx.get("produced_output"))

    # Diagnostics are built from FIXED, code-controlled labels only — never from
    # fixture-supplied strings (which may be secret-shaped). This keeps the harness
    # itself faithful to Scout's own rule: never emit sensitive data to a log/stdout.
    problems = []
    if rec["outcome"] != expected["outcome"]:
        problems.append("outcome mismatch (see fixture 'expected.outcome')")
    if "gate" in expected and rec["gate"] != expected["gate"]:
        problems.append("gate mismatch (see fixture 'expected.gate')")
    # resolved_env is a code-controlled label (production|non-production|<env>),
    # never fixture-derived secret data, so it is safe to compare + report.
    if "resolved_env" in expected and rec.get("resolved_env") != expected["resolved_env"]:
        problems.append("resolved_env mismatch (see fixture 'expected.resolved_env')")
    # resolved_from (v0.4 §4) and liveness (v0.4 §6.2) are code-controlled labels
    # (capabilities|investigation_toolbox / data|empty|no-op|unknown|empty-or-no-op),
    # never fixture-derived secret data, so they are safe to compare + report.
    if "resolved_from" in expected and rec.get("resolved_from") != expected["resolved_from"]:
        problems.append("resolved_from mismatch (see fixture 'expected.resolved_from')")
    if "liveness" in expected and rec.get("liveness") != expected["liveness"]:
        problems.append("liveness mismatch (see fixture 'expected.liveness')")
    # Assert no secret / never_return value leaked into the record itself. The
    # marker VALUE is never echoed — only its index — so a failing assertion cannot
    # itself leak the secret it is guarding against.
    secret_markers = fx.get("must_not_appear_in_record") or []
    flat = yaml.safe_dump(rec)
    for i, marker in enumerate(secret_markers):
        if marker in flat:
            problems.append(f"LEAK: must_not_appear marker #{i} appeared in the DecisionRecord")
    return rec, problems


def main(argv):
    verbose = "-v" in argv
    here = os.path.dirname(os.path.abspath(__file__))
    fixtures = sorted(glob.glob(os.path.join(here, "tests", "*.yaml")))
    if not fixtures:
        print("no fixtures found under tests/")
        return 1
    failures = 0
    for path in fixtures:
        name = os.path.basename(path)
        try:
            rec, problems = _run_fixture(path)
        except Exception as exc:  # noqa: BLE001
            # Print only the exception TYPE, never its message/args — a fixture-derived
            # exception string could carry secret-shaped data.
            print(f"ERROR {name}: {type(exc).__name__} (run with a debugger for detail)")
            failures += 1
            continue
        if problems:
            failures += 1
            print(f"FAIL  {name}")
            for p in problems:
                print(f"        - {p}")
        else:
            # outcome/gate are code-controlled enums from RAILS.md, not fixture free-text.
            print(f"PASS  {name}  -> {rec['outcome']} ({rec['gate']})")
        if verbose:
            # Emit a redaction-safe VIEW of the record: structural, code-controlled
            # fields only (never `reason`, which can quote a resolved name, nor any
            # nested value). This mirrors Scout's own rule — the harness never prints
            # anything derived from fixture data that could be secret-shaped.
            safe_view = {
                "step_id": rec.get("step_id"),
                "kind": rec.get("kind"),
                "caller_tier": rec.get("caller_tier"),
                "outcome": rec.get("outcome"),
                "gate": rec.get("gate"),
                "resolved_env": rec.get("resolved_env"),
                "resolved_from": rec.get("resolved_from"),
                "liveness": rec.get("liveness"),
                "redaction_actions": [
                    {"action": r.get("action"), "why": r.get("why")}
                    for r in (rec.get("redactions") or [])
                ],
            }
            print("        record:", safe_view)
    print()
    total = len(fixtures)
    print(f"{total - failures}/{total} fixtures passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
