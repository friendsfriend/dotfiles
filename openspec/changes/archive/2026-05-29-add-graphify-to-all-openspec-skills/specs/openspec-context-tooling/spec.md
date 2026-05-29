## ADDED Requirements

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
