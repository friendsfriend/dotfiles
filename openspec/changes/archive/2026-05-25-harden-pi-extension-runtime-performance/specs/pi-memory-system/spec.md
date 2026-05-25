## ADDED Requirements

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
