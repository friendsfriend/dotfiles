# ghostty Specification

## Purpose
TBD - created by archiving change document-existing-repository-areas. Update Purpose after archive.
## Requirements
### Requirement: Ghostty terminal configuration
The ghostty area SHALL provide the repository's default Ghostty terminal configuration.

#### Scenario: Supported profile links Ghostty
- **WHEN** the `minimal`, `work`, or `omarchy` profile links configs
- **THEN** the ghostty area SHALL be linked to the user's Ghostty config location

### Requirement: Split Ghostty config files
The ghostty area SHALL keep the main config, keybindings, and options in separate files loaded by the main config.

#### Scenario: Ghostty loads main config
- **WHEN** Ghostty reads the repository `config` file
- **THEN** it SHALL load the repository `keybinds` and `options` config files

### Requirement: Zsh shell command
The ghostty area SHALL configure Ghostty to launch Zsh as the terminal command.

#### Scenario: Ghostty opens a terminal
- **WHEN** a Ghostty terminal session starts
- **THEN** it SHALL use `/bin/zsh` as the configured command

