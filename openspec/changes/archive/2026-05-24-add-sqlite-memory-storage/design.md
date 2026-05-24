## Context

The memory extension currently stores canonical entries as a JSON array at `.pi/memory/entries.json`, with backup and corruption recovery helpers around that file. Reads and writes currently operate on the whole array, and lifecycle events such as `tool_result`, `agent_end`, startup indexing, compaction, and manual commands can all record memory.

A recent failure mode shows why this is fragile: parallel tool results can attempt to record large-result summaries at the same time, causing multiple read-modify-write operations against the same JSON store and temporary file pattern. The planned `add-hybrid-global-repo-memory` change will add scope, repository identity, and migration complexity; that work should build on a transactional store rather than multiplying JSON partitions.

## Goals / Non-Goals

**Goals:**

- Make SQLite the canonical structured store for memory entries before hybrid global/repository memory is implemented.
- Preserve existing memory behavior: bounded injection, quality gates, staleness checks, duplicate suppression, forgetting, health diagnostics, and orientation-not-authority language.
- Make memory writes transactionally safe under concurrent lifecycle events.
- Import existing `.pi/memory/entries.json` data without deleting the original files.
- Keep memory inspectable through commands and generated/exported artifacts even though the canonical store is no longer hand-edited JSON.
- Shape the storage abstraction so `add-hybrid-global-repo-memory` can add global and repository scope semantics as schema/query changes rather than new JSON directory partitions.

**Non-Goals:**

- Cloud sync, remote databases, embeddings, vector search, or multi-user memory.
- Implementing hybrid global/repository memory scope in this change; this change prepares the storage foundation for it.
- Automatically deleting existing `.pi/memory/` files after migration.
- Making memory authoritative for file edits or exact claims.
- Adding a native npm SQLite dependency unless the pi runtime lacks usable built-in SQLite support.

## Decisions

### Use SQLite as the canonical memory store

Store canonical memory data in a local SQLite database, initially under the current repository memory area such as `.pi/memory/memory.sqlite`. Existing JSON files become migration inputs and optional inspection/export artifacts rather than the source of truth.

Alternative considered: keep JSON and add a per-file write queue plus unique temp files. Rejected as the strategic direction because it only fixes the immediate race while leaving scope, querying, dedupe, health, dashboard, and migration behavior in whole-array rewrites.

### Prefer `node:sqlite` before external dependencies

Use Node's built-in `node:sqlite` module when available in the pi runtime. Initialize the database with settings appropriate for a local extension store, including foreign keys, WAL journaling where supported, and a busy timeout for concurrent event writes.

Alternative considered: add `better-sqlite3` or another npm SQLite package. Rejected for the first pass because native extension dependencies complicate global pi extension installation and portability.

### Introduce a storage abstraction before rewriting callers deeply

Add a memory store layer with operations such as adding entries, upserting singleton entries, listing entries, forgetting entries, recording usage, analyzing health, and exporting entries. Existing memory selection, rendering, quality, and staleness logic should call this abstraction rather than directly reading/writing `entries.json`.

Alternative considered: replace each JSON helper with direct SQL scattered through the extension. Rejected because the hybrid-memory change will need to extend storage behavior again, and scattered SQL would make that transition harder.

### Model entries relationally with JSON escape hatches

Use relational columns for fields frequently filtered, sorted, or indexed: id, type, source kind, lifecycle, quality, classification, timestamps, expiry, forgotten state, stale flag, dedupe key, duplicate pointer, hit count, and last-used time. Store tags in a join table. Store source metadata and less-common future fields in JSON text columns to preserve compatibility and migration flexibility.

A conceptual initial schema:

```text
entries
  id TEXT PRIMARY KEY
  type TEXT NOT NULL
  source_kind TEXT NOT NULL
  text TEXT NOT NULL
  quality TEXT
  lifecycle TEXT
  classification TEXT
  dedupe_key TEXT
  duplicate_of TEXT
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL
  expires_at TEXT
  forgotten_at TEXT
  stale INTEGER NOT NULL DEFAULT 0
  hit_count INTEGER NOT NULL DEFAULT 0
  last_used_at TEXT
  reason_rejected TEXT
  recovery_state TEXT
  source_json TEXT
  metadata_json TEXT

entry_tags
  entry_id TEXT NOT NULL
  tag TEXT NOT NULL
  PRIMARY KEY (entry_id, tag)
```

