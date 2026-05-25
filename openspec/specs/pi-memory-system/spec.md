## Purpose
Define how Pi stores, injects, inspects, and refreshes repo-scoped memory while keeping memory advisory rather than authoritative.

## Requirements

### Requirement: Repo-scoped memory storage
The system SHALL store memory under a global pi agent memory location while preserving repository-specific memory in isolated repository scopes and SHALL keep generated memory separate from source files and OpenSpec artifacts. Canonical scoped memory SHALL use the SQLite-backed storage established by `add-sqlite-memory-storage` rather than separate canonical JSON entry files.

#### Scenario: Repository memory is created
- **WHEN** the memory extension records repository-specific memory
- **THEN** the memory SHALL be written under a repository-specific scope in the global SQLite-backed memory location
- **AND** the entry SHALL identify the repository scope it belongs to
- **AND** the memory can be inspected or removed without modifying application source files

#### Scenario: Repository memory is isolated
- **WHEN** the agent runs in a different repository
- **THEN** memory recorded for another repository SHALL NOT be injected by default

#### Scenario: Global memory root is inspected
- **WHEN** the user inspects memory storage
- **THEN** the system SHALL distinguish global memory from repository-scoped memory

### Requirement: SQLite-backed memory storage
The system SHALL use a local SQLite database as the canonical structured store for memory entries, tags, and storage metadata.

#### Scenario: Memory database is initialized
- **WHEN** the memory extension starts and no SQLite memory database exists
- **THEN** the system creates the database and required schema in the memory storage location
- **AND** the system records or can determine the schema version for future migrations

#### Scenario: Memory entry is stored canonically
- **WHEN** the system records a memory entry
- **THEN** the entry is written to the SQLite database as the canonical source of truth
- **AND** generated JSON or Markdown views are treated as inspection or export artifacts rather than canonical storage

### Requirement: Transactional memory writes
The system SHALL perform memory mutations transactionally so concurrent lifecycle events cannot corrupt storage or lose accepted entries.

#### Scenario: Parallel tool results record memory
- **WHEN** multiple tool result handlers record memory during the same assistant tool batch
- **THEN** each accepted memory entry is committed through a SQLite transaction
- **AND** the memory database remains valid and queryable after all handlers complete
- **AND** successfully committed entries are not lost due to competing read-modify-write operations

#### Scenario: Memory mutation fails
- **WHEN** a memory mutation fails during a transaction
- **THEN** the system rolls back the incomplete mutation
- **AND** previously committed memory remains available for injection and inspection

### Requirement: JSON memory import
The system SHALL import compatible existing JSON memory data into SQLite without deleting the original JSON files automatically.

#### Scenario: Existing JSON memory is detected
- **WHEN** the memory extension finds an existing `.pi/memory/entries.json` file and the corresponding SQLite import has not been completed
- **THEN** the system reads compatible entries through safe JSON loading
- **AND** imports those entries into SQLite transactionally
- **AND** leaves the original JSON file available for user inspection

#### Scenario: Existing JSON memory is corrupt
- **WHEN** the memory extension finds an existing `.pi/memory/entries.json` file that cannot be fully parsed
- **THEN** the system uses existing safe recovery behavior where possible
- **AND** imports only compatible recovered entries into SQLite
- **AND** reports the recovery state through memory diagnostics

### Requirement: SQLite memory inspection and export
The system SHALL keep memory inspectable even though canonical storage is SQLite.

#### Scenario: User inspects SQLite-backed memory
- **WHEN** the user invokes a memory inspection command
- **THEN** the system reads memory from SQLite
- **AND** shows entries grouped with the same user-relevant metadata as before, including source kind, quality, lifecycle, stale, rejected, expired, duplicate, and forgotten state when present

#### Scenario: User diagnoses SQLite-backed memory
- **WHEN** the user invokes a memory health or doctor command
- **THEN** the system displays the SQLite database path, schema or migration status, storage validity, entry counts, and memory quality diagnostics

#### Scenario: User exports memory
- **WHEN** the user requests or the system generates an inspection export
- **THEN** the export reflects the SQLite-backed memory state
- **AND** the export does not replace SQLite as the canonical memory store

### Requirement: Hybrid-memory storage compatibility
The system SHALL prepare memory storage so later global and repository-scoped memory can be represented in SQLite without introducing separate canonical JSON stores.

#### Scenario: Later global memory design builds on SQLite
- **WHEN** a later change adds global and repository-scoped memory
- **THEN** the storage model can add scope and repository identity metadata to SQLite entries or related tables
- **AND** the later change does not need to create separate canonical `global/entries.json` and `repos/<repo-key>/entries.json` stores

