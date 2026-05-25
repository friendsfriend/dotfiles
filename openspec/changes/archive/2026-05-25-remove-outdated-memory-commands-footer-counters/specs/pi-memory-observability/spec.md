## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Memory statistics command
**Reason**: `/memory stats` is part of the removed `/memory` slash-command surface and is no longer a required observability interface.
**Migration**: Use the footer counters for lightweight session-local memory query/result/write visibility. Existing telemetry persistence may remain for internal auditing or future purpose-built observability surfaces.
