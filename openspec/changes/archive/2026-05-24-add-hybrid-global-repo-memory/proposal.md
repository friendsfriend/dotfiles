## Why

The memory extension is useful enough to be installed globally, but its current repository-local `.pi/memory/` storage model makes user-wide preferences hard to reuse across projects. Memory should live in a global pi agent storage area while still isolating repository-specific facts, OpenSpec state, and tool summaries by repository.

## What Changes

- Introduce hybrid memory storage under the global pi agent directory, with global and repository-scoped memory represented in the SQLite-backed memory store created by `add-sqlite-memory-storage`.
- Add explicit memory scope metadata so entries can be global, repository-scoped, or temporary/session-scoped.
- Inject bounded memory cards that blend relevant global memory with only the current repository's scoped memory.
- Keep repository-specific memory from being injected into unrelated repositories by default.
- Add commands and display behavior that distinguish global and repository memory during inspection, pinning, forgetting, refreshing, and diagnostics.
- Add safe migration/import behavior that moves existing repository-local SQLite/JSON memory into the matching global repository scope without deleting the original files automatically.
- Preserve the principle that memory is orientation, not authority, and keep existing quality, staleness, backup, quarantine, and health behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `pi-memory-system`: Change memory storage and retrieval requirements from purely repo-local storage to hybrid global storage with repository-scoped partitions.

## Impact

- Affected code: `pi/extensions/memory-system/index.ts`.
- Affected specification: `openspec/specs/pi-memory-system/spec.md` via a change delta.
- Generated memory moves from repository-local `.pi/memory/` toward SQLite-backed storage under `~/.pi/agent/memory/`, partitioned logically by scope and repository identity.
- Existing `.pi/memory/` data should remain inspectable and removable by the user after migration.
