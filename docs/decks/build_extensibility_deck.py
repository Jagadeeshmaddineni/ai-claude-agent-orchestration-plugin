#!/usr/bin/env python3
"""Generate Extensibility Framework presentation with SS&C Blue Stone light theme"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# SS&C Blue Stone light-mode palette (from team-work/work-publish canonical extra.css)
SSC_BLUE = RGBColor(0x00, 0x77, 0xC8)        # #0077C8 - SS&C Blue (primary)
SSC_BLUE_LIGHT = RGBColor(0x33, 0x92, 0xD3)  # #3392D3 - SS&C Blue 500
COBALT = RGBColor(0x0B, 0x4D, 0x99)          # #0B4D99 - darker blue
TEAL = RGBColor(0x10, 0x99, 0xAC)            # #1099AC - Teal (accent)
DARK_TEAL = RGBColor(0x07, 0x67, 0x75)       # #076775 - Dark Teal
NAVY = RGBColor(0x13, 0x1E, 0x58)            # #131E58 - Navy
DARK_GRAY = RGBColor(0x34, 0x41, 0x57)       # #344157 - Dark Gray
GRAY = RGBColor(0x85, 0x8E, 0xA0)            # #858EA0 - Gray
YELLOW = RGBColor(0xF5, 0xAB, 0x0A)          # #F5AB0A - Yellow
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_BG = RGBColor(0xF5, 0xF5, 0xF5)        # light background
LIGHTER_BG = RGBColor(0xFA, 0xFA, 0xFA)      # even lighter

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

def add_bg(slide, color=WHITE):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_shape(slide, left, top, width, height, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_text_box(slide, left, top, width, height, text, font_size=14, color=DARK_GRAY, bold=False, alignment=PP_ALIGN.LEFT):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = 'Calibri'
    p.alignment = alignment
    return tf

def add_bullet_frame(slide, left, top, width, height, items, font_size=13, color=DARK_GRAY):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = item
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = 'Calibri'
        p.space_after = Pt(6)
        p.level = 0
    return tf

def add_accent_bar(slide, top=Inches(0), color=SSC_BLUE):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), top, prs.slide_width, Inches(0.08))
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()

def add_footer(slide, text="SS&C Technologies  |  Agent Orchestration  |  Internal"):
    add_text_box(slide, Inches(0.5), Inches(7.0), Inches(12), Inches(0.4), text, font_size=9, color=GRAY, alignment=PP_ALIGN.LEFT)

# ═══════════════════════════════════════════════════════════════
# SLIDE 1: Title
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(1.5), Inches(2.0), Inches(10), Inches(1.2),
    "Extensibility Framework",
    font_size=48, color=SSC_BLUE, bold=True, alignment=PP_ALIGN.CENTER)

add_text_box(slide, Inches(1.5), Inches(3.0), Inches(10), Inches(0.8),
    "Zero-Behaviour-Change Plugin Extension for Agent Orchestration & Team Work",
    font_size=20, color=DARK_GRAY, alignment=PP_ALIGN.CENTER)

add_shape(slide, Inches(5.5), Inches(4.0), Inches(2.3), Inches(1.8), LIGHT_BG)
add_text_box(slide, Inches(5.7), Inches(4.2), Inches(1.9), Inches(1.4),
    "Opt-In\nNo Breaking Changes\nRepo-Level Config",
    font_size=16, color=SSC_BLUE, bold=True, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 2: The Big Idea
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "The Big Idea: Extensibility Without Breaking Existing Behavior",
    font_size=32, color=SSC_BLUE, bold=True)

# The invariant
box = add_shape(slide, Inches(1.0), Inches(1.5), Inches(11), Inches(1.2), LIGHTER_BG)
add_text_box(slide, Inches(1.3), Inches(1.65), Inches(10.4), Inches(0.9),
    '⚠ Hard Invariant: If the config file is absent, unreadable, malformed, or contains no entry for the skill/agent, the skill/agent behaves EXACTLY as it does today. Extensibility is strictly additive and opt-in.',
    font_size=15, color=NAVY, bold=True, alignment=PP_ALIGN.LEFT)

# What you can extend
add_text_box(slide, Inches(0.8), Inches(3.0), Inches(11), Inches(0.5),
    "Every skill and agent can be extended or overridden at the repository level:",
    font_size=16, color=DARK_GRAY)

add_bullet_frame(slide, Inches(1.2), Inches(3.6), Inches(5.2), Inches(2.8), [
    "Agents support before/replace/after hooks (inject context, replace with your own agent, run cleanup)",
    "Skills expose named hook points (e.g. before_commit, before_pr, after_pr) where you insert steps",
    "Pluggable Jira workflow (override transition IDs, custom fields, lifecycle hooks)",
    "Pluggable git workflow (offload PR steps to an external repo with scripts + markdown)",
], font_size=14, color=DARK_GRAY)

add_bullet_frame(slide, Inches(6.8), Inches(3.6), Inches(5.2), Inches(2.8), [
    "Config lives in YOUR repo (.claude/ssnc-agent-orch/ and .claude/ssnc-team-work/)",
    "Ships fully commented out - uncomment only what you want",
    "Zero network calls, zero plugin version coupling",
    "Works with Loop Library, external git repos, inline skills, or your own agent markdown",
], font_size=14, color=DARK_GRAY)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 3: Where Config Lives
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Where Configuration Lives",
    font_size=32, color=SSC_BLUE, bold=True)

# Table-like layout
table_data = [
    ("Plugin", "Config Directory", "Files"),
    ("agent-orch", ".claude/ssnc-agent-orch/", "skills.yaml, agents.yaml, jira-workflow.yaml, git-workflow.yaml"),
    ("team-work", ".claude/ssnc-team-work/", "skills.yaml, agents.yaml"),
]

y_start = Inches(1.6)
row_height = Inches(0.7)

for i, (plugin, directory, files) in enumerate(table_data):
    y = y_start + i * row_height
    if i == 0:
        # Header
        add_shape(slide, Inches(0.8), y, Inches(11.5), row_height, SSC_BLUE)
        add_text_box(slide, Inches(1.0), y + Inches(0.15), Inches(2.5), Inches(0.4), plugin, font_size=14, color=WHITE, bold=True)
        add_text_box(slide, Inches(3.7), y + Inches(0.15), Inches(3.5), Inches(0.4), directory, font_size=14, color=WHITE, bold=True)
        add_text_box(slide, Inches(7.4), y + Inches(0.15), Inches(4.7), Inches(0.4), files, font_size=14, color=WHITE, bold=True)
    else:
        # Data rows
        bg_color = LIGHT_BG if i % 2 == 0 else WHITE
        add_shape(slide, Inches(0.8), y, Inches(11.5), row_height, bg_color)
        add_text_box(slide, Inches(1.0), y + Inches(0.15), Inches(2.5), Inches(0.4), plugin, font_size=13, color=DARK_GRAY, bold=True)
        add_text_box(slide, Inches(3.7), y + Inches(0.15), Inches(3.5), Inches(0.4), directory, font_size=12, color=NAVY)
        add_text_box(slide, Inches(7.4), y + Inches(0.15), Inches(4.7), Inches(0.4), files, font_size=11, color=DARK_GRAY)

add_text_box(slide, Inches(0.8), Inches(3.3), Inches(11.5), Inches(0.6),
    "The config directory is in the CONSUMING repository (not the plugin cache).\nFiles ship fully commented out via /init-plugin or from examples/.",
    font_size=14, color=DARK_GRAY, alignment=PP_ALIGN.CENTER)

# Example snippet
add_text_box(slide, Inches(0.8), Inches(4.2), Inches(11.5), Inches(0.4),
    "Example: skills.yaml (commented out by default)",
    font_size=16, color=SSC_BLUE, bold=True)

code_bg = add_shape(slide, Inches(0.8), Inches(4.7), Inches(11.5), Inches(1.8), LIGHTER_BG)
add_text_box(slide, Inches(1.0), Inches(4.8), Inches(11.1), Inches(1.6),
    """# skills:
