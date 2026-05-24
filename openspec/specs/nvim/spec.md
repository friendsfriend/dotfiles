# nvim Specification

## Purpose
TBD - created by archiving change document-existing-repository-areas. Update Purpose after archive.
## Requirements
### Requirement: Neovim configuration entrypoint
The nvim area SHALL provide the repository's Neovim configuration entrypoint.

#### Scenario: Supported profile links Neovim
- **WHEN** the `minimal`, `work`, `omarchy`, or Windows setup links Neovim
- **THEN** the nvim area SHALL be installed at the platform's Neovim config location

### Requirement: Friendsfriend module loading
The Neovim entrypoint SHALL load the repository's core, lazy/plugin, and LSP configuration modules.

#### Scenario: Neovim starts with repository config
- **WHEN** Neovim loads `init.lua`
- **THEN** it SHALL require the `friendsfriend.core`, `friendsfriend.lazy`, and `friendsfriend.lsp` modules

