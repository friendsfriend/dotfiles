## 1. OpenSpec Context Tool Foundation

- [x] 1.1 Create the `openspec_context` extension module and register the tool with parameters, prompt snippet, and authority/freshness guidance.
- [x] 1.2 Define query modes for overview, change, tasks, task-context, capability, and readiness checks.
- [x] 1.3 Implement safe helpers for running OpenSpec CLI commands and reporting CLI failures without guessing workflow state.

## 2. OpenSpec Context Queries

- [x] 2.1 Implement overview mode using current OpenSpec state and optional archived-change listing.
- [x] 2.2 Implement change mode with active/archived detection, schema/status details, artifact paths, affected capabilities, and task progress.
- [x] 2.3 Implement tasks and task-context modes with matched task status, task file paths, related artifacts, and suggested follow-up `repo_graph` implementation queries.
- [x] 2.4 Implement capability mode with stable spec paths and active or requested archived changes that modify the capability.
- [x] 2.5 Implement readiness-oriented output for apply/archive context when available from OpenSpec CLI state.

## 3. Repo Graph Boundary Cleanup

- [x] 3.1 Add `openspec` to repo graph traversal ignores so no `openspec/` files or directories become graph nodes.
- [x] 3.2 Remove or deprecate OpenSpec-specific repo graph node kinds, scanner logic, and query modes.
- [x] 3.3 Update repo graph overview, search, neighbors, symbols, summaries, and suggested reads so outputs cannot include `openspec/` paths.
- [x] 3.4 Return clear guidance from any transitional/deprecated OpenSpec repo graph mode pointing callers to `openspec_context`.

## 4. Guidance and Workflow Updates

- [x] 4.1 Update OpenSpec apply/explore/propose prompts and skills to use `openspec_context` for workflow state and `repo_graph` for implementation navigation.
- [x] 4.2 Update tool prompt guidelines so agents do not ask `repo_graph` for OpenSpec changes, specs, or tasks.
- [x] 4.3 Preserve guidance that exact OpenSpec artifacts and implementation files must be read before exact claims or edits.

## 5. Validation

- [x] 5.1 Add or update repo graph tests proving overview/search/neighbors do not return `openspec/` paths or OpenSpec nodes.
- [x] 5.2 Add OpenSpec context tests for no active changes, active change details, archived change inclusion, task context, and capability context.
- [x] 5.3 Run OpenSpec validation/status checks and relevant extension import/tests.
