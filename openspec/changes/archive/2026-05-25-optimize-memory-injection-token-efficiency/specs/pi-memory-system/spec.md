## MODIFIED Requirements

### Requirement: Memory write points
The system SHALL write memory only at explicit lifecycle points: startup or reload indexing, tool result summarization, agent turn completion, compaction, and manual user commands, and SHALL apply quality and injection-eligibility gates before inferred or summarized content becomes durable or automatically injected memory.

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

#### Scenario: Large tool output is summarized
- **WHEN** a tool result is large enough to be summarized or recorded for observability
- **THEN** the system MAY store an inspectable summary or telemetry record
- **AND** the summary SHALL be cold or non-injectable by default unless a durable reusable fact is distilled and passes normal quality gates
- **AND** the raw tool-result summary SHALL NOT become automatic prompt context solely because the prompt mentions tool names, file reads, commands, or workflow instructions

### Requirement: Bounded memory injection
The system SHALL inject only a bounded, high-confidence memory card into agent context before a turn, blending applicable global memory with memory scoped to the current repository only when the expected relevance justifies the token cost.

#### Scenario: OpenSpec workflow begins
- **WHEN** the user starts or continues an OpenSpec workflow
- **THEN** the injected memory card includes relevant OpenSpec state for the current repository, relevant global or pinned preferences, and recent relevant session decisions within the configured budget
- **AND** unrelated memory is omitted
- **AND** repository-scoped memory from other repositories is omitted
- **AND** generated tool-result summaries and repository-orientation exhaust are omitted unless explicitly pinned or promoted by quality gates

#### Scenario: Memory card displays scope
- **WHEN** memory is injected into agent context
- **THEN** the memory card SHALL label entries or sections so global memory and current-repository memory are distinguishable

#### Scenario: No high-confidence memory is relevant
- **WHEN** the user starts a turn and no pinned preference, active workflow state, explicit decision, or continuation-relevant memory passes the injection threshold
- **THEN** the system SHALL inject no memory card or an intentionally minimal card
- **AND** the system SHALL preserve stored memory for later inspection or targeted retrieval

#### Scenario: Repository navigation is needed
- **WHEN** the user's prompt primarily requires current repository topology, file locations, symbols, or exact file contents
- **THEN** automatically injected memory SHALL NOT attempt to replace fresh graph queries or exact file reads
- **AND** generated repository orientation memory SHALL remain advisory and non-authoritative

## ADDED Requirements

### Requirement: Effective-intent memory selection
The system SHALL select automatic memory using a compact effective-intent query rather than scoring every memory entry against the full prompt envelope.

#### Scenario: Prompt contains workflow boilerplate
- **WHEN** a prompt includes command workflow instructions, tool-use guardrails, previously injected memory-card text, or large code blocks in addition to the user's actual request
- **THEN** memory scoring SHALL ignore or strongly downweight the boilerplate portions where deterministic extraction is practical
- **AND** memory selection SHALL preserve the user's actual request terms for relevance scoring

#### Scenario: Intent extraction is inconclusive
- **WHEN** the system cannot derive a useful effective-intent query
- **THEN** it SHALL fall back safely without selecting low-confidence generated memory solely from generic workflow terms

### Requirement: Hot and cold memory separation
The system SHALL distinguish memory that is eligible for automatic injection from memory that is stored only for inspection, observability, or targeted retrieval.

#### Scenario: Hot memory is available
- **WHEN** pinned preferences, explicit durable decisions, active workflow state, or continuation-relevant recent session decisions match the effective user intent
- **THEN** the system SHALL consider those entries for automatic injection within the configured budget

#### Scenario: Cold memory is available
- **WHEN** stored memory consists of tool-result summaries, command output summaries, repo-orientation scans, telemetry artifacts, stale observations, rejected entries, or low-confidence inferred candidates
- **THEN** the system SHALL keep those entries inspectable through memory commands, exports, stats, health, and dashboard surfaces
- **AND** those entries SHALL NOT be injected automatically unless the user explicitly pins or promotes their content and the promoted entry passes quality gates

#### Scenario: User inspects injection eligibility
- **WHEN** the user invokes memory status, health, stats, dashboard, or inspection commands
- **THEN** the system SHALL make selected entries and recent injection token counts inspectable
- **AND** the system SHOULD expose enough information to understand whether zero selected entries means memory was disabled, unavailable, or intentionally skipped for low relevance
