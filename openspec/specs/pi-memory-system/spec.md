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

#### Scenario: SQLite-backed memory is inspected
- **WHEN** a supported internal diagnostic or export path inspects stored memory
- **THEN** the system reads memory from SQLite
- **AND** shows entries with user-relevant metadata including source kind, quality, lifecycle, stale, rejected, expired, duplicate, and forgotten state when present

#### Scenario: SQLite-backed memory is diagnosed
- **WHEN** a supported diagnostic path checks memory storage health
- **THEN** the system can report the SQLite database path, schema or migration status, storage validity, entry counts, and memory quality diagnostics

#### Scenario: Memory export is generated
- **WHEN** the system generates an inspection export
- **THEN** the export reflects the SQLite-backed memory state
- **AND** the export does not replace SQLite as the canonical memory store

### Requirement: Hybrid-memory storage compatibility
The system SHALL prepare memory storage so later global and repository-scoped memory can be represented in SQLite without introducing separate canonical JSON stores.

#### Scenario: Later global memory design builds on SQLite
- **WHEN** a later change adds global and repository-scoped memory
- **THEN** the storage model can add scope and repository identity metadata to SQLite entries or related tables
- **AND** the later change does not need to create separate canonical `global/entries.json` and `repos/<repo-key>/entries.json` stores

### Requirement: Memory footer activity counters
The system SHALL show session-local memory activity counters in the Pi footer status using the memory extension status slot.

#### Scenario: Session starts with no explicit memory activity
- **WHEN** a Pi session starts or reloads
- **THEN** the memory footer status SHALL show zero explicit memory queries, zero total query results, and zero explicit memory writes

#### Scenario: Memory query completes
- **WHEN** the `memory_query` tool successfully returns results
- **THEN** the memory footer status SHALL increment the query count by one
- **AND** the memory footer status SHALL add the number of returned memory entries and file-summary records to the total result count

#### Scenario: Memory save completes
- **WHEN** the `memory_save` tool successfully records a durable semantic memory entry
- **THEN** the memory footer status SHALL increment the explicit memory write count by one

#### Scenario: Internal memory storage changes occur
- **WHEN** telemetry is appended, file-summary cache records are updated, memory data is imported, startup indexes are refreshed, staleness metadata is updated, or inspection exports are generated
- **THEN** the memory footer status SHALL NOT increment the explicit memory write count

### Requirement: Memory write points
The system SHALL write durable semantic memory only through explicit agent save actions, compaction handoff where required for continuity, or narrowly scoped startup/reload indexing, and SHALL keep telemetry and file-summary cache data separate from durable semantic notes.

#### Scenario: Agent explicitly saves a design decision
- **WHEN** an agent determines that a design decision, completed investigation, blocker, assumption, next step, or workflow state is worth preserving
- **THEN** the agent SHALL record it through an explicit memory save action
- **AND** the saved entry SHALL identify its scope, type, source, and relevant metadata such as related files or change name when provided

#### Scenario: Tool output is observed
- **WHEN** a read, bash, graph, or other tool result is produced
- **THEN** the system SHALL NOT automatically promote the raw result or broad summary into durable semantic memory
- **AND** telemetry or bounded diagnostic records MAY be stored separately from durable notes
- **AND** a durable note SHALL be created only when the agent explicitly saves a distilled entry

#### Scenario: Agent turn completes without explicit save
- **WHEN** an agent turn ends after normal work
- **THEN** the system SHALL NOT infer and store semantic memory solely from the conversation transcript
- **AND** telemetry MAY record that the turn occurred without creating durable semantic memory

### Requirement: Bounded memory injection
The system SHALL limit automatic memory injection to a minimal session-start context and SHALL require explicit tool queries for memory access after the session-start context has been delivered.

#### Scenario: Session starts
- **WHEN** a Pi session starts or reloads
- **THEN** the system SHALL inject at most a compact boot hint explaining that memory query and save tools are available
- **AND** the boot context MAY include a bounded summary of pinned global preferences when configured
- **AND** the boot context SHALL remind the agent that memory is orientation and exact files or commands remain authoritative

#### Scenario: Agent turn begins after session start
- **WHEN** a normal agent turn begins after the initial session-start context
- **THEN** the system SHALL NOT automatically select and inject stored memory entries for that turn
- **AND** the agent SHALL use memory query tools when past work, decisions, preferences, or continuation context is relevant