### Requirement: Memory write points
The system SHALL write memory only at explicit lifecycle points: startup or reload indexing, tool result summarization, agent turn completion, compaction, and manual user commands, and SHALL apply quality gates before inferred or summarized content becomes durable memory.

#### Scenario: Agent turn completes with a design decision
- **WHEN** an agent turn ends after the user and agent settle on a design decision
- **THEN** the system records the decision in session memory only if it passes memory quality checks for durable repository relevance
- **AND** the entry indicates that it was inferred from conversation unless the user explicitly pinned it

#### Scenario: User pins a preference
- **WHEN** the user invokes a memory command to pin a preference
- **THEN** the system records the preference as pinned memory
- **AND** pinned memory is distinguishable from inferred memory

#### Scenario: Agent turn includes low-quality memory candidates
- **WHEN** an agent turn contains code fragments, raw tool output, memory-card echoes, existing memory IDs, raw file paths without durable meaning, or duplicate inferred-memory text
- **THEN** the system rejects or marks those candidates as low quality
- **AND** the rejected candidates are not injected as durable session memory in future turns

### Requirement: Bounded memory injection
The system SHALL inject only a bounded, relevant memory card into agent context before a turn, blending applicable global memory with memory scoped to the current repository.

#### Scenario: OpenSpec workflow begins
- **WHEN** the user starts or continues an OpenSpec workflow
- **THEN** the injected memory card includes relevant OpenSpec state for the current repository, relevant global or pinned preferences, and recent relevant session decisions within the configured budget
- **AND** unrelated memory is omitted
- **AND** repository-scoped memory from other repositories is omitted

#### Scenario: Memory card displays scope
- **WHEN** memory is injected into agent context
- **THEN** the memory card SHALL label entries or sections so global memory and current-repository memory are distinguishable

### Requirement: Memory is orientation not authority
The system SHALL present memory as orientation and SHALL NOT treat memory as a substitute for exact file reads before editing or exact claims.

#### Scenario: Agent prepares to edit a file mentioned in memory
- **WHEN** a memory entry summarizes a file relevant to an edit
- **THEN** the agent must read the exact current file contents before editing

### Requirement: User memory controls
The system SHALL provide user commands to inspect, refresh, pin, forget, and diagnose memory across global and repository scopes.

#### Scenario: User inspects memory
- **WHEN** the user invokes a memory inspection command
- **THEN** the system shows stored memory grouped by type, source, or scope
- **AND** the output distinguishes pinned, observed, inferred, stale, and rejected entries when that metadata exists

#### Scenario: User inspects global memory
- **WHEN** the user requests global memory inspection
- **THEN** the system shows memory entries that are eligible for use across repositories

#### Scenario: User inspects repository memory
- **WHEN** the user requests repository memory inspection from inside a repository
- **THEN** the system shows memory entries from the current repository partition

#### Scenario: User pins scoped memory
- **WHEN** the user invokes a memory command to pin a preference or note with an explicit global or repository scope
- **THEN** the system records the entry in the requested scope
- **AND** future memory injection respects that scope

#### Scenario: User forgets a memory entry
- **WHEN** the user invokes a memory forget command for an entry
- **THEN** the system removes or marks that entry as forgotten
- **AND** future memory injection excludes that entry

### Requirement: OpenSpec-aware compaction
The system SHALL preserve OpenSpec-specific workflow state during compaction.

#### Scenario: Session compaction occurs during an active change
- **WHEN** pi compacts a session while an OpenSpec change is active
- **THEN** the compacted summary includes the active change name, current task state, key decisions, modified artifacts, blockers, validation state, and next steps when known

### Requirement: Staleness visibility
The system SHALL identify observed memory that may be stale when its source files, command results, or relevant generated artifacts change.

#### Scenario: Source file changes after memory was recorded
- **WHEN** an observed memory entry references a source file whose timestamp or hash no longer matches
- **THEN** the system marks the entry as stale or excludes it from authoritative injection

#### Scenario: Command-derived memory changes after refresh
- **WHEN** an observed memory entry references a command-derived result and the current result hash or relevant dependency metadata no longer matches
- **THEN** the system marks the entry as stale, refreshes it at an explicit refresh point, or excludes it from injection

#### Scenario: OpenSpec index changes without config change
- **WHEN** OpenSpec active change state changes even though `openspec/config.yaml` is unchanged
- **THEN** the system does not rely solely on the config file hash to treat the OpenSpec index memory as fresh
- **AND** the system refreshes, marks stale, or deprioritizes the OpenSpec index according to current OpenSpec command or artifact metadata

### Requirement: Hybrid memory scopes
The system SHALL classify memory entries by explicit scope so user-wide memory can be reused globally while repository-specific memory remains isolated.

