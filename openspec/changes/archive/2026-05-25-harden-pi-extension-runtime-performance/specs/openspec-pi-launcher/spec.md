## ADDED Requirements

### Requirement: Workflow prompt tracking avoids unrelated input discovery
The OpenSpec pi launcher SHALL avoid repository discovery work for user input that is not an OpenSpec workflow prompt requiring launcher stage tracking.

#### Scenario: User submits unrelated input
- **WHEN** the launcher input event observes text that does not start with an OpenSpec workflow prompt such as `/opsx-explore`, `/opsx-propose`, `/opsx-apply`, or `/opsx-archive`
- **THEN** the launcher SHALL continue normal input processing without searching for an OpenSpec repository root for stage tracking
- **AND** the unrelated input SHALL NOT change persisted launcher workflow stage

#### Scenario: User submits workflow input
- **WHEN** the launcher input event observes an OpenSpec workflow prompt that changes stage tracking
- **THEN** the launcher SHALL discover the relevant OpenSpec repository root before updating persisted per-repository launcher state
- **AND** existing stage updates for explore, propose, apply, and archive workflow prompts SHALL remain supported
