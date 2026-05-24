## ADDED Requirements

### Requirement: Memory telemetry persistence
The system SHALL persist memory observability events in a repo-local, inspectable location and SHALL include enough metadata to audit memory effectiveness across sessions.

#### Scenario: Memory card is injected for a turn
- **WHEN** the memory system selects one or more entries for injection before an agent turn
- **THEN** the system records a telemetry event with the selected memory entry IDs, hit count, estimated card tokens, memory enabled state, timestamp, and prompt summary
- **AND** the telemetry event is stored under `.pi/memory/` without modifying application source files

#### Scenario: No memory is selected for a turn
- **WHEN** no memory entries are selected before an agent turn
- **THEN** the system records a telemetry event indicating zero memory hits and the memory enabled state

### Requirement: Estimated memory savings
The system SHALL estimate avoided context tokens for memory hits and SHALL clearly distinguish estimated savings from actual provider usage.

#### Scenario: Memory hit has an estimated savings value
- **WHEN** a memory entry is selected for injection
- **THEN** the system estimates gross avoided context tokens for that entry using recorded source size or a documented heuristic
- **AND** the system records estimated net savings as estimated gross avoided tokens minus injected memory-card tokens

#### Scenario: Stats are shown to the user
- **WHEN** the user views memory statistics
- **THEN** estimated avoided tokens and estimated net savings are labeled as estimates
- **AND** provider-reported token usage and cost are shown separately when available

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

### Requirement: Memory statistics command
The system SHALL provide a memory statistics command that summarizes runtime memory effectiveness.

#### Scenario: User requests memory statistics
- **WHEN** the user invokes `/memory stats`
- **THEN** the system shows total observed turns, turns with memory hits, hit rate, injected memory tokens, estimated avoided tokens, estimated net savings, actual provider tokens and cost when available, and top-hit memory entries

#### Scenario: Statistics output is too large for notification
- **WHEN** memory statistics output exceeds a short notification length
- **THEN** the system presents the statistics in an editor or similarly readable UI surface

### Requirement: Benchmark suite
The system SHALL define a default memory benchmark suite with ten read-only, context-heavy requests.

#### Scenario: Benchmark runs with defaults
- **WHEN** the user invokes `/memory benchmark` without specifying a custom suite
- **THEN** the system runs the default suite of ten benchmark requests
- **AND** each request includes deterministic quality assertions or expected facts where practical

#### Scenario: Benchmark request completes
- **WHEN** a benchmark request completes
- **THEN** the system records the prompt, pass name, duration, assistant answer summary, memory telemetry, provider usage, tool telemetry, and assertion results

### Requirement: Baseline versus memory-assisted benchmark
The system SHALL compare a baseline pass with memory injection disabled against a memory-assisted pass with memory injection enabled.

#### Scenario: Benchmark comparison starts
- **WHEN** the benchmark runner executes the default comparison mode
- **THEN** it runs each benchmark request in a baseline pass with memory injection disabled
- **AND** it runs each benchmark request in a memory-assisted pass with memory injection enabled

#### Scenario: Benchmark comparison completes
- **WHEN** both benchmark passes complete
- **THEN** the system reports deltas for input tokens, output tokens, cache read tokens, cache write tokens, total cost, wall-clock time, tool calls, memory hits, injected memory tokens, estimated avoided tokens, and quality assertion results

### Requirement: Benchmark model selection
The system SHALL use a cheap OpenAI model by default for benchmark runs and SHALL allow the model to be overridden.

#### Scenario: Benchmark runs without model argument
- **WHEN** the user starts a benchmark without specifying a model
- **THEN** the benchmark uses `openai/gpt-4o-mini` or the configured cheap benchmark default

#### Scenario: Benchmark runs with model argument
- **WHEN** the user provides a benchmark model override
- **THEN** the benchmark uses the specified provider/model for child pi runs

### Requirement: Benchmark report storage
The system SHALL store benchmark artifacts locally in both machine-readable and human-readable formats.

#### Scenario: Benchmark run is created
- **WHEN** a benchmark starts
- **THEN** the system creates a unique benchmark directory under `.pi/memory/benchmarks/`
- **AND** the directory contains benchmark configuration and request definitions

#### Scenario: Benchmark run finishes
- **WHEN** a benchmark completes
- **THEN** the system writes per-request machine-readable results and a human-readable Markdown report containing summary tables

### Requirement: Benchmark progress and UI feedback
The system SHALL provide user-visible progress and final report access for benchmark runs.

#### Scenario: Benchmark is running interactively
- **WHEN** a benchmark pass or request starts or completes
- **THEN** the system updates the UI status or notification with benchmark progress

#### Scenario: Benchmark report is available
- **WHEN** the benchmark finishes in an interactive session
- **THEN** the system opens or offers the human-readable report through the UI
