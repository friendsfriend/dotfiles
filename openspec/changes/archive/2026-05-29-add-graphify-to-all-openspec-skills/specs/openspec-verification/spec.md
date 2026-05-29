## ADDED Requirements

### Requirement: Verification graphify navigation boundaries
The OpenSpec verification workflow SHALL allow graphify as advisory navigation for locating relevant files and prior context while requiring verifier verdicts to be based on current OpenSpec state, exact repository contents, policy contents, diffs, and safe verification commands.

#### Scenario: Verifier uses graphify for navigation
- **WHEN** the verifier workflow needs repository, implementation, prompt, configuration, history, or cross-document context
- **AND** graphify is available for the repository
- **THEN** the verifier instructions SHALL permit loading or following the graphify skill for advisory navigation
- **AND** the verifier SHALL read exact files or run safe verification commands before treating any graphify-suggested fact as evidence

#### Scenario: Graphify-only evidence is insufficient for verdict
- **WHEN** a verifier finding is based only on graphify output
- **THEN** the verifier SHALL NOT report that finding as definitive pass or fail evidence
- **AND** the verifier SHALL confirm the finding against current OpenSpec CLI output, exact files, diffs, policy contents, or safe command output before using it in the verdict

#### Scenario: Graphify is unavailable during verification
- **WHEN** graphify is unavailable or no graph exists during verification
- **THEN** verification SHALL continue with current OpenSpec state, exact file reads, policy contents, diffs, and safe verification commands
- **AND** the workflow SHALL NOT fail solely because graphify navigation is unavailable
