## ADDED Requirements

### Requirement: Repo-scoped memory storage
The system SHALL store memory for a repository in a local, inspectable location and SHALL keep generated memory separate from source files and OpenSpec artifacts.

#### Scenario: Memory is created for a repository
- **WHEN** the memory extension records repo-specific memory
- **THEN** the memory is written under a repository-local memory location such as `.pi/memory/`
- **AND** the memory can be inspected or removed without modifying application source files

### Requirement: Memory write points
The system SHALL write memory only at explicit lifecycle points: startup or reload indexing, tool result summarization, agent turn completion, compaction, and manual user commands.

#### Scenario: Agent turn completes with a design decision
- **WHEN** an agent turn ends after the user and agent settle on a design decision
- **THEN** the system records the decision in session memory
- **AND** the entry indicates that it was inferred from conversation unless the user explicitly pinned it

#### Scenario: User pins a preference
- **WHEN** the user invokes a memory command to pin a preference
- **THEN** the system records the preference as pinned memory
- **AND** pinned memory is distinguishable from inferred memory

### Requirement: Bounded memory injection
The system SHALL inject only a bounded, relevant memory card into agent context before a turn.

#### Scenario: OpenSpec workflow begins
- **WHEN** the user starts or continues an OpenSpec workflow
- **THEN** the injected memory card includes relevant OpenSpec state, pinned preferences, and recent session decisions within the configured budget
- **AND** unrelated memory is omitted

### Requirement: Memory is orientation not authority
The system SHALL present memory as orientation and SHALL NOT treat memory as a substitute for exact file reads before editing or exact claims.

#### Scenario: Agent prepares to edit a file mentioned in memory
- **WHEN** a memory entry summarizes a file relevant to an edit
- **THEN** the agent must read the exact current file contents before editing

### Requirement: User memory controls
The system SHALL provide user commands to inspect, refresh, pin, and forget memory.

#### Scenario: User inspects memory
- **WHEN** the user invokes a memory inspection command
- **THEN** the system shows stored memory grouped by type or source
- **AND** the output distinguishes pinned, observed, inferred, stale, and rejected entries when that metadata exists

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
The system SHALL identify observed memory that may be stale when its source files change.

#### Scenario: Source file changes after memory was recorded
- **WHEN** an observed memory entry references a source file whose timestamp or hash no longer matches
- **THEN** the system marks the entry as stale or excludes it from authoritative injection
