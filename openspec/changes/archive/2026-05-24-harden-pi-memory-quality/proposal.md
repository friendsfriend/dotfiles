## Why

The current repo-local pi memory system can become invalid on disk and can inject low-quality, recursive, or stale inferred entries into agent context. Hardening memory storage, extraction, staleness, and retrieval will make memory useful as orientation without allowing it to break agent turns or poison future context.

## What Changes

- Add resilient memory storage behavior that detects invalid memory files, recovers or quarantines corrupted data, and continues safely without breaking normal agent turns.
- Add memory health inspection so users can diagnose invalid JSON, duplicate entries, suspected junk, stale summaries, and injection quality issues.
- Improve inferred session memory extraction with quality gates that avoid code snippets, tool-output fragments, injected memory-card recursion, file-path-only facts, and duplicate/self-referential entries.
- Add deduplication and lifecycle rules for memory entries, including semantic singleton upserts, duplicate collapse, and short-lived handling for inferred scratch/session entries.
- Improve OpenSpec and command-derived freshness so observed memory does not appear authoritative when underlying command results or relevant artifacts change.
- Improve memory-card selection with relevance scoring that considers prompt text, change names, capabilities, file paths, source trust, recency, pinned preferences, stale state, and observed usefulness.
- Keep existing memory storage local and inspectable under `.pi/memory/` and continue presenting memory as orientation, not authority.

## Capabilities

### New Capabilities

- `pi-memory-health`: Memory durability, repair, quality diagnostics, deduplication, and health reporting for repo-local pi memory.

### Modified Capabilities

- `pi-memory-system`: Memory extraction, staleness handling, and bounded injection behavior become more robust, relevance-based, and resistant to recursive junk.

## Impact

- Affects `.pi/extensions/memory-system/index.ts` and may introduce helper modules under `.pi/extensions/memory-system/` if the implementation grows.
- Reads and writes generated local files under `.pi/memory/`, potentially including backups, quarantined corrupt files, health reports, and repaired entries.
- Extends `/memory` command behavior with diagnostic and repair-oriented surfaces such as health/doctor output.
- Interacts with existing and proposed memory observability/dashboard changes but does not require cloud telemetry, vector search, or external services.
- Existing memory entries remain compatible, but corrupted or duplicate entries may be quarantined, marked, or omitted from injection.