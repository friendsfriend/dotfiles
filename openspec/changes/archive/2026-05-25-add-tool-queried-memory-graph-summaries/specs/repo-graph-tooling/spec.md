## MODIFIED Requirements

### Requirement: Search and neighbor queries
The system SHALL provide graph query modes for matching nodes and exploring connected nodes, and SHALL include compact file-summary annotations in results when summaries are available and fresh.

#### Scenario: Agent searches for a concept
- **WHEN** the agent invokes graph search with a query string
- **THEN** the result returns ranked matching files, symbols, OpenSpec artifacts, skills, prompts, or config nodes
- **AND** each result includes a deterministic reason when available
- **AND** file results include a one-line summary when a read-derived hash-valid summary or deterministic fallback summary is available

#### Scenario: Agent explores neighbors
- **WHEN** the agent asks for neighbors of a file, symbol, capability, or change
- **THEN** the result returns connected nodes up to the requested bounded depth
- **AND** the output identifies edge types such as imports, contains, defines, references, modifies, or relates-to when available
- **AND** file nodes include a one-line summary when a read-derived hash-valid summary or deterministic fallback summary is available

### Requirement: OpenSpec graph queries
The system SHALL provide OpenSpec-aware graph queries for changes, capabilities, specs, and tasks, and SHALL use file summaries as navigation hints when suggesting files or artifacts.

#### Scenario: Agent queries an active change
- **WHEN** the agent invokes an OpenSpec change graph query for a change name
- **THEN** the result includes that change's proposal, design, tasks, delta specs, affected capabilities, and likely related stable specs
- **AND** file and artifact results include compact summaries when available

#### Scenario: Agent queries task context
- **WHEN** the agent invokes a task-context query for an OpenSpec task
- **THEN** the result suggests likely relevant implementation files, specs, prompts, skills, or configuration files when deterministically discoverable
- **AND** the result recommends exact files to read next
- **AND** one-line file summaries may be used as navigation labels and ranking inputs only when current or hash-valid

## ADDED Requirements

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
- **AND** deterministic fallback summaries SHALL be derived from current path, file type, OpenSpec artifact role, Markdown headings, symbols, imports, scripts, or config keys

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
- **AND** summary matches SHALL NOT override stronger exact path, symbol, heading, OpenSpec, or relationship matches by default

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
