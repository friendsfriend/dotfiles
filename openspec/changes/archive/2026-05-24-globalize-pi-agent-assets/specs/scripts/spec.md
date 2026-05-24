## ADDED Requirements

### Requirement: Global pi agent asset linking
The scripts area SHALL install dotfiles-managed pi agent assets into pi's global agent discovery locations without managing unrelated pi runtime state.

#### Scenario: Pi assets are linked globally
- **WHEN** the stow script runs for a supported setup profile
- **THEN** it SHALL link each repository pi extension, prompt template, and skill item into the corresponding global pi agent discovery location under `~/.pi/agent/`
- **AND** it SHALL NOT replace the global extension, prompt, or skill directories themselves

#### Scenario: Pi runtime state is preserved
- **WHEN** the stow script installs pi agent assets
- **THEN** it SHALL NOT replace or stow-manage pi runtime state such as authentication files, settings files, session history, package installs, launcher state, or generated memory data

#### Scenario: Pi agent target directories are missing
- **WHEN** the global pi agent extension, prompt, or skill target directories do not exist
- **THEN** the stow script SHALL create the required target directories before linking the corresponding assets

#### Scenario: Existing unmanaged pi asset path conflicts
- **WHEN** a global pi agent asset target path already exists as an unmanaged file or directory that would conflict with linking
- **THEN** the stow script SHALL avoid overwriting it silently and SHALL surface a visible failure or skip message that allows manual resolution

#### Scenario: Locally installed pi assets are preserved
- **WHEN** a user has additional extensions, prompt templates, or skills installed in the global pi agent asset directories
- **THEN** the stow script SHALL leave those unrelated local assets in place

### Requirement: Source-controlled pi asset layout
The repository SHALL maintain source-controlled pi agent assets under a visible `pi/` dotfiles area rather than hidden project-local `.pi/` source paths.

#### Scenario: Pi extension source layout
- **WHEN** source-controlled pi extensions are inspected in the repository
- **THEN** they SHALL reside under `pi/extensions/`

#### Scenario: Pi prompt source layout
- **WHEN** source-controlled pi prompt templates are inspected in the repository
- **THEN** they SHALL reside under `pi/prompts/`

#### Scenario: Pi skill source layout
- **WHEN** source-controlled pi skills are inspected in the repository
- **THEN** they SHALL reside under `pi/skills/`

#### Scenario: Generated pi memory is not treated as an asset
- **WHEN** generated pi memory, health, backup, quarantine, or session data exists
- **THEN** it SHALL NOT be stored under the source-controlled `pi/` asset layout as part of this change
