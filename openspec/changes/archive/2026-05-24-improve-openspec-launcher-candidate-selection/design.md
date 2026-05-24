## Context

The existing OpenSpec launcher is implemented as a project-local pi extension at `.pi/extensions/openspec-launcher/index.ts`. It discovers active changes with `openspec list --json`, inspects each change with `openspec status --change <name> --json`, and constructs one flat `SelectList` containing explore, propose, one item per apply candidate, one item per archive candidate, and exit.

That flat structure works for a small number of changes, but it does not scale and obscures the workflow distinction between selecting a workflow type and selecting a change. The current apply derivation also uses artifact completion (`status.isComplete`) as if it were implementation completion, which can exclude changes that are ready for implementation and include no-task proposal changes.

## Goals / Non-Goals

**Goals:**
- Keep `/openspec` as a compact workflow launcher.
- Show `Apply` and `Archive` as grouped top-level actions with candidate counts.
- Use a second-step searchable picker to select the specific change for apply or archive.
- Derive apply and archive candidates from implementation-task progress exposed by `openspec list --json`.
- Preserve editable prompt-prefill dispatch to `/opsx-apply <change>` and `/opsx-archive <change>`.

**Non-Goals:**
- Replacing the `/opsx-*` workflows.
- Automatically submitting apply/archive prompts.
- Implementing task completion or archive behavior inside the launcher.
- Adding persistent indexing, background watchers, or new dependencies.

## Decisions

### Use grouped launcher actions for apply and archive

The top-level initialized launcher will contain workflow actions rather than every candidate. `Apply` and `Archive` will include candidate counts in their labels or descriptions, such as `OpenSpec Apply (3)` and `OpenSpec Archive (2)`.

Alternative considered: keep the flattened list but improve labels. Grouping is clearer because it separates the workflow decision from candidate selection and prevents the first menu from growing with the number of changes.

### Open a second `SelectList` for candidate selection

Selecting grouped `Apply` or `Archive` will open another picker containing only candidates for that workflow. The picker should enable built-in fuzzy search where supported by the TUI component and should retain arrow and `j`/`k` navigation.

Alternative considered: prompt the user to type a change name manually. A searchable list is less error-prone and keeps the launcher discoverable.

### Derive candidates from task progress

The launcher will treat implementation-task counts from `openspec list --json` as the source for apply/archive readiness:

- Apply candidates: active changes with `totalTasks > 0` and `completedTasks < totalTasks`.
- Archive candidates: active changes with `totalTasks > 0` and `completedTasks === totalTasks`.

This excludes no-task changes from implementation workflows and avoids using artifact readiness as a proxy for implementation progress.

Alternative considered: continue using `openspec status --change` `isComplete`. That field reflects whether required OpenSpec artifacts are complete enough for apply, not whether implementation tasks are complete.

### Keep `openspec status` only for supplemental inspection when useful

The launcher may continue calling `openspec status --change` to display diagnostic state or fail closed for uncertain changes, but it must not use artifact completion as the primary apply/archive filter.

### Preserve stage ordering at group level

Workflow-aware ordering will operate on grouped apply/archive actions instead of individual candidate entries. For example, after propose, the `Apply` group is prioritized; after apply, the `Archive` group is prioritized.

## Risks / Trade-offs

- Candidate counts depend on `openspec list --json` task fields → If fields are missing or non-numeric, treat them as zero and omit the change from apply/archive to avoid unsafe prompts.
- Completed artifacts with no tasks will no longer appear as apply candidates → This is intentional; no-task changes need task creation or proposal refinement before implementation.
- Search support depends on the TUI `SelectList` API → If the exact API differs, provide the best available searchable or filterable picker without adding a new dependency.
- Two-step selection adds one keypress for single-candidate cases → The clearer workflow grouping is worth the extra step, and counts communicate when only one candidate exists.
