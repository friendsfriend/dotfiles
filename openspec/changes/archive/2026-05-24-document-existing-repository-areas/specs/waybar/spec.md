## ADDED Requirements

### Requirement: Omarchy Waybar status bar configuration
The waybar area SHALL provide the Waybar status bar configuration for an Omarchy setup.

#### Scenario: Omarchy profile links Waybar
- **WHEN** the `omarchy` profile links configs
- **THEN** the waybar area SHALL be linked to the user's Waybar config location

### Requirement: Waybar appearance customization
The waybar area SHALL provide both module configuration and styling for the Omarchy status bar.

#### Scenario: Waybar starts with repository config
- **WHEN** Waybar loads the repository configuration
- **THEN** it SHALL use the repository `config.jsonc` and `style.css` to apply the intended modules and visual scaling
