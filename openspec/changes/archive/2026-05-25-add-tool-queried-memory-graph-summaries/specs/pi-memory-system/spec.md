## MODIFIED Requirements

### Requirement: Memory write points
The system SHALL write durable semantic memory only through explicit user pinning, explicit agent save actions, compaction handoff where required for continuity, or narrowly scoped startup/reload indexing, and SHALL keep telemetry, benchmark artifacts, and file-summary cache data separate from durable semantic notes.

#### Scenario: Agent explicitly saves a design decision
- **WHEN** an agent determines that a design decision, completed investigation, blocker, assumption, next step, or workflow state is worth preserving
- **THEN** the agent SHALL record it through an explicit memory save action
- **AND** the saved entry SHALL identify its scope, type, source, and relevant metadata such as related files or change name when provided

#### Scenario: User pins a preference
- **WHEN** the user invokes a memory command to pin a preference
- **THEN** the system records the preference as pinned memory
- **AND** pinned memory is distinguishable from agent-saved and generated memory

#### Scenario: Tool output is observed
- **WHEN** a read, bash, graph, or other tool result is produced
- **THEN** the system SHALL NOT automatically promote the raw result or broad summary into durable semantic memory
- **AND** telemetry or bounded diagnostic records MAY be stored separately from durable notes
- **AND** a durable note SHALL be created only when the user or agent explicitly saves a distilled entry

#### Scenario: Agent turn completes without explicit save
- **WHEN** an agent turn ends after normal work
- **THEN** the system SHALL NOT infer and store semantic memory solely from the conversation transcript
- **AND** telemetry MAY record that the turn occurred without creating durable semantic memory

### Requirement: Bounded memory injection
The system SHALL limit automatic memory injection to a minimal session-start context and SHALL require explicit tool queries for memory access after the session-start context has been delivered.

#### Scenario: Session starts
- **WHEN** a Pi session starts or reloads
- **THEN** the system SHALL inject at most a compact boot hint explaining that memory query and save tools are available
- **AND** the boot context MAY include a bounded summary of pinned global preferences when configured
- **AND** the boot context SHALL remind the agent that memory is orientation and exact files or commands remain authoritative

#### Scenario: Agent turn begins after session start
- **WHEN** a normal agent turn begins after the initial session-start context
- **THEN** the system SHALL NOT automatically select and inject stored memory entries for that turn
- **AND** the agent SHALL use memory query tools when past work, decisions, preferences, or continuation context is relevant

#### Scenario: OpenSpec workflow begins
- **WHEN** the user starts or continues an OpenSpec workflow after session start
- **THEN** the system SHALL NOT automatically inject OpenSpec memory cards
- **AND** the agent SHALL query current OpenSpec CLI/artifacts and memory tools as needed for prior decisions or history
- **AND** repository-scoped memory from other repositories SHALL remain excluded from default query results

#### Scenario: Memory card displays scope
- **WHEN** the minimal session-start memory context includes any memory entry
- **THEN** the memory context SHALL label entries or sections so global memory and current-repository memory are distinguishable

### Requirement: User memory controls
The system SHALL provide user and agent commands or tools to inspect, query, save, pin, forget, refresh, and diagnose memory across global and repository scopes.

#### Scenario: User inspects memory
- **WHEN** the user invokes a memory inspection command
- **THEN** the system shows stored memory grouped by type, source, scope, or recency
- **AND** the output distinguishes pinned, agent-saved, observed, generated, stale, rejected, expired, duplicate, and forgotten entries when that metadata exists

#### Scenario: User queries past work
- **WHEN** the user or agent invokes a memory query with text, type, related file, change name, scope, or recency filters
- **THEN** the system returns matching past-work notes such as decisions, investigations, blockers, assumptions, preferences, and saved workflow state
- **AND** query results SHALL be advisory and SHALL NOT replace current OpenSpec/file/tool reads

#### Scenario: Agent saves memory
- **WHEN** the agent invokes a memory save action with a durable note
- **THEN** the system records the entry with source metadata identifying it as agent-saved
- **AND** the entry SHALL be inspectable and queryable in later sessions
- **AND** the entry SHALL NOT be automatically injected after session start unless explicitly included in the minimal boot context policy

#### Scenario: User inspects global memory
- **WHEN** the user requests global memory inspection
- **THEN** the system shows memory entries that are eligible for use across repositories

#### Scenario: User inspects repository memory
- **WHEN** the user requests repository memory inspection from inside a repository
- **THEN** the system shows memory entries from the current repository partition

#### Scenario: User pins scoped memory
- **WHEN** the user invokes a memory command to pin a preference or note with an explicit global or repository scope
- **THEN** the system records the entry in the requested scope
- **AND** future session-start boot context and query results respect that scope

#### Scenario: User forgets a memory entry
- **WHEN** the user invokes a memory forget command for an entry
- **THEN** the system removes or marks that entry as forgotten
- **AND** future memory queries and session-start boot contexts exclude that entry

## ADDED Requirements

### Requirement: Tool-queried memory access
The system SHALL make stored memory available primarily through explicit tools or commands rather than routine prompt injection.

#### Scenario: Agent needs prior decisions
- **WHEN** the agent needs to know what was decided or completed in prior work
- **THEN** the agent SHALL query memory with an explicit query describing the needed history
- **AND** the system SHALL return bounded, scoped, advisory results

#### Scenario: Agent does not need history
- **WHEN** the agent can complete the task using current prompt, graph navigation, and exact tools
- **THEN** the system SHALL spend no additional prompt tokens on stored memory beyond the session-start boot context

### Requirement: File summary cache storage
The system SHALL support storing read-derived one-line file summaries as repository-scoped graph annotation data rather than automatic prompt memory.

#### Scenario: File is read and summarized
- **WHEN** a file read produces a one-line responsibility summary
- **THEN** the system SHALL store the summary with repository identity, path, content hash, creation time, and source metadata
- **AND** the summary SHALL be bounded and SHALL NOT contain raw code snippets, secrets, or line-level authoritative claims
- **AND** the summary SHALL be available to graph tooling as navigation metadata

#### Scenario: File summary is stale
- **WHEN** the current file content hash does not match a stored read-derived summary hash
- **THEN** the system SHALL exclude that summary from graph ranking and normal display
- **AND** the stale summary MAY remain inspectable for diagnostics or history

#### Scenario: Memory is queried
- **WHEN** a user or agent queries semantic memory for past work
- **THEN** file-summary cache entries SHALL NOT dominate semantic memory results unless the query explicitly requests file summaries or graph annotations
