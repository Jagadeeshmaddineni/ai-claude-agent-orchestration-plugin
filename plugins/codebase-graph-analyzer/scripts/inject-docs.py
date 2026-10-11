#!/usr/bin/env python3
"""Inject markdown documentation nodes into code-review-graph's SQLite DB.

Creates 'Document' and 'Section' nodes from .md files, links them to code
symbols via 'DOCUMENTS' edges, and rebuilds the FTS5 index. These nodes
survive full graph rebuilds because the purge logic only targets kind='File'.
"""

import json
import re
import sqlite3
import subprocess
import sys
import time
from fnmatch import fnmatch
from pathlib import Path
from typing import Optional

SCRIPT_DIR = Path(__file__).parent
DEFAULT_CONFIG = {
    "include_patterns": ["**/*.md"],
    "exclude_patterns": [
        "**/node_modules/**",
        "**/CHANGELOG*.md",
        "**/.code-review-graph/**",
        "**/vendor/**",
        "**/.git/**",
    ],
    "cross_reference_detection": True,
    "min_heading_level": 1,
    "max_heading_level": 4,
    "signature_max_chars": 200,
    "params_keywords_max": 10,
}


def get_repo_root() -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True, check=True,
    )
    return Path(result.stdout.strip())


def load_config(repo_root: Path) -> dict:
    config_path = SCRIPT_DIR / "inject-docs-config.json"
    if config_path.exists():
        with open(config_path) as f:
            user_config = json.load(f)
        return {**DEFAULT_CONFIG, **user_config}
    return DEFAULT_CONFIG.copy()


def find_markdown_files(repo_root: Path, config: dict) -> list[Path]:
    candidates = []
    for pattern in config["include_patterns"]:
        candidates.extend(repo_root.glob(pattern))

    filtered = []
    for path in candidates:
        rel = str(path.relative_to(repo_root))
        excluded = any(fnmatch(rel, ep) for ep in config["exclude_patterns"])
        if not excluded and path.is_file():
            filtered.append(path)

    return sorted(set(filtered))


def parse_headings(content: str, config: dict) -> list[dict]:
    """Extract headings with line numbers and section content."""
    lines = content.split("\n")
    headings = []
    heading_re = re.compile(r"^(#{1,6})\s+(.+)$")

    for i, line in enumerate(lines):
        m = heading_re.match(line)
        if not m:
            continue
        level = len(m.group(1))
        if level < config["min_heading_level"] or level > config["max_heading_level"]:
            continue
        headings.append({
            "level": level,
            "text": m.group(2).strip(),
            "line": i + 1,
        })

    # Compute section content (text between this heading and the next)
    for idx, h in enumerate(headings):
        start = h["line"]  # line after heading
        if idx + 1 < len(headings):
            end = headings[idx + 1]["line"] - 1
        else:
            end = len(lines)
        section_lines = lines[start:end]
        h["content"] = "\n".join(section_lines).strip()

    return headings


def extract_keywords(text: str, max_keywords: int) -> str:
    """Extract meaningful keywords from text for the params field (embedded by embed_graph_tool)."""
    text_clean = re.sub(r"[#*`\[\](){}|>_~]", " ", text)
    text_clean = re.sub(r"https?://\S+", "", text_clean)
    words = re.findall(r"\b[A-Za-z][A-Za-z0-9_]{2,}\b", text_clean)
    # Prefer words that look like identifiers (CamelCase, snake_case) or technical terms
    scored = {}
    for w in words:
        if w.lower() in ("the", "and", "for", "that", "this", "with", "from", "are", "not", "but", "you", "all", "can", "has", "its", "was", "will", "one", "our"):
            continue
        score = 1
        if "_" in w or (any(c.isupper() for c in w[1:])):
            score = 3
        if len(w) > 6:
            score += 1
        scored[w] = scored.get(w, 0) + score

    top = sorted(scored.items(), key=lambda x: -x[1])[:max_keywords]
    return " ".join(w for w, _ in top)


def find_code_references(text: str) -> list[str]:
    """Find backtick-quoted identifiers that might reference code symbols."""
    refs = re.findall(r"`([A-Za-z_][A-Za-z0-9_.]*(?:\(\))?)`", text)
    cleaned = set()
    for r in refs:
        r = r.rstrip("()")
        # Skip very short names (get, set, run, etc.) — too many false positives
        if len(r) < 5:
            continue
        # Skip common non-symbol words that appear in backticks
        if r.lower() in ("true", "false", "null", "none", "string", "number", "boolean", "object", "array"):
            continue
        cleaned.add(r)
    return list(cleaned)


def match_references_to_nodes(refs: list[str], existing_names: dict[str, list[str]]) -> list[dict]:
    """Match documentation references against existing code nodes.

    existing_names: {lowercase_name: [qualified_name, ...]}
    Only exact name matches are used — partial/suffix matching produces too many false positives.
    """
    matches = []
    for ref in refs:
        ref_lower = ref.lower()
        if ref_lower in existing_names:
            for qn in existing_names[ref_lower]:
                matches.append({"ref": ref, "qualified_name": qn, "confidence": 1.0})
    return matches


