## Context

The current memory extension stores all memory relative to the current working directory under `.pi/memory/`. It already has useful behavior: bounded injection, quality gates, backup/quarantine handling, staleness checks, health diagnostics, OpenSpec indexing, user commands, and compaction integration.

The desired direction is different from purely repo-local memory: the memory system should be globally installed and should have global storage for user-wide preferences and cross-project workflow knowledge. At the same time, repository-specific facts, file paths, OpenSpec state, and tool summaries must remain isolated to their repository to avoid cross-project contamination.

## Goals / Non-Goals

**Goals:**

- Store memory under the global pi agent data area while preserving separate global and repository-specific scopes in the SQLite-backed memory store introduced by `add-sqlite-memory-storage`.
- Add explicit scope metadata to memory entries and memory-card rendering.
- Inject a bounded blend of relevant global memory and current-repository memory.
- Prevent repository-specific memory from being injected into other repositories by default.
- Preserve existing memory quality, health, backup, quarantine, staleness, and compaction principles.
- Provide a safe migration/import path from existing `.pi/memory/` data.

**Non-Goals:**

- Cloud sync, remote memory, embeddings, vector search, or external databases beyond the local SQLite store introduced by `add-sqlite-memory-storage`.
- Making memory authoritative for edits or exact claims.
- Automatically deleting existing `.pi/memory/` files after migration.
- Solving cross-machine repository identity perfectly in the first iteration.
- Moving pi assets into global installation; that is handled by the global asset layout change.

## Decisions

### Store memory under `~/.pi/agent/memory/` using SQLite as the canonical store

This change builds on `add-sqlite-memory-storage`. Use a global pi agent memory root with SQLite as the canonical structured store and generated artifacts for inspection:

```text
~/.pi/agent/memory/
  memory.sqlite
  memory.sqlite-wal
  memory.sqlite-shm
  exports/
    global/
      preferences.md
      health.json
    repos/
      <repo-key>/
        repo.md
        openspec-index.json
        health.json
        entries.export.json
```

Global and repository memory are logical scopes in SQLite entries and related tables rather than separate canonical `entries.json` files. Alternative considered: keep `.pi/memory/` as the canonical store and only globally install the extension. Rejected because user-wide preferences and memory controls should work across repositories. Alternative considered after the SQLite proposal: separate global and per-repository JSON partitions. Rejected because `add-sqlite-memory-storage` establishes SQLite as the transactional canonical store.

### Classify every memory entry with scope

Extend entries with explicit scope metadata, conceptually:

```text
global: usable in any repository when relevant
repo: usable only in the matching repository by default
session: temporary or current-session context, optionally tied to a repository
```

Repo-scoped entries should also carry a repository key. Global entries may carry an origin repository key for traceability, but origin does not restrict injection. These fields should be represented as SQLite columns or related tables, not inferred from separate JSON file paths.

Alternative considered: infer scope only from storage path. Rejected because scope should remain visible in inspection, health output, migration, and memory-card rendering.

### Derive a stable repository partition key

Repository identity should prefer a discovered git root, then an OpenSpec root, then the canonical current working directory. The key can initially be a hash of the canonical root path, with `index.json` storing human-readable metadata such as path, name, and last-seen timestamp.

Alternative considered: use only git remotes. Rejected because local-only repositories and private paths still need memory partitions, and remotes may be absent or change.

### Use source-aware default scope classification

Default memory scope should come from source and content:

- Pinned user preferences that are clearly user-wide default to global.
- Repo orientation, OpenSpec index, file/path summaries, and tool-result summaries default to the current repository scope.
- Inferred session decisions default to repository scope unless they are clearly user-wide preferences.
- Explicit command arguments can force global or repository scope.

Alternative considered: make all pinned memory global. Rejected because a user may pin repo-specific notes that should not leak elsewhere.

### Blend global and repository memory during injection

Before each agent turn, select from global memory and from the current repository partition. The memory card should label sections clearly, for example `Global Memory` and `Repo Memory: <name>`, and should continue to state that memory is orientation, not authority.

Alternative considered: combine all entries into one flat selection pool. Rejected because visible scope boundaries help the agent and user understand why a memory was injected.

### Migrate local `.pi/memory/` conservatively

If existing repository-local `.pi/memory/` data is found for the current repository and no imported repository scope exists in the global SQLite store, import compatible data into the repository scope and mark entries with migration/source metadata. Do not automatically delete `.pi/memory/`; users can inspect and remove it manually after confirming migration.

Alternative considered: move the directory in place. Rejected because memory is auxiliary and migration should not destroy inspectable source data.

## Risks / Trade-offs

- Repo-specific facts could leak globally if classification is too aggressive → Default ambiguous inferred entries to repository scope and require explicit promotion for global use.
- Path-hash repo keys may not match the same repo on another machine → Store metadata in `index.json` and leave remote-based identity as a later enhancement.
- Migration can duplicate memory temporarily → Use SQLite dedupe keys, indexes, and migration markers to suppress duplicate injection while preserving inspectability.
- Global memory can become noisy across projects → Preserve relevance scoring, quality gates, TTL behavior, and `/memory doctor` diagnostics.
- Moving storage can surprise users looking for `.pi/memory/` → Provide command output and documentation that show the global storage path and current repo partition.
