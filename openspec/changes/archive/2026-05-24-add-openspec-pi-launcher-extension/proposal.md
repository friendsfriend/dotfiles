## Why

OpenSpec actions are currently available as separate prompt commands, but choosing the right next action requires remembering repository state, available changes, and the desired workflow order. A project-local pi extension can make OpenSpec easier to use by surfacing a focused interactive launcher at the right moments.

## What Changes

- Add a project-local pi extension that registers an `/openspec` extension command.
- Show an interactive selectable OpenSpec launcher UI using pi's TUI when invoked manually.
- On pi session start, automatically show the launcher only when running with an interactive UI in an already initialized OpenSpec working directory.
- In non-OpenSpec directories, the manual launcher shows only `OpenSpec Init` and `Exit`; init runs OpenSpec initialization configured for pi.
- In OpenSpec directories, show workflow actions for explore mode, propose mode, apply candidates, archive candidates, and exit.
- Selecting a workflow action fills the prompt input with the corresponding `/opsx-*` command instead of submitting it immediately, so the user can add extra instructions before running it.
- Order and visibility of workflow actions are driven by a per-repository workflow state:
  - Initial and after archive: explore first, then propose, apply, archive.
  - After explore: hide explore and keep propose, apply, archive.
  - After propose: prioritize apply.
  - After apply: prioritize archive.
  - After archive: reset to initial ordering.
- Determine apply candidates from active changes that are not fully completed.
- Determine archive candidates from active changes with at least one completed task.
- Persist launcher workflow state per repository rather than per session.

## Capabilities

### New Capabilities
- `openspec-pi-launcher`: Interactive pi launcher for OpenSpec initialization and workflow actions.

### Modified Capabilities

## Impact

- Adds a project-local pi extension under `.pi/extensions/`.
- Uses pi extension APIs for commands, session-start events, custom TUI selection, command dispatch, shell execution, and state persistence.
- Uses OpenSpec CLI commands such as `openspec list --json`, `openspec status --change <name> --json`, and `openspec init --tools pi`.
- Does not change existing OpenSpec prompt templates or skills, but dispatches to existing `/opsx-explore`, `/opsx-propose`, `/opsx-apply`, and `/opsx-archive` flows.
