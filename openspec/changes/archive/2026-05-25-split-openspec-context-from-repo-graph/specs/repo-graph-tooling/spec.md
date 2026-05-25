## ADDED Requirements

### Requirement: OpenSpec directory exclusion
The repo graph tool SHALL ignore the `openspec/` directory completely during graph construction.

#### Scenario: Repository contains OpenSpec artifacts
- **WHEN** the agent invokes any repo graph query mode
- **THEN** the graph construction excludes all files and directories under `openspec/`
- **AND** results do not include OpenSpec changes, artifacts, tasks, capabilities, specs, headings, summaries, or paths from `openspec/`

#### Scenario: Agent needs OpenSpec workflow state
- **WHEN** the agent needs active changes, task progress, artifact paths, or capability spec context
- **THEN** the agent uses the dedicated OpenSpec context tool instead of `repo_graph`

## MODIFIED Requirements

### Requirement: Repository overview query
The system SHALL provide a graph query mode that returns a compact overview of repository implementation, source, configuration, documentation, and Pi resource structure outside `openspec/`.

#### Scenario: Agent requests overview
- **WHEN** the agent invokes the graph tool in overview mode
- **THEN** the result includes major non-OpenSpec directories, recognized project systems, pi resources, and notable config/script areas within a bounded output size
- **AND** the result excludes OpenSpec presence, OpenSpec changes, OpenSpec capabilities, and all paths under `openspec/`

### Requirement: Search and neighbor queries
The system SHALL provide graph query modes for matching nodes and exploring connected non-OpenSpec nodes, and SHALL include compact file-summary annotations in results when summaries are available and fresh.

#### Scenario: Agent searches for a concept
- **WHEN** the agent invokes graph search with a query string
- **THEN** the result returns ranked matching files, symbols, skills, prompts, or config nodes outside `openspec/`
- **AND** each result includes a deterministic reason when available
- **AND** file results include a one-line summary when a read-derived hash-valid summary or deterministic fallback summary is available
- **AND** results exclude OpenSpec artifacts, changes, tasks, capabilities, specs, and paths under `openspec/`

#### Scenario: Agent explores neighbors
- **WHEN** the agent asks for neighbors of a file or symbol outside `openspec/`
- **THEN** the result returns connected nodes up to the requested bounded depth
- **AND** the output identifies edge types such as imports, contains, defines, references, or relates-to when available
- **AND** file nodes include a one-line summary when a read-derived hash-valid summary or deterministic fallback summary is available
- **AND** returned nodes exclude OpenSpec artifacts, changes, tasks, capabilities, specs, and paths under `openspec/`

### Requirement: Graph before broad discovery guidance
The system SHALL instruct the agent to prefer the graph tool before broad exploratory grep/find/bash searches for implementation, source, configuration, documentation, or Pi resource discovery outside OpenSpec artifacts.

#### Scenario: Agent is in an OpenSpec apply workflow
- **WHEN** the agent has read required OpenSpec context and exact OpenSpec artifact files and needs to locate implementation files
- **THEN** the agent uses the graph tool before broad grep/find/bash discovery when the graph tool is available
- **AND** the graph query is derived from OpenSpec task or design context rather than from scanning `openspec/`
- **AND** the agent reads exact implementation files before editing

## REMOVED Requirements

### Requirement: OpenSpec graph queries
**Reason**: OpenSpec workflow and artifact context belongs in the dedicated OpenSpec context tool. Keeping OpenSpec modes in `repo_graph` mixes filesystem/source navigation with OpenSpec workflow semantics and can confuse archived artifact discovery with active change state.

**Migration**: Use the OpenSpec context tool for changes, capabilities, specs, tasks, and artifact paths. Use `repo_graph` only after OpenSpec context is known, to locate non-OpenSpec implementation/source/config files.
