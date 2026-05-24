## Why

The memory extension currently stores entries as whole-file JSON under `.pi/memory/`, which makes concurrent lifecycle writes fragile and forces increasingly database-shaped memory behavior into array rewrites. Before moving memory into hybrid global/repository scope, the storage foundation should become transactional so later global memory work can build on a safer canonical store.

## What Changes

- Replace the memory extension's canonical `entries.json` store with a local SQLite database for structured memory entries, tags, repository metadata, and storage health state.
- Use SQLite transactions to make lifecycle writes safe under parallel tool results, agent-end extraction, startup indexing, compaction, and manual memory commands.
- Add a migration path that imports existing `.pi/memory/entries.json` data into SQLite without deleting the original JSON files.
- Preserve human inspectability through `/memory` commands and generated/exported JSON or Markdown views rather than making raw SQLite the only inspection path.
- Keep scope support intentionally compatible with the planned `add-hybrid-global-repo-memory` change: this change establishes the SQLite schema and storage abstraction first; the later global-memory change should add global/repository partition semantics on top of SQLite instead of introducing new JSON partitions.
- Preserve the principle that memory is orientation, not authority, along with existing quality gates, staleness behavior, bounded injection, duplicate suppression, and health diagnostics.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `pi-memory-system`: Change memory storage requirements from repository-local JSON as the canonical store to a transactional SQLite-backed store with safe migration and inspectable exports.

## Impact

- Affected code: `.pi/extensions/memory-system/index.ts` now, or `pi/extensions/memory-system/index.ts` after global asset layout changes are applied.
- Affected specification: `openspec/specs/pi-memory-system/spec.md` via a change delta.
- Runtime storage: introduces `memory.sqlite` as the canonical memory database and treats existing `.pi/memory/entries.json` as an import source and optional export/backup artifact.
- Dependency/runtime considerations: prefer Node's built-in `node:sqlite` when available in the pi runtime to avoid adding a native npm package; document fallback decisions if runtime support is insufficient.
- Ordering: this change is intended to be implemented before `add-hybrid-global-repo-memory`, and that later change should revise its storage design to use SQLite tables/indexes rather than per-partition JSON files.
