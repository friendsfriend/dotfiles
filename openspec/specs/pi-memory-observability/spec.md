## Purpose
Define how Pi records and summarizes repo memory observability so users can audit runtime memory effectiveness while distinguishing estimates from actual provider usage.

## Requirements

### Requirement: Memory telemetry persistence
The system SHALL persist memory observability events in an inspectable memory location and SHALL include enough metadata to audit memory effectiveness across sessions or future diagnostic surfaces.

#### Scenario: Memory card is injected for a turn
- **WHEN** the memory system selects one or more entries for session-start boot context or another supported memory context
- **THEN** the system records a telemetry event with the selected memory entry IDs, hit count, estimated card tokens, memory enabled state, timestamp, and prompt summary
- **AND** the telemetry event is stored under memory storage without modifying application source files

#### Scenario: No memory is selected for a turn
- **WHEN** no memory entries are selected before an observed turn
- **THEN** the system records a telemetry event indicating zero memory hits and the memory enabled state

### Requirement: Footer memory activity observability
The system SHALL provide compact session-local memory activity observability through the Pi footer status.

#### Scenario: Footer activity is displayed
- **WHEN** the memory extension is loaded in a session
- **THEN** the footer status SHALL display the number of explicit memory queries, the total number of results returned by those queries, and the number of explicit durable semantic memory writes for the current extension runtime

#### Scenario: Query result count is displayed
- **WHEN** one or more `memory_query` calls complete successfully during the current session
- **THEN** the footer result counter SHALL equal the sum of memory entries and file-summary records returned by those successful calls

#### Scenario: Write count excludes telemetry
- **WHEN** memory telemetry, provider telemetry, tool telemetry, or file-summary cache data is persisted
- **THEN** the footer write counter SHALL remain unchanged

### Requirement: Estimated memory savings
The system SHALL estimate avoided context tokens for memory hits when memory injection or telemetry records require those estimates and SHALL clearly distinguish estimated savings from actual provider usage wherever those values are displayed.

#### Scenario: Memory hit has an estimated savings value
- **WHEN** a memory entry is selected for session-start boot context or another supported memory context
- **THEN** the system estimates gross avoided context tokens for that entry using recorded source size or a documented heuristic
- **AND** the system records estimated net savings as estimated gross avoided tokens minus injected memory-card tokens

#### Scenario: Estimated savings are displayed
- **WHEN** any supported diagnostic or future observability surface displays estimated avoided tokens or estimated net savings
- **THEN** those values SHALL be labeled as estimates
- **AND** provider-reported token usage and cost SHALL be shown separately when available

### Requirement: Provider usage and cost telemetry
The system SHALL record actual provider usage and cost for memory-observed turns when pi exposes that data.

#### Scenario: Assistant message includes usage
- **WHEN** an assistant message completes with provider usage data
- **THEN** the system records provider, model, input tokens, output tokens, cache read tokens, cache write tokens, total tokens, and cost fields

#### Scenario: Provider usage is unavailable
- **WHEN** provider usage or cost data is absent
- **THEN** the system records the field as unknown or omitted without fabricating actual usage values

### Requirement: Tool and latency telemetry
The system SHALL record tool activity and timing data for turns observed by memory telemetry.

#### Scenario: Tool is called during an observed turn
- **WHEN** the agent calls a tool during a memory-observed turn
- **THEN** the system records the tool name, call count, timing when available, success or error state, and a safe summary of arguments or outputs

#### Scenario: Turn completes
- **WHEN** an observed turn completes
- **THEN** the system records turn duration and aggregate tool counts by tool name
