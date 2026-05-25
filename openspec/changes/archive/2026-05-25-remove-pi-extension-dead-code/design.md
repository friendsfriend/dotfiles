## Context

The current Pi extension set contains several functions that are no longer referenced by extension code or tests. The main confirmed candidates are in `pi/extensions/memory-system/index.ts` (`addDaysIso`, `writeMarkdownFile`, and the obsolete `extractTurnMemory` path) and `pi/extensions/repo-graph/index.ts` (`relatedImplementationSearch`).

This cleanup follows prior changes that moved memory to explicit `memory_query`/`memory_save` semantics and moved OpenSpec-specific repository graph behavior into `openspec_context`. The important constraint is that cleanup must not change registered tools, command names, storage behavior, graph output semantics, or OpenSpec workflow behavior.

## Goals / Non-Goals

**Goals:**

- Remove implementation-only dead code that has no runtime callers.
- Keep the cleanup small enough to review safely.
- Preserve current public behavior for `memory_query`, `memory_save`, `repo_graph`, `openspec_context`, `openspec` launcher, and Codex usage status.
- Validate that active test coverage still exercises the supported behavior.

**Non-Goals:**

- Do not redesign memory storage, repo graph scanning, or launcher behavior.
- Do not remove public tool modes or schemas as part of this cleanup.
- Do not change OpenSpec specifications because this change does not alter normative behavior.

## Decisions

### Treat confirmed unreferenced helpers as removable implementation detail

Remove helpers only when repository-wide literal search confirms they have no callers outside their own definition. This favors a conservative cleanup over aggressive refactoring.

Alternative considered: keep the helpers for possible future use. Rejected because dormant helpers make current memory and repo graph behavior harder to understand and can mislead future maintainers into thinking obsolete flows still exist.

### Remove the obsolete transcript-memory extraction path as a unit

`extractTurnMemory` reflects the older automatic semantic-memory model. Current memory behavior is explicit-only for durable semantic notes, with `agent_end` intentionally doing no transcript inference. Removing this function and private-only helper cascade keeps implementation aligned with the current contract.

Alternative considered: retain the parser for possible diagnostics. Rejected because no current caller uses it and diagnostics should not depend on code that contradicts explicit-only memory semantics.

### Keep validation focused on behavior preservation

Use existing behavior tests and targeted string searches rather than introducing a large new test suite for the absence of code. Tests should prove supported memory and graph behavior still works; literal searches can confirm obsolete symbol removal.

Alternative considered: add static-analysis tooling. Rejected for this small cleanup because the repository currently does not expose a project-wide TypeScript lint/typecheck setup for these extension files.

## Risks / Trade-offs

- Removing a helper that is referenced only dynamically or by future manual experimentation → Mitigation: search the repository before removal and keep changes limited to symbols with no current callers.
- Existing tests may not run directly under raw Node ESM due to TypeScript import resolution → Mitigation: use the established project/Pi validation path when available and supplement with literal searches.
- Cleanup may be mixed with behavior changes during implementation → Mitigation: keep this change scoped to deletion and behavior-preserving test adjustments only.
