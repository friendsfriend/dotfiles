## MODIFIED Requirements

### Requirement: Bounded verifier feedback loop
The verifier workflow SHALL feed verifier failures back to the main agent and continue verification after fix turns until pass or a configured round limit is reached.

#### Scenario: Verifier fails with remaining rounds
- **WHEN** verification fails and the maximum verifier round count has not been reached
- **THEN** the system SHALL send a follow-up user message to the main agent containing the verifier report
- **AND** the message SHALL instruct the main agent to fix only the verifier findings within the OpenSpec change scope
- **AND** the system SHALL rerun verification after the main agent completes that fix turn

#### Scenario: Verifier passes after fixes
- **WHEN** a verifier rerun returns `VERDICT: PASS`
- **THEN** the system SHALL stop the verification loop
- **AND** it SHALL record verifier pass state for the current verification context without writing OpenSpec launcher state

#### Scenario: Maximum rounds reached
- **WHEN** verification still fails after the configured maximum number of rounds
- **THEN** the system SHALL stop automatic verifier reruns
- **AND** it SHALL show the latest verifier report to the user
- **AND** it SHALL leave the main agent session available for manual guidance

### Requirement: Verification pass staleness
The verifier workflow SHALL avoid treating stale verification results as current when implementation or policy context changes after a pass.

#### Scenario: Git diff changes after pass
- **WHEN** verification has passed for a change in a git repository
- **AND** the current git diff hash differs from the diff hash recorded at pass time
- **THEN** the system SHALL treat the previous pass as stale for verification/archive guidance

#### Scenario: Policy files change after pass
- **WHEN** verification has passed for a change
- **AND** the loaded `.pi/verifier/*.md` policy bundle hash differs from the hash recorded at pass time
- **THEN** the system SHALL treat the previous pass as stale for verification/archive guidance

#### Scenario: No git diff hash is available
- **WHEN** verification passes outside a usable git diff context
- **THEN** the system SHALL record only session-local pass state
- **AND** it SHALL NOT claim durable verification for future repository changes
