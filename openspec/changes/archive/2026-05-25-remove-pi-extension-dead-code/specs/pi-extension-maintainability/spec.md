## ADDED Requirements

### Requirement: Dead-code cleanup preserves extension behavior
The system SHALL allow Pi extension implementation dead code to be removed when the removed code is not part of registered tools, commands, UI behavior, storage formats, or documented workflow behavior.

#### Scenario: Dead code candidate is verified before removal
- **WHEN** a Pi extension helper or code path is selected for dead-code cleanup
- **THEN** the implementation SHALL verify that no current repository code references the selected symbol or path outside its own definition
- **AND** obsolete code SHALL be removed only when active extension behavior does not depend on it

#### Scenario: Public extension behavior is preserved
- **WHEN** dead-code cleanup is completed
- **THEN** registered tool names, command names, parameter schemas, prompt guidance, status identifiers, and storage locations SHALL remain unchanged unless a separate capability change explicitly modifies them

#### Scenario: Existing behavior validation remains passing
- **WHEN** the cleanup removes implementation-only code
- **THEN** existing tests for memory policy, repo graph behavior, and OpenSpec context behavior SHALL continue to pass where the repository validation setup supports running them
