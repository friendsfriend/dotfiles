## 1. Memory Injection Lifecycle

- [x] 1.1 Replace routine per-turn memory-card selection/injection with a session-start-only boot context path.
- [x] 1.2 Keep the session-start boot context compact and bounded, including memory tool guidance, orientation-not-authority wording, and optional pinned global preferences when configured.
- [x] 1.3 Update memory injection telemetry/status so it distinguishes session-start boot context from disabled or skipped per-turn injection.
- [x] 1.4 Ensure OpenSpec workflows no longer receive automatic memory cards after session start and instead rely on current OpenSpec reads plus explicit memory queries.

## 2. Explicit Memory Query and Save Surface

- [x] 2.1 Add or update memory query command/tool behavior for scoped past-work lookup by text, type, related file, change name, recency, and scope where practical.
- [x] 2.2 Add or update memory save command/tool behavior for explicit agent-saved notes with type, scope, source, related files, related change, and durable text.
- [x] 2.3 Update memory inspection output to distinguish pinned, agent-saved, legacy/generated, telemetry-derived, stale, rejected, expired, duplicate, and forgotten entries when metadata exists.
- [x] 2.4 Stop automatic durable semantic writes from large tool results and turn-end transcript inference while preserving telemetry and diagnostics.
- [x] 2.5 Ensure existing SQLite memory entries remain inspectable and queryable without being deleted during migration.

## 3. File Summary Cache

- [x] 3.1 Define storage and metadata for read-derived file summaries keyed by repository identity, path, content hash, source, and timestamps.
- [x] 3.2 Populate or update a bounded one-line file summary after file reads when a safe responsibility summary can be produced.
- [x] 3.3 Reject or omit file summaries containing raw code snippets, secrets, large literals, or line-level authoritative claims.
- [x] 3.4 Exclude stale file-summary cache entries from normal semantic memory queries unless explicitly requested.

## 4. Repo Graph Summary Annotations

- [x] 4.1 Extend repo graph file nodes/results to include a compact summary field and summary source metadata when available.
- [x] 4.2 Attach hash-valid read-derived file summaries to graph results and omit or mark stale summaries when file hashes no longer match.
- [x] 4.3 Implement deterministic fallback summaries from current scan data such as path, file type, OpenSpec artifact role, Markdown headings, symbols, imports, package scripts, and config keys.
- [x] 4.4 Include summaries in graph search, neighbors, OpenSpec change, capability, and task-context output where useful while preserving exact-read guidance.
- [x] 4.5 Use summary matches as bounded ranking signals and include deterministic reasons when summaries contribute to a match.

## 5. Observability and Dashboard Compatibility

- [x] 5.1 Preserve `/memory status`, `/memory stats`, `/memory dashboard`, export, health, benchmark, forget, and refresh behavior under the tool-queried memory model.
- [x] 5.2 Add observability for memory query/save usage and graph summary source/freshness where practical.
- [x] 5.3 Ensure telemetry and benchmark artifacts are not promoted into semantic memory without explicit save.

## 6. Validation

- [x] 6.1 Add or update tests showing no per-turn memory card is injected after the minimal session-start boot context.
- [x] 6.2 Add or update tests for explicit memory query/save behavior and legacy/generated entry visibility.
- [x] 6.3 Add or update tests showing large tool results and turn-end transcripts do not create durable semantic memories automatically.
- [x] 6.4 Add or update tests for graph file summaries: hash-valid read-derived summary, stale summary omission, deterministic fallback, and summary search ranking.
- [x] 6.5 Run project validation for the Pi extensions and `openspec validate add-tool-queried-memory-graph-summaries --strict`.
