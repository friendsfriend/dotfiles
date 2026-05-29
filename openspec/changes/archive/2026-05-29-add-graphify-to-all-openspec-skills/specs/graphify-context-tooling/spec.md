## ADDED Requirements

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
