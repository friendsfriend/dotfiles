## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Repo-scoped memory storage
The system SHALL store memory for a repository in a local, inspectable memory location and SHALL keep generated memory separate from source files and OpenSpec artifacts. Canonical structured memory SHALL be stored in SQLite, while JSON or Markdown files MAY be generated for migration, backup, export, or inspection.

#### Scenario: Memory is created for a repository
- **WHEN** the memory extension records repo-specific memory
- **THEN** the memory is written to a local SQLite memory database associated with the repository memory location
- **AND** the memory can be inspected or removed without modifying application source files
- **AND** any generated JSON or Markdown inspection artifacts are not treated as the canonical store
