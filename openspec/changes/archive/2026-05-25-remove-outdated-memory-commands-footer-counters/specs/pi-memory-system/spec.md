## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Tool-queried memory access
The system SHALL make stored memory available through explicit tools rather than routine prompt injection or memory slash commands.

#### Scenario: Agent needs prior decisions
- **WHEN** the agent needs to know what was decided or completed in prior work
- **THEN** the agent SHALL query memory with an explicit query describing the needed history
- **AND** the system SHALL return bounded, scoped, advisory results

#### Scenario: Agent does not need history
- **WHEN** the agent can complete the task using current prompt, graph navigation, and exact tools
- **THEN** the system SHALL spend no additional prompt tokens on stored memory beyond the session-start boot context

## REMOVED Requirements

### Requirement: Memory dashboard command surface
**Reason**: The `/memory` command surface is being removed, including `/memory dashboard`.
**Migration**: Use the footer counters for lightweight session-local activity visibility. Agents use `memory_query` for targeted historical lookup.

### Requirement: Memory command completions include dashboard
**Reason**: The `/memory` command and its subcommand completions are being removed.
**Migration**: No replacement completion is provided; memory remains available through registered tools.

### Requirement: Memory status includes observability summary
**Reason**: `/memory status` is part of the removed command surface.
**Migration**: Use the footer counters for current-session query/result/write visibility.
