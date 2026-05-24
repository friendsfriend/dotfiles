## MODIFIED Requirements

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
