## 1. Remove Benchmark Command Surface

- [x] 1.1 Remove `benchmark` from `/memory` argument completions and help/description text.
- [x] 1.2 Remove `/memory benchmark` command dispatch, confirmation messaging, dry-run handling, and report-opening behavior.
- [x] 1.3 Reword `/memory status`, dashboard empty states, and non-interactive messages so they no longer point users to benchmark reports or `/memory benchmark`.

## 2. Delete Benchmark Execution and Report Code

- [x] 2.1 Remove benchmark-only TypeScript interfaces and helpers for requests, pass results, assertion results, reports, run directories, and benchmark path construction.
- [x] 2.2 Remove the default benchmark request suite, assertion checking, benchmark metric deltas, report rendering, and child `pi` execution functions.
- [x] 2.3 Remove benchmark environment/tag plumbing where it is only used by the deleted runner, while keeping telemetry readers tolerant of historical benchmark-tagged records if needed.
- [x] 2.4 Ensure no code creates or writes `.pi/memory/benchmarks/` artifacts after the removal.

## 3. Simplify Dashboard

- [x] 3.1 Remove benchmark run summary types, benchmark report readers, benchmark aggregation, and latest benchmark overview fields from dashboard data loading.
- [x] 3.2 Reduce dashboard views/navigation to overview, memories, and turns.
- [x] 3.3 Remove benchmark list/detail rendering and benchmark Markdown report open actions.
- [x] 3.4 Update dashboard overview, memory-entry detail, empty-state, and safe-action text to describe only runtime telemetry, memory entries, and recent turns.

## 4. Verify Specs and Behavior

- [x] 4.1 Search for remaining supported-surface references to `benchmark`, `MemoryBenchmark`, `.pi/memory/benchmarks`, and `/memory benchmark`; keep only tolerated legacy parsing or unrelated historical text where justified.
- [x] 4.2 Run available formatting/type-check commands for the pi memory extension or repository.
- [x] 4.3 Verify `/memory stats` behavior remains available and benchmark-free.
- [x] 4.4 Verify `/memory dashboard` still opens with overview, memory-entry, and recent-turn views and does not expose benchmark views or report actions.
- [x] 4.5 Run OpenSpec validation/status for `remove-memory-benchmark-feature` and fix any delta-spec issues.
