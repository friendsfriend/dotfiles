## ADDED Requirements

### Requirement: Windows tiling window manager configuration
The glazewm area SHALL provide the Windows tiling window manager configuration equivalent to the macOS AeroSpace workflow.

#### Scenario: GlazeWM is installed on Windows
- **WHEN** the Windows install script links Windows config areas
- **THEN** the GlazeWM directory SHALL be linked to `%USERPROFILE%\.glzr\glazewm`

### Requirement: Core window-management keybindings
The glazewm area SHALL define keybindings for workspace switching, moving windows, directional focus, fullscreen, closing windows, reload, and exit.

#### Scenario: User switches workspace
- **WHEN** the user presses `Alt+1..7`
- **THEN** GlazeWM SHALL switch to the selected workspace

#### Scenario: User moves window to workspace
- **WHEN** the user presses `Alt+Shift+1..7`
- **THEN** GlazeWM SHALL move the focused window to the selected workspace

### Requirement: App-to-workspace rules
The glazewm area SHALL support window rules that assign applications to configured workspaces.

#### Scenario: Matching application opens
- **WHEN** an application matches a configured GlazeWM window rule
- **THEN** GlazeWM SHALL place it on the configured workspace
