## MODIFIED Requirements

### Requirement: Task context queries
The OpenSpec context tool SHALL provide task-focused context without searching implementation files directly.

#### Scenario: Agent queries task context
- **WHEN** the agent invokes task context mode for a change and task id or task text
- **THEN** the result includes the matched task, completion status when available, task file path, and related OpenSpec artifacts
- **AND** the result may suggest a follow-up graphify query derived from the task text when graph-backed implementation navigation would help
- **AND** the result SHALL NOT depend on graphify to determine OpenSpec task state or artifact paths

## ADDED Requirements

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
