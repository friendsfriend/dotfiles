## ADDED Requirements

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

### Requirement: Workflow actions in initialized projects
The launcher SHALL display workflow actions for explore mode, propose mode, apply candidates, archive candidates, and exit when invoked in an initialized OpenSpec project.

#### Scenario: Explore action selected
- **WHEN** the user selects the explore action
- **THEN** the extension SHALL populate the prompt input with the existing OpenSpec explore workflow command without submitting it

#### Scenario: Propose action selected
- **WHEN** the user selects the propose action
- **THEN** the extension SHALL populate the prompt input with the existing OpenSpec propose workflow command without submitting it

#### Scenario: Apply action selected
- **WHEN** the user selects an apply action for a specific change
- **THEN** the extension SHALL populate the prompt input with the existing OpenSpec apply workflow command and that change name without submitting it

#### Scenario: Archive action selected
- **WHEN** the user selects an archive action for a specific change
- **THEN** the extension SHALL populate the prompt input with the existing OpenSpec archive workflow command and that change name without submitting it

#### Scenario: User augments selected workflow prompt
- **WHEN** the launcher has populated the prompt input from a selected workflow action
- **THEN** the user SHALL be able to edit the prompt and add additional instructions before submitting it

### Requirement: Candidate filtering
The launcher SHALL compute apply and archive candidates from current OpenSpec project state each time it is displayed.

#### Scenario: Apply candidates are listed
- **WHEN** the launcher displays apply actions
- **THEN** it SHALL include active changes that are not fully completed

#### Scenario: Completed changes are excluded from apply candidates
- **WHEN** an active change is fully completed
- **THEN** the launcher SHALL NOT include that change as an apply candidate

#### Scenario: Archive candidates are listed
- **WHEN** the launcher displays archive actions
- **THEN** it SHALL include active changes that have at least one finished task

#### Scenario: Changes with no finished tasks are excluded from archive candidates
- **WHEN** an active change has no finished tasks
- **THEN** the launcher SHALL NOT include that change as an archive candidate

### Requirement: Workflow-aware ordering
The launcher SHALL order and hide actions according to per-repository workflow stage.

#### Scenario: Initial ordering
- **WHEN** the repository workflow stage is initial
- **THEN** the launcher SHALL show explore before propose, apply, and archive actions

#### Scenario: After explore ordering
- **WHEN** the repository workflow stage is after explore
- **THEN** the launcher SHALL hide explore and show propose before apply and archive actions

#### Scenario: After propose ordering
- **WHEN** the repository workflow stage is after propose
- **THEN** the launcher SHALL prioritize apply actions before archive actions

#### Scenario: After apply ordering
- **WHEN** the repository workflow stage is after apply
- **THEN** the launcher SHALL prioritize archive actions before apply actions

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
