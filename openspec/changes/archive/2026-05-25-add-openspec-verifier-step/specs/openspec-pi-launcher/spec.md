## MODIFIED Requirements

### Requirement: Workflow actions in initialized projects
The launcher SHALL display workflow actions for explore mode, propose mode, grouped apply candidates, grouped verify candidates when repository verifier policies exist, grouped archive candidates, and exit when invoked in an initialized OpenSpec project, and the explore action SHALL remain available across all workflow stages.

#### Scenario: Explore action selected
- **WHEN** the user selects the explore action
- **THEN** the extension SHALL populate the prompt input with the existing OpenSpec explore workflow command without submitting it

#### Scenario: Propose action selected
- **WHEN** the user selects the propose action
- **THEN** the extension SHALL populate the prompt input with the existing OpenSpec propose workflow command without submitting it

#### Scenario: Apply group displayed
- **WHEN** one or more apply candidates are available
- **THEN** the launcher SHALL display a single grouped apply action that communicates the number of apply candidates

#### Scenario: Verify group displayed
- **WHEN** one or more verify candidates are available and repository verifier policies exist
- **THEN** the launcher SHALL display a single grouped verify action that communicates the number of verify candidates

#### Scenario: Verify group hidden without policies
- **WHEN** repository verifier policies do not exist
- **THEN** the launcher SHALL NOT display a grouped verify action

#### Scenario: Archive group displayed
- **WHEN** one or more archive candidates are available
- **THEN** the launcher SHALL display a single grouped archive action that communicates the number of archive candidates

#### Scenario: Apply action selected
- **WHEN** the user selects the grouped apply action
- **THEN** the extension SHALL open an apply candidate picker instead of immediately populating a workflow command

#### Scenario: Verify action selected
- **WHEN** the user selects the grouped verify action
- **THEN** the extension SHALL open a verify candidate picker instead of immediately populating a workflow command

#### Scenario: Archive action selected
- **WHEN** the user selects the grouped archive action
- **THEN** the extension SHALL open an archive candidate picker instead of immediately populating a workflow command

#### Scenario: User selects verify candidate
- **WHEN** the user selects a change from the verify candidate picker
- **THEN** the extension SHALL populate the prompt input with the OpenSpec verify workflow command and that change name without submitting it

#### Scenario: User augments selected workflow prompt
- **WHEN** the launcher has populated the prompt input from a selected workflow action or candidate
- **THEN** the user SHALL be able to edit the prompt and add additional instructions before submitting it

#### Scenario: Explore remains available after previous exploration
- **WHEN** the repository workflow stage is after explore
- **THEN** the launcher SHALL display the explore action as an available workflow action

#### Scenario: Explore remains available after proposal or implementation work
- **WHEN** the repository workflow stage is after propose, after apply, or after verify
- **THEN** the launcher SHALL display the explore action as an available workflow action

### Requirement: Candidate filtering
The launcher SHALL compute apply, verify, and archive candidates from current OpenSpec project task state and verifier policy state each time it is displayed.

#### Scenario: Apply candidates are listed
- **WHEN** the launcher computes apply candidates
- **THEN** it SHALL include active changes with implementation tasks where at least one task is unfinished

#### Scenario: Changes with no implementation tasks are excluded from apply candidates
- **WHEN** an active change has no implementation tasks
- **THEN** the launcher SHALL NOT include that change as an apply candidate

#### Scenario: Changes with all implementation tasks complete are excluded from apply candidates
- **WHEN** an active change has implementation tasks and all tasks are complete
- **THEN** the launcher SHALL NOT include that change as an apply candidate

#### Scenario: Verify candidates are listed
- **WHEN** repository verifier policies exist and the launcher computes verify candidates
- **THEN** it SHALL include active changes with implementation tasks where all tasks are complete

#### Scenario: Changes with unfinished implementation tasks are excluded from verify candidates
- **WHEN** an active change has at least one unfinished implementation task
- **THEN** the launcher SHALL NOT include that change as a verify candidate

#### Scenario: Changes with no implementation tasks are excluded from verify candidates
- **WHEN** an active change has no implementation tasks
- **THEN** the launcher SHALL NOT include that change as a verify candidate

#### Scenario: Verify candidates are unavailable without policies
- **WHEN** repository verifier policies do not exist
- **THEN** the launcher SHALL NOT include any verify candidates

#### Scenario: Archive candidates are listed
- **WHEN** the launcher computes archive candidates
- **THEN** it SHALL include active changes with implementation tasks where all tasks are complete

#### Scenario: Changes with unfinished implementation tasks are excluded from archive candidates
- **WHEN** an active change has at least one unfinished implementation task
- **THEN** the launcher SHALL NOT include that change as an archive candidate

