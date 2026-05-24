## 1. Candidate Model

- [x] 1.1 Update launcher action types to distinguish grouped apply/archive actions from concrete apply/archive candidate selections.
- [x] 1.2 Update OpenSpec change summary handling so task counts from `openspec list --json` are the primary source for implementation readiness.
- [x] 1.3 Change apply candidate filtering to include only active changes with `totalTasks > 0` and `completedTasks < totalTasks`.
- [x] 1.4 Change archive candidate filtering to include only active changes with `totalTasks > 0` and `completedTasks === totalTasks`.

## 2. Grouped Launcher Actions

- [x] 2.1 Replace flattened per-change apply/archive top-level actions with grouped apply/archive actions that include candidate counts.
- [x] 2.2 Ensure grouped apply/archive actions are omitted or disabled safely when no candidates are available.
- [x] 2.3 Preserve existing explore, propose, init, exit, startup, and prompt-prefill behavior.
- [x] 2.4 Update workflow-stage ordering so it prioritizes grouped apply/archive actions rather than individual candidate entries.

## 3. Candidate Picker Flow

- [x] 3.1 Add a reusable candidate picker for apply and archive candidate lists.
- [x] 3.2 Enable candidate search or filtering by change name when supported by the selected TUI component.
- [x] 3.3 Preserve arrow-key and `j`/`k` navigation in candidate pickers.
- [x] 3.4 On apply candidate selection, prefill `/opsx-apply <change> ` without submitting it.
- [x] 3.5 On archive candidate selection, prefill `/opsx-archive <change> ` without submitting it.
- [x] 3.6 Ensure canceling a candidate picker returns without dispatching a workflow command.

## 4. Validation

- [x] 4.1 Run TypeScript syntax/type validation appropriate for project-local pi extensions.
- [x] 4.2 Verify `/openspec` displays grouped `Apply` and `Archive` actions with accurate candidate counts in an initialized project.
- [x] 4.3 Verify selecting `Apply` opens a searchable list of all apply candidates and selecting one prefills the correct `/opsx-apply` command.
- [x] 4.4 Verify selecting `Archive` opens a searchable list of all archive candidates and selecting one prefills the correct `/opsx-archive` command.
- [x] 4.5 Verify no-task changes are excluded from apply and archive candidate lists.
- [x] 4.6 Verify after-propose and after-apply launcher stages prioritize grouped apply/archive actions correctly.
