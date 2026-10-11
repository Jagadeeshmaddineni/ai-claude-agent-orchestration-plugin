# Team-Work Wiki Configuration

> Read by /team-work:work-wiki, /work-ingest, /work-ask, /work-lint.
> Edit by hand any time, or re-run /work-wiki to refresh.

wiki_root: wiki
qmd: no
qmd_mcp: no
ingest_mode: unset

## Field reference

- `wiki_root` — where the wiki lives (in-repo, sibling repo, or custom path).
- `qmd` — whether qmd hybrid search is available.
- `qmd_mcp` — whether a qmd MCP server is configured (native tool use in /work-ask).
- `ingest_mode` — `pr` (every ingest opens a PR for review) or `local`
  (commit locally, PR optional). Set by /work-ingest the first time it runs;
  honored thereafter without re-asking. `unset` until first ingest.
