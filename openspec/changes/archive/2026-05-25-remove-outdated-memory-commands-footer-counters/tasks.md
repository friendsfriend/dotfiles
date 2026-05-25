## 1. Remove Memory Command Surface

- [x] 1.1 Remove `pi.registerCommand("memory", ...)` and all `/memory` subcommand handling from `pi/extensions/memory-system/index.ts`.
- [x] 1.2 Remove command-only argument parsing helpers for `/memory query`, `/memory save`, scoped inspection, pinning, forgetting, generated cleanup, export, stats, health, and dashboard flows when no longer referenced.
- [x] 1.3 Remove command-only renderers and dashboard/stat/health UI code that becomes unreachable after deleting the command surface.
- [x] 1.4 Search for `/memory`, `memory dashboard`, `memory stats`, command completions, and removed helper references; delete or update stale references without removing the `memory_query` and `memory_save` tools.

## 2. Add Footer Activity Counters

- [x] 2.1 Add session-local in-memory counters for explicit memory query count, total query results, and explicit durable semantic save count.
- [x] 2.2 Add a centralized helper that renders the memory footer status through `ctx.ui.setStatus("memory", "mem qN/rN/wN")`.
- [x] 2.3 Initialize or reset the counters and footer status on session start/reload.
- [x] 2.4 Replace existing lifecycle-oriented memory status strings such as ready, boot-context, disabled, and query-only with the centralized counter status so later lifecycle events do not overwrite counter visibility.

## 3. Wire Counters to Explicit Tools

- [x] 3.1 Update successful `memory_query` tool execution to increment the query counter by one.
- [x] 3.2 Update successful `memory_query` tool execution to add `entries.length + fileSummaries.length` to the total result counter.
- [x] 3.3 Update successful `memory_save` tool execution to increment the explicit write counter after the durable semantic entry is saved.
- [x] 3.4 Ensure internal storage mutations, telemetry appends, file-summary cache writes, import/migration work, startup indexing, stale marking, and export generation do not increment the explicit write counter.

## 4. Preserve Supported Memory Behavior

- [x] 4.1 Verify `memory_query` still supports text, type/classification, scope, related file, change, recency, file-summary, and limit filters.
- [x] 4.2 Verify `memory_save` still records agent-saved durable entries with scope, classification/type, related files, change metadata, source metadata, quality, and lifecycle fields.
- [x] 4.3 Verify session-start boot context still explains explicit memory query/save behavior and preserves orientation-not-authority guardrails.
- [x] 4.4 Verify SQLite storage, scoped repository behavior, telemetry recording, compaction behavior, and read-derived file-summary cache behavior remain intact where still referenced.

## 5. Validation

- [x] 5.1 Run TypeScript or project test validation for the memory extension and fix any compile errors from removed command-only code.
- [x] 5.2 Run existing memory policy tests, including `pi/extensions/memory-system/memory-policy.test.ts`, if the repository validation setup supports them.
- [x] 5.3 Run exact searches to confirm removed command strings and dashboard/stat command references are gone from active implementation code.
- [x] 5.4 Manually smoke-test an interactive or extension-load scenario where the footer starts at `mem q0/r0/w0`, a memory query updates query/result counts, and a memory save updates write count.
- [x] 5.5 Run `openspec validate remove-outdated-memory-commands-footer-counters --strict` and resolve any proposal/spec/task issues.
