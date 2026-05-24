## ADDED Requirements

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
