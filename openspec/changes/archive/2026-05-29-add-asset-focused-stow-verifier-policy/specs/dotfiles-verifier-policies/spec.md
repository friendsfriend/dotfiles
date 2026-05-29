## ADDED Requirements

### Requirement: Asset-focused stow installation policy
The repository SHALL provide a project-local verifier policy that checks whether changed installable dotfile assets are installed by the repository stow script.

#### Scenario: Changed installable asset is covered by stow script
- **WHEN** the verifier evaluates an OpenSpec change that adds or materially changes a user-facing dotfile asset
- **AND** the asset is reachable from `scripts/stow.sh` through `stow_folder`, `stow_file`, explicit symlink commands, or a helper invoked by the relevant setup profile
- **THEN** the policy SHALL allow the asset installation coverage check to pass

#### Scenario: Changed installable asset is not covered by stow script
- **WHEN** the verifier evaluates an OpenSpec change that adds or materially changes a user-facing dotfile asset
- **AND** the asset is not reachable from `scripts/stow.sh` for any relevant supported setup profile
- **AND** the change artifacts do not explain why the asset is intentionally non-installable
- **THEN** the policy SHALL require the verifier to fail the change

#### Scenario: Changed path is not an installable asset
- **WHEN** the verifier evaluates changed files that are OpenSpec artifacts, scripts, documentation, generated graph output, Git metadata, dependency lists, or verifier policy files
- **THEN** the policy SHALL treat those paths as exempt from stow installation coverage unless the change artifacts explicitly describe them as installable user-facing assets

#### Scenario: Repository verifier policy remains local
- **WHEN** the verifier evaluates changed files under `.pi/verifier/`
- **THEN** the policy SHALL treat those files as repository-local verification configuration
- **AND** the policy SHALL NOT require those files to be stowed or linked into global Pi agent configuration

### Requirement: Pi agent asset coverage
The repository verifier policy SHALL treat source-controlled Pi agent extensions, prompt templates, and skills as installable assets that must be covered by the stow script's Pi asset linking flow.

#### Scenario: Pi agent asset is under a linked asset category
- **WHEN** the verifier evaluates a changed file under `pi/extensions/`, `pi/prompts/`, or `pi/skills/`
- **AND** `scripts/stow.sh` links that asset category into the corresponding `$HOME/.pi/agent/` target through `stow_pi_agent_assets` or an equivalent helper
- **THEN** the policy SHALL allow the Pi agent asset coverage check to pass

#### Scenario: New Pi agent asset category is not linked
- **WHEN** the verifier evaluates a changed file under a new source-controlled Pi agent asset category
- **AND** `scripts/stow.sh` does not link that category into a Pi agent discovery location
- **AND** the change artifacts do not explain why the category is intentionally non-installable
- **THEN** the policy SHALL require the verifier to fail the change

### Requirement: Verifier evidence checklist
The repository verifier policy SHALL require the verifier to inspect current changed-file context, the stow script, and relevant OpenSpec change artifacts before passing asset installation coverage.

#### Scenario: Evidence is available
- **WHEN** the verifier evaluates asset installation coverage for a change
- **THEN** the verifier SHALL inspect the changed-file list or git diff when available
- **AND** the verifier SHALL inspect `scripts/stow.sh`
- **AND** the verifier SHALL inspect relevant proposal, design, spec, or task artifacts when installability is ambiguous

#### Scenario: Required evidence cannot be inspected
- **WHEN** the verifier cannot inspect changed-file context or `scripts/stow.sh`
- **THEN** the policy SHALL require the verifier to fail or report an inconclusive result rather than pass without evidence
