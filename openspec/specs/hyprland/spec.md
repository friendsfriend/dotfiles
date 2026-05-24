# hyprland Specification

## Purpose
TBD - created by archiving change document-existing-repository-areas. Update Purpose after archive.
## Requirements
### Requirement: Omarchy Hyprland override configuration
The hyprland area SHALL provide a Hyprland configuration intended to replace or override the standard Omarchy-generated Hyprland setup.

#### Scenario: Omarchy setup prepares Hyprland config
- **WHEN** the Omarchy setup flow runs
- **THEN** it SHALL link the repository Hyprland area into the user's Hyprland config location

#### Scenario: Omarchy profile links Hyprland
- **WHEN** the `omarchy` profile links configs
- **THEN** the hyprland area SHALL be linked to the user's Hyprland config location

### Requirement: Split Hyprland configuration ownership
The hyprland area SHALL keep major Hyprland concerns in separate configuration files.

#### Scenario: Hyprland loads repository configuration
- **WHEN** Hyprland uses the repository config
- **THEN** startup, bindings, environment variables, input, look and feel, monitors, plugins, window rules, portal, idle, lock, and sunset behavior SHALL be represented by the area configuration files

### Requirement: Path of Exile price-check helper
The hyprland area SHALL include helper behavior for launching and closing the Path of Exile price-check workflow from the configured binding.

#### Scenario: Price-check binding is used
- **WHEN** the configured price-check keybinding is invoked
- **THEN** the Hyprland helper scripts SHALL support the documented workspace-switching and web-app price-check flow

