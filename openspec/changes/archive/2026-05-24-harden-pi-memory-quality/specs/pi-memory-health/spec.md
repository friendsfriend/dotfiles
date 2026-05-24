## ADDED Requirements

### Requirement: Memory storage recovery
The system SHALL recover safely from invalid or corrupted repo-local memory storage without breaking agent turns or memory commands.

#### Scenario: Entries file is valid
- **WHEN** the memory system reads `.pi/memory/entries.json` and the file contains valid memory entry JSON
- **THEN** the system loads the entries normally
- **AND** no recovery warning is reported

#### Scenario: Entries file is invalid
- **WHEN** the memory system reads `.pi/memory/entries.json` and the file is invalid JSON
- **THEN** the system does not throw an uncaught error into the agent turn or command
- **AND** the system recovers entries from a valid backup, a parseable safe subset, or an empty list
- **AND** the corrupt content is preserved in a repo-local quarantine file for inspection

#### Scenario: Entries are written
- **WHEN** the memory system writes `.pi/memory/entries.json`
- **THEN** the write is atomic
- **AND** the resulting file is valid JSON before it is considered the current memory store
- **AND** a previous valid copy is retained when feasible

### Requirement: Memory health diagnostics
The system SHALL provide a user-accessible memory health diagnostic report for repo-local memory.

#### Scenario: User runs memory doctor
- **WHEN** the user invokes a memory health or doctor command
- **THEN** the system reports storage validity, backup or quarantine state, active entry counts, pinned entry counts, stale entry counts, duplicate groups, suspected junk entries, and singleton consistency
- **AND** the report includes remediation hints when problems are detected

#### Scenario: Health output is long
- **WHEN** the memory health report exceeds a short notification length and interactive UI is available
- **THEN** the system displays the report in an editor or equivalent inspectable UI surface

#### Scenario: Health check detects no data
- **WHEN** the user runs the memory health command before memory files exist
- **THEN** the system reports that no memory store exists yet
- **AND** the command completes without creating source files or failing the agent session

### Requirement: Memory entry quality classification
The system SHALL classify memory entries and candidates by quality so low-value or unsafe entries can be diagnosed and excluded from injection.

#### Scenario: Inferred entry is self-referential
- **WHEN** an inferred memory candidate contains injected memory labels, existing memory entry IDs, or repeated memory-card content
- **THEN** the system rejects the candidate or marks it as suspected junk
- **AND** the candidate is not injected in future memory cards unless explicitly pinned by the user

#### Scenario: Inferred entry is code or raw tool output
- **WHEN** an inferred memory candidate is a code fragment, type definition, stack trace, raw file path, raw tool result, or documentation location without a durable repo decision
- **THEN** the system rejects the candidate or marks it as low quality
- **AND** the candidate is not promoted to durable session memory

#### Scenario: Inferred entry is durable
- **WHEN** an inferred memory candidate describes a settled preference, decision, blocker, assumption, or next step with durable repository relevance
- **THEN** the system may store it with quality metadata and inferred-origin metadata

### Requirement: Memory deduplication
The system SHALL identify duplicate and singleton-equivalent memory entries and avoid injecting redundant copies.

#### Scenario: Singleton memory is refreshed
- **WHEN** generated singleton memory such as repo orientation or OpenSpec index memory is refreshed
- **THEN** the system updates the existing active singleton entry when possible
- **AND** the system does not create an additional active duplicate for the same singleton key

#### Scenario: Duplicate entries exist
- **WHEN** multiple active entries have the same dedupe key or normalized text
- **THEN** the memory health report identifies the duplicate group
- **AND** memory-card injection includes at most one active representative from that duplicate group

#### Scenario: Duplicate pinned preferences exist
- **WHEN** duplicate pinned preferences are detected
- **THEN** the system reports the duplicates
- **AND** the system does not automatically forget or delete pinned preferences without explicit user action

### Requirement: Memory lifecycle controls
The system SHALL apply lifecycle metadata to inferred session memory so temporary or low-confidence memories do not persist indefinitely as high-priority context.

#### Scenario: Temporary inferred memory expires
- **WHEN** an inferred session memory has expired according to its lifecycle metadata
- **THEN** the system excludes it from memory-card injection
- **AND** the memory inspection or health output distinguishes the expired state when metadata is available

#### Scenario: User pins an inferred memory
- **WHEN** the user explicitly pins or records a durable preference
- **THEN** the resulting pinned memory is not treated as temporary inferred scratch memory
- **AND** normal expiration rules for inferred session memory do not remove it from injection eligibility
