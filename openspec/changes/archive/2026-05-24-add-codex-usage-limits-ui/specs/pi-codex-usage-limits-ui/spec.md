## ADDED Requirements

### Requirement: Codex usage indicator appears only for OpenAI Codex models
The pi extension SHALL display Codex usage-limit information only when the active model is an OpenAI Codex model.

#### Scenario: OpenAI Codex model is selected
- **WHEN** the active model provider is `openai-codex`
- **THEN** the TUI displays a compact Codex usage-limit indicator next to the selected model or in the same footer/status area

#### Scenario: Non-Codex model is selected
- **WHEN** the active model provider is not `openai-codex`
- **THEN** the TUI does not display the Codex usage-limit indicator

#### Scenario: Model changes away from Codex
- **WHEN** the active model changes from an OpenAI Codex model to any non-Codex model
- **THEN** the extension clears the Codex usage-limit indicator

### Requirement: Usage data refreshes for active Codex sessions
The pi extension SHALL refresh Codex usage-limit data when a Codex model becomes active and while it remains active.

#### Scenario: Codex model selected during model change
- **WHEN** the user selects an OpenAI Codex model
- **THEN** the extension starts a usage-limit refresh without blocking normal pi interaction

#### Scenario: Session restores with Codex model
- **WHEN** pi starts or reloads a session whose active model is OpenAI Codex
- **THEN** the extension refreshes and displays Codex usage-limit information

#### Scenario: Codex remains selected
- **WHEN** an OpenAI Codex model remains active beyond the configured refresh interval
- **THEN** the extension refreshes the usage-limit information again without starting overlapping refreshes

### Requirement: Usage indicator is compact and understandable
The pi extension SHALL render usage-limit state in a short format suitable for the pi footer/status area.

#### Scenario: Usage data is available
- **WHEN** current Codex usage-limit data is available
- **THEN** the indicator includes the remaining or used allowance and reset timing when those values are available

#### Scenario: Usage data is loading
- **WHEN** a Codex usage-limit refresh is in progress and no current value is available
- **THEN** the indicator communicates that Codex usage is loading in a compact form

#### Scenario: Usage data is unavailable
- **WHEN** credentials, API support, or network access do not provide usage-limit data
- **THEN** the indicator shows a compact unavailable state without interrupting the user

### Requirement: Extension handles failures safely
The pi extension SHALL handle missing credentials, failed usage requests, malformed responses, and non-interactive modes without disrupting pi.

#### Scenario: Usage request fails
- **WHEN** the usage-limit data source returns an error or cannot be reached
- **THEN** the extension keeps pi running and displays a compact error or unavailable state only while Codex remains selected

#### Scenario: Response shape is unexpected
- **WHEN** the usage-limit data source returns data that cannot be parsed into the expected fields
- **THEN** the extension treats usage data as unavailable and does not throw an uncaught error

#### Scenario: UI is not available
- **WHEN** pi is running in a mode without an interactive UI
- **THEN** the extension does not attempt to render the usage-limit indicator
