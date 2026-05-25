## Why

`repo_graph` currently mixes implementation-structure navigation with OpenSpec workflow/artifact context, which makes results harder to interpret and can surface archived OpenSpec artifacts as if they were normal repository structure. Splitting these concerns gives agents a clearer freshness and authority model: OpenSpec state comes from an OpenSpec-specific tool, while repository graph navigation ignores OpenSpec artifacts entirely.

## What Changes

- Add a dedicated OpenSpec context tool for active changes, archived changes, change artifacts, task progress, capabilities, and apply/archive readiness.
- Change `repo_graph` so it ignores the `openspec/` directory completely during graph construction and no longer returns OpenSpec change, task, artifact, capability, or spec nodes.
- Move OpenSpec-specific query responsibilities out of `repo_graph` and into the new OpenSpec context tool.
- Update agent/tool guidance so OpenSpec workflows use the OpenSpec context tool for workflow state and `repo_graph` only for implementation/source/config navigation.
- **BREAKING**: Existing `repo_graph` OpenSpec modes and OpenSpec node results will be removed or replaced by the new OpenSpec context tool.

## Capabilities

### New Capabilities
- `openspec-context-tooling`: Defines a dedicated Pi tool for fresh OpenSpec workflow and artifact context.

### Modified Capabilities
- `repo-graph-tooling`: Repo graph queries must exclude `openspec/` completely and focus on repository implementation/source/config structure.

## Impact

- Affected implementation files: `pi/extensions/repo-graph/index.ts` and a new OpenSpec context extension module under `pi/extensions/`.
- Affected tests: repo graph tests should assert `openspec/` is ignored; new OpenSpec context tests should cover active/archived changes and task context.
- Affected guidance: OpenSpec skills/prompts should use the OpenSpec context tool for workflow state and `repo_graph` for implementation navigation.
- Affected tool API: OpenSpec-specific `repo_graph` modes become obsolete in favor of the dedicated OpenSpec context tool.
