## Why

The `/openspec` launcher currently flattens every apply and archive candidate into the top-level menu, which makes the launcher noisy and can appear to expose only one useful workflow option when candidate derivation is off. Apply and archive should be selected as workflow groups first, then choose from a searchable candidate list built from current OpenSpec state.

## What Changes

- Change the initialized launcher to show grouped `Apply` and `Archive` actions with candidate counts instead of one top-level action per change.
- Add second-step searchable candidate pickers for apply and archive selections.
- Update candidate derivation so apply/archive counts and lists reflect implementation workflow readiness rather than only artifact completion status.
- Keep selected candidates dispatching to existing editable prompt-prefill behavior for `/opsx-apply <change>` and `/opsx-archive <change>`.
- Preserve existing explore, propose, init, exit, startup, stage-ordering, and per-repository state behavior.

## Capabilities

### New Capabilities

### Modified Capabilities
- `openspec-pi-launcher`: Change workflow action display and candidate selection requirements for apply/archive flows.

## Impact

- Affected code: `.pi/extensions/openspec-launcher/index.ts`.
- Affected specification: `openspec/specs/openspec-pi-launcher/spec.md` via a change delta.
- No new runtime dependencies are expected; the launcher should continue using pi TUI components and OpenSpec CLI state.
