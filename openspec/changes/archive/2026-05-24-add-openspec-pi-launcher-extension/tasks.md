## 1. Extension Structure

- [x] 1.1 Create a project-local pi extension at `.pi/extensions/openspec-launcher/index.ts`.
- [x] 1.2 Define launcher action, workflow stage, OpenSpec change summary, and persisted state types.
- [x] 1.3 Add helpers for locating the OpenSpec root by walking upward from `ctx.cwd`.

## 2. State and OpenSpec Discovery

- [x] 2.1 Implement global launcher state loading and saving keyed by resolved OpenSpec root path.
- [x] 2.2 Implement OpenSpec change discovery using `openspec list --json` from the detected root.
- [x] 2.3 Implement per-change status inspection using `openspec status --change <name> --json`.
- [x] 2.4 Derive apply candidates from active changes that are not fully completed.
- [x] 2.5 Derive archive candidates from active changes with at least one completed task.

## 3. Launcher UI

- [x] 3.1 Implement the initialized-project launcher item builder with workflow-aware ordering.
- [x] 3.2 Implement the non-initialized launcher item builder with only `OpenSpec Init` and `Exit`.
- [x] 3.3 Implement the custom TUI selection dialog using `ctx.ui.custom()` and `SelectList`.
- [x] 3.4 Add keyboard handling so arrow keys and `j`/`k` navigate the launcher, enter selects, and escape cancels.

## 4. Command and Startup Integration

- [x] 4.1 Register the `/openspec` extension command and open the launcher from the command handler.
- [x] 4.2 Add a session-start handler that auto-opens the launcher only for initialized OpenSpec roots with interactive UI support.
- [x] 4.3 Ensure startup does not auto-open the launcher in non-initialized directories or non-interactive contexts.

## 5. Action Dispatch

- [x] 5.1 Dispatch explore selections to `/opsx-explore` and update repository stage to after explore.
- [x] 5.2 Dispatch propose selections to `/opsx-propose` and update repository stage to after propose.
- [x] 5.3 Dispatch apply selections to `/opsx-apply <change>` and update repository stage to after apply.
- [x] 5.4 Dispatch archive selections to `/opsx-archive <change>` and reset repository stage to initial.
- [x] 5.5 Run `openspec init --tools pi` when `OpenSpec Init` is selected from a non-initialized directory.
- [x] 5.6 Ensure `Exit` and cancel close the launcher without dispatching a workflow command.
- [x] 5.7 Prefill selected workflow commands into the prompt input instead of submitting them immediately, and update stage when the user submits the prepared command.

## 6. Validation

- [x] 6.1 Run type checking or a syntax validation command appropriate for pi TypeScript extensions.
- [x] 6.2 Manually verify `/openspec` in this initialized repository shows explore/propose/apply/archive/exit according to current OpenSpec state.
- [x] 6.3 Manually verify launcher state persists across pi sessions for the same repository and does not affect another repository.
- [x] 6.4 Manually verify `/openspec` from a non-initialized temporary directory shows only init and exit.
