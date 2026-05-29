# graphify-context-tooling Specification

## Purpose
TBD - created by archiving change replace-context-tools-with-graphify. Update Purpose after archive.
## Requirements
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
OpenSpec workflows SHALL maintain graphify navigation freshness when workflow changes affect future graph-backed navigation.

#### Scenario: Apply changes repository context
- **WHEN** an OpenSpec apply workflow changes specs, docs, prompts, skills, or implementation files
- **AND** `graphify-out/graph.json` exists
- **THEN** the workflow SHALL recommend `/graphify . --update` or an equivalent graphify update step
- **AND** the update SHALL be presented as maintaining navigation quality, not as a substitute for OpenSpec validation

#### Scenario: Archive changes repository context
- **WHEN** an OpenSpec archive workflow moves a change, syncs specs, or otherwise changes OpenSpec artifacts
- **AND** `graphify-out/graph.json` exists
- **THEN** the workflow SHALL run `/graphify . --update` or an equivalent graphify update step after archive
- **AND** the update SHALL be presented as maintaining navigation quality, not as a substitute for OpenSpec validation or archive correctness

#### Scenario: Archive graphify update fails
- **WHEN** an automatic post-archive graphify update fails
- **THEN** the workflow SHALL report the failure clearly
- **AND** the archive result SHALL remain intact
- **AND** the workflow SHALL NOT claim graph-backed navigation is current

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

### Requirement: OpenSpec skills use graphify skill for navigation
OpenSpec command and skill workflows SHALL explicitly use the graphify skill as the preferred graph-backed navigation guidance when repository, implementation, prompt, configuration, history, or cross-document relationship context is needed and graphify is available.

#### Scenario: Graphify graph exists during OpenSpec skill workflow
- **WHEN** an OpenSpec skill needs repository or history navigation context
- **AND** `graphify-out/graph.json` exists for the repository
- **THEN** the skill guidance SHALL direct the agent to load or follow the graphify skill before broad exploratory filesystem discovery
- **AND** the guidance SHALL require exact file reads or exact command output before making exact claims or edits

#### Scenario: Graphify is unavailable during OpenSpec skill workflow
- **WHEN** an OpenSpec skill needs repository or history navigation context
- **AND** graphify is unavailable or no graph exists
- **THEN** the workflow SHALL continue using OpenSpec CLI/context, exact file reads, and targeted search
- **AND** the workflow MAY tell the user that running graphify can enable graph-backed navigation

### Requirement: OpenSpec graph freshness guidance
OpenSpec command and skill workflows SHALL treat graphify graphs as update-driven artifacts and SHALL surface freshness guidance when stale graph data could affect navigation quality.

#### Scenario: Graph commit metadata differs from current repository commit
- **WHEN** an OpenSpec workflow uses graphify navigation
- **AND** graphify report metadata indicates a source commit different from the current repository commit
- **THEN** the workflow SHALL treat the graph as potentially stale
- **AND** the workflow SHALL recommend `/graphify . --update` or equivalent before relying on graph relationships for navigation quality
- **AND** the workflow SHALL continue to use exact current files and commands as authority

#### Scenario: Graph freshness cannot be determined
- **WHEN** an OpenSpec workflow uses graphify navigation
- **AND** graph freshness cannot be determined from available metadata
- **THEN** the workflow SHALL treat graphify as advisory navigation only
- **AND** the workflow SHALL NOT claim graph-backed results are current without exact file or command confirmation

