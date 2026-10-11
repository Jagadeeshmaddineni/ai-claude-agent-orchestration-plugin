---
description: Implement connector code using multi-agent orchestration. Invokes agent-orch:implement with connector-specific context, then shows next steps.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The input may contain additional context.

## Behavior

This command invokes `/agent-orch:implement` for multi-agent parallel implementation, then displays connector-specific next step guidance.

### Step 1: Invoke Multi-Agent Implementation

Run the `/agent-orch:implement` skill. This will:
- Launch Builder, Validator, and Scribe agents in parallel
- Use the C0-C9 constitution from `.specify/memory/constitution.md`
- Follow the spec and tasks from `specs/[feature]/`

**Invoke now:** `/agent-orch:implement`

### Step 2: After Implementation Completes

Once `/agent-orch:implement` has finished, display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Connector Implementation Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The connector code has been generated using multi-agent orchestration.

→ Next: Run /speckit.validate to check for build errors, lint issues, and pattern compliance

This will:
  - Run TypeScript build check (nx build)
  - Run ESLint (nx lint)
  - Verify C0-C9 pattern compliance
  - Check OAuth2 scopes (if applicable)
  - Generate validation report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**STOP here.** Wait for the user to run `/speckit.validate`.

## Key Rules

- Always invoke `/agent-orch:implement` first
- After agent-orch completes, show the next step guidance
- Direct users to `/speckit.validate` as the next command
- Do NOT automatically proceed to validation
