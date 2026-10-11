---
name: inject-docs
description: Inject markdown documentation into the knowledge graph as searchable Document and Section nodes. Links docs to code symbols they reference.
argument-hint: "[--force]"
---

# Inject Documentation into Knowledge Graph

Parses all markdown files in the repository and injects them as searchable nodes into the code-review-graph database. Documentation sections are linked to code symbols they reference via `DOCUMENTS` edges.

## Steps

1. **Run the injection script** via Bash:
   ```bash
   python "$(dirname "$(dirname "$0")")/scripts/inject-docs.py"
   ```
   Replace the path with the actual plugin location. The script:
   - Finds all `.md` files matching configured patterns
   - Creates `Document` nodes (one per file) and `Section` nodes (one per heading)
   - Detects cross-references to code symbols (backtick-quoted identifiers)
   - Creates `DOCUMENTS` edges linking sections to referenced code
   - Rebuilds the FTS5 index

2. **Verify** by calling `list_graph_stats_tool` and reporting the new node count.

3. **Optionally rebuild embeddings** by calling `embed_graph_tool()` if the user wants semantic search over documentation content. Mention this option to the user.

## After Injection

The following queries now work for documentation:
- `semantic_search_nodes_tool(query="any topic from docs")` — finds relevant sections
- `query_graph_tool(pattern="callers_of", target="SomeClass")` — shows DOCUMENTS edges from docs
- FTS searches match heading text, file names, and content summaries

## Configuration

Edit `scripts/inject-docs-config.json` to control:
- `include_patterns` — which markdown files to process (default: all `**/*.md`)
- `exclude_patterns` — files to skip (default: node_modules, CHANGELOG, vendor)
- `cross_reference_detection` — link docs to code symbols (default: true)
- `min_heading_level` / `max_heading_level` — heading depth (default: 1–4)
- `signature_max_chars` — content summary length for FTS (default: 200)
- `params_keywords_max` — keyword count for embeddings (default: 10)

## Notes

- Injection is **idempotent** — running it again replaces previous doc nodes
- Doc nodes use `kind='Document'` and `kind='Section'` which survive full graph rebuilds
- Edges from docs use `confidence_tier='INJECTED'` for easy filtering
- The `qualified_name` prefix `docs::` identifies all injected documentation nodes