#### Scenario: OpenSpec workflow begins
- **WHEN** the user starts or continues an OpenSpec workflow after session start
- **THEN** the system SHALL NOT automatically inject OpenSpec memory cards
- **AND** the agent SHALL query current OpenSpec CLI/artifacts and memory tools as needed for prior decisions or history
- **AND** repository-scoped memory from other repositories SHALL remain excluded from default query results

#### Scenario: Memory card displays scope
- **WHEN** the minimal session-start memory context includes any memory entry
- **THEN** the memory context SHALL label entries or sections so global memory and current-repository memory are distinguishable

### Requirement: Effective-intent memory selection
The system SHALL select automatic memory using a compact effective-intent query rather than scoring every memory entry against the full prompt envelope.

#### Scenario: Prompt contains workflow boilerplate
- **WHEN** a prompt includes command workflow instructions, tool-use guardrails, previously injected memory-card text, or large code blocks in addition to the user's actual request
- **THEN** memory scoring SHALL ignore or strongly downweight the boilerplate portions where deterministic extraction is practical
- **AND** memory selection SHALL preserve the user's actual request terms for relevance scoring

#### Scenario: Intent extraction is inconclusive
- **WHEN** the system cannot derive a useful effective-intent query
- **THEN** it SHALL fall back safely without selecting low-confidence generated memory solely from generic workflow terms

### Requirement: Hot and cold memory separation
The system SHALL distinguish memory that is eligible for automatic session-start boot context from memory that is stored only for targeted retrieval, observability, or internal graph annotation.

#### Scenario: Hot memory is available for session start
- **WHEN** pinned global preferences are configured for boot context inclusion and pass the session-start policy
- **THEN** the system MAY include those entries in the bounded session-start boot context

#### Scenario: Cold memory is available
- **WHEN** stored memory consists of tool-result summaries, command output summaries, repo-orientation scans, telemetry artifacts, stale observations, rejected entries, or low-confidence inferred candidates
- **THEN** the system SHALL keep those entries excluded from automatic prompt injection after session start
- **AND** those entries SHALL be available only through targeted memory query behavior or internal diagnostic surfaces that are not exposed through the removed `/memory` command

#### Scenario: Agent inspects memory through explicit query
- **WHEN** the agent invokes `memory_query` with relevant filters
- **THEN** the system SHALL return bounded advisory results from matching stored memory
- **AND** the query result SHALL NOT replace exact current file, OpenSpec, graph, or command reads

### Requirement: Memory is orientation not authority
The system SHALL present memory as orientation and SHALL NOT treat memory as a substitute for exact file reads before editing or exact claims.

#### Scenario: Agent prepares to edit a file mentioned in memory
- **WHEN** a memory entry summarizes a file relevant to an edit
- **THEN** the agent must read the exact current file contents before editing

### Requirement: User memory controls
The system SHALL provide agent tool access to query and save memory across supported scopes without exposing a `/memory` slash-command surface.

#### Scenario: Agent queries past work
- **WHEN** the agent invokes `memory_query` with text, type, related file, change name, scope, or recency filters
- **THEN** the system SHALL return matching past-work notes such as decisions, investigations, blockers, assumptions, preferences, and saved workflow state
- **AND** query results SHALL be advisory and SHALL NOT replace current OpenSpec/file/tool reads

#### Scenario: Agent saves memory
- **WHEN** the agent invokes `memory_save` with a durable note
- **THEN** the system SHALL record the entry with source metadata identifying it as agent-saved
- **AND** the entry SHALL be queryable in later sessions
- **AND** the entry SHALL NOT be automatically injected after session start unless explicitly included in the minimal boot context policy

#### Scenario: Slash-command memory access is requested
- **WHEN** the user attempts to invoke `/memory` or any former `/memory` subcommand
- **THEN** the memory extension SHALL NOT provide that slash command
- **AND** memory access SHALL remain available to the agent through `memory_query` and `memory_save`

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
- **THEN** it SHALL import compatible memory data into the repository scope
- **AND** imported entries SHALL preserve enough metadata to identify their migration source

