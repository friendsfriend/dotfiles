## 1. SQLite Runtime and Store Setup

- [x] 1.1 Validate that the pi runtime can import and use Node's built-in `node:sqlite` module without adding an npm dependency.
- [x] 1.2 Add memory database path helpers for the initial repository-local SQLite location and any generated export paths.
- [x] 1.3 Implement SQLite database initialization with schema-version tracking, foreign keys, WAL mode where supported, and a busy timeout.
- [x] 1.4 Create the initial schema for entries, entry tags, and migration/source metadata.
- [x] 1.5 Add indexes for common selection and diagnostics fields such as timestamps, expiry, forgotten state, dedupe key, source kind, quality, lifecycle, and tags.

## 2. Storage Abstraction

- [x] 2.1 Introduce a memory store abstraction that hides whether entries are backed by SQLite or imported JSON.
- [x] 2.2 Implement SQLite row-to-`MemoryEntry` and `MemoryEntry`-to-row mapping, including tags and source metadata JSON.
- [x] 2.3 Implement store operations for listing active/all entries, adding entries, upserting singleton entries, forgetting entries, recording usage, and updating staleness.
- [x] 2.4 Wrap every write operation in a SQLite transaction with rollback on failure.
- [x] 2.5 Preserve existing semantic dedupe, lifecycle, expiry, quality, and duplicate-suppression behavior through the store layer.

## 3. Migrate Existing JSON Memory

- [x] 3.1 Detect existing `.pi/memory/entries.json` data and whether that source has already been imported into SQLite.
- [x] 3.2 Reuse or preserve the existing safe JSON loading behavior for valid, backup, subset, and empty recovery states.
- [x] 3.3 Import compatible JSON entries into SQLite in a single transaction while preserving IDs and metadata where possible.
- [x] 3.4 Mark imported entries or migration metadata with the source path and recovery state.
- [x] 3.5 Leave original `.pi/memory/entries.json`, backup, and corrupt/quarantine files in place for user inspection.
- [x] 3.6 Suppress or mark duplicate imported entries without deleting inspectable records unexpectedly.

## 4. Update Memory Callers

- [x] 4.1 Route `readEntries`, `addEntry`, singleton upserts, staleness updates, and write-heavy lifecycle paths through the SQLite store.
- [x] 4.2 Update `before_agent_start` memory selection to read from SQLite while preserving token budgets and relevance scoring.
- [x] 4.3 Update `tool_result` large-result memory capture to use transactional inserts under parallel tool execution.
- [x] 4.4 Update `agent_end` inferred-memory extraction and rejected-candidate recording to use SQLite transactions.
- [x] 4.5 Update compaction-related memory reads and writes to use the SQLite-backed store.

## 5. Inspection, Health, and Export

- [x] 5.1 Update `/memory show` and default inspection rendering to read grouped memory from SQLite.
- [x] 5.2 Update `/memory status` to report the SQLite database path, entry counts, and last injection state.
- [x] 5.3 Update `/memory doctor` or health analysis to include schema version, migration status, database validity, and quality diagnostics.
- [x] 5.4 Provide JSON and/or Markdown export output from SQLite for human inspection without making exports canonical.
- [x] 5.5 Ensure generated exports and diagnostics continue to state that memory is orientation, not authority.

## 6. Compatibility with Hybrid Global Memory

- [x] 6.1 Keep the SQLite schema and store abstraction ready for future scope and repository identity columns or tables.
- [x] 6.2 Avoid implementing separate canonical `global/entries.json` or `repos/<repo-key>/entries.json` storage in this change.
- [x] 6.3 Add notes or follow-up tasks to revise `add-hybrid-global-repo-memory` so it builds on SQLite tables and queries rather than JSON partitions.

## 7. Validation

- [x] 7.1 Validate startup/reload with no existing memory database and no existing JSON memory.
- [x] 7.2 Validate migration from valid existing `.pi/memory/entries.json` into SQLite without deleting JSON files.
- [x] 7.3 Validate migration from corrupt or partially recoverable JSON reports recovery state and imports compatible entries only.
- [x] 7.4 Validate parallel large tool-result writes do not corrupt storage and preserve all successfully committed entries.
- [x] 7.5 Validate `/memory show|status|pin|forget|refresh|doctor|clear-generated` against SQLite-backed storage.
- [x] 7.6 Validate memory injection still excludes stale, rejected, forgotten, expired, low-quality, and duplicate-suppressed entries.
- [x] 7.7 Run TypeScript syntax/type validation appropriate for the memory extension.
- [x] 7.8 Run OpenSpec validation for `add-sqlite-memory-storage`.