def inject(repo_root: Optional[Path] = None, check_only: bool = False):
    if repo_root is None:
        repo_root = get_repo_root()

    db_path = repo_root / ".code-review-graph" / "graph.db"
    if not db_path.exists():
        print("[inject-docs] No graph.db found. Run /codebase-graph-analyzer:build-graph first.")
        sys.exit(1 if check_only else 1)

    config = load_config(repo_root)

    if check_only:
        conn = sqlite3.connect(str(db_path))
        count = conn.execute("SELECT count(*) FROM nodes WHERE kind IN ('Document', 'Section')").fetchone()[0]
        conn.close()
        if count > 0:
            print(f"[inject-docs] {count} doc nodes present. Up to date.")
            sys.exit(0)
        else:
            print("[inject-docs] No doc nodes found. Injection needed.")
            sys.exit(1)

    md_files = find_markdown_files(repo_root, config)
    if not md_files:
        print("[inject-docs] No markdown files found matching patterns.")
        return

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    now = time.time()

    # Build lookup of existing code node names for cross-reference detection
    existing_names: dict[str, list[str]] = {}
    if config["cross_reference_detection"]:
        rows = conn.execute("SELECT name, qualified_name FROM nodes WHERE kind NOT IN ('Document', 'Section')").fetchall()
        for name, qn in rows:
            existing_names.setdefault(name.lower(), []).append(qn)

    # Idempotent: remove previous doc nodes and injected edges
    conn.execute("DELETE FROM nodes WHERE kind IN ('Document', 'Section')")
    conn.execute("DELETE FROM edges WHERE confidence_tier = 'INJECTED'")

    doc_count = 0
    section_count = 0
    edge_count = 0

    for md_path in md_files:
        rel_path = str(md_path.relative_to(repo_root))
        abs_path = str(md_path.resolve())
        content = md_path.read_text(errors="replace")
        lines = content.split("\n")

        doc_qualified = f"docs::{rel_path}"
        doc_name = md_path.name

        # Compute document-level signature (first 200 meaningful chars)
        text_only = re.sub(r"^#+\s+", "", content, flags=re.MULTILINE)
        text_only = re.sub(r"[#*`\[\](){}|>]", "", text_only)
        doc_signature = " ".join(text_only.split())[:config["signature_max_chars"]]

        headings = parse_headings(content, config)
        heading_summary = [{"level": h["level"], "text": h["text"], "line": h["line"]} for h in headings]

        # Insert Document node
        conn.execute(
            """INSERT INTO nodes (kind, name, qualified_name, file_path, line_start, line_end,
               language, signature, extra, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            ("Document", doc_name, doc_qualified, abs_path, 1, len(lines),
             "markdown", doc_signature,
             json.dumps({"headings": heading_summary, "relative_path": rel_path}), now),
        )
        doc_count += 1

        for h in headings:
            section_qualified = f"docs::{rel_path}::{h['text']}"
            section_end = h["line"] + len(h["content"].split("\n"))

            sec_signature = " ".join(h["content"].split())[:config["signature_max_chars"]]
            sec_keywords = extract_keywords(h["content"], config["params_keywords_max"])

            conn.execute(
                """INSERT OR IGNORE INTO nodes (kind, name, qualified_name, file_path,
                   line_start, line_end, language, parent_name, signature, params, extra, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("Section", h["text"], section_qualified, abs_path,
                 h["line"], section_end, "markdown", doc_name, sec_signature, sec_keywords,
                 json.dumps({"level": h["level"], "content": h["content"][:2000]}), now),
            )
            section_count += 1

            # CONTAINS edge: Document -> Section
            conn.execute(
                """INSERT INTO edges (kind, source_qualified, target_qualified, file_path, line,
                   confidence, confidence_tier, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                ("CONTAINS", doc_qualified, section_qualified, abs_path, h["line"],
                 1.0, "INJECTED", now),
            )
            edge_count += 1

            # Cross-reference detection: DOCUMENTS edges
            if config["cross_reference_detection"]:
                refs = find_code_references(h["content"])
                matches = match_references_to_nodes(refs, existing_names)
                seen_targets = set()
                for match in matches:
                    if match["qualified_name"] in seen_targets:
                        continue
                    seen_targets.add(match["qualified_name"])
                    conn.execute(
                        """INSERT INTO edges (kind, source_qualified, target_qualified, file_path,
                           line, confidence, confidence_tier, extra, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        ("DOCUMENTS", section_qualified, match["qualified_name"], abs_path,
                         h["line"], match["confidence"], "INJECTED",
                         json.dumps({"ref": match["ref"]}), now),
                    )
                    edge_count += 1

    # Rebuild FTS5 index — drop and recreate to handle corruption gracefully
    try:
        conn.execute("DELETE FROM nodes_fts")
    except sqlite3.DatabaseError:
        conn.execute("DROP TABLE IF EXISTS nodes_fts")
        conn.execute(
            """CREATE VIRTUAL TABLE nodes_fts USING fts5(
               name, qualified_name, file_path, signature,
               tokenize='porter unicode61')"""
        )
    conn.execute(
        """INSERT INTO nodes_fts(rowid, name, qualified_name, file_path, signature)
           SELECT id, name, qualified_name, file_path, COALESCE(signature, '')
           FROM nodes"""
    )

    conn.commit()
    conn.close()

    print(f"[inject-docs] Injected {doc_count} documents, {section_count} sections, {edge_count} edges.")
    print(f"[inject-docs] FTS5 index rebuilt. Run embed_graph_tool() for semantic search.")


if __name__ == "__main__":
    check = "--check-only" in sys.argv
    inject(check_only=check)