#### Scenario: Changes with no implementation tasks are excluded from archive candidates
- **WHEN** an active change has no implementation tasks
- **THEN** the launcher SHALL NOT include that change as an archive candidate

### Requirement: Workflow-aware ordering
The launcher SHALL order actions according to per-repository workflow stage while treating apply, verify, and archive as grouped workflow actions, and SHALL NOT hide the explore action in initialized projects because of workflow stage.

#### Scenario: Initial ordering
- **WHEN** the repository workflow stage is initial
- **THEN** the launcher SHALL show explore before propose, grouped apply, grouped verify when available, and grouped archive actions

#### Scenario: After explore ordering
- **WHEN** the repository workflow stage is after explore
- **THEN** the launcher SHALL show propose before grouped apply, grouped verify when available, and grouped archive actions
- **AND** the launcher SHALL keep explore available after the higher-priority workflow actions

#### Scenario: After propose ordering
- **WHEN** the repository workflow stage is after propose
- **THEN** the launcher SHALL prioritize the grouped apply action before grouped verify when available and grouped archive actions
- **AND** the launcher SHALL keep explore available

#### Scenario: After apply ordering with verifier policies
- **WHEN** the repository workflow stage is after apply
- **AND** repository verifier policies exist
- **THEN** the launcher SHALL prioritize the grouped verify action before grouped archive and grouped apply actions
- **AND** the launcher SHALL keep explore available

#### Scenario: After apply ordering without verifier policies
- **WHEN** the repository workflow stage is after apply
- **AND** repository verifier policies do not exist
- **THEN** the launcher SHALL prioritize the grouped archive action before the grouped apply action
- **AND** the launcher SHALL keep explore available

#### Scenario: After verify ordering
- **WHEN** the repository workflow stage is after verify
- **THEN** the launcher SHALL prioritize the grouped archive action before grouped verify and grouped apply actions
- **AND** the launcher SHALL keep explore available

#### Scenario: After archive reset
- **WHEN** the user submits an archive workflow command for a change
- **THEN** the extension SHALL reset the repository workflow stage to initial

### Requirement: Workflow prompt tracking avoids unrelated input discovery
The OpenSpec pi launcher SHALL avoid repository discovery work for user input that is not an OpenSpec workflow prompt requiring launcher stage tracking.

#### Scenario: User submits unrelated input
- **WHEN** the launcher input event observes text that does not start with an OpenSpec workflow prompt such as `/opsx-explore`, `/opsx-propose`, `/opsx-apply`, `/opsx-verify`, or `/opsx-archive`
- **THEN** the launcher SHALL continue normal input processing without searching for an OpenSpec repository root for stage tracking
- **AND** the unrelated input SHALL NOT change persisted launcher workflow stage

#### Scenario: User submits workflow input
- **WHEN** the launcher input event observes an OpenSpec workflow prompt that changes stage tracking
- **THEN** the launcher SHALL discover the relevant OpenSpec repository root before updating persisted per-repository launcher state
- **AND** existing stage updates for explore, propose, apply, verify, and archive workflow prompts SHALL remain supported

#### Scenario: User submits verify workflow input
- **WHEN** the launcher input event observes `/opsx-verify <change>`
- **THEN** the launcher SHALL update persisted workflow stage to after verify for that repository
- **AND** it SHALL preserve the submitted change name as the last change

## ADDED Requirements

### Requirement: Verify candidate picker
The launcher SHALL use a second-step candidate picker when the user selects grouped verify workflow actions.

#### Scenario: User selects grouped verify action
- **WHEN** the user selects the grouped verify action and verify candidates are available
- **THEN** the launcher SHALL display an interactive list containing all available verify candidates

#### Scenario: User searches verify candidate list
- **WHEN** a verify candidate picker is displayed
- **THEN** the user SHALL be able to search or filter the listed candidates by change name when the underlying TUI component supports searchable selection

#### Scenario: User cancels verify candidate picker
- **WHEN** the user cancels a verify candidate picker
- **THEN** the extension SHALL close that picker without dispatching an OpenSpec workflow command

### Requirement: Post-apply verifier prompt integration
The launcher SHALL cooperate with the verifier workflow to offer verification after completed apply work when repository verifier policies exist.

#### Scenario: Apply prompt submitted
- **WHEN** the user submits `/opsx-apply <change>`
- **THEN** the launcher SHALL preserve the change name so post-apply verifier prompting can evaluate that change after the main agent turn completes

#### Scenario: Verify passes
- **WHEN** the verifier workflow reports a passing result for a change
- **THEN** the launcher SHALL be able to persist the repository workflow stage as after verify for that change

#### Scenario: Archive remains available
- **WHEN** repository verifier policies exist and a completed change has not yet passed verification
- **THEN** the launcher MAY still display archive candidates
- **AND** verify SHALL be ordered before archive after apply
