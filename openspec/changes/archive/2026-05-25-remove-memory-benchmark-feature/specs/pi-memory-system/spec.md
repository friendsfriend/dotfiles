## MODIFIED Requirements

### Requirement: Memory write points
The system SHALL write durable semantic memory only through explicit user pinning, explicit agent save actions, compaction handoff where required for continuity, or narrowly scoped startup/reload indexing, and SHALL keep telemetry and file-summary cache data separate from durable semantic notes.

#### Scenario: Agent explicitly saves a design decision
- **WHEN** an agent determines that a design decision, completed investigation, blocker, assumption, next step, or workflow state is worth preserving
- **THEN** the agent SHALL record it through an explicit memory save action
- **AND** the saved entry SHALL identify its scope, type, source, and relevant metadata such as related files or change name when provided

#### Scenario: User pins a preference
- **WHEN** the user invokes a memory command to pin a preference
- **THEN** the system records the preference as pinned memory
- **AND** pinned memory is distinguishable from agent-saved and generated memory

#### Scenario: Tool output is observed
- **WHEN** a read, bash, graph, or other tool result is produced
- **THEN** the system SHALL NOT automatically promote the raw result or broad summary into durable semantic memory
- **AND** telemetry or bounded diagnostic records MAY be stored separately from durable notes
- **AND** a durable note SHALL be created only when the user or agent explicitly saves a distilled entry

#### Scenario: Agent turn completes without explicit save
- **WHEN** an agent turn ends after normal work
- **THEN** the system SHALL NOT infer and store semantic memory solely from the conversation transcript
- **AND** telemetry MAY record that the turn occurred without creating durable semantic memory

### Requirement: Memory status includes observability summary
The system SHALL extend memory status output with recent observability information.

#### Scenario: User requests memory status after observed turns
- **WHEN** the user invokes `/memory status`
- **THEN** the system shows active memory entry count, last injection entry count, last injection estimated tokens, and recent telemetry availability
- **AND** the output points users to `/memory stats` or `/memory dashboard` when applicable

## REMOVED Requirements

### Requirement: Memory injection measurement control
**Reason**: Disabling and re-enabling memory injection for benchmark passes is no longer needed after removing the benchmark feature.

**Migration**: Stored memories remain managed through existing memory controls. Users should inspect normal runtime injection behavior through `/memory status`, `/memory stats`, and `/memory dashboard`.

### Requirement: Benchmark telemetry is isolated from durable session memory
**Reason**: Benchmark child runs, benchmark answer data, and benchmark-specific artifact storage are removed.

**Migration**: The broader memory write-point requirement continues to prevent normal telemetry and tool observations from becoming durable semantic memory unless explicitly saved or pinned.
