# openspec-verification Specification

## Purpose
TBD - created by archiving change add-openspec-verifier-step. Update Purpose after archive.
## Requirements
### Requirement: OpenSpec verify workflow command
The system SHALL provide an OpenSpec verify workflow action invokable as `/opsx-verify <change>` for active OpenSpec changes.

#### Scenario: User invokes verify with a change name
- **WHEN** the user submits `/opsx-verify <change>` from inside an initialized OpenSpec project
- **THEN** the system SHALL run the repository verifier workflow for that change
- **AND** the verifier workflow SHALL use current OpenSpec CLI/filesystem state for the selected change

#### Scenario: User invokes verify without a change name
- **WHEN** the user submits `/opsx-verify` without a change name
- **THEN** the system SHALL prompt the user to select an active OpenSpec change rather than guessing

#### Scenario: Verify invoked outside OpenSpec project
- **WHEN** the user submits `/opsx-verify <change>` outside an initialized OpenSpec project
- **THEN** the system SHALL report that no OpenSpec project was found
- **AND** verification SHALL NOT run

### Requirement: Project verifier policy loading
The verifier workflow SHALL load project-local verifier policies from Markdown files in `.pi/verifier/` under the OpenSpec project root.

#### Scenario: Policy files exist
- **WHEN** `.pi/verifier/` contains one or more regular `*.md` files
- **THEN** the verifier workflow SHALL load all matching files
- **AND** the files SHALL be ordered lexicographically by file name before injection into the verifier prompt
- **AND** each policy file SHALL be injected with a visible file-boundary heading containing its project-relative path

#### Scenario: No policy files exist
- **WHEN** `.pi/verifier/` does not exist or contains no regular `*.md` files
- **THEN** the verifier workflow SHALL report that no repository verifier policies are configured
- **AND** automatic post-apply verification SHALL NOT be offered for that repository

#### Scenario: Nested policy files exist
- **WHEN** `.pi/verifier/` contains Markdown files in nested subdirectories
- **THEN** the verifier workflow SHALL ignore nested files for V0 policy discovery
- **AND** only direct child `*.md` files SHALL be injected

### Requirement: Global verifier agent
The verifier workflow SHALL use a globally defined verifier agent from the dotfiles Pi resources and SHALL keep repository policies separate from verifier mechanics.

#### Scenario: Verifier runs
- **WHEN** verification starts for an OpenSpec change
- **THEN** the system SHALL run an independent verifier agent using the global verifier instructions
- **AND** the system SHALL inject the project policy bundle into that verifier agent
- **AND** the verifier agent SHALL receive the selected change name and current verification context

#### Scenario: Verifier inspects repository
- **WHEN** the verifier agent needs to assess implementation correctness
- **THEN** it SHALL be able to inspect files and run configured safe verification commands through read/search/bash-style tools
- **AND** it SHALL be instructed not to intentionally modify repository files

### Requirement: Verification context packet
The verifier workflow SHALL provide the verifier agent with enough current context to assess the selected OpenSpec change without relying on stale main-session assumptions.

#### Scenario: Verification starts for a change
- **WHEN** the verifier workflow starts for `<change>`
- **THEN** it SHALL collect current OpenSpec status for `<change>`
- **AND** it SHALL collect current apply instructions or task context for `<change>` when available
- **AND** it SHALL include current project policy contents
- **AND** it SHALL include git diff or changed-file context when available

#### Scenario: OpenSpec state cannot be read
- **WHEN** required OpenSpec CLI state for the selected change cannot be read
- **THEN** the verifier workflow SHALL fail with a clear diagnostic
- **AND** it SHALL NOT report a passing verdict

### Requirement: Machine-detectable verifier verdict
The verifier workflow SHALL require verifier output to contain a machine-detectable verdict.

#### Scenario: Verifier passes
- **WHEN** the verifier output contains `VERDICT: PASS`
- **THEN** the workflow SHALL treat the selected change as verified for the current verification context
- **AND** it SHALL notify the user that verification passed

#### Scenario: Verifier fails
- **WHEN** the verifier output contains `VERDICT: FAIL`
- **THEN** the workflow SHALL treat verification as failed
- **AND** it SHALL preserve the verifier findings for display and feedback to the main agent

#### Scenario: Verifier verdict is missing
- **WHEN** the verifier output does not contain a supported verdict
- **THEN** the workflow SHALL treat the result as failed or inconclusive
- **AND** it SHALL surface the raw verifier output to the user

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

### Requirement: Post-apply verification prompt
The system SHALL offer verification after completed OpenSpec apply work when repository verifier policies are configured.

#### Scenario: Apply completes all tasks with policies configured
- **WHEN** the main agent finishes an `/opsx-apply <change>` turn
- **AND** current OpenSpec task state shows all implementation tasks for `<change>` are complete
- **AND** `.pi/verifier/*.md` policies exist for the project
- **THEN** the system SHALL prompt the user whether to run the verifier for `<change>`

#### Scenario: Apply pauses before all tasks complete
- **WHEN** the main agent finishes an `/opsx-apply <change>` turn
- **AND** current OpenSpec task state shows unfinished implementation tasks remain
- **THEN** the system SHALL NOT prompt for post-apply verification

#### Scenario: User declines verification prompt
- **WHEN** the user declines the post-apply verification prompt
- **THEN** the system SHALL return to the normal pi prompt without running the verifier
- **AND** archive SHALL remain user-controllable

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

### Requirement: Verification graphify navigation boundaries
The OpenSpec verification workflow SHALL allow graphify as advisory navigation for locating relevant files and prior context while requiring verifier verdicts to be based on current OpenSpec state, exact repository contents, policy contents, diffs, and safe verification commands.

#### Scenario: Verifier uses graphify for navigation
- **WHEN** the verifier workflow needs repository, implementation, prompt, configuration, history, or cross-document context
- **AND** graphify is available for the repository
- **THEN** the verifier instructions SHALL permit loading or following the graphify skill for advisory navigation
- **AND** the verifier SHALL read exact files or run safe verification commands before treating any graphify-suggested fact as evidence

#### Scenario: Graphify-only evidence is insufficient for verdict
- **WHEN** a verifier finding is based only on graphify output
- **THEN** the verifier SHALL NOT report that finding as definitive pass or fail evidence
- **AND** the verifier SHALL confirm the finding against current OpenSpec CLI output, exact files, diffs, policy contents, or safe command output before using it in the verdict

#### Scenario: Graphify is unavailable during verification
- **WHEN** graphify is unavailable or no graph exists during verification
- **THEN** verification SHALL continue with current OpenSpec state, exact file reads, policy contents, diffs, and safe verification commands
- **AND** the workflow SHALL NOT fail solely because graphify navigation is unavailable

