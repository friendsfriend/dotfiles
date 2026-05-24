## ADDED Requirements

### Requirement: Memory dashboard command surface
The memory command surface SHALL expose an interactive dashboard entry point.

#### Scenario: User requests dashboard from memory command
- **WHEN** the user invokes `/memory dashboard`
- **THEN** the memory extension opens the interactive memory dashboard when UI interaction is available

#### Scenario: User requests dashboard without interactive UI
- **WHEN** the user invokes `/memory dashboard` in a non-interactive context
- **THEN** the system prints a concise message explaining that the dashboard requires interactive UI and points to `/memory stats` or benchmark reports for non-interactive inspection

### Requirement: Memory command completions include dashboard
The memory command SHALL include dashboard in argument completions.

#### Scenario: User completes memory subcommands
- **WHEN** the user requests completions for `/memory d`
- **THEN** the command completion list includes `dashboard`
