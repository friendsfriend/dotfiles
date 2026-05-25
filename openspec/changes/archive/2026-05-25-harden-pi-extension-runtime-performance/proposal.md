## Why

Several Pi extensions do useful work at startup and on graph queries, but some of that work is heavier than necessary or lacks explicit lifecycle cleanup. Hardening these runtime paths should reduce reload/session-switch risk, avoid avoidable filesystem and CLI work, and keep extension behavior responsive as the dotfiles Pi workflow grows.

## What Changes

- Add lifecycle cleanup for SQLite-backed memory resources so reloads, forks, and session switches do not retain stale database handles.
- Reduce avoidable memory startup/reload work by guarding or lazily performing OpenSpec and repository-orientation refreshes when they are relevant.
- Make repo graph construction avoid repeated file reads where practical while preserving fresh per-call graph semantics and hash-valid summary behavior.
- Avoid OpenSpec launcher filesystem discovery for user inputs that are not OpenSpec workflow prompts.
- Review memory pruning behavior so repository activity does not unexpectedly evict durable global or high-value entries.
- Preserve existing registered tools, command names, prompt guidance, and user-visible behavior except for improved performance and lifecycle reliability.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `pi-memory-system`: Clarify runtime resource lifecycle and durable memory retention behavior for SQLite-backed memory.
- `repo-graph-tooling`: Clarify that graph construction may use a per-call cache to avoid repeated reads while remaining fresh and non-durable.
- `openspec-pi-launcher`: Clarify that launcher stage tracking avoids unnecessary repository discovery for unrelated input.

## Impact

- Affected code: `pi/extensions/memory-system/index.ts`, `pi/extensions/repo-graph/index.ts`, and `pi/extensions/openspec-launcher/index.ts`.
- Affected validation: memory policy tests, repo graph summary/boundary tests, and launcher behavior should be checked where possible.
- No dependency changes are expected.
- Risk areas: memory database handle lifecycle, repository-scoped memory pruning semantics, and preserving current graph freshness guarantees.
