## ADDED Requirements

### Requirement: Pi asset installation remains valid after context tool removal
The dotfiles installation scripts SHALL continue to install or link remaining Pi agent assets after the repo graph, memory, OpenSpec launcher, and Codex usage limits extensions are removed.

#### Scenario: Stow links active Pi assets
- **WHEN** `scripts/stow.sh` runs for a supported `DOTFILES_ENV`
- **THEN** it SHALL link remaining Pi extensions, prompts, and skills into the corresponding `$HOME/.pi/agent/` directories
- **AND** it SHALL NOT require removed `repo-graph`, `memory-system`, `openspec-launcher`, or `codex-usage-limits` source directories to exist

#### Scenario: Removed extension symlink exists
- **WHEN** a stale symlink exists in `$HOME/.pi/agent/extensions` for a removed Pi extension managed by this repository
- **THEN** the installation script SHALL avoid recreating that removed extension link
- **AND** it MAY remove or replace only repository-managed stale symlinks without deleting user-owned regular files

#### Scenario: Pi asset source directory is empty
- **WHEN** a Pi asset source directory contains no children after removal cleanup
- **THEN** the installation script SHALL complete without failing solely because there are no assets to link
