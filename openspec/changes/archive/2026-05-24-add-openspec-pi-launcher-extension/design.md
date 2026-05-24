## Context

This repository already contains OpenSpec prompt templates and skills for explore, propose, apply, and archive workflows. Users can invoke those commands directly, but pi does not currently provide a compact OpenSpec entry point that adapts to the current repository state.

Pi extensions can register slash commands, listen to `session_start`, run shell commands, show custom TUI components, and send user messages back into the agent. OpenSpec exposes machine-readable state through commands such as `openspec list --json` and `openspec status --change <name> --json`.

## Goals / Non-Goals

**Goals:**
- Provide `/openspec` as an extension command that opens an interactive OpenSpec launcher.
- Automatically show the launcher on session start only when pi has an interactive UI and the current working directory belongs to an initialized OpenSpec project.
- Support OpenSpec initialization from non-initialized directories via the manual `/openspec` command.
- Build action lists from actual OpenSpec CLI state.
- Persist launcher workflow stage per OpenSpec repository, not per pi session.
- Dispatch selected actions to the existing OpenSpec prompt flows instead of duplicating their behavior.

**Non-Goals:**
- Replacing `/opsx-*` prompt templates or OpenSpec skills.
- Implementing OpenSpec proposal/apply/archive logic inside the extension.
- Supporting startup prompts in non-interactive or RPC-only contexts.
- Adding a long-running OpenSpec daemon or background watcher.

## Decisions

### Use a project-local pi extension

The launcher will live under `.pi/extensions/` so it is available when working in this repository and can be reloaded with `/reload`.

Alternative considered: a global extension under `~/.pi/agent/extensions/`. A global extension would work across all repositories, but this change is scoped to this repo's OpenSpec/pi workflow and can be promoted later if it proves generally useful.

### Use `/openspec` as an extension command

The extension will register an `openspec` command. The command handler opens the launcher UI and handles initialization when the current directory is not OpenSpec-initialized.

Alternative considered: intercepting raw input for `/openspec`. A command is simpler, clearer, and matches the user's desired trigger.

### Detect OpenSpec root by walking upward

The extension will consider a directory OpenSpec-initialized when it or an ancestor contains `openspec/config.yaml`. The discovered root becomes the repository key for CLI execution and state persistence.

This lets the launcher work from subdirectories inside an initialized project while still initializing only when no root is found.

### Prefill existing prompt commands instead of submitting immediately

Selected workflow actions will populate the prompt editor with the corresponding command and a trailing space:

- Explore: `/opsx-explore `
- Propose: `/opsx-propose `
- Apply: `/opsx-apply <change> `
- Archive: `/opsx-archive <change> `

The extension will not submit these commands automatically. This lets the user add context or instructions before pressing enter. The extension also does not directly create proposals, implement tasks, or archive changes; it only prepares existing workflows for user submission.

### Use custom TUI selection with `SelectList`

The launcher will use `ctx.ui.custom()` and pi TUI `SelectList` for keyboard navigation and display. The wrapper will support arrow keys via built-in selection handling and map `j`/`k` to down/up navigation before passing input to the list.

`Exit` closes the UI and returns to the normal prompt without sending a user message.

### Build candidates from OpenSpec CLI state

On each launcher display, the extension will run `openspec list --json` and inspect each active change using `openspec status --change <name> --json`.

- Apply candidates are changes whose status is not fully complete.
- Archive candidates are changes with at least one completed task.

Task completion can be derived from `openspec list --json` fields when present, with `openspec status` used for completion state. If a command fails or a change cannot be inspected, the launcher will omit unsafe derived actions and show a warning.

### Persist workflow state globally, keyed by OpenSpec root

Workflow stage will be stored in a global extension state file under pi's agent directory, keyed by the resolved OpenSpec root path. This satisfies per-repository persistence without modifying the repository on every menu selection.

The state shape will be small, for example:

```json
{
  "/Users/example/project": {
    "stage": "afterApply",
    "lastChange": "add-example",
    "updatedAt": "2026-05-24T00:00:00.000Z"
  }
}
```

Stages:
- `initial`
- `afterExplore`
- `afterPropose`
- `afterApply`

Archive selection resets the stage to `initial`.

### Update stage when a prepared workflow prompt is submitted

The extension will update workflow stage when the user submits an `/opsx-*` workflow command, not when the launcher merely fills the prompt editor. This prevents launcher selection from advancing repository state if the user edits away or cancels the prepared prompt.

The actual OpenSpec workflow remains authoritative for apply/archive candidate visibility because candidates are recomputed from CLI state each time.

Alternative considered: advance stage when the user selects a launcher action. That is simpler, but it can get ahead of user intent now that launcher selection only prepares an editable prompt.

## Risks / Trade-offs

- Startup UI may appear before the user expects it → Limit auto-display to initialized OpenSpec roots and interactive UI only; provide `Exit` as a no-op close action.
- `ctx.hasUI` may be true for RPC as well as TUI → Prefer a conservative startup guard if pi exposes mode information; otherwise use `ctx.hasUI` and avoid startup display where custom UI is unavailable.
- OpenSpec CLI output can evolve → Parse only stable fields where possible and fail closed by omitting uncertain candidates with a warning.
- Updating stage on selection can get ahead of actual workflow completion → Candidate lists are recomputed from OpenSpec state, so incorrect ordering is temporary and recoverable.
- Running multiple OpenSpec CLI commands can add small latency → Keep the UI construction synchronous enough for small change lists and show warnings rather than blocking indefinitely.
