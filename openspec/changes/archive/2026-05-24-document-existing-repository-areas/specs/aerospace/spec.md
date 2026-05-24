## ADDED Requirements

### Requirement: macOS tiling window manager configuration
The aerospace area SHALL provide AeroSpace configuration for macOS workspace and window-management behavior.

#### Scenario: AeroSpace config is linked for macOS profiles
- **WHEN** the `minimal` or `work` setup profile links macOS configs
- **THEN** an AeroSpace configuration from the repository SHALL be installed at the user's AeroSpace config location

### Requirement: Workspace keybindings
The aerospace area SHALL preserve workspace switching and window-moving keybindings based on Alt plus workspace keys.

#### Scenario: User switches workspace
- **WHEN** the user presses the configured Alt plus workspace key
- **THEN** AeroSpace SHALL switch to the corresponding workspace

#### Scenario: User moves a window to workspace
- **WHEN** the user presses the configured Alt+Shift plus workspace key
- **THEN** AeroSpace SHALL move the focused application to the corresponding workspace

### Requirement: Monitor-aware workspace assignment
The aerospace area SHALL support assigning workspaces to fixed monitors where configured.

#### Scenario: Workspace-to-monitor rules are active
- **WHEN** AeroSpace starts with the repository configuration
- **THEN** configured workspaces SHALL be assigned to their intended monitors
