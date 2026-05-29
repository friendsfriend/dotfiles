## ADDED Requirements

### Requirement: Stow installation coverage verification
The scripts area SHALL be protected by repository verifier policy so changed installable dotfile assets are checked for coverage in `scripts/stow.sh` before an OpenSpec change is considered verified.

#### Scenario: Verifier checks stow-managed asset coverage
- **WHEN** an OpenSpec verifier run evaluates a change that adds or materially changes an installable dotfile asset
- **THEN** repository verifier policy SHALL require confirmation that `scripts/stow.sh` installs or links the asset for the relevant supported setup profile

#### Scenario: Verifier accepts explicit non-installable rationale
- **WHEN** an OpenSpec verifier run evaluates an asset-like changed path that is intentionally not installed by `scripts/stow.sh`
- **AND** the change artifacts document why the path is not an installable user-facing asset
- **THEN** repository verifier policy SHALL allow the scripts coverage check to pass without requiring a stow script reference

#### Scenario: Repository verifier policy is not globally installed
- **WHEN** `scripts/stow.sh` installs repository-managed Pi assets
- **THEN** it SHALL NOT link `.pi/verifier/*.md` files into global Pi agent configuration
- **AND** it SHALL remove repository-managed stale symlinks for the repository-local stow installation verifier policy when encountered
