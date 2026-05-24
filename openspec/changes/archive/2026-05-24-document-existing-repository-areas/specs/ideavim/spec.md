## ADDED Requirements

### Requirement: IntelliJ Vim-like editing configuration
The ideavim area SHALL provide configuration for Vim-like editing in IntelliJ-based IDEs.

#### Scenario: Work profile links IdeaVim config
- **WHEN** the `work` profile links IDE configs
- **THEN** the IdeaVim configuration SHALL be linked into the user's home directory

### Requirement: Ataman leader-style keybinding configuration
The ideavim area SHALL provide Ataman configuration for leader-style keybindings aligned with the Neovim workflow.

#### Scenario: Work profile links Ataman config
- **WHEN** the `work` profile links IDE configs
- **THEN** the Ataman configuration SHALL be linked into the user's home directory

### Requirement: External plugin assumptions
The ideavim area SHALL document that required IntelliJ plugins must be installed before relying on the configuration.

#### Scenario: User enables IdeaVim workflow
- **WHEN** the user activates the IntelliJ Vim workflow
- **THEN** the configuration SHALL assume the required IntelliJ plugins are already installed
