# Presentation Decks

This directory contains presentation decks for the agent-orch and team-work plugins, along with their generator scripts.

## Extensibility Framework Deck

**File**: `extensibility-framework.pptx`  
**Generator**: `build_extensibility_deck.py`  
**Theme**: SS&C Blue Stone light mode

### Regenerating the Deck

To regenerate the deck after making changes to the generator script:

```bash
python3 docs/decks/build_extensibility_deck.py
```

**Requirements**: `python-pptx` package

```bash
pip install python-pptx
# or
pip3 install --user python-pptx
```

### Theme Palette

The deck uses the canonical SS&C Blue Stone light-mode palette:

| Color | Hex | Usage |
|-------|-----|-------|
| SS&C Blue | `#0077C8` | Primary (titles, accents) |
| Teal | `#1099AC` | Secondary accent |
| Cobalt | `#0B4D99` | Dark blue variant |
| Navy | `#131E58` | Deep navy for emphasis |
| Dark Gray | `#344157` | Body text |
| Gray | `#858EA0` | Muted text |
| Yellow | `#F5AB0A` | Highlights |
| Dark Teal | `#076775` | Alternative accent |

**Font**: Calibri (SS&C brand standard for digital)

### Content

The extensibility framework deck covers:

1. **Title** - Overview of the opt-in, zero-behaviour-change framework
2. **The Big Idea** - The hard invariant and what you can extend
3. **Where Config Lives** - Table showing .claude/ssnc-agent-orch/ and .claude/ssnc-team-work/
4. **Agent Extension** - before/replace/after hooks with Architect example
5. **Skill Hook Points** - /make flow with before_commit, before_pr, after_pr
6. **Pluggable Jira Workflow** - jira-workflow.yaml override mechanism
7. **Pluggable Git Workflow** - External repo clone-and-run pattern
8. **Team-Work Extensibility** - Same model applied to team-work plugin
9. **Getting Started** - Copy from examples/, uncomment what you need
10. **Closing** - The three principles: zero behaviour change, repo-level config, additive only

### References

- Full contract: `plugins/agent-orch/rules/extensibility.md`
- Example configs: `examples/ssnc-agent-orch/*.yaml` and `examples/ssnc-team-work/*.yaml`
- Blue Stone palette: `plugins/team-work/skills/work-publish/SKILL.md` (extra.css template)