#   make:
#     before_commit: [scripts/format.sh]
#     before_pr: [.loop-library/pre-pr-review.yaml]
#   build:
#     after_build: [/agent-orch:simplify]""",
    font_size=12, color=NAVY, alignment=PP_ALIGN.LEFT)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 4: Agent Extension (before/replace/after)
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Agent Extension: before / replace / after",
    font_size=32, color=SSC_BLUE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11), Inches(0.5),
    "Every agent supports up to three optional hooks: before (inject context), replace (use your own agent), after (cleanup)",
    font_size=14, color=DARK_GRAY)

# Flow diagram
flow_items = [
    ("1. before", "docs/adr/*", TEAL),
    ("2. replace OR default", "Your agent OR orchestrate-X", SSC_BLUE),
    ("3. after", ".loop-library/architect.yaml", DARK_TEAL),
]

x_start = Inches(1.5)
box_w = Inches(3.0)
gap = Inches(0.3)
y = Inches(2.2)

for i, (label, example, color) in enumerate(flow_items):
    x = x_start + i * (box_w + gap)
    box = add_shape(slide, x, y, box_w, Inches(1.6), color)
    add_text_box(slide, x, y + Inches(0.15), box_w, Inches(0.4), label, font_size=14, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)
    add_text_box(slide, x + Inches(0.2), y + Inches(0.7), box_w - Inches(0.4), Inches(0.7), example, font_size=12, color=WHITE, alignment=PP_ALIGN.CENTER)

