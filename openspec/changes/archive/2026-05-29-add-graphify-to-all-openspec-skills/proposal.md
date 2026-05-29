## Why

OpenSpec skills already mention graphify in several places, but the behavior is inconsistent and not explicit across every OpenSpec command/skill. Making graphify handoff guidance uniform ensures OpenSpec workflows use the graphify skill as the advisory repository/navigation layer while preserving OpenSpec CLI state and exact file reads as authority.

## What Changes

- Add explicit graphify-skill usage guidance to all OpenSpec command/skill workflows where repository, history, implementation, prompt, or configuration navigation is needed.
- Require OpenSpec workflows to treat graphify as an advisory map only, never as authoritative workflow state or file content.
- Add graph freshness guidance when `graphify-out/graph.json` exists but may be stale.
- Ensure verify/archive/propose/apply/explore style workflows all share the same graphify boundary language.
- No breaking changes to OpenSpec CLI behavior or artifact schemas.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `graphify-context-tooling`: Add requirements that OpenSpec commands/skills explicitly load/use the graphify skill for graph-backed navigation when available, including freshness guidance and authority boundaries.
- `openspec-context-tooling`: Clarify the OpenSpec-context-to-graphify handoff so OpenSpec context remains the fresh workflow source while graphify provides follow-up repository/history navigation.
- `openspec-verification`: Clarify that verification workflows may use graphify for navigation, but verifier verdicts must be based on current OpenSpec state, exact files, and safe verification commands rather than graph contents alone.

## Impact

- Affected skills: `pi/skills/openspec-apply-change/SKILL.md`, `pi/skills/openspec-propose/SKILL.md`, `pi/skills/openspec-explore/SKILL.md`, `pi/skills/openspec-archive-change/SKILL.md`, `pi/skills/openspec-verify-change/SKILL.md` and their installed/global copies if applicable.
- Affected specs: graphify/OpenSpec context and verification specs.
- No new runtime dependencies; behavior degrades to OpenSpec CLI/context plus exact file reads and targeted search when graphify is unavailable.
