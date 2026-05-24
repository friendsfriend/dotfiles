## ADDED Requirements

### Requirement: Fresh deterministic graph queries
The system SHALL compute repository graph query results from the current filesystem for each graph tool call and SHALL NOT return stale graph data.

#### Scenario: File changes before graph query
- **WHEN** a repository file changes before the agent invokes the graph tool
- **THEN** the graph result reflects the changed filesystem state
- **AND** the result is not based on an unvalidated stale persisted graph

### Requirement: Graph is not durable memory
The system SHALL NOT persist repository graph data as semantic memory.

#### Scenario: Graph query completes
- **WHEN** the graph tool finishes a query
- **THEN** any graph data built for the query is discarded or retained only as an implementation cache that preserves freshness semantics
- **AND** the graph data is not injected as durable memory in later turns

### Requirement: Repository overview query
The system SHALL provide a graph query mode that returns a compact overview of repository structure.

#### Scenario: Agent requests overview
- **WHEN** the agent invokes the graph tool in overview mode
- **THEN** the result includes major directories, recognized project systems, OpenSpec presence, pi resources, and notable config/script areas within a bounded output size

### Requirement: Search and neighbor queries
The system SHALL provide graph query modes for matching nodes and exploring connected nodes.

#### Scenario: Agent searches for a concept
- **WHEN** the agent invokes graph search with a query string
- **THEN** the result returns ranked matching files, symbols, OpenSpec artifacts, skills, prompts, or config nodes
- **AND** each result includes a deterministic reason when available

#### Scenario: Agent explores neighbors
- **WHEN** the agent asks for neighbors of a file, symbol, capability, or change
- **THEN** the result returns connected nodes up to the requested bounded depth
- **AND** the output identifies edge types such as imports, contains, defines, references, modifies, or relates-to when available

### Requirement: OpenSpec graph queries
The system SHALL provide OpenSpec-aware graph queries for changes, capabilities, specs, and tasks.

#### Scenario: Agent queries an active change
- **WHEN** the agent invokes an OpenSpec change graph query for a change name
- **THEN** the result includes that change's proposal, design, tasks, delta specs, affected capabilities, and likely related stable specs

#### Scenario: Agent queries task context
- **WHEN** the agent invokes a task-context query for an OpenSpec task
- **THEN** the result suggests likely relevant implementation files, specs, prompts, skills, or configuration files when deterministically discoverable
- **AND** the result recommends exact files to read next

### Requirement: Source and configuration relationships
The system SHALL include deterministic source and configuration relationships where feasible.

#### Scenario: Source file imports another file
- **WHEN** the graph scanner can parse an import relationship from a source file
- **THEN** the graph includes an imports edge from the importing file to the imported file

#### Scenario: Package script is discovered
- **WHEN** the graph scanner reads a package or script configuration file
- **THEN** the graph includes nodes or metadata for scripts and their referenced commands when deterministically extractable

### Requirement: Graph before broad discovery guidance
The system SHALL instruct the agent to prefer the graph tool before broad exploratory grep/find/bash searches.

#### Scenario: Agent is in an OpenSpec apply workflow
- **WHEN** the agent has read required OpenSpec context files and needs to locate implementation files
- **THEN** the agent uses the graph tool before broad grep/find/bash discovery when the graph tool is available
- **AND** the agent reads exact files before editing

### Requirement: Exact tools remain authoritative
The system SHALL preserve `read` as authoritative for exact file contents and `grep` as appropriate for exact text searches.

#### Scenario: Graph suggests a file to edit
- **WHEN** the graph tool suggests a file relevant to a task
- **THEN** the agent reads the current file contents before editing

#### Scenario: Agent needs exact string occurrences
- **WHEN** the task requires locating exact text occurrences
- **THEN** the agent may use grep or equivalent exact search even if the graph tool is available