# Example config
add_text_box(slide, Inches(0.8), Inches(4.2), Inches(11.5), Inches(0.4),
    "Example: Architect agent with ADRs injected before, Loop Library run after",
    font_size=16, color=SSC_BLUE, bold=True)

code_bg = add_shape(slide, Inches(0.8), Inches(4.7), Inches(11.5), Inches(1.8), LIGHTER_BG)
add_text_box(slide, Inches(1.0), Inches(4.85), Inches(11.1), Inches(1.6),
    """agents:
  architect:
    before:
      - docs/adr/*                      # feed every ADR to architect first
    replace:                            # empty → our architect runs normally
    after:
      - .loop-library/architect.yaml    # run a bounded loop afterwards""",
    font_size=12, color=NAVY, alignment=PP_ALIGN.LEFT)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 5: Skill Hook Points (/make example)
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Skill Hook Points: Named Insertion Points",
    font_size=32, color=SSC_BLUE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11), Inches(0.5),
    "Skills expose named hook points where you can insert: scripts, markdown, Loop Library loops, or inline skills",
    font_size=14, color=DARK_GRAY)

# /make flow
add_text_box(slide, Inches(0.8), Inches(1.9), Inches(11.5), Inches(0.4),
    "/make skill flow with before_commit + before_pr hooks",
    font_size=16, color=SSC_BLUE, bold=True)

flow_boxes = [
    ("Run /build", SSC_BLUE_LIGHT),
    ("→ before_commit hook\nscripts/format.sh", TEAL),
    ("→ git add + commit", SSC_BLUE_LIGHT),
    ("→ git push", SSC_BLUE_LIGHT),
    ("→ before_pr hook\nloop-library review\nchecklist", TEAL),
    ("→ gh pr create", SSC_BLUE_LIGHT),
    ("→ after_pr hook", TEAL),
]

x_start = Inches(0.6)
box_w = Inches(1.7)
gap = Inches(0.05)
y = Inches(2.5)

for i, (label, color) in enumerate(flow_boxes):
    x = x_start + i * (box_w + gap)
    box = add_shape(slide, x, y, box_w, Inches(1.4), color)
    add_text_box(slide, x + Inches(0.05), y + Inches(0.15), box_w - Inches(0.1), Inches(1.1), label, font_size=10, color=WHITE, alignment=PP_ALIGN.CENTER)

# Config example
add_text_box(slide, Inches(0.8), Inches(4.3), Inches(11.5), Inches(0.4),
    "Configuration: skills.yaml",
    font_size=16, color=SSC_BLUE, bold=True)

code_bg = add_shape(slide, Inches(0.8), Inches(4.8), Inches(11.5), Inches(1.8), LIGHTER_BG)
add_text_box(slide, Inches(1.0), Inches(4.95), Inches(11.1), Inches(1.6),
    """skills:
  make:
    before_commit: [scripts/format.sh]
    before_pr:
      - .loop-library/pre-pr-review.yaml
      - docs/checklists/pr-ready.md
    after_pr: [scripts/notify-team.sh]""",
    font_size=12, color=NAVY, alignment=PP_ALIGN.LEFT)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 6: Pluggable Jira Workflow
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Pluggable Jira Workflow",
    font_size=32, color=SSC_BLUE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11), Inches(0.5),
    "Override transition IDs, custom field IDs, and inject lifecycle hooks declaratively",
    font_size=14, color=DARK_GRAY)

# Two-column layout
# Left: Today
box = add_shape(slide, Inches(0.8), Inches(2.0), Inches(5.5), Inches(2.5), LIGHT_BG)
add_text_box(slide, Inches(1.0), Inches(2.1), Inches(5.1), Inches(0.4),
    "Today: Hardcoded in .claude/rules/jira.md",
    font_size=14, color=NAVY, bold=True)
add_bullet_frame(slide, Inches(1.2), Inches(2.6), Inches(5.0), Inches(1.8), [
    "Transition IDs scattered across skills",
    "Custom field IDs hardcoded",
    "No repo-specific lifecycle hooks",
    "Every team uses same flow",
], font_size=12, color=DARK_GRAY)

