## Purpose
Define behavior for the Pi repository graph tooling that helps agents navigate repository implementation, source, configuration, documentation, and Pi resource structure outside `openspec/` while preserving freshness and exact-file verification.

## Requirements
### Requirement: Fresh deterministic graph queries
The system SHALL compute repository graph query results from the current filesystem for each graph tool call and SHALL NOT return stale graph data.

#### Scenario: File changes before graph query
- **WHEN** a repository file changes before the agent invokes the graph tool
- **THEN** the graph result reflects the changed filesystem
- **AND** the result is not based on an unvalidated stale persisted graph

### Requirement: Graph is not durable memory
The system SHALL NOT persist repository graph data as semantic memory.

#### Scenario: Graph query completes
- **WHEN** the graph tool finishes a query
- **THEN** any graph data built for the query is discarded or retained only as an implementation cache that preserves freshness semantics
- **AND** the graph data is not injected as durable memory in later turns

### Requirement: OpenSpec directory exclusion
The repo graph tool SHALL ignore the `openspec/` directory completely during graph construction.

#### Scenario: Repository contains OpenSpec artifacts
- **WHEN** the agent invokes any repo graph query mode
- **THEN** the graph construction excludes all files and directories under `openspec/`
- **AND** results do not include OpenSpec changes, artifacts, tasks, capabilities, specs, headings, summaries, or paths from `openspec/`

#### Scenario: Agent needs OpenSpec workflow state
- **WHEN** the agent needs active changes, task progress, artifact paths, or capability spec context
- **THEN** the agent uses the dedicated OpenSpec context tool instead of `repo_graph`

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

### Requirement: Source and configuration relationships
The system SHALL include deterministic source and configuration relationships where feasible.

#### Scenario: Source file imports another file
- **WHEN** the graph scanner can parse an import relationship from a source file
- **THEN** the graph includes an imports edge from the importing file to the imported file

#### Scenario: Package script is discovered
- **WHEN** the graph scanner reads a package or script configuration file
- **THEN** the graph includes nodes or metadata for scripts and their referenced commands when deterministically extractable

### Requirement: Graph before broad discovery guidance
The system SHALL instruct the agent to prefer the graph tool before broad exploratory grep/find/bash searches for implementation, source, configuration, documentation, or Pi resource discovery outside OpenSpec artifacts.

#### Scenario: Agent is in an OpenSpec apply workflow
- **WHEN** the agent has read required OpenSpec context and exact OpenSpec artifact files and needs to locate implementation files
- **THEN** the agent uses the graph tool before broad grep/find/bash discovery when the graph tool is available
- **AND** the graph query is derived from OpenSpec task or design context rather than from scanning `openspec/`
- **AND** the agent reads exact implementation files before editing

### Requirement: Exact tools remain authoritative
The system SHALL preserve `read` as authoritative for exact file contents and `grep` as appropriate for exact text searches.

#### Scenario: Graph suggests a file to edit
- **WHEN** the graph tool suggests a file relevant to a task
- **THEN** the agent reads the current file contents before editing

#### Scenario: Agent needs exact string occurrences
- **WHEN** the task requires locating exact text occurrences
- **THEN** the agent may use grep or equivalent exact search even if the graph tool is available

### Requirement: File summary graph annotations
The graph tool SHALL annotate file nodes with compact one-line summaries that help agents decide what to read next while preserving exact-file verification.

#### Scenario: Hash-valid read summary exists
- **WHEN** a stored read-derived summary exists for a file and its content hash matches the current file content
- **THEN** graph results SHALL attach that summary to the file node
- **AND** the summary SHALL be treated as navigation metadata rather than authoritative file content
- **AND** graph output SHALL continue to remind agents to read exact files before editing or making exact claims when appropriate

#### Scenario: No valid read summary exists
- **WHEN** no read-derived summary exists for a file or the stored summary is stale
- **THEN** graph results SHALL use a deterministic fallback summary when the scanner can derive one from current filesystem data
- **AND** deterministic fallback summaries SHALL be derived from current path, file type, Markdown headings, symbols, imports, scripts, or config keys

#### Scenario: Summary cannot be derived safely
- **WHEN** neither a hash-valid read summary nor a safe deterministic fallback summary is available
- **THEN** the graph result SHALL omit the summary for that file
- **AND** the absence of a summary SHALL NOT prevent the file from being returned for structural matches

### Requirement: Summary freshness and ranking
The graph tool SHALL use only current deterministic summaries or hash-valid read-derived summaries for search ranking and display.

#### Scenario: Summary contributes to search ranking
- **WHEN** a query term matches a current or hash-valid file summary
- **THEN** the graph search MAY use that match as one ranking signal
- **AND** the result reason SHALL identify that the summary contributed to the match when practical
- **AND** summary matches SHALL NOT override stronger exact path, symbol, heading, or relationship matches by default

#### Scenario: Stored summary is stale
- **WHEN** a stored read-derived file summary does not match the current file hash
- **THEN** the graph tool SHALL NOT use that summary for ranking
- **AND** the graph tool SHALL omit it from normal results or mark it stale only in diagnostic output

### Requirement: Graph summary boundaries
The graph tool SHALL keep file summaries bounded, non-authoritative, and separate from automatic memory injection.

#### Scenario: Summary is displayed
- **WHEN** a graph result displays a file summary
- **THEN** the summary SHALL be one line or otherwise compactly bounded
- **AND** the summary SHALL NOT include raw code snippets, secrets, or line-level authoritative claims

#### Scenario: Graph query completes
- **WHEN** the graph tool finishes a query
- **THEN** the graph result MAY include summaries for returned nodes
- **AND** those summaries SHALL NOT be injected as durable prompt memory by the graph tool


### Requirement: Per-call graph scan caching
The repo graph tool SHALL support reusing file stat, content, and hash data within a single graph construction call to avoid repeated filesystem reads while preserving fresh per-call query semantics.

#### Scenario: One graph query scans a file in multiple phases
- **WHEN** a single repo graph query needs the same file data for Markdown scanning, source/config scanning, or file-summary freshness checks
- **THEN** the graph implementation MAY reuse data captured during that same graph construction
- **AND** the reused data SHALL NOT be persisted as durable semantic memory or reused for a later graph query without revalidation

#### Scenario: File changes between graph queries
- **WHEN** a file changes after one repo graph query completes and before the next repo graph query starts
- **THEN** the next graph query SHALL reflect the changed filesystem state
- **AND** any per-call cache from the previous query SHALL NOT cause stale graph nodes, summaries, or rankings to be returned
