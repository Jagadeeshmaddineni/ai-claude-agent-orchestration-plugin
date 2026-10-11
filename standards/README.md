# SS&C Agentic Software Standards

Standards, inventories, and proposals for Claude Code agentic development across SS&C Technologies.

## Documents

| Document | Purpose |
|----------|---------|
| [SKILL-INVENTORY.md](SKILL-INVENTORY.md) | Complete inventory of included vs discoverable skills |
| [ADD-SKILL-PROPOSAL.md](ADD-SKILL-PROPOSAL.md) | Proposal for fine-grained `/add-skill` command |
| [SPEC-DRIVEN-DEVELOPMENT.md](SPEC-DRIVEN-DEVELOPMENT.md) | Fundamentals of spec-driven development with agents |
| [TEAM-CUSTOMIZATION.md](TEAM-CUSTOMIZATION.md) | How teams adapt the base plugin for their domain |
| [BASELINE-CAPABILITIES.md](BASELINE-CAPABILITIES.md) | What ships out of the box and what it gives you |
| [SUPPLY-CHAIN-SECURITY.md](SUPPLY-CHAIN-SECURITY.md) | Defense-in-depth strategy: internal controls + Kusari/GUAC integration |
| [CRITICAL-REVIEW.md](CRITICAL-REVIEW.md) | Honest assessment: what works, what's missing, what needs improvement |

## Audience

- Plugin developers maintaining and extending the orchestration platform
- Team leads evaluating adoption for their engineering group
- CTO and engineering leadership reviewing the agentic development strategy

## Context

The SS&C agentic development platform has two primary components:

1. **Agent Orchestration Plugin** (`claude-agent-orchestration-plugin`) - The core multi-agent engine with 26 agents, 19 skills, and 8 commands
2. **Plugin Discovery** (`code-plugin-discovery`) - The marketplace and catalog for discovering, inheriting, and contributing plugins across SS&C

Together they form an out-of-the-box baseline that teams can use immediately or customize deeply for their domain.
