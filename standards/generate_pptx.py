#!/usr/bin/env python3
"""Generate CTO presentation: Agentic Software R&D&Ops at SS&C"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Bluestone light-mode palette
PRIMARY = RGBColor(0x1F, 0x66, 0x81)       # #1F6681 - primary blue
SECONDARY = RGBColor(0x0D, 0x9D, 0xDB)     # #0D9DDB - accent cyan
DARK_TEXT = RGBColor(0x1B, 0x3D, 0x55)      # #1B3D55 - deep navy
BODY_TEXT = RGBColor(0x3D, 0x51, 0x67)      # #3D5167 - medium navy
LIGHT_TEXT = RGBColor(0x5B, 0x6A, 0x85)     # #5B6A85 - soft navy
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_BG = RGBColor(0xF6, 0xFD, 0xFF)      # #F6FDFF - near white
SUBTLE_BG = RGBColor(0xEE, 0xF4, 0xF8)     # light blue-gray
ACCENT_GREEN = RGBColor(0x00, 0xA8, 0x6B)   # #00A86B - success
ACCENT_WARN = RGBColor(0xFF, 0xA8, 0x00)    # #FFA800 - warning
ACCENT_ERROR = RGBColor(0xFF, 0x3B, 0x30)   # #FF3B30 - error
NEUTRAL_LINE = RGBColor(0xC2, 0xD0, 0xDB)   # #C2D0DB - divider
AQUA = RGBColor(0x00, 0xCE, 0xD1)
MARIGOLD = RGBColor(0xFF, 0xB3, 0x47)
INDIGO = RGBColor(0x4B, 0x00, 0x82)
RASPBERRY = RGBColor(0xE3, 0x0B, 0x5C)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

def add_bg(slide, color=LIGHT_BG):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_shape(slide, left, top, width, height, color, radius=Inches(0.1)):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    shape.shadow.inherit = False
    return shape

def add_text_box(slide, left, top, width, height, text, font_size=14, color=BODY_TEXT, bold=False, alignment=PP_ALIGN.LEFT):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = 'Inter'
    p.alignment = alignment
    return tf

def add_bullet_frame(slide, left, top, width, height, items, font_size=14, color=BODY_TEXT, title=None, title_color=PRIMARY):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    first = True
    if title:
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(font_size + 2)
        p.font.color.rgb = title_color
        p.font.bold = True
        p.font.name = 'Inter'
        p.space_after = Pt(8)
        first = False
    for item in items:
        if first:
            p = tf.paragraphs[0]
            first = False
        else:
            p = tf.add_paragraph()
        p.text = item
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = 'Inter'
        p.space_after = Pt(4)
        p.level = 0
    return tf

def add_accent_bar(slide, top=Inches(0), color=PRIMARY):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), top, prs.slide_width, Inches(0.06))
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()

def add_footer(slide, text="SS&C Technologies  |  AI Governance  |  Confidential"):
    add_text_box(slide, Inches(0.5), Inches(7.0), Inches(12), Inches(0.4), text, font_size=9, color=LIGHT_TEXT, alignment=PP_ALIGN.LEFT)

def add_divider(slide, left, top, width):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Inches(0.02))
    shape.fill.solid()
    shape.fill.fore_color.rgb = NEUTRAL_LINE
    shape.line.fill.background()

# ═══════════════════════════════════════════════════════════════
# SLIDE 1: Title
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)

# Top accent bar
add_accent_bar(slide)

# Title block
add_text_box(slide, Inches(1), Inches(1.8), Inches(11), Inches(1.0),
    "Agentic Software Research,\nDevelopment & Operations",
    font_size=40, color=PRIMARY, bold=True, alignment=PP_ALIGN.LEFT)

add_text_box(slide, Inches(1), Inches(3.2), Inches(9), Inches(0.6),
    "A Standards-Based Platform for AI-Assisted Engineering Across SS&C",
    font_size=20, color=DARK_TEXT, alignment=PP_ALIGN.LEFT)

add_divider(slide, Inches(1), Inches(4.1), Inches(3))

add_text_box(slide, Inches(1), Inches(4.4), Inches(6), Inches(1.0),
    "Engineering Leadership Briefing  |  April 2026\nAI Governance Team  |  SS&C Technologies",
    font_size=14, color=LIGHT_TEXT, alignment=PP_ALIGN.LEFT)

# Right side accent shape
shape = add_shape(slide, Inches(10.5), Inches(1.5), Inches(2.3), Inches(4.5), SUBTLE_BG)
add_text_box(slide, Inches(10.7), Inches(2.0), Inches(1.9), Inches(3.5),
    "26 Agents\n19 Skills\n8 Commands\n3 Catalog Plugins\n6 Languages\nOut of the Box",
    font_size=16, color=PRIMARY, bold=True, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 2: The Problem & Vision
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "The Challenge: Scaling Engineering Quality Across SS&C",
    font_size=28, color=PRIMARY, bold=True)

# Left column - Problems
box = add_shape(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(5.0), SUBTLE_BG)
add_bullet_frame(slide, Inches(1.1), Inches(1.7), Inches(5.0), Inches(4.6), [
    "Teams reinvent patterns: each BU builds its own deployment, testing, and review workflows",
    "Quality is inconsistent: some teams have strong code review, others ship without it",
    "Domain knowledge is siloed: the private cloud team's expertise doesn't reach fund services",
    "AI adoption is fragmented: Copilot here, Cursor there, custom scripts everywhere",
    "No shared standards for how agents should build, test, and review code",
], font_size=13, title="Today's Pain Points", title_color=ACCENT_ERROR)

# Right column - Vision
box = add_shape(slide, Inches(6.8), Inches(1.5), Inches(5.7), Inches(5.0), SUBTLE_BG)
add_bullet_frame(slide, Inches(7.1), Inches(1.7), Inches(5.2), Inches(4.6), [
    "One platform, many flavors: shared base with team-specific customization",
    "Quality gates built in: two-stage review on every build, not optional",
    "Knowledge flows: plugin discovery catalog lets teams share patterns",
    "Spec-driven development: agents implement what's specified, reviewers verify",
    "Out of the box to production: zero config to start, deep customization to grow",
], font_size=13, title="The Vision", title_color=ACCENT_GREEN)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 3: Platform Architecture
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Platform Architecture: Two Components, One Experience",
    font_size=28, color=PRIMARY, bold=True)

# Left: Agent Orchestration
box = add_shape(slide, Inches(0.8), Inches(1.5), Inches(5.5), Inches(5.3), SUBTLE_BG)
add_text_box(slide, Inches(1.1), Inches(1.7), Inches(5.0), Inches(0.5),
    "Agent Orchestration Plugin", font_size=18, color=PRIMARY, bold=True)
add_text_box(slide, Inches(1.1), Inches(2.2), Inches(5.0), Inches(0.4),
    "The multi-agent engine that builds, tests, reviews, and documents code",
    font_size=12, color=LIGHT_TEXT)

add_bullet_frame(slide, Inches(1.1), Inches(2.8), Inches(5.0), Inches(3.8), [
    "/build - Multi-agent implementation from conversation",
    "/implement - Spec-kit driven with parallel specialists",
    "26 specialized agents (architect, builder, validator, security, ...)",
    "Two-stage review: spec compliance then code quality",
    "TDD enforcement, integration verification, no scaffolding",
    "Jira integration, MCP servers, observability setup",
    "/private-cloud - Terraform for SS&C + AWS hybrid",
    "/c4 - Architecture documentation with Mermaid diagrams",
], font_size=12)

# Right: Plugin Discovery
box = add_shape(slide, Inches(6.8), Inches(1.5), Inches(5.7), Inches(5.3), SUBTLE_BG)
add_text_box(slide, Inches(7.1), Inches(1.7), Inches(5.2), Inches(0.5),
    "Plugin Discovery Marketplace", font_size=18, color=PRIMARY, bold=True)
add_text_box(slide, Inches(7.1), Inches(2.2), Inches(5.2), Inches(0.4),
    "The catalog for discovering, inheriting, and sharing plugins across SS&C",
    font_size=12, color=LIGHT_TEXT)

add_bullet_frame(slide, Inches(7.1), Inches(2.8), Inches(5.2), Inches(3.8), [
    "/find-plugin - Conversational auto-discovery from natural language",
    "/discover-plugin - Full interactive catalog browser",
    "/contribute-plugin-marketplace - Register your plugin",
    "/inherit-plugin - Clone, remap domain + tech, generate",
    "Taxonomy: division > business unit > team > plugin",
    "3 plugins in catalog: agent-orch, ssnc-cloud, ssc-devops",
    "Structured manifests (plugin.md) with searchable metadata",
    "Anyone can contribute - wizard generates the manifest",
], font_size=12)

# Connection arrow area
add_text_box(slide, Inches(4.5), Inches(6.3), Inches(4), Inches(0.5),
    "Together: install, discover, inherit, customize, contribute back",
    font_size=12, color=SECONDARY, bold=True, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 4: The 26 Agents
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "26 Specialized Agents: The Right Expert for Every Task",
    font_size=28, color=PRIMARY, bold=True)

# Core agents
box = add_shape(slide, Inches(0.8), Inches(1.4), Inches(2.8), Inches(2.8), SUBTLE_BG)
add_bullet_frame(slide, Inches(1.0), Inches(1.5), Inches(2.5), Inches(2.6), [
    "Architect (opus) - plans work",
    "Builder (sonnet) - TDD implementation",
    "Validator (sonnet) - testing + coverage",
    "Scribe (sonnet) - documentation",
], font_size=11, title="Core (4)", title_color=PRIMARY)

# Review agents
box = add_shape(slide, Inches(3.9), Inches(1.4), Inches(2.8), Inches(2.8), SUBTLE_BG)
add_bullet_frame(slide, Inches(4.1), Inches(1.5), Inches(2.5), Inches(2.6), [
    "Spec Reviewer (opus) - Stage 1",
    "Quality Reviewer (opus) - Stage 2",
    "Debugger (opus) - root cause",
], font_size=11, title="Review & Debug (3)", title_color=PRIMARY)

# Specialist agents
box = add_shape(slide, Inches(7.0), Inches(1.4), Inches(5.5), Inches(2.8), SUBTLE_BG)
add_bullet_frame(slide, Inches(7.2), Inches(1.5), Inches(2.4), Inches(2.6), [
    "Security - OWASP audit",
    "Performance - benchmarks",
    "API - REST/GraphQL design",
    "Database - schema + queries",
    "DevOps - CI/CD + K8s",
    "Telemetry - OpenTelemetry",
    "UI/UX - design systems",
    "Refactorer - tech debt",
], font_size=11, title="Specialists (15)", title_color=PRIMARY)

add_bullet_frame(slide, Inches(9.8), Inches(1.7), Inches(2.4), Inches(2.5), [
    "Migration - upgrades",
    "Data Engineer - ETL",
    "ML Engineer - MLOps",
    "Observability - SLOs",
    "Incident Responder",
    "Legacy Modernizer",
    "C4 Scribe - arch docs",
], font_size=11)

# Coordination agents
box = add_shape(slide, Inches(0.8), Inches(4.5), Inches(11.7), Inches(2.2), SUBTLE_BG)
add_bullet_frame(slide, Inches(1.0), Inches(4.6), Inches(5.5), Inches(2.0), [
    "Advocate (opus) - challenges architecture decisions, discovers existing services, creates Jira tickets",
    "Private Cloud (sonnet) - Terraform/HCL for SS&C and AWS hybrid infrastructure",
    "Content Specialist (sonnet) - technical writing, tutorials, blog posts beyond code docs",
    "Jira Triage (sonnet) - classifies issues as agent-ready, human-review, or not-code-work",
], font_size=11, title="Coordination & Support (4)", title_color=PRIMARY)

add_text_box(slide, Inches(7.0), Inches(4.8), Inches(5.0), Inches(0.8),
    "Model selection: opus for complex reasoning (planning, review, debugging)\nsonnet for focused domain work (implementation, testing, analysis)",
    font_size=11, color=LIGHT_TEXT)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 5: How /build Works
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "How /build Works: From Intent to Verified Code",
    font_size=28, color=PRIMARY, bold=True)

phases = [
    ("1", "Requirements", "Conversational\ngathering", PRIMARY),
    ("1.5", "Advocate", "Challenge\nassumptions", SECONDARY),
    ("2", "Architect", "Analyze codebase\ncreate plan", PRIMARY),
    ("3", "Implement", "Builder + Validator\n+ Specialists", ACCENT_GREEN),
    ("3.5", "Verify", "Build + migrate\n+ start + lint", MARIGOLD),
    ("4", "Review", "Spec compliance\n+ code quality", RASPBERRY),
    ("5", "Finalize", "Jira update\n+ documentation", PRIMARY),
]

x_start = Inches(0.5)
box_w = Inches(1.6)
gap = Inches(0.15)
y_top = Inches(1.6)
box_h = Inches(2.0)

for i, (num, title, desc, color) in enumerate(phases):
    x = x_start + i * (box_w + gap)
    shape = add_shape(slide, x, y_top, box_w, box_h, color)
    # Phase number
    add_text_box(slide, x, y_top + Inches(0.1), box_w, Inches(0.35),
        f"Phase {num}", font_size=10, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)
    # Title
    add_text_box(slide, x, y_top + Inches(0.4), box_w, Inches(0.4),
        title, font_size=14, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)
    # Description
    add_text_box(slide, x + Inches(0.1), y_top + Inches(0.9), box_w - Inches(0.2), Inches(0.9),
        desc, font_size=10, color=WHITE, alignment=PP_ALIGN.CENTER)

# Key points below
add_divider(slide, Inches(0.8), Inches(4.0), Inches(11.5))

add_bullet_frame(slide, Inches(0.8), Inches(4.2), Inches(5.5), Inches(2.5), [
    "Zero configuration required - describe what you want, agents do the rest",
    "TDD mandatory: Builder writes failing test first, then implementation",
    "Specialist agents auto-selected based on feature complexity",
    "Two-stage review is sequential: Stage 1 must pass before Stage 2 starts",
    "Refinement loops: failed reviews create tasks, agents fix, re-review",
], font_size=12, title="Key Principles", title_color=DARK_TEXT)

add_bullet_frame(slide, Inches(7.0), Inches(4.2), Inches(5.5), Inches(2.5), [
    "Session tracked in ssnc-agent-orch/YYYY-MM-DD-[feature]/",
    "PLAN.md - requirements and task breakdown",
    "STATUS.md - real-time agent progress",
    "All agents have ISC2 certifications (CISSP, CCSP, CSSLP) applied",
    "No scaffolding: TODOs, stubs, placeholders are rejected by reviewers",
], font_size=12, title="Governance", title_color=DARK_TEXT)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 6: Discovery & Catalog
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Plugin Discovery: Share Patterns Across SS&C",
    font_size=28, color=PRIMARY, bold=True)

# Flow diagram
add_text_box(slide, Inches(0.8), Inches(1.3), Inches(11.5), Inches(0.5),
    "Your Repo  -->  /find-plugin  -->  Catalog (plugin.md manifests)  -->  /inherit-plugin  -->  Your Adapted Plugin",
    font_size=14, color=SECONDARY, bold=True, alignment=PP_ALIGN.CENTER)

# Catalog entries
entries = [
    ("Agent Orchestration", "agent-orch", "AI Governance", "26 agents, 19 skills, 8 commands\nMulti-agent orchestration engine", PRIMARY),
    ("SS&C Private Cloud", "ssnc-cloud", "Cloud Team", "3 plugins: cloud-developer, cloud-pro, cloud-pipeline\nJava/Spring Boot, Terraform, K8s", SECONDARY),
    ("SS&C DevOps", "ssc-devops", "GlobeOp", "5 skills: deploy, cicd, monitor, security, troubleshoot\nBolt API, Ansible, GitHub Actions", ACCENT_GREEN),
]

for i, (name, slug, team, desc, color) in enumerate(entries):
    y = Inches(2.1) + i * Inches(1.5)
    box = add_shape(slide, Inches(0.8), y, Inches(11.5), Inches(1.3), SUBTLE_BG)
    add_text_box(slide, Inches(1.1), y + Inches(0.1), Inches(4), Inches(0.4),
        name, font_size=16, color=color, bold=True)
    add_text_box(slide, Inches(5.5), y + Inches(0.1), Inches(2.5), Inches(0.4),
        f"Owner: {team}", font_size=11, color=LIGHT_TEXT)
    add_text_box(slide, Inches(1.1), y + Inches(0.5), Inches(10), Inches(0.7),
        desc, font_size=12, color=BODY_TEXT)

# Bottom
add_divider(slide, Inches(0.8), Inches(6.0), Inches(11.5))
add_text_box(slide, Inches(0.8), Inches(6.1), Inches(11.5), Inches(0.6),
    "Any team can contribute: /contribute-plugin-marketplace scans your plugin, generates a manifest, and submits a merge request to the catalog",
    font_size=13, color=DARK_TEXT, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 7: /add-skill Proposal
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Proposed: /add-skill - Fine-Grained Capability Installation",
    font_size=28, color=PRIMARY, bold=True)

# Problem
box = add_shape(slide, Inches(0.8), Inches(1.4), Inches(5.5), Inches(2.2), SUBTLE_BG)
add_bullet_frame(slide, Inches(1.0), Inches(1.5), Inches(5.1), Inches(2.0), [
    "Today: plugins are all-or-nothing (26 agents + 19 skills per install)",
    "Teams wanting one skill must install the entire plugin",
    "Creates noise, version coupling, and heavyweight adoption",
], font_size=12, title="Problem", title_color=ACCENT_ERROR)

# Solution
box = add_shape(slide, Inches(6.8), Inches(1.4), Inches(5.7), Inches(2.2), SUBTLE_BG)
add_bullet_frame(slide, Inches(7.0), Inches(1.5), Inches(5.3), Inches(2.0), [
    "/add-skill olly - installs just the observability skill + 2 agents",
    "/add-skill cloud-architect - gets cloud expertise without full plugin",
    "Dependency resolution: skills declare required agents/rules",
], font_size=12, title="Solution", title_color=ACCENT_GREEN)

# Comparison table
add_text_box(slide, Inches(0.8), Inches(3.8), Inches(11.5), Inches(0.4),
    "Installation Comparison", font_size=16, color=DARK_TEXT, bold=True)

rows = [
    ("Team wants observability only", "Install full agent-orch\n(26 agents, 19 skills)", "/add-skill olly\n(1 skill, 2 agents)"),
    ("Team wants cloud architect", "Install full ssnc-cloud\n(3 plugins)", "/add-skill cloud-architect\n(1 skill, 1 agent)"),
    ("Team wants safe guardrails", "Install full ssnc-cloud", "/add-skill safe-contributor\n(1 rule set)"),
]

y = Inches(4.3)
# Header
add_text_box(slide, Inches(0.8), y, Inches(3.5), Inches(0.35), "Scenario", font_size=11, color=WHITE, bold=True)
add_text_box(slide, Inches(4.5), y, Inches(4.0), Inches(0.35), "Today", font_size=11, color=WHITE, bold=True)
add_text_box(slide, Inches(8.7), y, Inches(4.0), Inches(0.35), "With /add-skill", font_size=11, color=WHITE, bold=True)
header_bg = add_shape(slide, Inches(0.8), y, Inches(11.5), Inches(0.35), PRIMARY)
header_bg.fill.fore_color.rgb = PRIMARY
# Re-add text on top
add_text_box(slide, Inches(0.8), y, Inches(3.5), Inches(0.35), "Scenario", font_size=11, color=WHITE, bold=True)
add_text_box(slide, Inches(4.5), y, Inches(4.0), Inches(0.35), "Today", font_size=11, color=WHITE, bold=True)
add_text_box(slide, Inches(8.7), y, Inches(4.0), Inches(0.35), "With /add-skill", font_size=11, color=WHITE, bold=True)

for i, (scenario, today, proposed) in enumerate(rows):
    row_y = y + Inches(0.4) + i * Inches(0.7)
    bg_color = WHITE if i % 2 == 0 else SUBTLE_BG
    add_shape(slide, Inches(0.8), row_y, Inches(11.5), Inches(0.65), bg_color)
    add_text_box(slide, Inches(0.9), row_y + Inches(0.05), Inches(3.3), Inches(0.55), scenario, font_size=11, color=DARK_TEXT)
    add_text_box(slide, Inches(4.6), row_y + Inches(0.05), Inches(3.8), Inches(0.55), today, font_size=10, color=ACCENT_ERROR)
    add_text_box(slide, Inches(8.8), row_y + Inches(0.05), Inches(3.8), Inches(0.55), proposed, font_size=10, color=ACCENT_GREEN)

add_text_box(slide, Inches(0.8), Inches(6.7), Inches(11.5), Inches(0.4),
    "Phase 1 (MVP): Local extraction from installed plugins  |  Phase 2: Catalog integration  |  Phase 3: Skill registry",
    font_size=12, color=SECONDARY, bold=True, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 8: Team Customization
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "One Platform, Many Flavors: Team Customization",
    font_size=28, color=PRIMARY, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.2), Inches(11), Inches(0.5),
    "Every team inherits the same base ingredients. Each team adds what their domain, stack, and compliance require.",
    font_size=14, color=BODY_TEXT)

# Team cards
teams = [
    ("GIDS", "Java/Spring Boot\nMariaDB\nSOC 2 compliance\nFund accounting agents", PRIMARY),
    ("WIT", ".NET / C#\nAzure infrastructure\nRegulatory compliance\nWealth mgmt agents", SECONDARY),
    ("Intralinks", "React/TypeScript\nS3/CDN patterns\nData sovereignty\nDocument mgmt agents", ACCENT_GREEN),
    ("GlobeOp", "Python/Java\nBatch processing\nReconciliation rules\nFund operations agents", MARIGOLD),
    ("Private Cloud", "Terraform/HCL\nKubernetes\nNetwork security\nInfrastructure agents", INDIGO),
]

for i, (name, desc, color) in enumerate(teams):
    x = Inches(0.5) + i * Inches(2.5)
    box = add_shape(slide, x, Inches(1.9), Inches(2.3), Inches(2.8), SUBTLE_BG)
    # Color bar at top of card
    bar = add_shape(slide, x, Inches(1.9), Inches(2.3), Inches(0.35), color)
    add_text_box(slide, x, Inches(1.92), Inches(2.3), Inches(0.3),
        name, font_size=14, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)
    add_text_box(slide, x + Inches(0.15), Inches(2.4), Inches(2.0), Inches(2.2),
        desc, font_size=11, color=BODY_TEXT)

# Shared base
add_divider(slide, Inches(0.8), Inches(5.0), Inches(11.5))

add_text_box(slide, Inches(0.8), Inches(5.2), Inches(11.5), Inches(0.4),
    "Shared Base Ingredients (Non-Negotiable Across All Teams)",
    font_size=16, color=DARK_TEXT, bold=True, alignment=PP_ALIGN.CENTER)

shared = [
    "Two-stage review (spec compliance + code quality)",
    "TDD enforcement with coverage targets",
    "Integration verification (build + migrate + start + lint)",
    "No scaffolding policy (fully functional code only)",
    "Advocate review (prevent duplication, discover platform services)",
]
for i, item in enumerate(shared):
    x = Inches(0.8) + (i % 3) * Inches(4.0)
    y = Inches(5.7) + (i // 3) * Inches(0.4)
    add_text_box(slide, x, y, Inches(3.8), Inches(0.35), f"  {item}", font_size=11, color=BODY_TEXT)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 9: What's in the Catalog (Private Cloud + DevOps detail)
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Discoverable Skills: Private Cloud & DevOps for Everyone",
    font_size=28, color=PRIMARY, bold=True)

# Private Cloud section
box = add_shape(slide, Inches(0.8), Inches(1.4), Inches(5.5), Inches(5.2), SUBTLE_BG)
add_text_box(slide, Inches(1.1), Inches(1.5), Inches(5.0), Inches(0.4),
    "SS&C Private Cloud Developer Toolkit", font_size=16, color=PRIMARY, bold=True)
add_text_box(slide, Inches(1.1), Inches(1.9), Inches(5.0), Inches(0.3),
    "Owner: Cloud Team  |  Stack: Java, Spring Boot, Angular, Terraform, K8s", font_size=10, color=LIGHT_TEXT)

cloud_skills = [
    ("/spec-build", "End-to-end feature pipeline: spec -> architect challenge -> implementation"),
    ("/safe-contributor", "Conservative guardrails: PR size limits, test requirements, security"),
    ("/cloud-architect", "Deep platform expertise: Stratus, Gateway, Edge, Roustabout, Gatsby, Icarus"),
    ("/cloud-deploy", "Deploy to SS&C Cloud environments (planned)"),
    ("/cloud-troubleshoot", "Cross-service debugging with logs, traces, K8s state (planned)"),
    ("/cloud-db", "MariaDB query, schema inspection, data diagnostics (planned)"),
]
for i, (skill, desc) in enumerate(cloud_skills):
    y = Inches(2.4) + i * Inches(0.65)
    add_text_box(slide, Inches(1.1), y, Inches(1.5), Inches(0.3), skill, font_size=11, color=SECONDARY, bold=True)
    add_text_box(slide, Inches(2.6), y, Inches(3.5), Inches(0.55), desc, font_size=10, color=BODY_TEXT)

# DevOps section
box = add_shape(slide, Inches(6.8), Inches(1.4), Inches(5.7), Inches(5.2), SUBTLE_BG)
add_text_box(slide, Inches(7.1), Inches(1.5), Inches(5.2), Inches(0.4),
    "SS&C DevOps Cloud Automation", font_size=16, color=PRIMARY, bold=True)
add_text_box(slide, Inches(7.1), Inches(1.9), Inches(5.2), Inches(0.3),
    "Owner: GlobeOp  |  Stack: Python, Ansible, Terraform, GitHub Actions", font_size=10, color=LIGHT_TEXT)

devops_skills = [
    ("/ssc-cloud-deploy", "Bolt API + Ansible deployment, Docker/Podman, zero-downtime"),
    ("/ssc-cloud-cicd", "GitHub Actions, blue-green deployments, automated rollback"),
    ("/ssc-cloud-monitor", "OpenSearch + Prometheus + Grafana, Fluent Bit log forwarding"),
    ("/ssc-cloud-security", "LDAP/AD auth, secrets management, TLS/SSL, audit logging"),
    ("/ssc-cloud-troubleshoot", "Systematic diagnostics for deployment and runtime issues"),
]
for i, (skill, desc) in enumerate(devops_skills):
    y = Inches(2.4) + i * Inches(0.65)
    add_text_box(slide, Inches(7.1), y, Inches(2.2), Inches(0.3), skill, font_size=11, color=ACCENT_GREEN, bold=True)
    add_text_box(slide, Inches(9.3), y, Inches(3.5), Inches(0.55), desc, font_size=10, color=BODY_TEXT)

add_text_box(slide, Inches(0.8), Inches(6.8), Inches(11.5), Inches(0.4),
    "These skills are available today via /discover-plugin  |  Proposed: make key skills available via /add-skill without full plugin install",
    font_size=12, color=SECONDARY, bold=True, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 10: Supply Chain Security
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Supply Chain Security: Defense-in-Depth for Agentic Code",
    font_size=28, color=PRIMARY, bold=True)

add_text_box(slide, Inches(0.8), Inches(1.2), Inches(11), Inches(0.5),
    "AI agents exponentially increase supply chain surface area. Every build introduces dynamic dependencies, agent-generated artifacts, and model-driven decisions. We need both internal controls AND external intelligence.",
    font_size=13, color=BODY_TEXT)

# Layer 1: Internal
box = add_shape(slide, Inches(0.8), Inches(1.9), Inches(3.7), Inches(3.2), SUBTLE_BG)
bar = add_shape(slide, Inches(0.8), Inches(1.9), Inches(3.7), Inches(0.35), PRIMARY)
add_text_box(slide, Inches(0.8), Inches(1.92), Inches(3.7), Inches(0.3),
    "Layer 1: Build Our Own", font_size=13, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)
add_bullet_frame(slide, Inches(1.0), Inches(2.4), Inches(3.3), Inches(2.5), [
    "Agent provenance tracking (which agent, which model, which plan)",
    "Agent-generated SBOM as mandatory build artifact",
    "Extended commit metadata (agent chain, review status)",
    "Supply chain checks in two-stage review gates",
    "Agent tool grants audited (principle of least privilege)",
], font_size=10)

# Layer 2: Kusari
box = add_shape(slide, Inches(4.8), Inches(1.9), Inches(3.7), Inches(3.2), SUBTLE_BG)
bar = add_shape(slide, Inches(4.8), Inches(1.9), Inches(3.7), Inches(0.35), SECONDARY)
add_text_box(slide, Inches(4.8), Inches(1.92), Inches(3.7), Inches(0.3),
    "Layer 2: Kusari + GUAC", font_size=13, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)
add_bullet_frame(slide, Inches(5.0), Inches(2.4), Inches(3.3), Inches(2.5), [
    "GUAC graph database maps full supply chain (OpenSSF project)",
    "Automated SBOM: CycloneDX, SPDX, in-toto, SLSA",
    "Vulnerability intelligence with context (70% faster MTTR)",
    "CI/CD policy enforcement (fail-fast, zero unknowns in prod)",
    "Provenance verification + signed attestations",
], font_size=10)

# Layer 3: Combined
box = add_shape(slide, Inches(8.8), Inches(1.9), Inches(3.7), Inches(3.2), SUBTLE_BG)
bar = add_shape(slide, Inches(8.8), Inches(1.9), Inches(3.7), Inches(0.35), ACCENT_GREEN)
add_text_box(slide, Inches(8.8), Inches(1.92), Inches(3.7), Inches(0.3),
    "Layer 3: Defense-in-Depth", font_size=13, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)
add_bullet_frame(slide, Inches(9.0), Inches(2.4), Inches(3.3), Inches(2.5), [
    "Internal controls catch agent-specific risks (model CVEs, config tampering)",
    "Kusari catches traditional risks (vulnerable deps, typosquats, licenses)",
    "GUAC tracks agent changes as supply chain events",
    "Redundancy is intentional - neither layer alone is sufficient",
    "Secure from the ground up, not bolted on later",
], font_size=10)

# Why this matters box
add_divider(slide, Inches(0.8), Inches(5.3), Inches(11.5))

add_text_box(slide, Inches(0.8), Inches(5.5), Inches(5.5), Inches(0.4),
    "The New Reality", font_size=16, color=DARK_TEXT, bold=True)

risks = [
    ("Agent adds dependency dynamically", "Provenance log + Kusari scan", BODY_TEXT),
    ("Model CVE changes agent behavior", "Internal tracking (Kusari can't see this)", ACCENT_WARN),
    ("Agent configs grant Bash access", "Least privilege audit + attestation", ACCENT_ERROR),
    ("26 agents x N teams = massive surface", "GUAC graph + continuous monitoring", BODY_TEXT),
]

for i, (risk, mitigation, color) in enumerate(risks):
    y = Inches(5.9) + i * Inches(0.35)
    add_text_box(slide, Inches(0.8), y, Inches(5.5), Inches(0.3), risk, font_size=10, color=color)
    add_text_box(slide, Inches(6.8), y, Inches(5.5), Inches(0.3), mitigation, font_size=10, color=ACCENT_GREEN)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 11: Maturity Model (renumbered)
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Adoption Maturity: From Zero Config to Platform Contributor",
    font_size=28, color=PRIMARY, bold=True)

levels = [
    ("Level 1", "Getting Started", "Use /build conversationally\nAgents figure out your stack\nZero configuration", "Week 1", NEUTRAL_LINE),
    ("Level 2", "Structured", "Write specs first\nUse /implement with spec-kit\nJira integration", "Weeks 2-3", SECONDARY),
    ("Level 3", "Customized", "Inherit plugin\nAdd domain agents + rules\nCustom conventions", "Month 1-2", PRIMARY),
    ("Level 4", "Integrated", "Jira-driven work queue\nAutomated issue triage\nLabel governance", "Month 2-3", ACCENT_GREEN),
    ("Level 5", "Platform", "Contribute plugins back\nCatalog registration\nCross-team sharing", "Month 3+", MARIGOLD),
]

for i, (level, name, desc, timeline, color) in enumerate(levels):
    y = Inches(1.4) + i * Inches(1.1)
    # Level indicator
    bar = add_shape(slide, Inches(0.8), y, Inches(0.8), Inches(0.9), color)
    add_text_box(slide, Inches(0.8), y + Inches(0.05), Inches(0.8), Inches(0.35),
        level, font_size=10, color=DARK_TEXT if color == NEUTRAL_LINE else WHITE, bold=True, alignment=PP_ALIGN.CENTER)
    add_text_box(slide, Inches(0.8), y + Inches(0.4), Inches(0.8), Inches(0.4),
        name, font_size=9, color=DARK_TEXT if color == NEUTRAL_LINE else WHITE, alignment=PP_ALIGN.CENTER)
    # Description
    box = add_shape(slide, Inches(1.8), y, Inches(8.2), Inches(0.9), SUBTLE_BG)
    add_text_box(slide, Inches(2.0), y + Inches(0.1), Inches(7.0), Inches(0.7),
        desc, font_size=11, color=BODY_TEXT)
    # Timeline
    add_text_box(slide, Inches(10.2), y + Inches(0.2), Inches(2.5), Inches(0.4),
        timeline, font_size=12, color=color if color != NEUTRAL_LINE else LIGHT_TEXT, bold=True)

add_text_box(slide, Inches(0.8), Inches(6.9), Inches(11.5), Inches(0.4),
    "Most teams should start at Level 1 and grow. The platform supports every level without requiring you to jump ahead.",
    font_size=13, color=DARK_TEXT, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 11: Honest Assessment
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(11), Inches(0.7),
    "Honest Assessment: Strengths, Gaps, and Next Steps",
    font_size=28, color=PRIMARY, bold=True)

# Strengths
box = add_shape(slide, Inches(0.8), Inches(1.4), Inches(3.7), Inches(5.0), SUBTLE_BG)
add_bullet_frame(slide, Inches(1.0), Inches(1.5), Inches(3.3), Inches(4.8), [
    "Two-stage review catches real gaps between spec and code",
    "Zero-config /build works immediately with any tech stack",
    "Plugin inheritance is the right model for org-wide sharing",
    "Discovery catalog is well-structured and searchable",
    "Agent specialization is right-sized (26 focused roles)",
], font_size=11, title="What Works", title_color=ACCENT_GREEN)

# Gaps
box = add_shape(slide, Inches(4.8), Inches(1.4), Inches(3.7), Inches(5.0), SUBTLE_BG)
add_bullet_frame(slide, Inches(5.0), Inches(1.5), Inches(3.3), Inches(4.8), [
    "No supply chain security for agent-generated code",
    "No observability into agent behavior or token costs",
    "No regression testing for agent output quality",
    "Documentation counts/versions are inconsistent",
    "All-or-nothing plugin install (no /add-skill yet)",
    "No cross-repo orchestration for microservices",
    "Failure modes are undocumented",
], font_size=11, title="Gaps", title_color=ACCENT_ERROR)

# Next Steps
box = add_shape(slide, Inches(8.8), Inches(1.4), Inches(3.7), Inches(5.0), SUBTLE_BG)
add_bullet_frame(slide, Inches(9.0), Inches(1.5), Inches(3.3), Inches(4.8), [
    "P0: Supply chain security (Kusari POC + internal controls)",
    "P0: Fix doc discrepancies, add tutorial",
    "P1: Build /add-skill Phase 1",
    "P1: Session analytics + token counting",
    "P1: Agent tool grant audit",
    "P2: GUAC deployment for cross-team graph",
    "P2: Agent regression test suite",
], font_size=11, title="Priority Actions", title_color=PRIMARY)

add_footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 12: Call to Action
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)
add_accent_bar(slide)

add_text_box(slide, Inches(1), Inches(1.5), Inches(11), Inches(0.8),
    "Next Steps",
    font_size=36, color=PRIMARY, bold=True, alignment=PP_ALIGN.CENTER)

add_divider(slide, Inches(5.5), Inches(2.5), Inches(2))

actions = [
    ("For Engineering Teams", "Install the plugin and try /build on your next feature.\nNo configuration, no commitment, just see what agents produce.", SECONDARY),
    ("For Team Leads", "Run /discover-plugin to see what's available.\nEvaluate /inherit-plugin to customize for your domain.", PRIMARY),
    ("For Platform Teams", "Register your patterns in the catalog with /contribute-plugin-marketplace.\nOther teams are looking for what you've already built.", ACCENT_GREEN),
    ("For This Platform", "Fix documentation accuracy, build /add-skill, add session analytics.\nEat our own cooking: test agents the way agents test code.", DARK_TEXT),
]

for i, (audience, action, color) in enumerate(actions):
    y = Inches(3.0) + i * Inches(1.05)
    add_text_box(slide, Inches(1.5), y, Inches(3), Inches(0.4),
        audience, font_size=16, color=color, bold=True)
    add_text_box(slide, Inches(4.8), y, Inches(7), Inches(0.9),
        action, font_size=13, color=BODY_TEXT)

add_divider(slide, Inches(1), Inches(7.0), Inches(11))

add_text_box(slide, Inches(1), Inches(6.5), Inches(11), Inches(0.5),
    "Slack: #ai-agent-orchestration  |  Email: ai-governance@ssnc.com  |  Repo: code.ssnc.dev/ai/claude-agent-orchestration-plugin",
    font_size=12, color=LIGHT_TEXT, alignment=PP_ALIGN.CENTER)

add_footer(slide)

# Save
output_path = '/Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/standards/agentic-software-rdo-cto-briefing.pptx'
prs.save(output_path)
print(f"Saved to {output_path}")
print(f"Slides: {len(prs.slides)}")