#### Scenario: Migration preserves original files
- **WHEN** local `.pi/memory/` data is imported into global memory storage
- **THEN** the system SHALL NOT automatically delete the original `.pi/memory/` files

#### Scenario: Migrated duplicate entries exist
- **WHEN** imported entries duplicate existing global or repository memory entries
- **THEN** the system SHALL use existing deduplication and quality logic to avoid injecting duplicate content

### Requirement: Tool-queried memory access
The system SHALL make stored memory available through explicit tools rather than routine prompt injection or memory slash commands.

#### Scenario: Agent needs prior decisions
- **WHEN** the agent needs to know what was decided or completed in prior work
- **THEN** the agent SHALL query memory with an explicit query describing the needed history
- **AND** the system SHALL return bounded, scoped, advisory results

#### Scenario: Agent does not need history
- **WHEN** the agent can complete the task using current prompt, graph navigation, and exact tools
- **THEN** the system SHALL spend no additional prompt tokens on stored memory beyond the session-start boot context

### Requirement: File summary cache storage
The system SHALL support storing read-derived one-line file summaries as repository-scoped graph annotation data rather than automatic prompt memory.

#### Scenario: File is read and summarized
- **WHEN** a file read produces a one-line responsibility summary
- **THEN** the system SHALL store the summary with repository identity, path, content hash, creation time, and source metadata
- **AND** the summary SHALL be bounded and SHALL NOT contain raw code snippets, secrets, or line-level authoritative claims
- **AND** the summary SHALL be available to graph tooling as navigation metadata

#### Scenario: File summary is stale
- **WHEN** the current file content hash does not match a stored read-derived summary hash
- **THEN** the system SHALL exclude that summary from graph ranking and normal display
- **AND** the stale summary MAY remain inspectable for diagnostics or history

#### Scenario: Memory is queried
- **WHEN** a user or agent queries semantic memory for past work
- **THEN** file-summary cache entries SHALL NOT dominate semantic memory results unless the query explicitly requests file summaries or graph annotations



### Requirement: Memory store lifecycle cleanup
The memory system SHALL release SQLite-backed resources associated with the current extension runtime during session shutdown, reload, fork, or session switch flows.

#### Scenario: Session shuts down after memory store use
- **WHEN** the memory extension has opened SQLite-backed memory stores and pi emits session shutdown for the extension runtime
- **THEN** the memory extension SHALL close the runtime's open SQLite database handles or otherwise release them safely
- **AND** cleanup SHALL tolerate repeated or best-effort shutdown without corrupting stored memory

#### Scenario: Memory is queried after reload
- **WHEN** the extension runtime is reloaded after previous memory store cleanup
- **THEN** a later `memory_query` or `memory_save` call SHALL open or reuse a valid current-runtime store
- **AND** stored memory SHALL remain queryable from the canonical SQLite database

### Requirement: Guarded startup memory refresh
The memory system SHALL avoid unnecessary startup or reload refresh work when the current repository context does not require that refresh for supported memory behavior.

#### Scenario: Startup has no OpenSpec project
- **WHEN** the memory extension starts in a repository or directory without an initialized OpenSpec project
- **THEN** the memory extension SHALL NOT perform an OpenSpec index refresh that requires running OpenSpec CLI commands
- **AND** the minimal memory boot context and footer counters SHALL still initialize normally

#### Scenario: Refresh is needed later
- **WHEN** a supported memory query, save, staleness, or diagnostic path requires refreshed repository or OpenSpec orientation
- **THEN** the memory extension SHALL refresh the required data at that point or mark older observed data stale rather than treating it as authoritative

### Requirement: Durable memory retention during pruning
The memory system SHALL avoid pruning durable global or high-value semantic memory solely because unrelated newer entries from other scopes exist.

#### Scenario: Pruning runs with protected memory entries
- **WHEN** the memory store prunes entries to enforce bounded storage
- **THEN** pinned global preferences and high-quality durable agent-saved entries SHALL be protected from deletion when lower-value entries can be pruned instead
- **AND** repository-scoped activity SHALL NOT by itself delete protected global memory

#### Scenario: Storage remains bounded
- **WHEN** protected entries are retained during pruning
- **THEN** the memory system SHALL still bound lower-value generated, telemetry-derived, stale, duplicate, rejected, forgotten, or expired entries according to the configured retention policy