# Right: With jira-workflow.yaml
box = add_shape(slide, Inches(6.8), Inches(2.0), Inches(5.5), Inches(2.5), LIGHT_BG)
add_text_box(slide, Inches(7.0), Inches(2.1), Inches(5.1), Inches(0.4),
    "With jira-workflow.yaml: Declarative",
    font_size=14, color=SSC_BLUE, bold=True)
add_bullet_frame(slide, Inches(7.2), Inches(2.6), Inches(5.0), Inches(1.8), [
    "Centralized transition + field mapping",
    "Per-repo lifecycle hooks (on_start, on_review, on_done)",
    "Can disable Jira entirely per repo",
    "Falls back to defaults for missing keys",
], font_size=12, color=DARK_GRAY)

# Example config
add_text_box(slide, Inches(0.8), Inches(4.8), Inches(11.5), Inches(0.4),
    "Example: jira-workflow.yaml",
    font_size=16, color=SSC_BLUE, bold=True)

code_bg = add_shape(slide, Inches(0.8), Inches(5.3), Inches(11.5), Inches(1.8), LIGHTER_BG)
add_text_box(slide, Inches(1.0), Inches(5.45), Inches(11.1), Inches(1.6),
    """jira:
  enabled: true
  transitions: { in_progress: "21", in_review: "31", done: "41" }
  fields: { start_date: "customfield_10015" }
  lifecycle:
    on_review: [scripts/post-pr-to-jira.sh]""",
    font_size=12, color=NAVY, alignment=PP_ALIGN.LEFT)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 7: Pluggable Git Workflow (External Repo)
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Pluggable Git Workflow: External Repo Offload",
    font_size=32, color=SSC_BLUE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11), Inches(0.5),
    "Offload git/PR steps to an external repo. Agent-orch orchestrates WHEN steps run; your repo owns WHAT they do.",
    font_size=14, color=DARK_GRAY)

# The mechanism
add_text_box(slide, Inches(0.8), Inches(2.0), Inches(11.5), Inches(0.4),
    "Clone-and-Run Mechanism",
    font_size=16, color=SSC_BLUE, bold=True)

add_bullet_frame(slide, Inches(1.2), Inches(2.5), Inches(11), Inches(1.5), [
    "1. Shallow-clone the external repo (git@code.ssnc.dev:BluedoorAIUK/test_codeReviewFlow.git) to .claude/ssnc-agent-orch/.cache/",
    "2. At each hook point (before_pr, after_pr), run scripts or markdown from the cloned repo",
    "3. User confirms source/ref + steps on first run per session (unless auto-approved permission mode)",
    "4. Cache reused for rest of session; .cache/ is git-ignored (never committed)",
], font_size=13, color=DARK_GRAY)

# Example config
add_text_box(slide, Inches(0.8), Inches(4.4), Inches(11.5), Inches(0.4),
    "Example: git-workflow.yaml",
    font_size=16, color=SSC_BLUE, bold=True)

code_bg = add_shape(slide, Inches(0.8), Inches(4.9), Inches(11.5), Inches(1.8), LIGHTER_BG)
add_text_box(slide, Inches(1.0), Inches(5.05), Inches(11.1), Inches(1.6),
    """git:
  source: git@code.ssnc.dev:BluedoorAIUK/test_codeReviewFlow.git
  ref: main
  steps:
    before_pr: [scripts/lint.sh, flows/review.md]
    after_pr: [scripts/post-merge-checks.sh]""",
    font_size=12, color=NAVY, alignment=PP_ALIGN.LEFT)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 8: Team-Work Extensibility
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Team-Work Plugin: Same Model",
    font_size=32, color=SSC_BLUE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11), Inches(0.5),
    ".claude/ssnc-team-work/skills.yaml and agents.yaml follow the same contract",
    font_size=14, color=DARK_GRAY)

# Two examples
# Left: work-recap skill
box = add_shape(slide, Inches(0.8), Inches(2.0), Inches(5.5), Inches(2.8), LIGHT_BG)
add_text_box(slide, Inches(1.0), Inches(2.1), Inches(5.1), Inches(0.4),
    "Example: /work-recap skill hooks",
    font_size=14, color=SSC_BLUE, bold=True)

