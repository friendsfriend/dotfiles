## MODIFIED Requirements

### Requirement: Memory write points
The system SHALL write memory only at explicit lifecycle points: startup or reload indexing, tool result summarization, agent turn completion, compaction, and manual user commands, and SHALL apply quality gates before inferred or summarized content becomes durable memory.

#### Scenario: Agent turn completes with a design decision
- **WHEN** an agent turn ends after the user and agent settle on a design decision
- **THEN** the system records the decision in session memory only if it passes memory quality checks for durable repository relevance
- **AND** the entry indicates that it was inferred from conversation unless the user explicitly pinned it

#### Scenario: User pins a preference
- **WHEN** the user invokes a memory command to pin a preference
- **THEN** the system records the preference as pinned memory
- **AND** pinned memory is distinguishable from inferred memory

#### Scenario: Agent turn includes low-quality memory candidates
- **WHEN** an agent turn contains code fragments, raw tool output, memory-card echoes, existing memory IDs, raw file paths without durable meaning, or duplicate inferred-memory text
- **THEN** the system rejects or marks those candidates as low quality
- **AND** the rejected candidates are not injected as durable session memory in future turns

### Requirement: Bounded memory injection
The system SHALL inject only a bounded, relevant memory card into agent context before a turn, using freshness, quality, deduplication, source trust, and prompt relevance to select entries.

#### Scenario: OpenSpec workflow begins
- **WHEN** the user starts or continues an OpenSpec workflow
- **THEN** the injected memory card includes relevant OpenSpec state, pinned preferences, and recent high-quality session decisions within the configured budget
- **AND** unrelated, stale, duplicate, rejected, expired, or low-quality memory is omitted

#### Scenario: Prompt mentions a file, change, capability, or tag
- **WHEN** a memory entry matches a prompt-mentioned file path, OpenSpec change name, capability name, or tag
- **THEN** the system boosts that entry's injection relevance when it is not stale, rejected, forgotten, expired, or duplicate-suppressed

#### Scenario: Tool-output memory has weak relevance
- **WHEN** a tool-output memory summary does not strongly match the current prompt by tag, path, command, or text relevance
- **THEN** the system excludes or deprioritizes that summary even if it is recent

### Requirement: User memory controls
The system SHALL provide user commands to inspect, refresh, pin, forget, and diagnose memory.

#### Scenario: User inspects memory
- **WHEN** the user invokes a memory inspection command
- **THEN** the system shows stored memory grouped by type or source
- **AND** the output distinguishes pinned, observed, inferred, stale, rejected, expired, suspected-junk, duplicate, and forgotten entries when that metadata exists

#### Scenario: User forgets a memory entry
- **WHEN** the user invokes a memory forget command for an entry
- **THEN** the system removes or marks that entry as forgotten
- **AND** future memory injection excludes that entry

#### Scenario: User diagnoses memory health
- **WHEN** the user invokes a memory health or doctor command
- **THEN** the system displays storage validity and memory quality diagnostics
- **AND** the command does not require reading or modifying application source files

### Requirement: Staleness visibility
The system SHALL identify observed memory that may be stale when its source files, command results, or relevant generated artifacts change.

#### Scenario: Source file changes after memory was recorded
- **WHEN** an observed memory entry references a source file whose timestamp or hash no longer matches
- **THEN** the system marks the entry as stale or excludes it from authoritative injection

#### Scenario: Command-derived memory changes after refresh
- **WHEN** an observed memory entry references a command-derived result and the current result hash or relevant dependency metadata no longer matches
- **THEN** the system marks the entry as stale, refreshes it at an explicit refresh point, or excludes it from injection

#### Scenario: OpenSpec index changes without config change
- **WHEN** OpenSpec active change state changes even though `openspec/config.yaml` is unchanged
- **THEN** the system does not rely solely on the config file hash to treat the OpenSpec index memory as fresh
- **AND** the system refreshes, marks stale, or deprioritizes the OpenSpec index according to current OpenSpec command or artifact metadata
