## Context

Pi agents currently rely on `find`, `grep`, `bash`, and `read` to discover repository structure. That works, but it often causes broad exploratory searches before the agent knows which files, symbols, OpenSpec artifacts, or configuration links matter. A repository graph tool can provide a deterministic structural view that helps the agent navigate first and read exact files second.

The graph is intentionally not memory. It is computed from current repository files on each tool call and must never become stale. Persistence is allowed only as an internal optimization if the tool can prove results reflect the current filesystem.

## Goals / Non-Goals

**Goals:**
- Provide a `repo_graph` pi tool for deterministic repository navigation.
- Recompute graph results from the current filesystem for every semantic tool call.
- Support OpenSpec-aware queries for changes, capabilities, specs, tasks, and related implementation files.
- Support source/config queries for files, imports, exports, symbols, headings, scripts, and reverse relationships where feasible.
- Return compact, ranked, action-oriented results that reduce broad grep/find usage.
- Teach OpenSpec workflows to use the graph before broad discovery searches.

**Non-Goals:**
- Replacing `read` before editing or exact verification.
- Replacing `grep` for exact text search.
- Persisting graph data as durable memory.
- Perfect language-server accuracy in v1.
- Building a general vector or semantic code search engine.

## Decisions

### Recompute graph on every tool call

The tool contract is that results reflect the current filesystem at the time of the call. The implementation builds the graph in memory, executes the query, returns compact results, and discards the graph.

Alternative considered: persistent graph index with invalidation. Rejected because stale graph results would undermine trust and add invalidation complexity.

### Allow cache only as invisible optimization

If performance requires caching later, cache entries must be validated against current inputs using hashes, mtimes, or equivalent. Cache behavior must not change the external contract: graph results are never stale.

### Keep query modes explicit

Use structured modes rather than a single vague search string. Initial modes should include:
- `overview`: high-level repository and OpenSpec structure
- `search`: ranked nodes matching a query
- `neighbors`: connected nodes around a path, symbol, capability, or change
- `reverse-deps`: nodes that depend on a file or symbol
- `symbols`: source symbols, exports, and imports where supported
- `openspec-change`: artifacts, specs, capabilities, and likely files for a change
- `task-context`: likely implementation context for a specific OpenSpec task
- `capability`: stable and delta specs plus related files for a capability

### Return ranked navigation results

The graph should return concise results with reasons and suggested next reads. The model should not receive the whole graph unless explicitly requested and bounded.

Example result shape:

```text
Top relevant files for task: ...
1. path/to/file.ts
   reason: imports target module; defines matching symbol
   related: ...
Suggested next action: read path/to/file.ts
```

### Model graph as multiple deterministic subgraphs

Construct graph nodes and edges from deterministic repository facts:
- filesystem containment and file types
- Markdown headings and links
- OpenSpec changes, specs, capabilities, proposals, designs, and tasks
- pi skills and prompts
- package/config files and scripts
- source imports/exports/symbol declarations where simple parsing is reliable
- shell scripts or config includes where feasible

### Integrate via tool prompt guidelines and OpenSpec skills

The tool should include prompt guidelines telling the agent to use `repo_graph` before broad grep/find/bash discovery. OpenSpec skills/prompts should reinforce this pattern:

```text
OpenSpec tells the agent WHAT to do.
repo_graph tells it WHERE to look.
read tells it WHAT IS EXACTLY THERE.
edit changes it.
```

## Risks / Trade-offs

- **Recomputing on each call may be slow** → Start with bounded scans and ignored directories; add validated cache only if needed.
- **Graph may be incomplete** → Return confidence/source details and guide the agent to fall back to grep/read when necessary.
- **Too much output can waste tokens** → Rank and limit results by default; require explicit expansion for larger neighborhoods.
- **Agent may overtrust graph** → Tool guidelines and OpenSpec skills must require exact `read` before editing.
- **Language parsing complexity can grow** → Use simple deterministic parsers first; add language-specific parsers incrementally.

## Migration Plan

1. Add the `repo_graph` extension tool with `overview`, `search`, and OpenSpec query modes.
2. Add deterministic scanners for filesystem, Markdown/OpenSpec, pi skills/prompts, package/config files, and simple imports.
3. Add prompt guidelines to the tool definition.
4. Update OpenSpec skills/prompts to prefer graph navigation before broad discovery searches.
5. Add more query modes and parsers based on observed workflow needs.

Rollback is disabling the extension tool; existing `grep`, `find`, `bash`, and `read` behavior remains unchanged.

## Open Questions

- Which languages and config formats should v1 parse beyond Markdown/OpenSpec and simple source imports?
- Should the tool be one flexible `repo_graph` tool or several narrower tools?
- What default result limit best balances usefulness and token savings?
- Should ignored directories follow `.gitignore`, a graph-specific config, or both?
