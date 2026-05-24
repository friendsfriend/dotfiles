## Why

Pi agents often use broad grep/find/bash exploration to discover repository structure before knowing where relevant files are. A deterministic repo graph tool can reduce blind searches by giving the agent a fresh structural lens over files, symbols, imports, OpenSpec relationships, and configuration links.

## What Changes

- Add a pi tool that computes a repository graph from the current filesystem on each tool call.
- Support queries for repository overview, matching nodes, neighbors, reverse dependencies, symbols, OpenSpec changes/capabilities, and task-oriented implementation context.
- Make the graph deterministic and non-persistent as semantic state: results must reflect the repository at the time of the call and must never be stale.
- Return compact, ranked, action-oriented results that help the agent choose exact files to read.
- Document tool-use guidance for OpenSpec workflows: OpenSpec tells the agent what to do, repo graph tells it where to look, read provides authoritative contents, and edit changes files.
- Encourage graph use before broad exploratory grep/find/bash, while preserving grep for exact text search and read for authority.

## Capabilities

### New Capabilities
- `repo-graph-tooling`: Defines deterministic repository graph tooling for pi, including graph construction, query modes, freshness guarantees, result format, and OpenSpec workflow integration.

### Modified Capabilities

- None.

## Impact

- Adds a pi extension tool, likely named `repo_graph`, with deterministic on-demand graph construction.
- Adds parsers or scanners for filesystem structure, Markdown/OpenSpec artifacts, source imports/exports/symbols where feasible, package/config files, scripts, and pi skills/prompts.
- May update OpenSpec skills/prompts to prefer `repo_graph` before broad discovery searches.
- Reduces unnecessary grep/find/read calls but does not replace exact reads before edits.
