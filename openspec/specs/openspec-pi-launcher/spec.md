## Purpose

The OpenSpec pi launcher provides an interactive `/openspec` command for discovering and running OpenSpec workflows from pi.

## Requirements

### Requirement: OpenSpec command launcher
The extension SHALL register an `/openspec` extension command that opens an interactive OpenSpec launcher when UI interaction is available.

#### Scenario: User invokes launcher in initialized project
- **WHEN** the user runs `/openspec` from a directory inside an initialized OpenSpec project
- **THEN** the extension SHALL display an interactive launcher containing OpenSpec workflow actions for that project

#### Scenario: User exits launcher
- **WHEN** the user selects `Exit` from the launcher
- **THEN** the extension SHALL close the launcher and return to the normal pi prompt without dispatching an OpenSpec workflow command

### Requirement: Startup launcher trigger
The extension SHALL automatically display the OpenSpec launcher on pi session start only when pi is running with an interactive UI and the current working directory belongs to an initialized OpenSpec project.

#### Scenario: Session starts in initialized project with interactive UI
- **WHEN** a pi session starts with interactive UI support and the current working directory is inside an initialized OpenSpec project
- **THEN** the extension SHALL automatically display the OpenSpec launcher

#### Scenario: Session starts outside initialized project
- **WHEN** a pi session starts outside an initialized OpenSpec project
- **THEN** the extension SHALL NOT automatically display the OpenSpec launcher

#### Scenario: Session starts without interactive UI
- **WHEN** a pi session starts without interactive TUI support
- **THEN** the extension SHALL NOT automatically display the OpenSpec launcher

### Requirement: OpenSpec initialization option
The `/openspec` launcher SHALL support initializing OpenSpec for pi when invoked from a directory that is not already inside an initialized OpenSpec project.

#### Scenario: Manual launcher in non-initialized directory
- **WHEN** the user runs `/openspec` from a directory that is not inside an initialized OpenSpec project
- **THEN** the launcher SHALL show only `OpenSpec Init` and `Exit` options

#### Scenario: User selects initialization
- **WHEN** the user selects `OpenSpec Init`
- **THEN** the extension SHALL run OpenSpec initialization configured for pi for the current working directory

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

### Requirement: Workflow actions in initialized projects
The launcher SHALL display workflow actions for explore mode, propose mode, grouped apply candidates, grouped archive candidates, and exit when invoked in an initialized OpenSpec project, and the explore action SHALL remain available across all workflow stages.

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

#### Scenario: Explore remains available after previous exploration
- **WHEN** the repository workflow stage is after explore
- **THEN** the launcher SHALL display the explore action as an available workflow action

#### Scenario: Explore remains available after proposal or implementation work
- **WHEN** the repository workflow stage is after propose or after apply
- **THEN** the launcher SHALL display the explore action as an available workflow action

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
The launcher SHALL order actions according to per-repository workflow stage while treating apply and archive as grouped workflow actions, and SHALL NOT hide the explore action in initialized projects because of workflow stage.

#### Scenario: Initial ordering
- **WHEN** the repository workflow stage is initial
- **THEN** the launcher SHALL show explore before propose, grouped apply, and grouped archive actions

#### Scenario: After explore ordering
- **WHEN** the repository workflow stage is after explore
- **THEN** the launcher SHALL show propose before grouped apply and grouped archive actions
- **AND** the launcher SHALL keep explore available after the higher-priority workflow actions

#### Scenario: After propose ordering
- **WHEN** the repository workflow stage is after propose
- **THEN** the launcher SHALL prioritize the grouped apply action before the grouped archive action
- **AND** the launcher SHALL keep explore available

#### Scenario: After apply ordering
- **WHEN** the repository workflow stage is after apply
- **THEN** the launcher SHALL prioritize the grouped archive action before the grouped apply action
- **AND** the launcher SHALL keep explore available

#### Scenario: After archive reset
- **WHEN** the user submits an archive workflow command for a change
- **THEN** the extension SHALL reset the repository workflow stage to initial

### Requirement: Per-repository launcher state
The extension SHALL persist workflow stage per OpenSpec repository rather than per pi session.

#### Scenario: State survives new pi session
- **WHEN** the launcher stage changes in an OpenSpec repository and the user starts a new pi session in the same repository
- **THEN** the launcher SHALL use the previously persisted stage for that repository

#### Scenario: State is isolated across repositories
- **WHEN** the user changes launcher stage in one OpenSpec repository
- **THEN** the launcher SHALL NOT apply that stage to a different OpenSpec repository

### Requirement: Keyboard navigation
The launcher SHALL support keyboard selection using arrow keys and vim-style `j`/`k` navigation.

#### Scenario: User navigates with arrow keys
- **WHEN** the launcher is focused and the user presses up or down arrow keys
- **THEN** the selected menu item SHALL move accordingly

#### Scenario: User navigates with j and k
- **WHEN** the launcher is focused and the user presses `j` or `k`
- **THEN** the selected menu item SHALL move down or up respectively

#### Scenario: User confirms selection
- **WHEN** the launcher is focused and the user presses enter
- **THEN** the extension SHALL execute the currently selected launcher action
