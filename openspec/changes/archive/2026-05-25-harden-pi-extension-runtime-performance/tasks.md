## 1. Memory Lifecycle and Retention

- [x] 1.1 Add a safe close/release path to the SQLite memory store implementation and ensure it tolerates repeated cleanup.
- [x] 1.2 Register `session_shutdown` cleanup for memory stores and clear runtime store cache entries after closing.
- [x] 1.3 Add or update validation that memory remains queryable after a cleanup/reload-style lifecycle path.
- [x] 1.4 Guard OpenSpec index refresh so startup outside an initialized OpenSpec project does not run unnecessary OpenSpec CLI commands.
- [x] 1.5 Review repository-orientation refresh and defer or guard avoidable startup command work while preserving staleness/inspection behavior.
- [x] 1.6 Replace global newest-N pruning with a retention policy that protects pinned global and high-quality durable semantic entries when lower-value entries can be pruned.
- [x] 1.7 Add focused validation for protected-entry pruning behavior.

## 2. Repo Graph Per-Call Efficiency

- [x] 2.1 Introduce a per-graph-build cache for file stat/content/hash data used by Markdown scanning, source/config scanning, and summary freshness checks.
- [x] 2.2 Refactor graph scan phases to reuse the per-call cache without persisting graph data across tool calls.
- [x] 2.3 Preserve fresh per-call behavior by ensuring the cache is created for each `repo_graph` invocation and discarded before returning.
- [x] 2.4 Extend or add repo graph validation showing file changes between graph calls are reflected in later query results.

## 3. OpenSpec Launcher Input Short-Circuit

- [x] 3.1 Update launcher input handling to test for `/opsx-explore`, `/opsx-propose`, `/opsx-apply`, and `/opsx-archive` before searching for an OpenSpec root.
- [x] 3.2 Preserve existing stage updates for workflow prompts, including leading/trailing whitespace behavior where applicable.
- [x] 3.3 Add focused validation or a small helper-level test for unrelated input not triggering stage discovery or state changes.

## 4. Cleanup and Validation

- [x] 4.1 Prefer ESM-style imports over inline `require("node:fs")` in touched extension files when doing so is straightforward and behavior-preserving.
- [x] 4.2 Run memory policy validation for `pi/extensions/memory-system/memory-policy.test.ts` using the repository-supported TypeScript test runner if available.
- [x] 4.3 Run repo graph validation for `pi/extensions/repo-graph/repo-graph-openspec-boundary.test.ts` and `pi/extensions/repo-graph/repo-graph-summary.test.ts` using the repository-supported TypeScript test runner if available.
- [x] 4.4 Validate OpenSpec launcher behavior manually or through focused tests if no existing launcher test harness exists.
- [x] 4.5 Document any validation commands that cannot run because the local TypeScript/ESM test runner is unavailable.

## Validation Notes

- Passed via pi-bundled JITI runner: `pi/extensions/memory-system/memory-policy.test.ts`, `pi/extensions/repo-graph/repo-graph-openspec-boundary.test.ts`, `pi/extensions/repo-graph/repo-graph-summary.test.ts`.
- Passed focused launcher helper validation via pi-bundled JITI runner with temporary stubs for UI-only pi imports: `pi/extensions/openspec-launcher/openspec-launcher.test.ts`.
- `bun pi/extensions/memory-system/memory-policy.test.ts && bun pi/extensions/repo-graph/repo-graph-openspec-boundary.test.ts && bun pi/extensions/repo-graph/repo-graph-summary.test.ts && bun pi/extensions/openspec-launcher/openspec-launcher.test.ts` could not run because Bun does not provide `node:sqlite`.
- `node --experimental-strip-types pi/extensions/memory-system/memory-policy.test.ts` could not run directly because the test imports extensionless local TypeScript modules.
