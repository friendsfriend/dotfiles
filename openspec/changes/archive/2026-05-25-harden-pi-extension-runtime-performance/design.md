## Context

The Pi extension codebase is intentionally lightweight and project-local, but several runtime paths deserve hardening:

- `memory-system` keeps SQLite-backed stores in a module-level cache and does not currently expose an obvious main-store close path on session shutdown.
- `memory-system` performs startup/reload refresh work for OpenSpec and repository orientation even though current memory access is primarily explicit-query based.
- `repo-graph` builds a fresh graph per call, but separate scan phases can read the same files repeatedly during one graph build.
- `openspec-launcher` checks for an OpenSpec root on every input event before determining whether the input is an OpenSpec workflow command.
- Memory pruning is global by newest entries, which can be surprising for durable global or high-value notes in a multi-repository memory store.

The hardening must preserve the existing extension surface: tools, command names, status IDs, storage locations, OpenSpec launcher behavior, graph freshness guarantees, and memory advisory semantics.

## Goals / Non-Goals

**Goals:**

- Close or otherwise release SQLite-backed memory resources when extension runtimes shut down.
- Avoid unnecessary startup, reload, input, and graph-query work without changing user-visible behavior.
- Preserve fresh per-call graph semantics while allowing a per-call file-content/stat/hash cache.
- Preserve durable memory semantics and avoid pruning high-value/global entries solely because unrelated repository activity is newer.
- Add validation around lifecycle, caching freshness, and unrelated-input behavior where practical.

**Non-Goals:**

- Do not introduce a long-lived persisted repository graph cache.
- Do not redesign the memory schema beyond retention/lifecycle adjustments needed by this hardening.
- Do not remove OpenSpec launcher startup behavior in initialized interactive projects.
- Do not change the `memory_query`, `memory_save`, or `repo_graph` public schemas.

## Decisions

### Add explicit memory-store lifecycle cleanup

Introduce a shutdown path that closes cached SQLite stores and clears cache entries for the extension runtime on `session_shutdown`. The implementation should tolerate repeated shutdowns and avoid throwing from cleanup.

Alternative considered: rely on process exit to close database handles. Rejected because pi supports reloads, forks, and session switches where the process can continue while extension runtimes are replaced.

### Prefer guarded or lazy startup refresh work

Keep the minimal boot context and footer status cheap. OpenSpec index refresh should run only when an OpenSpec project is present or when memory/query flows need it. Repository orientation refresh should be guarded so it does not perform avoidable command work on every reload if its output is not needed for current behavior.

Alternative considered: remove startup refreshes entirely. Rejected because existing staleness and inspection exports may still benefit from bounded refresh behavior; the safer direction is to guard and defer rather than delete.

### Use a per-call repo graph scan cache, not durable graph cache

During one `repo_graph` call, centralize file stat/content/hash reads so Markdown scanning, source/config scanning, and summary attachment can reuse current data. Discard the cache after the tool call. This preserves the requirement that each graph query reflects the current filesystem.

Alternative considered: persist graph results across calls. Rejected because the repo graph contract emphasizes fresh deterministic queries and non-durable graph data.

### Short-circuit launcher input tracking before filesystem discovery

Check whether input text matches `/opsx-explore`, `/opsx-propose`, `/opsx-apply`, or `/opsx-archive` before searching for an OpenSpec root. Only workflow prompts need stage tracking.

Alternative considered: cache the OpenSpec root for all input events. Rejected as a first step because simple regex short-circuiting removes work for unrelated input without adding cache invalidation concerns.

### Protect high-value memory during pruning

Adjust pruning so durable global/pinned/high-quality entries are not deleted solely due to unrelated newer entries. A per-scope or protected-entry pruning policy is preferable to one global newest-N deletion.

Alternative considered: increase the global entry cap. Rejected because it delays but does not solve cross-repository eviction semantics.

## Risks / Trade-offs

- Closing a shared SQLite handle while another async operation is still using it → Mitigation: scope cleanup to shutdown, make operations obtain stores through the existing accessor, and ensure cleanup occurs after active extension work is ending.
- Guarding startup refreshes could leave inspection exports less immediately fresh → Mitigation: keep explicit refresh/query paths able to refresh when needed and maintain staleness labeling.
- Repo graph per-call caching could accidentally reuse stale content across calls → Mitigation: keep the cache local to a single graph build and discard it before returning.
- Memory pruning changes could retain too many entries → Mitigation: preserve the cap for lower-value entries and add tests for protected-entry retention.
- Launcher short-circuiting could miss workflow commands with leading whitespace → Mitigation: match trimmed input consistently with existing stage update parsing.

## Migration Plan

1. Add tests or focused assertions for the behavior being hardened.
2. Implement lifecycle cleanup and guarded work in small, reviewable steps.
3. Run existing memory policy and repo graph tests plus targeted validation for launcher input handling.
4. Roll back by reverting the hardening commits; no data migration should be required.

## Open Questions

- Should repository-orientation refresh remain on startup for inspection exports, or should it move fully behind explicit memory diagnostics in a later change?
- What exact retention classes should be protected from pruning beyond pinned/global/high-quality durable entries?
