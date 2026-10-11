# Agentic Engineering Principles

[< Back to Documentation Index](README.md) | [< Back to README](../README.md)

---

A set of **tool-agnostic first principles** for engineering with AI agents inside a governed
software development lifecycle. You do not need this plugin to apply them. They are written for
**staff and principal engineers** who are setting the standard for how their teams use coding
agents — whether you build your own orchestration, adopt a different framework, or use a single
agent in an IDE.

The Claude Agent Orchestration Plugin (`agent-orch`) is used throughout as a **reference
implementation** — a worked example of each principle — but every principle is stated so you can
implement it in your own stack. Each principle is also mapped to
[**POL-013 — Software Development Lifecycle**](https://code.ssnc.dev/one-security/pcs-grc/blob/main/policies/markdown/POL-013_Software_Development_Lifecycle.md),
so adopting them moves you toward SDLC compliance rather than away from it.

---

## The core thesis

> An AI agent is a **non-deterministic contributor** operating inside a deterministic SDLC.
> The job of the engineering standard is not to make the agent trustworthy — it is to make the
> agent's output **verifiable, bounded, reversible, and auditable** regardless of how much you
> trust it.

POL-013 already treats AI systems as first-class subjects of the SDLC (impact assessment, model
registry, monitoring, responsible-AI objectives — CHG1.1, CHG1.14, CHG1.19–1.21). These principles
extend the same governance to AI systems *used as engineering tools*: the agent writing the code is
subject to the same controls as the code it writes.

---

## The principles at a glance

| # | Principle | One-line statement |
|---|-----------|--------------------|
| 1 | **Evidence over claims** | No work is "done" without machine-checkable proof. |
| 2 | **Distrust, then verify** | The reviewer is independent of the implementer and re-checks from source. |
| 3 | **Specification is the contract** | Agents build against an explicit spec; deviations are flagged, not silently absorbed. |
| 4 | **Root cause before remedy** | No fix is applied before the cause is understood and reproduced. |
| 5 | **Least privilege, narrow role** | Each agent has the smallest scope and toolset its job requires. |
| 6 | **Human on the loop** | Humans govern at gates; agents do not self-approve consequential change. |
| 7 | **Isolation and environment segregation** | Agents work in disposable, non-production environments. |
| 8 | **Auditability by construction** | Every agent action leaves a durable, reviewable trail. |
| 9 | **Gated promotion** | Change moves through staged quality gates, never straight to main/prod. |
| 10 | **Bounded autonomy** | Agents have explicit stop conditions and escalate rather than thrash. |

---

## 1. Evidence over claims

**Principle.** An agent's assertion that something works is not evidence that it works. Completion
requires the output of a verification command — test results, a clean build, a passing linter, a
coverage number — captured and attached to the claim.

**Why.** Language models are optimistic by construction; they are rewarded for producing
plausible-sounding completion. "Should work," "probably passes," and "done!" are failure modes, not
status. The cost of a false-positive completion compounds downstream (broken main, wasted review,
production incidents).

**How to apply (any stack).**
- Define, per task type, the single command that proves the task is done.
- Require the agent to *run it freshly* and paste full output (exit code included) into its status.
- Treat a completion claim without attached evidence as "not started."
- Forbid completion when the verification command fails — escalate to investigation instead.

**Reference implementation (agent-orch).** Builder and Validator agents share a mandatory 5-step
verification gate (identify → run → read → verify → evidence). The `verify-task-evidence.sh` hook
blocks task closure that lacks proof. See [ARCHITECTURE.md → Verification Gates](ARCHITECTURE.md#verification-gates).

**POL-013 mapping.** CHG1.6 (security testing — *document test results*, R-CHG1.6.5), CHG1.10
(test information — *validate test coverage*, R-CHG1.10.4), CHG1.16 (*document security testing
results*, R-CHG1.16.6).

---

## 2. Distrust, then verify

**Principle.** Separate the agent that *produces* work from the agent (or human) that *accepts* it.
The reviewer ignores the producer's narrative and independently re-derives correctness from the
source artifacts.

**Why.** Self-review inherits the author's blind spots and confirmation bias. Distrust here is
structural, not personal — the same reason human code review, CI, and external audit exist. When
acceptance is independent, an approval *means* something.

**How to apply (any stack).**
- Never let the implementing agent be the sole approver of its own output.
- Give the reviewer the spec and the code, not the implementer's summary, as primary inputs.
- Require evidence with file/line citations for each requirement marked satisfied.
- Apply extra scrutiny to red flags: suspiciously fast completion, vague change descriptions
  ("cleaned up", "refactored"), large diffs, missing test output.

**Reference implementation (agent-orch).** A two-stage review (Spec Compliance → Code Quality) runs
*after* implementation, by distinct reviewer agents that read the actual code rather than trusting
status. See [ARCHITECTURE.md → Distrust-But-Verify Review](ARCHITECTURE.md#distrust-but-verify-review).

**POL-013 mapping.** CHG1.1 (*obtain security signoff for solution designs*, R-CHG1.1.6; *review
security criteria before go-live*, R-CHG1.1.7), CHG1.2 (*review code for vulnerabilities*,
R-CHG1.2.4), CHG1.16 (*perform code review for security vulnerabilities*, R-CHG1.16.2).

---

## 3. Specification is the contract

**Principle.** Agents implement against an explicit, written specification. The spec is the single
source of truth; anything in the code that is not in the spec is scope creep, and anything in the
spec not in the code is a gap. Both are surfaced, not silently resolved.

**Why.** Agents fill ambiguity with assumptions. Unconstrained, they add unrequested features
(enlarging attack surface and test burden) or quietly drop requirements. An explicit contract makes
"did we build the right thing?" a checkable question rather than a judgment call.

**How to apply (any stack).**
- Capture functional, non-functional, and security requirements *before* implementation.
- Have the agent enumerate the requirements it will satisfy, and review that list against the code.
- Treat unrequested additions as requiring explicit approval — including "helpful" ones.
- Keep the spec versioned alongside the code so the contract evolves under change control.

**Reference implementation (agent-orch).** Spec-kit-native design reads `spec.md` as the contract;
the Spec Reviewer builds an independent requirements checklist and flags scope creep. Standalone
mode mirrors this with `PLAN.md`. See [ARCHITECTURE.md → Spec-Kit Native Design](ARCHITECTURE.md#spec-kit-native-design).

**POL-013 mapping.** CHG1.1 (*document functional, non-functional, and security requirements*,
R-CHG1.1.2), CHG1.3 / CHG1.11 / CHG1.15 (application & stakeholder requirements; *maintain
requirements traceability*, R-CHG1.11.7), CHG1.15 (*define acceptance criteria covering functional,
performance, and security requirements*, R-CHG1.15.10).

---

## 4. Root cause before remedy

**Principle.** When something fails, no change is made until the cause is investigated, reproduced,
and confirmed. Fixes target the root cause, not the symptom.

**Why.** Agents are fast enough to make trial-and-error debugging feel productive while it silently
introduces collateral bugs and "fixes" that mask the real defect. Reproduction proves understanding;
a fix without it is a guess.

**How to apply (any stack).**
- Require a reproduction and a stated hypothesis before any remediation edit.
- Compare the failing path against a known-good analogue in the same codebase.
- Write a failing test that captures the defect *before* fixing it.
- Set an attempt limit (see Principle 10) after which the issue escalates as a design problem.

**Reference implementation (agent-orch).** The Debugger agent enforces a 4-phase methodology
(investigation → pattern analysis → hypothesis & test → implementation) with a hard rule: *no fixes
without root-cause investigation first*. See [ARCHITECTURE.md → 4-Phase Debugging](ARCHITECTURE.md#4-phase-debugging-methodology).

**POL-013 mapping.** CHG1.6 (*remediate findings*, R-CHG1.6.6), CHG1.9 (*assess change risks*,
R-CHG1.9.5; *review change effectiveness*, R-CHG1.9.7), CHG1.16 (*remediate critical and high
severity vulnerabilities before production*, R-CHG1.16.5).

---

## 5. Least privilege, narrow role

**Principle.** Give each agent the smallest role and the fewest tools needed to do its job. A
reviewer cannot write code; a security auditor cannot approve its own findings; a read-only
integration cannot mutate state.

**Why.** Broad, general-purpose agents dilute expertise and widen blast radius. Narrow roles improve
output quality (focused context) *and* security (a compromised or hallucinating agent can do less
damage). This is the principle of least privilege applied to autonomous actors.

**How to apply (any stack).**
- Decompose work into single-responsibility roles with explicit tool allow-lists.
- Default integrations and agents to read-only; grant write scope deliberately and per-service.
- Keep approval authority separate from production authority.
- Prefer many small, auditable capabilities over one agent with god-mode.

**Reference implementation (agent-orch).** 26 single-responsibility agents, each with a declared
tool set; the bundled MCP server tags every tool `read`/`write` and lets you register services
read-only. See [ARCHITECTURE.md → Three-Tier System](ARCHITECTURE.md#three-tier-system) and the
[MCP scope model](../plugins/agent-orch/mcp/docs/README.md).

**POL-013 mapping.** CHG1.4 (*define secure architecture principles*, R-CHG1.4.1; *apply security
patterns*, R-CHG1.4.3), CHG1.15 (*enforce least privilege and logical data segregation*,
R-CHG1.15.5), CHG1.8 (*use different credentials*, R-CHG1.8.5).

---

## 6. Human on the loop

**Principle.** Humans govern at decision gates; agents execute between them. For consequential
change — production deployment, schema migration, public API change, anything sensitive or
high-risk — a human authorizes before the agent proceeds. The system can also *decline* unsafe or
ambiguous work.

**Why.** "Human *in* the loop" (approve every step) does not scale and trains people to rubber-stamp.
"Human *on* the loop" (govern the gates, monitor the flow, intervene on exception) keeps human
judgment where it matters without bottlenecking routine work. The agent that can say "no — this is
under-specified / too risky, escalate first" is a feature, not a defect.

**How to apply (any stack).**
- Classify work by risk; require explicit human authorization above a defined threshold.
- Make the agent surface conflicts, missing context, and risk *before* acting, and gate on
  acknowledgment.
- Use a visible, queryable governance signal (label, ticket state, approval record) so anyone can
  see what is agent-eligible and what is gated.
- Treat "decline and escalate" as a valid, encouraged agent outcome.

**Reference implementation (agent-orch).** The Advocate agent performs team-awareness and conflict
detection and blocks the build until risks are acknowledged; Jira label governance
(`claude-code-agent-harness` vs `human-review-required`) implements human-on-the-loop gating
visibly in the tracker. See [JIRA_INTEGRATION.md → Label Governance](JIRA_INTEGRATION.md#label-governance-human-on-the-loop).

**POL-013 mapping.** CHG1.1 (*implement stage-gate approval process*, R-CHG1.1.5; AI impact
assessment R-CHG1.1.8–1.1.12), CHG1.9 (*require change approvals*, R-CHG1.9.2), CHG1.12 (*approve
releases*, R-CHG1.12.4), CHG1.19 (*obtain stakeholder review and approval of assessment*,
R-CHG1.19.6).

---

## 7. Isolation and environment segregation

**Principle.** Agents operate in disposable, isolated working environments — a feature branch, a
worktree, an ephemeral sandbox — never directly against production or shared mutable state. Direct
development or debugging in production is prohibited.

**Why.** Autonomous edits at machine speed need a blast-radius boundary. Isolation makes agent work
reversible (throw the branch away) and prevents one agent's experiment from corrupting another's
context or the live system.

**How to apply (any stack).**
- Run each agent task on its own branch/worktree/sandbox with no write path to production.
- Segregate development, test, and production environments with distinct credentials and access
  controls.
- Keep production data out of test environments unless anonymized.
- Make agent workspaces cheap to create and destroy so isolation is the default, not a chore.

**Reference implementation (agent-orch).** Git worktree isolation per session, with a `PreToolUse`
guard hook (`guard-worktree-writes`) that hard-blocks writes leaking outside the worktree. See
[WORKTREES.md](WORKTREES.md).

**POL-013 mapping.** CHG1.8 & CHG1.17 (*separate environments physically/logically*, R-CHG1.8.1;
*prohibit direct development or debugging in production*, R-CHG1.17.2; *ensure test environments do
not contain production data unless anonymized*, R-CHG1.15.6).

---

## 8. Auditability by construction

**Principle.** Every meaningful agent action — decisions, assignments, findings, file changes,
state transitions — leaves a durable, human-readable trail that exists *because of how the system
works*, not because someone remembered to log it.

**Why.** You cannot govern, debug, or pass an audit on work you cannot reconstruct. Agentic work is
opaque by default (reasoning is ephemeral); auditability has to be engineered in. It is also what
makes post-incident review and continuous improvement possible.

**How to apply (any stack).**
- Persist coordination state in version-controlled, human-readable artifacts, not just chat history.
- Record who (which agent/human) did what, when, and why at each gate.
- Tag agent-authored commits and changes so provenance is queryable.
- Keep the trail close to the work (in-repo, in-tracker) rather than in a separate system that can
  drift.

**Reference implementation (agent-orch).** File-based agent communication (`PLAN.md`/`STATUS.md`,
`.specify/`), date-tree session directories, a `validate-ai-commit` hook for commit provenance, and
a Jira lifecycle that comments session start/blocked/completion. See
[ARCHITECTURE.md → Agent Communication Patterns](ARCHITECTURE.md#agent-communication-patterns).

**POL-013 mapping.** CHG1.9 (*document change requests*, R-CHG1.9.4), CHG1.12 (*maintain version
control* / *track component changes*, R-CHG1.12.2–1.12.3), CHG1.15 (*log security-relevant events
without exposing sensitive data*, R-CHG1.15.7), CHG1.21 (*maintain comprehensive lineage
documentation* for AI systems, R-CHG1.21.4).

---

## 9. Gated promotion

**Principle.** Change advances through explicit, ordered quality gates — plan → implement →
verify → review → merge → release — and never jumps straight to the protected branch or to
production. Each gate has a clear pass condition.

**Why.** Staged gates localize failures and make change control enforceable. Ordering matters:
checking code quality before spec compliance wastes effort if the code is about to be rewritten. A
gated pipeline is also the natural place to attach the evidence (Principle 1) and approvals
(Principle 6).

**How to apply (any stack).**
- Define the gate sequence and the machine-checkable pass condition for each.
- Order gates so cheap, blocking checks run before expensive, dependent ones.
- Require all change to production to be reviewed, tested, and authorized — including emergency
  fixes, which get retrospective review.
- Provide rollback at the release gate; verify it works.

**Reference implementation (agent-orch).** The `make` lifecycle gates a feature from creation
through `make-validate` (repair CI + reviews) to `make-clean` (CI-green merge, branch cleanup,
ticket close). Branch protection and squash-merge enforce no direct-to-main change. See
[USER_GUIDE.md](USER_GUIDE.md).

**POL-013 mapping.** CHG1.9 (Enterprise Change Management — *test changes before deployment*,
R-CHG1.9.3; *handle emergency changes*, R-CHG1.9.6), CHG1.12 (release management — *control code
deployment*, *test rollback capabilities*, R-CHG1.12.1/1.12.6), CHG1.17 (*implement access controls
for environment promotion*, R-CHG1.17.3).

---

## 10. Bounded autonomy

**Principle.** Agents operate with explicit limits: a maximum number of attempts, a scope boundary,
and defined stop conditions. On hitting a limit, the agent escalates to a human or a higher-order
agent rather than continuing to thrash.

**Why.** Unbounded autonomy degrades — repeated failed fixes accumulate damage, and a confidently
wrong agent will keep going forever. Limits convert "stuck" from a silent time-sink into an explicit
escalation signal, which is exactly where human judgment adds the most value.

**How to apply (any stack).**
- Cap retries (e.g. 3 attempts) on a failing task; on exhaustion, stop and escalate with a written
  assessment.
- Bound scope: an agent fixing a bug does not refactor adjacent code or expand the change.
- Define hard stop conditions (irreversible action, ambiguity, conflict, risk threshold) that halt
  for human input.
- Make escalation a structured, expected outcome with a clear hand-off, not a failure state.

**Reference implementation (agent-orch).** The 3-attempt rule halts debugging and triggers an
architectural review; the Quality Reviewer caps refinement at 3 rounds then escalates a user
decision; scope-creep detection bounds the change to the spec. See
[ARCHITECTURE.md → The 3-Attempt Rule](ARCHITECTURE.md#4-phase-debugging-methodology).

**POL-013 mapping.** CHG1.20 (AI operations — *define performance thresholds requiring investigation
or intervention*, R-CHG1.20.5; *configure automated alerting for threshold breaches*, R-CHG1.20.4),
CHG1.1 (stage-gate enforcement, R-CHG1.1.5).

---

## Consolidated mapping to POL-013

| Principle | Primary POL-013 control groups |
|-----------|-------------------------------|
| 1. Evidence over claims | CHG1.6, CHG1.10, CHG1.16 |
| 2. Distrust, then verify | CHG1.1, CHG1.2, CHG1.16 |
| 3. Specification is the contract | CHG1.1, CHG1.3, CHG1.11, CHG1.15 |
| 4. Root cause before remedy | CHG1.6, CHG1.9, CHG1.16 |
| 5. Least privilege, narrow role | CHG1.4, CHG1.8, CHG1.15 |
| 6. Human on the loop | CHG1.1, CHG1.9, CHG1.12, CHG1.19 |
| 7. Isolation & environment segregation | CHG1.8, CHG1.15, CHG1.17 |
| 8. Auditability by construction | CHG1.9, CHG1.12, CHG1.15, CHG1.21 |
| 9. Gated promotion | CHG1.9, CHG1.12, CHG1.17 |
| 10. Bounded autonomy | CHG1.1, CHG1.20 |

---

## A maturity ladder for adoption

POL-013 grades controls **Basic → Intermediate → Advanced**. The same ladder works for adopting
agentic engineering — you do not need all ten principles on day one.

**Basic (start here).**
- Every agent task has a verification command and attaches its output (P1).
- Agents work on a branch, never on main/prod (P7).
- A human approves merges to the protected branch (P6, P9).
- Agent commits are identifiable as agent-authored (P8).

**Intermediate.**
- Implementation and review are performed by separate agents/humans (P2).
- Work is driven by a written, versioned spec; scope creep is flagged (P3).
- Agents have scoped tool access; integrations default to read-only (P5).
- Failures trigger reproduce-before-fix and a retry cap (P4, P10).

**Advanced.**
- A multi-gate pipeline enforces ordered quality gates with rollback (P9).
- Conflict detection and risk classification gate consequential work, with declines/escalation
  treated as first-class outcomes (P6, P10).
- Full coordination state is auditable in-repo and in the tracker, sufficient to reconstruct any
  session for incident review (P8).
- AI systems *built* this way are themselves registered, monitored, and impact-assessed per
  POL-013 CHG1.19–1.21 — closing the loop between the agent and what it produces.

---

## Minimum bar for staff / principal sign-off

Before a team is "cleared" to use coding agents on production code, a staff/principal engineer
should be able to answer **yes** to all of:

- [ ] Can I see the **evidence** (test/build/lint output) behind every completed agent task?
- [ ] Is the **acceptor independent** of the producer for anything that reaches main?
- [ ] Is there a **written contract** (spec/plan/ticket) the agent was working against?
- [ ] Do agents work in **isolation** with no write path to production?
- [ ] Is there a **human gate** on consequential change, and can the agent **decline/escalate**?
- [ ] Can I **reconstruct** what an agent did, when, and why, after the fact?
- [ ] Do agents **stop and escalate** at a defined limit instead of thrashing?

If any answer is "no," that gap is the team's next priority — regardless of which tool they use.

---

## Anti-patterns to retire

| Anti-pattern | Why it fails | Principle violated |
|--------------|--------------|--------------------|
| "The agent said it's done, ship it." | No evidence; optimistic completion. | P1 |
| Letting the implementing agent approve its own PR. | Inherits author blind spots. | P2 |
| Prompting an agent with a vague goal and accepting whatever it builds. | Unbounded scope; silent gaps. | P3 |
| Pasting a stack trace and asking for a fix. | Symptom-patching without root cause. | P4 |
| One agent with full tool access and write everywhere. | Maximal blast radius. | P5 |
| Auto-merging agent output to main on green CI alone. | No human gate on consequential change. | P6, P9 |
| Pointing an agent at the production environment "just this once." | Irreversible, uncontained. | P7 |
| Relying on chat scrollback as the record. | Ephemeral, unauditable. | P8 |
| Letting an agent retry a failing fix indefinitely. | Accumulating collateral damage. | P10 |

---

## Closing

These principles are deliberately **mechanism-agnostic**. agent-orch is one expression of them;
your team may implement them with GitHub Actions, a different agent framework, or a thin set of
conventions and hooks. What matters is that the *properties* hold: agent output is **verifiable**
(P1–P4), agent authority is **constrained** (P5–P7), and agent activity is **accountable**
(P8–P10). Get those three properties right and you can adopt agentic engineering at staff/principal
standard while staying inside POL-013 — whatever tools you choose.

---

[< Back to Documentation Index](README.md) | [< Back to README](../README.md)
