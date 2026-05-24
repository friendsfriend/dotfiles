## Why

The `/openspec` launcher currently hides the Explore action after the repository reaches the `afterExplore` workflow stage. Explore mode is useful as a reusable thinking surface throughout a change, so hiding it makes the launcher feel incomplete and prevents users from returning to discovery when new questions appear.

## What Changes

- Keep `OpenSpec Explore` visible whenever `/openspec` is invoked inside an initialized OpenSpec project.
- Change workflow-stage behavior so stage affects action ordering and prioritization, not Explore availability.
- Preserve existing prompt-prefill behavior: selecting Explore still fills `/opsx-explore ` without submitting it.
- Preserve existing propose, grouped apply, grouped archive, exit, candidate filtering, keyboard navigation, startup, and per-repository state behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `openspec-pi-launcher`: Change workflow action visibility so Explore remains available in initialized projects across all workflow stages.

## Impact

- Affected code: `.pi/extensions/openspec-launcher/index.ts`.
- Affected specification: `openspec/specs/openspec-pi-launcher/spec.md` via a change delta.
- No new runtime dependencies are expected.
