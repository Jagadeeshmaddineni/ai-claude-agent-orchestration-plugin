#!/usr/bin/env python3
"""Generate AI Model SDLC Lifecycle presentation - Bluestone light mode"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Bluestone light-mode palette
PRIMARY = RGBColor(0x1F, 0x66, 0x81)
SECONDARY = RGBColor(0x0D, 0x9D, 0xDB)
DARK_TEXT = RGBColor(0x1B, 0x3D, 0x55)
BODY_TEXT = RGBColor(0x3D, 0x51, 0x67)
LIGHT_TEXT = RGBColor(0x5B, 0x6A, 0x85)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_BG = RGBColor(0xF6, 0xFD, 0xFF)
SUBTLE_BG = RGBColor(0xEE, 0xF4, 0xF8)
GREEN = RGBColor(0x00, 0xA8, 0x6B)
WARN = RGBColor(0xFF, 0xA8, 0x00)
ERROR = RGBColor(0xFF, 0x3B, 0x30)
NEUTRAL_LINE = RGBColor(0xC2, 0xD0, 0xDB)
AQUA = RGBColor(0x00, 0xCE, 0xD1)
MARIGOLD = RGBColor(0xFF, 0xB3, 0x47)
INDIGO = RGBColor(0x4B, 0x00, 0x82)
RASPBERRY = RGBColor(0xE3, 0x0B, 0x5C)
SAPPHIRE = RGBColor(0x0F, 0x52, 0xBA)

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
    shape.shadow.inherit = False
    return shape

def add_rect(slide, left, top, width, height, color):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    shape.shadow.inherit = False
    return shape

def tb(slide, left, top, width, height, text, size=14, color=BODY_TEXT, bold=False, align=PP_ALIGN.LEFT):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = 'Inter'
    p.alignment = align
    return tf

def bullets(slide, left, top, width, height, items, size=14, color=BODY_TEXT, title=None, title_color=PRIMARY):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    first = True
    if title:
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(size + 2)
        p.font.color.rgb = title_color
        p.font.bold = True
        p.font.name = 'Inter'
        p.space_after = Pt(6)
        first = False
    for item in items:
        if first:
            p = tf.paragraphs[0]
            first = False
        else:
            p = tf.add_paragraph()
        p.text = item
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.font.name = 'Inter'
        p.space_after = Pt(3)
    return tf

def accent_bar(slide, top=Inches(0), color=PRIMARY):
    add_rect(slide, Inches(0), top, prs.slide_width, Inches(0.06), color)

def footer(slide, text="SS&C Technologies  |  AI Gateway  |  Confidential"):
    tb(slide, Inches(0.5), Inches(7.0), Inches(12), Inches(0.4), text, size=9, color=LIGHT_TEXT)

def divider(slide, left, top, width):
    add_rect(slide, left, top, width, Inches(0.02), NEUTRAL_LINE)

# ═══════════════════════════════════════════════════════════════
# SLIDE 1: Title
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
accent_bar(slide)

tb(slide, Inches(1), Inches(1.6), Inches(10), Inches(1.2),
    "AI Model SDLC\nLifecycle Management",
    size=42, color=PRIMARY, bold=True)

tb(slide, Inches(1), Inches(3.2), Inches(9), Inches(0.6),
    "Automated Request-to-Deployment Pipeline with Gemma 4 Consolidation Strategy",
    size=20, color=DARK_TEXT)

divider(slide, Inches(1), Inches(4.1), Inches(3))

tb(slide, Inches(1), Inches(4.4), Inches(6), Inches(1.0),
    "AI Governance  |  April 2026\nBuilding on Derek Feng's Lifecycle Framework (Feb 2026)",
    size=14, color=LIGHT_TEXT)

# Stats box
add_shape(slide, Inches(10.2), Inches(1.5), Inches(2.6), Inches(4.5), SUBTLE_BG)
tb(slide, Inches(10.3), Inches(1.7), Inches(2.4), Inches(4.0),
    "4 Data Centers\n10 GPU Chassis\n10 Distinct Models\n80 GPU Chips\n5 Strategic Slots\n~40 Chips\n  Freeable",
    size=15, color=PRIMARY, bold=True, align=PP_ALIGN.CENTER)

footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 2: Enhanced Lifecycle - Jira + Agent Automation
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
accent_bar(slide)

tb(slide, Inches(0.8), Inches(0.4), Inches(11), Inches(0.7),
    "Enhanced Model Lifecycle: Jira-Driven Agent Automation",
    size=28, color=PRIMARY, bold=True)

tb(slide, Inches(0.8), Inches(1.0), Inches(11), Inches(0.4),
    "Derek Feng's lifecycle + automated request intake, GPU provisioning checks, and agent-assisted evaluation",
    size=13, color=LIGHT_TEXT)

# Flow phases
phases = [
    ("1", "Model\nRequest", "Jira ticket\ncreated", SECONDARY, "CRUD UI form\n+ HuggingFace link"),
    ("2", "Agent\nTriage", "Auto-assess\nfeasibility", PRIMARY, "GPU check\n+ license check"),
    ("3", "Legal\nReview", "Human-in-loop\napproval", RASPBERRY, "Apache/MIT/custom\nlicense review"),
    ("4", "Benchmark\nEval", "External +\ninternal evals", SAPPHIRE, "MMLU, LiveCode,\nvibe check, HW perf"),
    ("5", "GPU\nPlanning", "Capacity +\nreplacement", GREEN, "Which chips?\nWhat retires?"),
    ("6", "Deploy /\nDeprecate", "Tiered\nrollout", MARIGOLD, "Hot/Warm/Cold\n+ sleep mode"),
    ("7", "Monitor\n& Retire", "Ongoing\ngovernance", PRIMARY, "Usage metrics\n+ deprecation"),
]

x_start = Inches(0.3)
box_w = Inches(1.72)
gap = Inches(0.1)
y_top = Inches(1.6)
box_h = Inches(1.6)

for i, (num, title, desc, color, detail) in enumerate(phases):
    x = x_start + i * (box_w + gap)
    add_shape(slide, x, y_top, box_w, box_h, color)
    tb(slide, x, y_top + Inches(0.05), box_w, Inches(0.25),
        f"Phase {num}", size=9, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    tb(slide, x, y_top + Inches(0.25), box_w, Inches(0.5),
        title, size=13, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    tb(slide, x + Inches(0.05), y_top + Inches(0.8), box_w - Inches(0.1), Inches(0.7),
        desc, size=9, color=WHITE, align=PP_ALIGN.CENTER)
    # Detail below
    add_shape(slide, x, y_top + box_h + Inches(0.08), box_w, Inches(0.9), SUBTLE_BG)
    tb(slide, x + Inches(0.05), y_top + box_h + Inches(0.1), box_w - Inches(0.1), Inches(0.8),
        detail, size=9, color=BODY_TEXT, align=PP_ALIGN.CENTER)

# Key enhancements
divider(slide, Inches(0.8), Inches(4.5), Inches(11.5))

tb(slide, Inches(0.8), Inches(4.7), Inches(11), Inches(0.4),
    "What's New vs Derek's Original Framework", size=16, color=DARK_TEXT, bold=True)

add_shape(slide, Inches(0.8), Inches(5.2), Inches(3.7), Inches(1.5), SUBTLE_BG)
bullets(slide, Inches(1.0), Inches(5.25), Inches(3.3), Inches(1.4), [
    "Request enters Jira (not email/Slack)",
    "Agent auto-triages: license, GPU fit, benchmark data",
    "CRUD UI for simple request/status tracking",
], size=11, title="Jira + Agent Intake", title_color=SECONDARY)

add_shape(slide, Inches(4.8), Inches(5.2), Inches(3.7), Inches(1.5), SUBTLE_BG)
bullets(slide, Inches(5.0), Inches(5.25), Inches(3.3), Inches(1.4), [
    "Agent checks available GPU chips across 4 DCs (80 chips, 10 chassis)",
    "Auto-calculates if model fits current capacity",
    "Identifies what can be retired to make room",
], size=11, title="GPU Auto-Check", title_color=GREEN)

add_shape(slide, Inches(8.8), Inches(5.2), Inches(3.7), Inches(1.5), SUBTLE_BG)
bullets(slide, Inches(9.0), Inches(5.25), Inches(3.3), Inches(1.4), [
    "Legal review is human-in-the-loop (not skippable)",
    "But it's a simple CRUD approval workflow",
    "Apache 2.0 = fast-track; custom = full review",
], size=11, title="Legal as CRUD Workflow", title_color=RASPBERRY)

footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 3: Current GPU Inventory
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
accent_bar(slide)

tb(slide, Inches(0.8), Inches(0.4), Inches(11), Inches(0.7),
    "Current GPU Inventory: 4 Data Centers, 80 Chips (10 Chassis)",
    size=28, color=PRIMARY, bold=True)

# us-kc1-prod
dc_data = [
    ("us-kc1", [
        ("H100", "C1", "2", "Llama3.1-8B"),
        ("H100", "C1", "4", "Llama3.1-70B"),
        ("H100", "C1", "2", "all-mpnet-base-v2"),
        ("H200", "C2", "4", "Llama3.3-70B"),
        ("H200", "C2", "4", "Qwen3-30B-A3B"),
        ("H200", "C3", "6", "Qwen2.5-VL-32B"),
        ("H200", "C3", "2", "Available"),
    ], "24 chips"),
    ("us-sl", [
        ("H100", "C1", "2", "Llama3.1-8B"),
        ("H100", "C1", "4", "Llama3.1-70B"),
        ("H100", "C1", "2", "all-mpnet-base-v2"),
        ("H200", "C2", "4", "Llama3.3-70B"),
        ("H200", "C2", "4", "Qwen3-30B-A3B"),
        ("H200", "C3", "6", "Qwen2.5-VL-32B"),
        ("H200", "C3", "2", "Available"),
    ], "24 chips"),
    ("uk-london", [
        ("H200", "C1", "8", "Kimi K2 Thinking"),
        ("H200", "C2", "1", "all-mpnet-base-v2"),
        ("H200", "C2", "1", "qwen3-embed-8b"),
        ("H200", "C2", "2", "Parakeet Voice"),
        ("H200", "C2", "4", "Qwen3-VL-235B"),
    ], "16 chips"),
    ("uk-whales", [
        ("H200", "C1", "8", "Kimi K2 Thinking"),
        ("H200", "C2", "1", "all-mpnet-base-v2"),
        ("H200", "C2", "1", "qwen3-embed-8b"),
        ("H200", "C2", "2", "Parakeet Voice"),
        ("H200", "C2", "4", "Qwen3-VL-235B"),
    ], "16 chips"),
]

for dc_idx, (dc_name, rows, total) in enumerate(dc_data):
    x_base = Inches(0.4) + dc_idx * Inches(3.15)
    y_base = Inches(1.2)

    # DC header
    add_rect(slide, x_base, y_base, Inches(3.0), Inches(0.35), PRIMARY)
    tb(slide, x_base, y_base + Inches(0.02), Inches(3.0), Inches(0.3),
        f"{dc_name} ({total})", size=11, color=WHITE, bold=True, align=PP_ALIGN.CENTER)

    # Column headers
    header_y = y_base + Inches(0.4)
    add_rect(slide, x_base, header_y, Inches(3.0), Inches(0.25), SUBTLE_BG)
    tb(slide, x_base + Inches(0.05), header_y, Inches(0.5), Inches(0.25), "GPU", size=8, color=DARK_TEXT, bold=True)
    tb(slide, x_base + Inches(0.55), header_y, Inches(0.3), Inches(0.25), "C#", size=8, color=DARK_TEXT, bold=True)
    tb(slide, x_base + Inches(0.85), header_y, Inches(0.3), Inches(0.25), "Chips", size=8, color=DARK_TEXT, bold=True)
    tb(slide, x_base + Inches(1.2), header_y, Inches(1.7), Inches(0.25), "Model", size=8, color=DARK_TEXT, bold=True)

    for row_idx, (gpu, chassis, chips, model) in enumerate(rows):
        row_y = header_y + Inches(0.28) + row_idx * Inches(0.28)
        bg = WHITE if row_idx % 2 == 0 else SUBTLE_BG
        add_rect(slide, x_base, row_y, Inches(3.0), Inches(0.26), bg)

        model_color = GREEN if model == "Available" else (WARN if "Parakeet" in model else BODY_TEXT)
        tb(slide, x_base + Inches(0.05), row_y, Inches(0.5), Inches(0.25), gpu, size=8, color=BODY_TEXT)
        tb(slide, x_base + Inches(0.55), row_y, Inches(0.3), Inches(0.25), chassis, size=8, color=BODY_TEXT)
        tb(slide, x_base + Inches(0.85), row_y, Inches(0.3), Inches(0.25), chips, size=8, color=BODY_TEXT)
        tb(slide, x_base + Inches(1.2), row_y, Inches(1.7), Inches(0.25), model, size=8, color=model_color)

# Strategic slots
divider(slide, Inches(0.8), Inches(4.2), Inches(11.5))

tb(slide, Inches(0.8), Inches(4.4), Inches(11), Inches(0.4),
    "The 5 Strategic Slots (from Derek's Minimalist Portfolio)", size=16, color=DARK_TEXT, bold=True)

slots = [
    ("Reasoning", "Complex logic, coding", "Kimi K2 (UK) -> Gemma4?", RASPBERRY),
    ("Vision", "OCR, image analysis", "Qwen3-VL-235B (UK)\nQwen2.5-VL-32B (US)", SAPPHIRE),
    ("Workhorse", "RAG, chat, summarization", "Llama3.3-70B (US)", PRIMARY),
    ("Edge", "High-volume extraction", "Llama3.1-8B (US)", MARIGOLD),
    ("Embedding", "Vector search", "all-mpnet / qwen3-embed", GREEN),
]

for i, (slot, purpose, model, color) in enumerate(slots):
    x = Inches(0.4) + i * Inches(2.5)
    y = Inches(4.9)
    bar = add_rect(slide, x, y, Inches(2.3), Inches(0.3), color)
    tb(slide, x, y + Inches(0.02), Inches(2.3), Inches(0.25), slot, size=11, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    tb(slide, x, y + Inches(0.35), Inches(2.3), Inches(0.25), purpose, size=9, color=BODY_TEXT, align=PP_ALIGN.CENTER)
    tb(slide, x, y + Inches(0.6), Inches(2.3), Inches(0.25), model, size=9, color=LIGHT_TEXT, align=PP_ALIGN.CENTER)

tb(slide, Inches(0.8), Inches(6.0), Inches(11), Inches(0.3),
    "Each chassis = 8 chips  |  US sites mirror each other  |  UK sites mirror each other  |  4 chips available per US site",
    size=9, color=LIGHT_TEXT)

footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 4: Gemma 4 31B - The Consolidation Candidate
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
accent_bar(slide)

tb(slide, Inches(0.8), Inches(0.4), Inches(11), Inches(0.7),
    "Gemma 4 31B-it: One Model, Multiple Slots",
    size=28, color=PRIMARY, bold=True)

tb(slide, Inches(0.8), Inches(1.0), Inches(11), Inches(0.4),
    "google/gemma-4-31B-it  |  30.7B params (dense)  |  256K context  |  Text + Vision + Video  |  Apache 2.0  |  Thinking mode",
    size=12, color=SECONDARY, bold=True)

# Key specs box
add_shape(slide, Inches(0.8), Inches(1.5), Inches(3.5), Inches(2.8), SUBTLE_BG)
bullets(slide, Inches(1.0), Inches(1.6), Inches(3.1), Inches(2.5), [
    "30.7B parameters (dense, all active)",
    "256K token context window",
    "Multimodal: text + image + video (60s)",
    "Native function calling + thinking mode",
    "Apache 2.0 license (legal fast-track)",
    "Hybrid attention (local + global)",
    "~4 H200 chips (BF16) or ~2 chips (INT8)",
    "140+ languages, 35 optimized",
], size=11, title="Model Specs", title_color=PRIMARY)

# Benchmark comparison
add_shape(slide, Inches(4.6), Inches(1.5), Inches(7.8), Inches(2.8), SUBTLE_BG)
tb(slide, Inches(4.8), Inches(1.55), Inches(7.5), Inches(0.35),
    "Benchmark Performance vs Current Fleet", size=14, color=PRIMARY, bold=True)

bench_header_y = Inches(1.95)
headers = [("Benchmark", 2.0), ("Gemma4 31B", 1.2), ("Llama3.3 70B*", 1.2), ("Qwen3 30B*", 1.2), ("Gemma3 27B", 1.2)]
add_rect(slide, Inches(4.8), bench_header_y, Inches(7.4), Inches(0.28), PRIMARY)
hx = 4.8
for hdr, w in headers:
    tb(slide, Inches(hx), bench_header_y, Inches(w), Inches(0.28), hdr, size=9, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    hx += w

bench_rows = [
    ("MMLU Pro", "85.2%", "~70%", "~72%", "67.6%"),
    ("AIME 2026 (math)", "89.2%", "~25%", "~30%", "20.8%"),
    ("GPQA Diamond", "84.3%", "~45%", "~50%", "42.4%"),
    ("LiveCodeBench v6", "80.0%", "~35%", "~40%", "29.1%"),
    ("MMMU Pro (vision)", "76.9%", "N/A", "N/A", "N/A"),
    ("256K context", "Yes", "128K", "128K", "128K"),
]

for ri, (bench, g4, llama, qwen, g3) in enumerate(bench_rows):
    ry = bench_header_y + Inches(0.3) + ri * Inches(0.28)
    bg = WHITE if ri % 2 == 0 else SUBTLE_BG
    add_rect(slide, Inches(4.8), ry, Inches(7.4), Inches(0.27), bg)
    vals = [bench, g4, llama, qwen, g3]
    vx = 4.8
    for vi, (v, w) in enumerate(zip(vals, [h[1] for h in headers])):
        c = GREEN if vi == 1 else BODY_TEXT
        tb(slide, Inches(vx), ry, Inches(w), Inches(0.27), v, size=9, color=c, bold=(vi==1), align=PP_ALIGN.CENTER if vi > 0 else PP_ALIGN.LEFT)
        vx += w

tb(slide, Inches(4.8), Inches(4.0), Inches(7.4), Inches(0.25),
    "* Llama3.3/Qwen3 benchmarks estimated from public data - internal eval required to confirm",
    size=8, color=LIGHT_TEXT)

# What Gemma 4 can cover
divider(slide, Inches(0.8), Inches(4.5), Inches(11.5))

tb(slide, Inches(0.8), Inches(4.7), Inches(11), Inches(0.4),
    "Consolidation Hypothesis: 4 Slots, 1 Model (US + UK)", size=16, color=DARK_TEXT, bold=True)

# Slot cards
slot_cards = [
    ("Workhorse (US)", "Replaces Llama3.3+3.1-70B", "31B vs 70B but benchmarks\nsuggest parity or better\n= fewer chips per instance", GREEN, "16 chips\n(4+4 x2)"),
    ("Vision (US)", "Replaces Qwen2.5-VL-32B", "Gemma4 native vision\n(MMMU Pro: 76.9%)\n= no separate vision model", SAPPHIRE, "12 chips\n(6 x2)"),
    ("Reasoning (US)", "Replaces Qwen3-30B-A3B", "Gemma4 thinking mode\nvs Qwen3 MoE (3B active)\n= eval needed", WARN, "8 chips\n(4 x2)"),
    ("Reasoning (UK)", "Replaces Kimi K2 Thinking", "K2 uses 8 chips/site (16 total)\nGemma4 31B = ~4 chips total\n= massive savings, eval quality", RASPBERRY, "12 chips\n(16->4)"),
]

for i, (title, replaces, rationale, color, chips) in enumerate(slot_cards):
    x = Inches(0.4) + i * Inches(3.2)
    y = Inches(5.15)
    add_shape(slide, x, y, Inches(3.0), Inches(1.6), SUBTLE_BG)
    bar = add_rect(slide, x, y, Inches(3.0), Inches(0.3), color)
    tb(slide, x, y + Inches(0.02), Inches(3.0), Inches(0.25), title, size=10, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    tb(slide, x + Inches(0.1), y + Inches(0.35), Inches(2.8), Inches(0.25), replaces, size=8, color=DARK_TEXT, bold=True)
    tb(slide, x + Inches(0.1), y + Inches(0.6), Inches(1.9), Inches(0.8), rationale, size=7, color=BODY_TEXT)
    tb(slide, x + Inches(2.0), y + Inches(0.7), Inches(0.9), Inches(0.7), chips, size=10, color=color, bold=True, align=PP_ALIGN.CENTER)

footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 5: Capacity Impact Analysis
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
accent_bar(slide)

tb(slide, Inches(0.8), Inches(0.4), Inches(11), Inches(0.7),
    "Capacity Impact: What Gemma 4 Consolidation Could Free Up",
    size=28, color=PRIMARY, bold=True)

# Current allocation
add_shape(slide, Inches(0.8), Inches(1.3), Inches(5.5), Inches(4.0), SUBTLE_BG)
tb(slide, Inches(1.0), Inches(1.4), Inches(5.0), Inches(0.35),
    "Current Allocation (All 4 Sites = 80 chips)", size=16, color=PRIMARY, bold=True)

current_models = [
    ("Llama3.1-8B-Instruct", "4", "H100", "Edge (US only)", BODY_TEXT),
    ("Llama3.1-70B-Instruct", "8", "H100", "Legacy workhorse (US)", WARN),
    ("Llama3.3-70B-Instruct", "8", "H200", "Workhorse (US)", WARN),
    ("Qwen3-30B-A3B", "8", "H200", "Reasoning MoE (US)", WARN),
    ("Qwen2.5-VL-32B-Instruct", "12", "H200", "Vision (US)", WARN),
    ("Kimi K2 Thinking", "16", "H200", "Reasoning (UK)", WARN),
    ("Qwen3-VL-235B (UK)", "8", "H200", "Vision large (UK)", BODY_TEXT),
    ("Embeddings + Voice + Avail", "16", "Mixed", "Infra (all sites)", BODY_TEXT),
]

y_start = Inches(1.9)
# Header
add_rect(slide, Inches(1.0), y_start, Inches(5.0), Inches(0.28), PRIMARY)
tb(slide, Inches(1.0), y_start, Inches(2.0), Inches(0.28), "Model", size=9, color=WHITE, bold=True)
tb(slide, Inches(3.0), y_start, Inches(0.7), Inches(0.28), "Chips", size=9, color=WHITE, bold=True)
tb(slide, Inches(3.7), y_start, Inches(0.6), Inches(0.28), "GPU", size=9, color=WHITE, bold=True)
tb(slide, Inches(4.3), y_start, Inches(1.7), Inches(0.28), "Role", size=9, color=WHITE, bold=True)

for ri, (model, chips, gpu, role, color) in enumerate(current_models):
    ry = y_start + Inches(0.3) + ri * Inches(0.3)
    bg = WHITE if ri % 2 == 0 else SUBTLE_BG
    add_rect(slide, Inches(1.0), ry, Inches(5.0), Inches(0.28), bg)
    tb(slide, Inches(1.05), ry, Inches(1.9), Inches(0.28), model, size=9, color=color)
    tb(slide, Inches(3.0), ry, Inches(0.7), Inches(0.28), chips, size=9, color=color)
    tb(slide, Inches(3.7), ry, Inches(0.6), Inches(0.28), gpu, size=9, color=BODY_TEXT)
    tb(slide, Inches(4.3), ry, Inches(1.7), Inches(0.28), role, size=9, color=BODY_TEXT)

# After consolidation
add_shape(slide, Inches(6.8), Inches(1.3), Inches(5.7), Inches(4.0), SUBTLE_BG)
tb(slide, Inches(7.0), Inches(1.4), Inches(5.2), Inches(0.35),
    "After Gemma 4 Consolidation (Projected)", size=16, color=GREEN, bold=True)

projected = [
    ("Gemma4-31B (US x2)", "8", "H200", "Workhorse+Vision+Reas", GREEN),
    ("Gemma4-31B (UK x2)", "4", "H200", "Reasoning (replaces Kimi)", GREEN),
    ("Qwen3-VL-235B (UK)", "8", "H200", "Vision large (UK)", BODY_TEXT),
    ("Llama3.1-8B + Embed + Voice", "20", "Mixed", "Edge + Infra (retain)", BODY_TEXT),
    ("Freed capacity", "~40 chips", "Mixed", "New models / scale", AQUA),
]

y_start2 = Inches(1.9)
add_rect(slide, Inches(7.0), y_start2, Inches(5.2), Inches(0.28), GREEN)
tb(slide, Inches(7.0), y_start2, Inches(2.2), Inches(0.28), "Model", size=9, color=WHITE, bold=True)
tb(slide, Inches(9.2), y_start2, Inches(0.7), Inches(0.28), "Chips", size=9, color=WHITE, bold=True)
tb(slide, Inches(9.9), y_start2, Inches(0.6), Inches(0.28), "GPU", size=9, color=WHITE, bold=True)
tb(slide, Inches(10.5), y_start2, Inches(1.7), Inches(0.28), "Impact", size=9, color=WHITE, bold=True)

for ri, (model, chips, gpu, role, color) in enumerate(projected):
    ry = y_start2 + Inches(0.3) + ri * Inches(0.35)
    bg = WHITE if ri % 2 == 0 else SUBTLE_BG
    add_rect(slide, Inches(7.0), ry, Inches(5.2), Inches(0.33), bg)
    tb(slide, Inches(7.05), ry, Inches(2.1), Inches(0.33), model, size=9, color=color, bold=(color==GREEN or color==AQUA))
    tb(slide, Inches(9.2), ry, Inches(0.7), Inches(0.33), chips, size=9, color=color, bold=(color==AQUA))
    tb(slide, Inches(9.9), ry, Inches(0.6), Inches(0.33), gpu, size=9, color=BODY_TEXT)
    tb(slide, Inches(10.5), ry, Inches(1.7), Inches(0.33), role, size=9, color=BODY_TEXT)

# Summary box
divider(slide, Inches(0.8), Inches(5.5), Inches(11.5))

summary_items = [
    ("Retired", "US: Llama3.1-70B(8)+3.3-70B(8)+VL-32B(12)+Qwen3-30B(8)=36  |  UK: Kimi K2(16) = 52 chips total", ERROR),
    ("Added", "Gemma4-31B: US 2x4=8 chips + UK 2x2=4 chips = 12 chips total", GREEN),
    ("Net freed", "~40 chips across all sites (52 retired - 12 added) = 50% of fleet capacity for new models or savings", AQUA),
]

for i, (label, desc, color) in enumerate(summary_items):
    y = Inches(5.7) + i * Inches(0.4)
    tb(slide, Inches(1.0), y, Inches(1.2), Inches(0.35), label, size=12, color=color, bold=True)
    tb(slide, Inches(2.2), y, Inches(10), Inches(0.35), desc, size=11, color=BODY_TEXT)

tb(slide, Inches(0.8), Inches(6.9), Inches(11.5), Inches(0.3),
    "All projections require internal benchmark validation. Chip counts are estimates based on BF16 deployment.",
    size=9, color=LIGHT_TEXT)

footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 6: The Jira + Agent Request Workflow
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
accent_bar(slide)

tb(slide, Inches(0.8), Inches(0.4), Inches(11), Inches(0.7),
    "Model Request Workflow: Jira + Agent + Human-in-the-Loop",
    size=28, color=PRIMARY, bold=True)

# CRUD UI section
add_shape(slide, Inches(0.8), Inches(1.3), Inches(5.5), Inches(5.2), SUBTLE_BG)
tb(slide, Inches(1.0), Inches(1.4), Inches(5.0), Inches(0.35),
    "CRUD Request UI (Simple Web Form)", size=16, color=PRIMARY, bold=True)

fields = [
    "Model Name / Size (e.g., google/gemma-4-31B-it)",
    "HuggingFace Link (auto-fetches model card)",
    "Requested By / Team / Business Unit",
    "What model is it replacing? (dropdown of current fleet)",
    "Business Case (free text)",
    "Priority: Standard / Expedited",
    "Target Environment: US-PROD / UK-PROD / Both",
    "GPU Preference: H100 / H200 / Any",
]

for i, field in enumerate(fields):
    y = Inches(1.9) + i * Inches(0.38)
    add_rect(slide, Inches(1.0), y, Inches(5.0), Inches(0.35), WHITE if i % 2 == 0 else SUBTLE_BG)
    tb(slide, Inches(1.1), y + Inches(0.02), Inches(4.8), Inches(0.3), f"{i+1}. {field}", size=10, color=BODY_TEXT)

tb(slide, Inches(1.0), Inches(5.0), Inches(5.0), Inches(0.5),
    "Submit creates Jira ticket in AITOOLS project (jira.ssnc-corp.cloud/projects/AITOOLS).\nAgent picks up ticket automatically.",
    size=10, color=SECONDARY, bold=True)

# Agent automation section
add_shape(slide, Inches(6.8), Inches(1.3), Inches(5.7), Inches(5.2), SUBTLE_BG)
tb(slide, Inches(7.0), Inches(1.4), Inches(5.2), Inches(0.35),
    "Agent Auto-Triage (What Happens Next)", size=16, color=PRIMARY, bold=True)

steps = [
    ("1. License Check", "Agent reads HuggingFace model card.\nApache 2.0 / MIT = auto-approve.\nCustom license = flag for Legal review.", GREEN),
    ("2. GPU Fit Check", "Agent queries current GPU inventory.\nCalculates VRAM needed (BF16 vs INT8).\nIdentifies available chips across all DCs.", SECONDARY),
    ("3. Replacement Analysis", "If replacing existing model:\n- Compare benchmarks (>5% improvement?)\n- Calculate chip delta (net free / net cost)\n- Flag if replacement frees capacity", SAPPHIRE),
    ("4. Auto-Recommendation", "Agent posts assessment to Jira ticket:\n- PROCEED (meets all checks)\n- REVIEW (Legal or capacity concern)\n- REJECT (insufficient justification)", PRIMARY),
]

for i, (step, desc, color) in enumerate(steps):
    y = Inches(1.9) + i * Inches(1.2)
    bar = add_rect(slide, Inches(7.0), y, Inches(0.06), Inches(1.0), color)
    tb(slide, Inches(7.2), y, Inches(5.0), Inches(0.3), step, size=12, color=color, bold=True)
    tb(slide, Inches(7.2), y + Inches(0.3), Inches(5.0), Inches(0.7), desc, size=9, color=BODY_TEXT)

footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 7: Deployment Tiers + vLLM Sleep Mode
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
accent_bar(slide)

tb(slide, Inches(0.8), Inches(0.4), Inches(11), Inches(0.7),
    "Deployment Tiers & vLLM Sleep Mode",
    size=28, color=PRIMARY, bold=True)

# Tiers
tiers = [
    ("Hot", "Primary GPUs (FP16/BF16)", "~50 tok/s", "Active production models with real-time traffic", GREEN, "Current fleet models"),
    ("Warm", "Older HW / INT4 quantized", "~15 tok/s", "Legacy models still needed by some teams", WARN, "Models being deprecated"),
    ("Cold", "CPU Offloading / vLLM Sleep", "30-60s load*", "Archived models available on-demand", LIGHT_TEXT, "Retired but accessible"),
]

for i, (tier, hw, speed, desc, color, example) in enumerate(tiers):
    x = Inches(0.8) + i * Inches(4.1)
    y = Inches(1.2)
    add_shape(slide, x, y, Inches(3.8), Inches(2.5), SUBTLE_BG)
    bar = add_rect(slide, x, y, Inches(3.8), Inches(0.4), color)
    tb(slide, x, y + Inches(0.05), Inches(3.8), Inches(0.3), f"{tier} Tier", size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    tb(slide, x + Inches(0.15), y + Inches(0.5), Inches(3.5), Inches(0.3), hw, size=12, color=DARK_TEXT, bold=True)
    tb(slide, x + Inches(0.15), y + Inches(0.8), Inches(3.5), Inches(0.25), f"Speed: {speed}", size=11, color=color, bold=True)
    tb(slide, x + Inches(0.15), y + Inches(1.15), Inches(3.5), Inches(0.5), desc, size=10, color=BODY_TEXT)
    tb(slide, x + Inches(0.15), y + Inches(1.7), Inches(3.5), Inches(0.5), f"Example: {example}", size=9, color=LIGHT_TEXT)

# vLLM Sleep Mode
divider(slide, Inches(0.8), Inches(4.0), Inches(11.5))

tb(slide, Inches(0.8), Inches(4.2), Inches(11), Inches(0.4),
    "vLLM Sleep Mode: Game-Changer for Cold Tier", size=16, color=DARK_TEXT, bold=True)

add_shape(slide, Inches(0.8), Inches(4.7), Inches(5.5), Inches(2.0), SUBTLE_BG)
bullets(slide, Inches(1.0), Inches(4.8), Inches(5.1), Inches(1.8), [
    "Level 1: Offload weights to CPU RAM, discard KV cache",
    "  - Wake time: 0.1-0.8s (small) / 3-6s (large models)",
    "  - Best for frequent model switching",
    "Level 2: Discard weights + KV, keep only buffers in CPU",
    "  - Wake time: 0.8-2.6s (reload from disk)",
    "  - Best for many models, limited RAM",
], size=10, title="Two Sleep Levels", title_color=PRIMARY)

add_shape(slide, Inches(6.8), Inches(4.7), Inches(5.7), Inches(2.0), SUBTLE_BG)
bullets(slide, Inches(7.0), Inches(4.8), Inches(5.3), Inches(1.8), [
    "Model switching: from 2+ minutes to <10 seconds",
    "Legacy support: delegate fraction of GPUs to cold tier",
    "API-driven: curl -X POST localhost:8002/sleep?level=2",
    "Wake on demand: curl -X POST localhost:8001/wake_up",
    "Deprecation timeline: Day 60 legacy to Day 365+ retired",
    "= much longer tail support without burning hot GPU chips",
], size=10, title="Impact on Lifecycle", title_color=GREEN)

tb(slide, Inches(0.8), Inches(6.9), Inches(11.5), Inches(0.3),
    "* vLLM sleep mode could reduce cold tier load penalty to single digits",
    size=9, color=LIGHT_TEXT)

footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 8: Gemma 4 Model Request - Walking Through the Process
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
accent_bar(slide)

tb(slide, Inches(0.8), Inches(0.4), Inches(11), Inches(0.7),
    "Example: Gemma 4 31B Request Through the Pipeline",
    size=28, color=PRIMARY, bold=True)

# Step-by-step walkthrough
steps = [
    ("Step 1: Request Filed", SECONDARY, [
        "Model: google/gemma-4-31B-it (30.7B params)",
        "Link: huggingface.co/google/gemma-4-31B-it",
        "Replacing: Llama-70Bs + VL-32B (US) + Kimi K2 (UK)",
        "Business case: 4-slot consolidation, ~40 chips freed",
    ]),
    ("Step 2: Agent Triage", PRIMARY, [
        "License: Apache 2.0 -> AUTO-APPROVED",
        "GPU fit: 4 chips (BF16) per instance -> FITS in H200 C2",
        "Benchmarks: MMLU Pro 85.2% vs Llama3.3 ~70% -> +15%",
        "Recommendation: PROCEED (all checks pass)",
    ]),
    ("Step 3: Legal Review", GREEN, [
        "Apache 2.0 = fast-track (no custom license review needed)",
        "Google DeepMind provenance = known entity",
        "No data residency concerns (weights only, no training data)",
        "Status: APPROVED (same day)",
    ]),
    ("Step 4: Benchmark Eval", SAPPHIRE, [
        "External: MMLU Pro 85.2%, LiveCodeBench 80%, GPQA 84.3%",
        "Internal: vibe check, refusal rate, verbosity, unit tests",
        "Hardware: TTFT, TPS @ batch 1 & 64 on H200",
        "Delta vs current: >5% on all benchmarks -> APPROVED",
    ]),
]

for i, (step, color, items) in enumerate(steps):
    x = Inches(0.5) + i * Inches(3.15)
    y = Inches(1.2)
    add_shape(slide, x, y, Inches(3.0), Inches(3.3), SUBTLE_BG)
    bar = add_rect(slide, x, y, Inches(3.0), Inches(0.35), color)
    tb(slide, x, y + Inches(0.02), Inches(3.0), Inches(0.3), step, size=11, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    for j, item in enumerate(items):
        item_y = y + Inches(0.45) + j * Inches(0.6)
        tb(slide, x + Inches(0.1), item_y, Inches(2.8), Inches(0.55), item, size=9, color=BODY_TEXT)

# Execution plan
divider(slide, Inches(0.8), Inches(4.8), Inches(11.5))

tb(slide, Inches(0.8), Inches(5.0), Inches(11), Inches(0.4),
    "Step 5: Execution Plan", size=16, color=DARK_TEXT, bold=True)

exec_phases = [
    ("Week 1", "Deploy Gemma4 31B\non 4 H200 chips\n(us-kc1 C2/C3)", GREEN),
    ("Week 2", "Run side-by-side\nwith Llama3.3-70B\n(both models hot)", SECONDARY),
    ("Week 3", "Migrate traffic\nfrom Llama3.3 + VL\nto Gemma4", PRIMARY),
    ("Week 4", "Move Llama3.3 to\nWarm tier (INT4)\nFree 4 H200 chips", WARN),
    ("Week 6", "Retire Llama3.1-70B\nto Cold (vLLM sleep)\nFree 4 H100 chips", LIGHT_TEXT),
    ("Week 8", "Evaluate Qwen3-30B\nreplacement\n(reasoning eval)", SAPPHIRE),
]

for i, (week, desc, color) in enumerate(exec_phases):
    x = Inches(0.5) + i * Inches(2.1)
    y = Inches(5.5)
    add_shape(slide, x, y, Inches(1.95), Inches(1.2), color)
    tb(slide, x, y + Inches(0.05), Inches(1.95), Inches(0.25), week, size=10, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    tb(slide, x + Inches(0.05), y + Inches(0.3), Inches(1.85), Inches(0.85), desc, size=9, color=WHITE, align=PP_ALIGN.CENTER)

footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 9: Fleet-Wide Consolidation Strategy
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
accent_bar(slide)

tb(slide, Inches(0.8), Inches(0.4), Inches(11), Inches(0.7),
    "Fleet-Wide Model Audit: Start the Process Across All Models",
    size=28, color=PRIMARY, bold=True)

tb(slide, Inches(0.8), Inches(1.0), Inches(11), Inches(0.5),
    "Every model in the fleet should go through the same evaluation pipeline. Gemma 4 is the first candidate, not the last.",
    size=13, color=BODY_TEXT)

# Current fleet audit table
add_rect(slide, Inches(0.8), Inches(1.6), Inches(11.5), Inches(0.3), PRIMARY)
audit_headers = [("Current Model", 2.5), ("Chips Used", 0.9), ("Strategic Slot", 1.3), ("Consolidation Candidate", 2.3), ("Action", 1.5), ("Priority", 1.0)]
hx = 0.8
for h, w in audit_headers:
    tb(slide, Inches(hx), Inches(1.6), Inches(w), Inches(0.3), h, size=9, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    hx += w

audit_rows = [
    ("Llama3.1-8B-Instruct", "4 (US)", "Edge", "Gemma4 E4B (4.5B active)", "Evaluate", "P2", BODY_TEXT),
    ("Llama3.1-70B-Instruct", "8 (US)", "Legacy Workhorse", "Gemma4 31B", "Replace (retire to cold)", "P0", ERROR),
    ("Llama3.3-70B-Instruct", "8 (US)", "Workhorse", "Gemma4 31B", "Replace (side-by-side first)", "P0", WARN),
    ("Qwen3-30B-A3B", "8 (US)", "Reasoning", "Gemma4 31B (thinking mode)", "Evaluate head-to-head", "P1", WARN),
    ("Qwen2.5-VL-32B-Instruct", "12 (US)", "Vision", "Gemma4 31B (native vision)", "Replace (eval vision quality)", "P0", WARN),
    ("Qwen3-VL-235B (UK)", "8 (UK)", "Vision (Large)", "Keep (235B >> 31B for quality)", "Retain", "N/A", BODY_TEXT),
    ("Kimi K2 Thinking", "16 (UK)", "Reasoning (Large)", "Gemma4 31B (thinking mode)", "Replace (16->4 chips)", "P0", ERROR),
    ("all-mpnet-base-v2", "8 (all)", "Embedding", "Keep (standard, no alternative)", "Retain", "N/A", BODY_TEXT),
    ("qwen3-embeddings-8b", "2 (UK)", "Embedding", "Keep (complements mpnet)", "Retain", "N/A", BODY_TEXT),
    ("Parakeet Voice", "4 (UK)", "Voice/STT", "Keep (unique modality)", "Retain", "N/A", GREEN),
]

for ri, (model, chips, slot, candidate, action, priority, color) in enumerate(audit_rows):
    ry = Inches(1.92) + ri * Inches(0.38)
    bg = WHITE if ri % 2 == 0 else SUBTLE_BG
    add_rect(slide, Inches(0.8), ry, Inches(11.5), Inches(0.36), bg)
    vals = [model, chips, slot, candidate, action, priority]
    vx = 0.8
    for vi, (v, (_, w)) in enumerate(zip(vals, audit_headers)):
        c = color if vi == 0 else (ERROR if priority == "P0" and vi == 5 else (WARN if priority in ["P1"] and vi == 5 else BODY_TEXT))
        tb(slide, Inches(vx), ry + Inches(0.02), Inches(w), Inches(0.33), v, size=9, color=c, bold=(vi==5), align=PP_ALIGN.CENTER if vi > 0 else PP_ALIGN.LEFT)
        vx += w

# Bottom summary
divider(slide, Inches(0.8), Inches(5.8), Inches(11.5))

tb(slide, Inches(0.8), Inches(6.0), Inches(11.5), Inches(0.8),
    "P0 models: US (Llama3.1-70B + Llama3.3-70B + Qwen2.5-VL-32B = 28 chips) + UK (Kimi K2 = 16 chips) = 44 chips replaceable.\n"
    "Gemma4 31B needs ~12 chips total (8 US + 4 UK). Net freed: ~40 chips = 50% of fleet. Start benchmarks immediately.",
    size=12, color=DARK_TEXT)

footer(slide)

# ═══════════════════════════════════════════════════════════════
# SLIDE 10: Next Steps / Call to Action
# ═══════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
accent_bar(slide)

tb(slide, Inches(1), Inches(1.2), Inches(11), Inches(0.8),
    "Next Steps",
    size=36, color=PRIMARY, bold=True, align=PP_ALIGN.CENTER)

divider(slide, Inches(5.5), Inches(2.2), Inches(2))

actions = [
    ("This Week", "File Gemma 4 31B request in AITOOLS Jira. Begin internal benchmark eval on H200.\nVerify current GPU inventory matches this deck (needs confirmation).", ERROR),
    ("This Month", "Build the CRUD request UI (simple web form -> AITOOLS Jira ticket).\nDeploy agent auto-triage for license, GPU fit, and benchmark checks.", SECONDARY),
    ("Next Month", "Side-by-side Gemma 4 vs Llama3.3-70B, Qwen2.5-VL-32B, and Kimi K2.\nBegin deprecation of Llama3.1-70B (move to warm, then cold via vLLM sleep).", PRIMARY),
    ("Ongoing", "Run every current model through the evaluation pipeline.\nTrack capacity freed. Report monthly on GPU utilization and model performance.\nLegal workflow as CRUD - Apache 2.0 fast-track, custom = full review.", GREEN),
]

for i, (timeline, action, color) in enumerate(actions):
    y = Inches(2.7) + i * Inches(1.05)
    tb(slide, Inches(1.5), y, Inches(2.5), Inches(0.4), timeline, size=16, color=color, bold=True)
    tb(slide, Inches(4.2), y, Inches(8), Inches(0.9), action, size=13, color=BODY_TEXT)

divider(slide, Inches(1), Inches(6.8), Inches(11))

tb(slide, Inches(1), Inches(6.3), Inches(11), Inches(0.5),
    "Key insight: Gemma 4 31B at 31B params appears to match or beat our 70B models across reasoning, coding, and vision.\n"
    "If benchmarks confirm, this is a significant capacity win. Start the process now.",
    size=12, color=DARK_TEXT, align=PP_ALIGN.CENTER)

footer(slide)

# Save
output_path = '/Users/jstein/dev/ssnc/ai/claude-agent-orchestration-plugin/standards/ai-model-sdlc-lifecycle.pptx'
prs.save(output_path)
print(f"Saved to {output_path}")
print(f"Slides: {len(prs.slides)}")