code_bg = add_shape(slide, Inches(1.0), Inches(2.6), Inches(5.1), Inches(2.0), LIGHTER_BG)
add_text_box(slide, Inches(1.1), Inches(2.75), Inches(4.9), Inches(1.8),
    """# skills:
#   work-recap:
#     before:
#       - scripts/fetch-metrics.sh
#     after:
#       - /loop sanitize-output
#       - scripts/post-to-slack.sh""",
    font_size=11, color=NAVY, alignment=PP_ALIGN.LEFT)

# Right: content-specialist agent
box = add_shape(slide, Inches(6.8), Inches(2.0), Inches(5.5), Inches(2.8), LIGHT_BG)
add_text_box(slide, Inches(7.0), Inches(2.1), Inches(5.1), Inches(0.4),
    "Example: content-specialist agent override",
    font_size=14, color=SSC_BLUE, bold=True)

code_bg = add_shape(slide, Inches(7.0), Inches(2.6), Inches(5.1), Inches(2.0), LIGHTER_BG)
add_text_box(slide, Inches(7.1), Inches(2.75), Inches(4.9), Inches(1.8),
    """# agents:
#   content-specialist:
#     before:
#       - docs/brand-voice.md
#     replace:
#       # our-content-writer.md
#     after: []""",
    font_size=11, color=NAVY, alignment=PP_ALIGN.LEFT)

add_text_box(slide, Inches(0.8), Inches(5.1), Inches(11.5), Inches(0.8),
    "Same zero-behaviour-change guarantee: if the config is absent or commented out,\nteam-work skills and agents run exactly as they do today.",
    font_size=14, color=DARK_GRAY, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 9: Getting Started
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Getting Started: Copy, Uncomment, Run",
    font_size=32, color=SSC_BLUE, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11), Inches(0.5),
    "Three ways to get the config templates into your repo:",
    font_size=14, color=DARK_GRAY)

# Three steps
steps = [
    ("1. Via /init-plugin or /upgrade-plugin", "The skills install/upgrade templates automatically to .claude/ssnc-agent-orch/ and .claude/ssnc-team-work/", SSC_BLUE),
    ("2. Copy from examples/", "Copy examples/ssnc-agent-orch/*.yaml and examples/ssnc-team-work/*.yaml to your .claude/ directories", TEAL),
    ("3. Manual creation", "Create the YAML files yourself following the contract in plugins/agent-orch/rules/extensibility.md", DARK_TEAL),
]

y = Inches(2.1)
for i, (step, desc, color) in enumerate(steps):
    box = add_shape(slide, Inches(0.8), y, Inches(11.5), Inches(1.2), LIGHT_BG)
    add_text_box(slide, Inches(1.0), y + Inches(0.1), Inches(11.1), Inches(0.4), step, font_size=15, color=color, bold=True)
    add_text_box(slide, Inches(1.0), y + Inches(0.5), Inches(11.1), Inches(0.6), desc, font_size=13, color=DARK_GRAY)
    y += Inches(1.35)

# Next step
add_text_box(slide, Inches(0.8), Inches(6.1), Inches(11.5), Inches(0.4),
    "Then: Uncomment ONLY what you want to customize. Everything else runs as default.",
    font_size=16, color=SSC_BLUE, bold=True, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 10: Closing
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(1.5), Inches(2.0), Inches(10), Inches(1.0),
    "Extensibility: The Contract",
    font_size=42, color=SSC_BLUE, bold=True, alignment=PP_ALIGN.CENTER)

# The three principles
principles = [
    "Zero behaviour change by default — absent/commented config = current behaviour",
    "Repo-level config — your repo owns .claude/ssnc-agent-orch/ and .claude/ssnc-team-work/",
    "Additive only — plugins ship templates fully commented out; you uncomment what you need",
]

y = Inches(3.3)
for principle in principles:
    box = add_shape(slide, Inches(1.5), y, Inches(10), Inches(0.8), LIGHT_BG)
    add_text_box(slide, Inches(1.7), y + Inches(0.15), Inches(9.6), Inches(0.5), principle, font_size=15, color=DARK_GRAY, alignment=PP_ALIGN.CENTER)
    y += Inches(0.95)

add_text_box(slide, Inches(1.5), Inches(6.3), Inches(10), Inches(0.5),
    "Full contract: plugins/agent-orch/rules/extensibility.md",
    font_size=14, color=GRAY, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# Save
output_path = 'docs/decks/extensibility-framework.pptx'
prs.save(output_path)
print(f"Generated: {output_path}")
print(f"Slides: {len(prs.slides)}")
print(f"Theme: SS&C Blue Stone light mode")
print(f"Primary: #0077C8 (SS&C Blue), Accent: #1099AC (Teal), Font: Calibri")
