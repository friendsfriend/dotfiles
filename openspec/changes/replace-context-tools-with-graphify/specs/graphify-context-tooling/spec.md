## ADDED Requirements

### Requirement: Graphify-backed repository navigation
Pi/OpenSpec workflows SHALL use graphify as the preferred graph-backed repository navigation layer when `graphify-out/graph.json` exists or graphify can be run for the project.

#### Scenario: Graph exists for repository
- **WHEN** an agent needs repository map, relationship, or history context during an OpenSpec workflow
- **AND** `graphify-out/graph.json` exists for the repository
- **THEN** workflow guidance SHALL direct the agent to query graphify before broad exploratory filesystem discovery
- **AND** the agent SHALL treat graphify output as advisory navigation rather than authoritative file content

#### Scenario: Graph does not exist
- **WHEN** an agent needs graph-backed context and no graphify graph exists
- **THEN** the workflow SHALL continue using OpenSpec CLI/context plus exact file and command tools
- **AND** the workflow SHALL tell the user that running graphify can enable token-reduced navigation

### Requirement: Graphify authority boundaries
Graphify results SHALL never replace exact OpenSpec CLI state, exact artifact reads, exact implementation file reads, or exact command output.

#### Scenario: Graphify suggests an artifact or file
- **WHEN** graphify suggests an OpenSpec artifact, source file, prompt, skill, or configuration file
- **THEN** the agent SHALL read the exact current file before making exact claims, editing, or implementing from that content

#### Scenario: Exact string location is required
- **WHEN** a task requires locating exact text occurrences
- **THEN** the agent MAY use grep or equivalent exact search even when graphify is available

### Requirement: Graphify update guidance
OpenSpec workflows SHALL recommend or run graphify incremental updates when workflow changes affect future graph-backed navigation.

#### Scenario: Apply or archive changes repository context
- **WHEN** an OpenSpec apply or archive workflow changes specs, docs, prompts, skills, or implementation files
- **AND** `graphify-out/graph.json` exists
- **THEN** the workflow SHALL recommend `/graphify . --update` or an equivalent graphify update step
- **AND** the update SHALL be presented as maintaining navigation quality, not as a substitute for OpenSpec validation

#### Scenario: Code-only changes are updated
- **WHEN** graphify update detects code-only changes
- **THEN** the workflow MAY rely on graphify's deterministic code extraction path without LLM semantic extraction

### Requirement: Token-reduction reporting
Pi/OpenSpec workflows SHALL surface graphify token-reduction benefits from graphify outputs when available without fabricating provider usage.

#### Scenario: Graphify benchmark exists
- **WHEN** graphify reports token-reduction or query-cost benchmark data for the repository
- **THEN** workflow guidance MAY summarize those graphify-reported values to explain why graph-first navigation is preferred
- **AND** the summary SHALL identify the values as graphify benchmark estimates unless backed by provider-reported usage

#### Scenario: Benchmark is unavailable
- **WHEN** graphify benchmark data is unavailable
- **THEN** the workflow SHALL NOT fabricate token savings numbers
