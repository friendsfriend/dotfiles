## MODIFIED Requirements

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

## ADDED Requirements

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
