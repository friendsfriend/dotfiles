## Purpose
Define behavior for the Pi OpenSpec context tooling that gives agents fresh workflow and artifact context while keeping exact OpenSpec file reads authoritative.
## Requirements
### Requirement: Fresh OpenSpec context queries
The system SHALL provide a dedicated Pi tool for querying current OpenSpec workflow and artifact context.

#### Scenario: Agent requests OpenSpec overview
- **WHEN** the agent invokes the OpenSpec context tool in overview mode
- **THEN** the result includes active changes from current OpenSpec state
- **AND** the result distinguishes active changes from archived changes when archived changes are included
- **AND** the result recommends exact OpenSpec artifact reads when details are needed

#### Scenario: OpenSpec CLI state changes before query
- **WHEN** OpenSpec change state changes before the agent invokes the OpenSpec context tool
- **THEN** the tool result reflects the current OpenSpec state
- **AND** the result is not based on an unvalidated stale persisted context

### Requirement: Change context queries
The OpenSpec context tool SHALL provide change-focused queries for artifacts, affected capabilities, and task progress.

#### Scenario: Agent queries a change
- **WHEN** the agent invokes the OpenSpec context tool for a specific change name
- **THEN** the result includes the change state, schema when available, artifact paths, affected capabilities, and task progress when deterministically available
- **AND** the result identifies whether the change is active or archived
- **AND** the result recommends exact artifact files to read next

#### Scenario: Change does not exist
- **WHEN** the agent queries a change name that is not present in active or requested archived OpenSpec locations
- **THEN** the result clearly reports that the change was not found
- **AND** the result suggests listing available changes

### Requirement: Task context queries
The OpenSpec context tool SHALL provide task-focused context without searching implementation files directly.

#### Scenario: Agent queries task context
- **WHEN** the agent invokes task context mode for a change and task id or task text
- **THEN** the result includes the matched task, completion status when available, task file path, and related OpenSpec artifacts
- **AND** the result may suggest a follow-up graphify query derived from the task text when graph-backed implementation navigation would help
- **AND** the result SHALL NOT depend on graphify to determine OpenSpec task state or artifact paths

### Requirement: Capability context queries
The OpenSpec context tool SHALL provide capability-focused context for stable specs and change delta specs.

#### Scenario: Agent queries a capability
- **WHEN** the agent invokes the OpenSpec context tool for a capability name
- **THEN** the result includes the stable spec path when present
- **AND** the result includes active or requested archived changes that modify the capability when deterministically available
- **AND** the result recommends exact spec files to read next

### Requirement: OpenSpec context authority boundaries
The OpenSpec context tool SHALL present results as workflow context and SHALL preserve exact file reads as authoritative for artifact contents.

#### Scenario: OpenSpec context suggests an artifact
- **WHEN** the OpenSpec context tool suggests a proposal, design, tasks, or spec file
- **THEN** the agent must read the exact current artifact before making exact claims, editing artifacts, or implementing from artifact contents

#### Scenario: OpenSpec CLI fails
- **WHEN** an OpenSpec CLI command needed for workflow state fails
- **THEN** the OpenSpec context tool reports the failure clearly
- **AND** the tool SHALL NOT report guessed workflow state as authoritative

### Requirement: OpenSpec context is not durable memory
The OpenSpec context tool SHALL NOT persist OpenSpec workflow context as semantic memory.

#### Scenario: OpenSpec context query completes
- **WHEN** the OpenSpec context tool finishes a query
- **THEN** any context assembled for the query is discarded or retained only as an implementation cache that preserves freshness semantics
- **AND** the context is not injected as durable memory in later turns

### Requirement: Graphify handoff guidance
The OpenSpec context tool SHALL describe graphify as the follow-up navigation layer for implementation/source/configuration/history context while preserving OpenSpec context as the workflow state source.

#### Scenario: OpenSpec context suggests next reads
- **WHEN** the OpenSpec context tool returns change, task, capability, or readiness context
- **THEN** it SHALL recommend exact OpenSpec artifact files to read for authoritative artifact contents
- **AND** it MAY recommend a graphify query for related implementation files, prior archived changes, or cross-document relationships
- **AND** it SHALL NOT recommend `repo_graph`

#### Scenario: Graphify is unavailable
- **WHEN** graphify is unavailable or no `graphify-out/graph.json` exists
- **THEN** the OpenSpec context tool SHALL still return current OpenSpec workflow context
- **AND** follow-up guidance SHALL fall back to exact file reads and targeted grep/find/bash discovery

### Requirement: OpenSpec-to-graphify skill handoff
OpenSpec context tooling and OpenSpec skill guidance SHALL describe a consistent handoff from fresh OpenSpec workflow context to graphify-backed repository navigation when graphify is useful and available.

#### Scenario: OpenSpec context precedes repository navigation
- **WHEN** an agent performs an OpenSpec workflow action
- **AND** repository, implementation, prompt, configuration, history, or cross-document navigation context is needed
- **THEN** the workflow SHALL use OpenSpec CLI or `openspec_context` for current workflow state first
- **AND** the workflow SHALL read exact OpenSpec artifacts needed for authoritative artifact content
- **AND** the workflow SHALL then use the graphify skill for advisory repository navigation when graphify is available

#### Scenario: Graphify suggests OpenSpec-related context
- **WHEN** graphify suggests a related OpenSpec artifact, archived change, skill, prompt, configuration file, or implementation file
- **THEN** the agent SHALL read the exact current file before making exact claims, editing, implementing, archiving, or verifying from that content
- **AND** the graphify result SHALL NOT replace OpenSpec CLI state, `openspec_context` state, exact artifact reads, or exact command output

