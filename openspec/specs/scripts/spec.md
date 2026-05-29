# scripts Specification

## Purpose
TBD - created by archiving change document-existing-repository-areas. Update Purpose after archive.
## Requirements
### Requirement: Profile-based bootstrap
The scripts area SHALL provide a setup flow that supports the `minimal`, `work`, and `omarchy` setup profiles.

#### Scenario: Supported profile is selected
- **WHEN** the user selects `minimal`, `work`, or `omarchy` during setup
- **THEN** the setup flow SHALL run the dependency, linking, and profile-specific setup steps for that profile

#### Scenario: Unsupported profile is selected
- **WHEN** the selected setup profile is not `minimal`, `work`, or `omarchy`
- **THEN** the setup flow SHALL exit with an error

### Requirement: Repository bootstrap location
The scripts area SHALL bootstrap or reuse the dotfiles repository at `~/dotfiles`.

#### Scenario: Repository is missing
- **WHEN** `~/dotfiles` does not exist during setup
- **THEN** the setup flow SHALL clone the repository into `~/dotfiles`

#### Scenario: Repository already exists
- **WHEN** `~/dotfiles` already exists during setup
- **THEN** the setup flow SHALL continue using the existing repository

### Requirement: Platform dependency installation
The scripts area SHALL install dependencies using the package mechanism appropriate for the selected profile.

#### Scenario: macOS profile dependencies are installed
- **WHEN** the selected profile is `minimal` or `work`
- **THEN** dependencies SHALL be installed with Homebrew from the corresponding brew package list

#### Scenario: Omarchy dependencies are installed
- **WHEN** the selected profile is `omarchy`
- **THEN** dependencies SHALL be installed from the Omarchy package list using the Arch/Yay package flow

### Requirement: Stow-managed linking
The scripts area SHALL link repository config areas into their expected user config locations according to the selected profile.

#### Scenario: macOS profile configs are linked
- **WHEN** the selected profile is `minimal` or `work`
- **THEN** the script SHALL link the macOS-relevant config areas and select the matching SketchyBar entrypoint

#### Scenario: Omarchy profile configs are linked
- **WHEN** the selected profile is `omarchy`
- **THEN** the script SHALL link Hyprland, Waybar, Walker, and other Linux-relevant config areas and reload Hyprland

### Requirement: Windows link installation
The scripts area SHALL provide a Windows installation script that links supported Windows config areas without requiring administrator privileges by default.

#### Scenario: Default Windows installation
- **WHEN** the Windows install script is run without symlink mode
- **THEN** it SHALL create directory junctions for supported Windows config areas

#### Scenario: Windows symlink mode requested without permission
- **WHEN** symlink mode is requested without administrator privileges or Developer Mode
- **THEN** the script SHALL fail with guidance to enable Developer Mode, run as Administrator, or use junctions

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

### Requirement: Pi asset installation remains valid after context tool removal
The dotfiles installation scripts SHALL continue to install or link remaining Pi agent assets after the repo graph, memory, OpenSpec launcher, and Codex usage limits extensions are removed.

#### Scenario: Stow links active Pi assets
- **WHEN** `scripts/stow.sh` runs for a supported `DOTFILES_ENV`
- **THEN** it SHALL link remaining Pi extensions, prompts, and skills into the corresponding `$HOME/.pi/agent/` directories
- **AND** it SHALL NOT require removed `repo-graph`, `memory-system`, `openspec-launcher`, or `codex-usage-limits` source directories to exist

#### Scenario: Removed extension symlink exists
- **WHEN** a stale symlink exists in `$HOME/.pi/agent/extensions` for a removed Pi extension managed by this repository
- **THEN** the installation script SHALL avoid recreating that removed extension link
- **AND** it MAY remove or replace only repository-managed stale symlinks without deleting user-owned regular files

#### Scenario: Pi asset source directory is empty
- **WHEN** a Pi asset source directory contains no children after removal cleanup
- **THEN** the installation script SHALL complete without failing solely because there are no assets to link

### Requirement: Stow installation coverage verification
The scripts area SHALL be protected by repository verifier policy so changed installable dotfile assets are checked for coverage in `scripts/stow.sh` before an OpenSpec change is considered verified.

#### Scenario: Verifier checks stow-managed asset coverage
- **WHEN** an OpenSpec verifier run evaluates a change that adds or materially changes an installable dotfile asset
- **THEN** repository verifier policy SHALL require confirmation that `scripts/stow.sh` installs or links the asset for the relevant supported setup profile

#### Scenario: Verifier accepts explicit non-installable rationale
- **WHEN** an OpenSpec verifier run evaluates an asset-like changed path that is intentionally not installed by `scripts/stow.sh`
- **AND** the change artifacts document why the path is not an installable user-facing asset
- **THEN** repository verifier policy SHALL allow the scripts coverage check to pass without requiring a stow script reference

#### Scenario: Repository verifier policy is not globally installed
- **WHEN** `scripts/stow.sh` installs repository-managed Pi assets
- **THEN** it SHALL NOT link `.pi/verifier/*.md` files into global Pi agent configuration
- **AND** it SHALL remove repository-managed stale symlinks for the repository-local stow installation verifier policy when encountered

