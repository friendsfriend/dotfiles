## ADDED Requirements

### Requirement: Apply and archive candidate pickers
The launcher SHALL use a second-step candidate picker when the user selects grouped apply or archive workflow actions.

#### Scenario: User selects grouped apply action
- **WHEN** the user selects the grouped apply action and apply candidates are available
- **THEN** the launcher SHALL display an interactive list containing all available apply candidates

#### Scenario: User selects grouped archive action
- **WHEN** the user selects the grouped archive action and archive candidates are available
- **THEN** the launcher SHALL display an interactive list containing all available archive candidates

#### Scenario: User searches candidate list
- **WHEN** a candidate picker is displayed
- **THEN** the user SHALL be able to search or filter the listed candidates by change name when the underlying TUI component supports searchable selection

#### Scenario: User selects apply candidate
- **WHEN** the user selects a change from the apply candidate picker
- **THEN** the extension SHALL populate the prompt input with the existing OpenSpec apply workflow command and that change name without submitting it

#### Scenario: User selects archive candidate
- **WHEN** the user selects a change from the archive candidate picker
- **THEN** the extension SHALL populate the prompt input with the existing OpenSpec archive workflow command and that change name without submitting it

#### Scenario: User cancels candidate picker
- **WHEN** the user cancels an apply or archive candidate picker
- **THEN** the extension SHALL close that picker without dispatching an OpenSpec workflow command

## MODIFIED Requirements

### Requirement: Workflow actions in initialized projects
The launcher SHALL display workflow actions for explore mode, propose mode, grouped apply candidates, grouped archive candidates, and exit when invoked in an initialized OpenSpec project.

#### Scenario: Explore action selected
- **WHEN** the user selects the explore action
- **THEN** the extension SHALL populate the prompt input with the existing OpenSpec explore workflow command without submitting it

#### Scenario: Propose action selected
- **WHEN** the user selects the propose action
- **THEN** the extension SHALL populate the prompt input with the existing OpenSpec propose workflow command without submitting it

#### Scenario: Apply group displayed
- **WHEN** one or more apply candidates are available
- **THEN** the launcher SHALL display a single grouped apply action that communicates the number of apply candidates

#### Scenario: Archive group displayed
- **WHEN** one or more archive candidates are available
- **THEN** the launcher SHALL display a single grouped archive action that communicates the number of archive candidates

#### Scenario: Apply action selected
- **WHEN** the user selects the grouped apply action
- **THEN** the extension SHALL open an apply candidate picker instead of immediately populating a workflow command

#### Scenario: Archive action selected
- **WHEN** the user selects the grouped archive action
- **THEN** the extension SHALL open an archive candidate picker instead of immediately populating a workflow command

#### Scenario: User augments selected workflow prompt
- **WHEN** the launcher has populated the prompt input from a selected workflow action or candidate
- **THEN** the user SHALL be able to edit the prompt and add additional instructions before submitting it

### Requirement: Candidate filtering
The launcher SHALL compute apply and archive candidates from current OpenSpec project task state each time it is displayed.

#### Scenario: Apply candidates are listed
- **WHEN** the launcher computes apply candidates
- **THEN** it SHALL include active changes with implementation tasks where at least one task is unfinished

#### Scenario: Changes with no implementation tasks are excluded from apply candidates
- **WHEN** an active change has no implementation tasks
- **THEN** the launcher SHALL NOT include that change as an apply candidate

#### Scenario: Changes with all implementation tasks complete are excluded from apply candidates
- **WHEN** an active change has implementation tasks and all tasks are complete
- **THEN** the launcher SHALL NOT include that change as an apply candidate

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
The launcher SHALL order and hide actions according to per-repository workflow stage while treating apply and archive as grouped workflow actions.

#### Scenario: Initial ordering
- **WHEN** the repository workflow stage is initial
- **THEN** the launcher SHALL show explore before propose, grouped apply, and grouped archive actions

#### Scenario: After explore ordering
- **WHEN** the repository workflow stage is after explore
- **THEN** the launcher SHALL hide explore and show propose before grouped apply and grouped archive actions

#### Scenario: After propose ordering
- **WHEN** the repository workflow stage is after propose
- **THEN** the launcher SHALL prioritize the grouped apply action before the grouped archive action

#### Scenario: After apply ordering
- **WHEN** the repository workflow stage is after apply
- **THEN** the launcher SHALL prioritize the grouped archive action before the grouped apply action

#### Scenario: After archive reset
- **WHEN** the user submits an archive workflow command for a change
- **THEN** the extension SHALL reset the repository workflow stage to initial
