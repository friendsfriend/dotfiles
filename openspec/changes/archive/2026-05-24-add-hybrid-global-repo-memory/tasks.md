## 1. Storage Roots and Repository Identity

- [x] 1.1 Confirm `add-sqlite-memory-storage` has established SQLite as the canonical memory store before applying this change; build hybrid scope on SQLite tables/queries rather than separate canonical JSON partitions.
- [x] 1.2 Add global memory root path helpers for `~/.pi/agent/memory/`, the global SQLite database, generated export paths, and repository export directories.
- [x] 1.3 Implement repository root discovery that prefers git root, then OpenSpec root, then canonical current working directory when appropriate.
- [x] 1.4 Implement repository key generation and repository index metadata updates with path, display name, and last-seen time in SQLite-backed metadata.
- [x] 1.5 Ensure no-repository contexts do not write generated repository memory into an unrelated repository scope.

## 2. Scoped Entry Model

- [x] 2.1 Extend memory entry metadata with explicit scope information for global, repository, and temporary/session memory.
- [x] 2.2 Preserve compatibility with existing entries that do not yet have scope metadata.
- [x] 2.3 Add origin repository metadata for global entries when they are discovered or pinned from inside a repository.
- [x] 2.4 Update dedupe-key, lifecycle, and health helpers to include scope where necessary and avoid cross-scope collisions.

## 3. Read/Write and Migration

- [x] 3.1 Update SQLite-backed read/write helpers so global entries and current-repository entries are selected by scope and repository key.
- [x] 3.2 Preserve transactional writes, safe JSON import behavior, previous-valid backup/export behavior, and corruption quarantine reporting for migrated sources.
- [x] 3.3 Implement migration/import detection for existing repository-local `.pi/memory/` data and repository-local SQLite memory.
- [x] 3.4 Import compatible local memory into the current repository scope with migration source metadata.
- [x] 3.5 Ensure migration does not automatically delete original `.pi/memory/` files.
- [x] 3.6 Suppress duplicate injection for migrated entries that duplicate existing global or repository entries.

## 4. Scope Classification and Commands

- [x] 4.1 Default pinned user-wide preferences to global scope when explicitly requested or clearly classified as global.
- [x] 4.2 Default repo orientation, OpenSpec index, file/path summaries, tool summaries, and repo-specific decisions to repository scope.
- [x] 4.3 Default ambiguous inferred memory to repository scope when a repository is available.
- [x] 4.4 Extend `/memory` command parsing and completions to support explicit global and repository scope inspection and pinning.
- [x] 4.5 Update `/memory show`, `status`, `doctor`/`health`, `forget`, `refresh`, and `clear-generated` behavior to respect scope.

## 5. Scope-Aware Injection and Compaction

- [x] 5.1 Update memory selection to consider global entries plus only the current repository partition for repository-scoped entries.
- [x] 5.2 Ensure repository-scoped memory from other repositories is never selected by default.
- [x] 5.3 Render memory cards with clear global and current-repository sections or labels.
- [x] 5.4 Preserve token budgets, relevance scoring, quality gates, staleness exclusion, and orientation-not-authority language.
- [x] 5.5 Update OpenSpec-aware compaction to include relevant global memory and current-repository memory without cross-repo leakage.

## 6. Validation

- [x] 6.1 Validate startup/reload with no memory, existing global memory, existing repository memory, and existing `.pi/memory/` local data.
- [x] 6.2 Validate global pinned memory can be injected in multiple repositories when relevant.
- [x] 6.3 Validate repository-specific OpenSpec or file-path memory is injected only in the matching repository.
- [x] 6.4 Validate `/memory show|status|pin|forget|refresh|doctor|clear-generated` across global and repository scopes.
- [x] 6.5 Validate corrupt entries and backups remain isolated per partition and fail open.
- [x] 6.6 Run TypeScript syntax/type validation appropriate for the memory extension.
- [x] 6.7 Run OpenSpec validation for the change artifacts.
