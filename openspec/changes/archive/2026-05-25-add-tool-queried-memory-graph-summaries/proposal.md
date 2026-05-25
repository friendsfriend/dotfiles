## Why

Pi memory should optimize for token efficiency and user trust by avoiding opaque per-turn context injection. The desired architecture separates notes, map, and truth: memory is a tool-queried past-work journal, repo graph is the compact navigation map enriched with one-line file summaries, and exact file/command tools remain authoritative.

## What Changes

- **BREAKING**: Replace per-turn automatic memory-card injection with a minimal session-start-only boot hint or pinned preference summary.
- Add explicit memory query/save tool behavior so agents query past work when relevant and intentionally save durable decisions, history, blockers, or preferences instead of automatically storing broad tool output.
- Reframe memory commands/tools around discovering what was done in the past, including decisions, completed investigations, active assumptions, blockers, related files, and workflow state.
- Stop automatically promoting large read/bash/tool outputs into semantic memory; keep telemetry/observability separate from durable notes unless the agent explicitly saves a distilled note.
- Add one-line file summaries to repo graph file results.
- Populate graph file summaries from read-derived, hash-validated summaries when available, and fall back to deterministic extraction from current graph scan data such as path, artifact type, headings, symbols, imports, scripts, and config keys.
- Preserve exact-read guardrails: graph summaries are navigation metadata, not authoritative file content.
- Supersede the narrower `optimize-memory-injection-token-efficiency` direction by making memory tool-queried after session start rather than merely more conservative.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `pi-memory-system`: Change injection and write semantics to session-start-only minimal context, explicit query/save tools, and past-work-oriented memory.
- `repo-graph-tooling`: Add file summary graph annotations with read-derived hash validation and deterministic fallback extraction.

## Impact

- Affected implementation: `pi/extensions/memory-system/index.ts`, including injection lifecycle, automatic extraction/write points, command/tool surface, telemetry separation, and explicit save/query flows.
- Affected implementation: `pi/extensions/repo-graph/index.ts`, including file node metadata, graph search ranking, rendered outputs, task-context suggestions, and summary overlay lookup.
- Affected specs: `openspec/specs/pi-memory-system/spec.md` and `openspec/specs/repo-graph-tooling/spec.md`.
- Existing SQLite memory data should remain inspectable; generated legacy entries may become history/cold entries rather than injection candidates.
- No external semantic search or embedding dependency is expected.