The later hybrid-global change should add scope and repository identity columns/tables to this schema rather than introducing separate global and per-repository JSON files.

### Use transactions for every memory mutation

Every write operation that changes memory state must execute in a transaction. This includes adding tool-result summaries, inferred session memory, singleton upserts, forgetting entries, staleness updates, usage/hit-count updates, migration imports, and health/export metadata updates.

This ensures parallel lifecycle events are serialized by SQLite and cannot corrupt a shared temporary file or lose entries through competing whole-array rewrites.

### Preserve inspectability with exports and commands

SQLite is not as directly inspectable as JSON, so the user-facing memory commands remain the primary inspection surface. `/memory show`, `/memory status`, and `/memory doctor` should report the SQLite database path, migration status, entry counts, and quality diagnostics. An export path should be available for JSON or Markdown inspection without making exported files canonical.

Alternative considered: rely on users opening the SQLite file with external tools. Rejected because memory is part of the agent trust surface and should remain understandable from inside pi.

### Import existing JSON conservatively

On startup, reload, or explicit migration, detect existing `.pi/memory/entries.json`. If SQLite has not already imported that source, parse through the existing safe JSON loader and insert compatible entries into SQLite in a single transaction. Preserve IDs and metadata where possible, add import metadata, suppress duplicates by dedupe key where appropriate, and do not delete or move original JSON files automatically.

Alternative considered: move `entries.json` out of the way after import. Rejected because the current memory system treats generated memory as auxiliary, and users should be able to inspect the source data before removing it.

### Make this change a prerequisite for hybrid global memory

The `add-hybrid-global-repo-memory` design currently proposes global and repository JSON partitions. After this change, that later proposal should be revised to use SQLite as its canonical store, adding scope/repository metadata and queries instead of `global/entries.json` and `repos/<repo-key>/entries.json`.

## Risks / Trade-offs

- SQLite reduces raw file readability → Keep `/memory` inspection strong and generate JSON/Markdown exports for debugging.
- `node:sqlite` availability may depend on the Node runtime used by pi → Validate runtime support early and document fallback options before adding dependencies.
- Synchronous SQLite calls can block the event loop briefly → Keep transactions small, avoid long-running queries in streaming paths, and use indexes for selection/health queries.
- Migration bugs could duplicate or lose memory → Preserve original JSON files, run imports transactionally, mark imported sources, and validate counts before considering migration complete.
- Schema evolution adds maintenance overhead → Store a schema version and use explicit migrations rather than opportunistic ad hoc changes.
- WAL sidecar files can surprise users → Show the canonical database path and explain sidecar files in `/memory doctor` or documentation.

## Migration Plan

1. Add SQLite database initialization and schema-version tracking without changing memory behavior.
2. Add a storage abstraction and route reads/writes through SQLite-backed operations.
3. Implement JSON import from `.pi/memory/entries.json` into SQLite, preserving original files.
4. Keep JSON export or generated inspection output available for users and diagnostics.
5. Validate concurrent writes by simulating multiple large tool-result memory records in the same turn.
6. Revise the pending `add-hybrid-global-repo-memory` artifacts to treat SQLite as the canonical store before applying that change.

Rollback strategy: because original JSON files are not deleted during migration, rollback can disable SQLite-backed storage and continue reading existing JSON data. Any SQLite-only entries created after the switch should be exportable to JSON before rollback when preservation is needed.

## Open Questions

- Should initial SQLite storage live at `.pi/memory/memory.sqlite` until the global-memory change, or should this change already place it under `~/.pi/agent/memory/` with repository-local compatibility?
- Should exports be automatic after every mutation, command-driven, or generated only by `/memory doctor` and `/memory export`?
- Should duplicate suppression be enforced by unique indexes, application logic, or a combination that permits retained duplicate records for inspection?
