## ADDED Requirements

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