#### Scenario: Global preference is recorded
- **WHEN** the system records a durable user-wide preference
- **THEN** the entry SHALL be stored as global memory
- **AND** the entry SHALL be eligible for injection in any repository when relevant

#### Scenario: Repository-specific fact is recorded
- **WHEN** the system records repository structure, file paths, OpenSpec state, tool-result summaries, or repository-specific decisions
- **THEN** the entry SHALL be stored as repository-scoped memory for the current repository
- **AND** the entry SHALL NOT be eligible for injection in other repositories by default

#### Scenario: Ambiguous inferred memory is recorded
- **WHEN** the system infers memory that is not clearly user-wide
- **THEN** the entry SHALL default to repository scope when a repository is available

#### Scenario: Global memory has repository origin
- **WHEN** a global memory entry is discovered while working in a repository
- **THEN** the system MAY retain origin repository metadata for traceability
- **AND** the origin metadata SHALL NOT by itself restrict global injection eligibility

### Requirement: Repository memory partition identity
The system SHALL derive and persist a repository identity for repository-scoped memory.

#### Scenario: Repository root is available
- **WHEN** the memory extension records repository-scoped memory inside a git or OpenSpec repository
- **THEN** it SHALL derive the repository identity from the discovered repository root

#### Scenario: Repository metadata is recorded
- **WHEN** a repository identity is created or refreshed
- **THEN** the system SHALL record inspectable metadata such as the repository path, display name, and last-seen time in a global memory index

#### Scenario: No repository root is available
- **WHEN** no repository root can be discovered
- **THEN** repository-scoped generated memory SHALL NOT be mixed with an unrelated repository scope

### Requirement: Local memory migration
The system SHALL provide a safe migration or import path from existing repository-local `.pi/memory/` storage into the global repository memory scope.

#### Scenario: Existing local memory is found
- **WHEN** the memory extension starts in a repository with existing `.pi/memory/` data and no corresponding imported repository scope
- **THEN** it SHALL import compatible memory data into the repository scope or provide an explicit command to do so
- **AND** imported entries SHALL preserve enough metadata to identify their migration source

#### Scenario: Migration preserves original files
- **WHEN** local `.pi/memory/` data is imported into global memory storage
- **THEN** the system SHALL NOT automatically delete the original `.pi/memory/` files

#### Scenario: Migrated duplicate entries exist
- **WHEN** imported entries duplicate existing global or repository memory entries
- **THEN** the system SHALL use existing deduplication and quality logic to avoid injecting duplicate content

### Requirement: Memory dashboard command surface
The memory command surface SHALL expose an interactive dashboard entry point.

#### Scenario: User requests dashboard from memory command
- **WHEN** the user invokes `/memory dashboard`
- **THEN** the memory extension opens the interactive memory dashboard when UI interaction is available

#### Scenario: User requests dashboard without interactive UI
- **WHEN** the user invokes `/memory dashboard` in a non-interactive context
- **THEN** the system prints a concise message explaining that the dashboard requires interactive UI and points to `/memory stats` or benchmark reports for non-interactive inspection

### Requirement: Memory command completions include dashboard
The memory command SHALL include dashboard in argument completions.

#### Scenario: User completes memory subcommands
- **WHEN** the user requests completions for `/memory d`
- **THEN** the command completion list includes `dashboard`

### Requirement: Memory injection measurement control
The system SHALL support disabling memory injection for measurement without deleting or forgetting stored memory.

#### Scenario: Memory injection is disabled for a benchmark pass
- **WHEN** the benchmark runner starts a baseline pass with memory injection disabled
- **THEN** the memory system does not inject a memory card into agent context for that pass
- **AND** stored memory entries remain unchanged and available for later memory-assisted passes

#### Scenario: Memory injection is re-enabled after measurement
- **WHEN** the benchmark runner starts a memory-assisted pass after a disabled baseline pass
- **THEN** the memory system resumes normal bounded memory-card selection and injection

### Requirement: Memory status includes observability summary
The system SHALL extend memory status output with recent observability information.

#### Scenario: User requests memory status after observed turns
- **WHEN** the user invokes `/memory status`
- **THEN** the system shows active memory entry count, last injection entry count, last injection estimated tokens, and recent telemetry availability
- **AND** the output points users to `/memory stats` or the latest benchmark report when applicable

### Requirement: Benchmark telemetry is isolated from durable session memory
The system SHALL prevent benchmark execution artifacts from polluting normal durable session memory when practical.

#### Scenario: Benchmark child run completes
- **WHEN** a benchmark child run records telemetry or answer data
- **THEN** the system stores benchmark-specific data under the benchmark run directory or benchmark-tagged telemetry
- **AND** the system does not promote benchmark prompts or answers into normal inferred session memory as durable user preferences or design decisions
