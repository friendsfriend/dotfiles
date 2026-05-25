## Why

The Pi extension codebase has accumulated implementation leftovers from earlier memory and repo-graph iterations. Removing confirmed dead code reduces maintenance overhead, lowers cognitive load for future changes, and makes later performance/lifecycle work safer to review.

## What Changes

- Remove unreferenced helper functions from the memory extension, including expiry/Markdown-writing helpers that no longer participate in current memory flows.
- Remove obsolete automatic transcript-memory extraction code now that durable semantic memory is explicit-only through `memory_save`.
- Remove obsolete repo-graph implementation-search helper code left behind after OpenSpec-specific behavior moved to `openspec_context`.
- Preserve existing public extension behavior, registered tools, prompt guidance, storage formats, and OpenSpec requirements.
- Add or update lightweight validation so dead-code cleanup does not remove active memory query/save, repo graph, or OpenSpec context behavior.

## Capabilities

### New Capabilities

- `pi-extension-maintainability`: Defines behavior-preserving maintenance expectations for Pi extension dead-code cleanup.

### Modified Capabilities

- None. This cleanup does not change requirements for existing runtime capabilities.

## Impact

- Affected code: `pi/extensions/memory-system/index.ts` and `pi/extensions/repo-graph/index.ts`.
- Affected validation: existing memory policy and repo graph tests should continue to pass; optional static/literal search validation may be used to confirm removed symbols are gone.
- No public API, tool schema, memory storage, prompt template, or user workflow changes are expected.
