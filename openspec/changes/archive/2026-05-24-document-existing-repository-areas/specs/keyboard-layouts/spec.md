## ADDED Requirements

### Requirement: macOS keyboard layout installation
The keyboard-layouts area SHALL provide an installation flow for the custom macOS keyboard layout bundle.

#### Scenario: User confirms installation
- **WHEN** the user confirms the keyboard layout installation prompt
- **THEN** the install script SHALL copy the custom layout bundle into `~/Library/Keyboard Layouts`

#### Scenario: User declines installation
- **WHEN** the user declines the keyboard layout installation prompt
- **THEN** the install script SHALL exit without installing the bundle

### Requirement: macOS input source configuration
The keyboard-layouts area SHALL configure the intended macOS input sources for the user's keyboard workflow.

#### Scenario: Input sources are configured
- **WHEN** the install script configures input sources
- **THEN** it SHALL configure German, German-DIN-2137, and required system non-keyboard input methods as enabled input sources

### Requirement: Custom US international layout behavior
The keyboard-layouts area SHALL include a custom US international layout with German umlaut access through Alt-based bindings.

#### Scenario: Custom layout is available after installation
- **WHEN** the custom layout is installed and the user completes the required logout or reboot
- **THEN** the custom US international Linux layout SHALL be available for selection
