## Context

The memory extension currently combines two related but different concerns: normal runtime observability (`/memory stats`, per-turn telemetry, status summaries, and dashboard inspection) and an active benchmark runner (`/memory benchmark`) that launches child pi processes, disables/enables memory injection across passes, records benchmark artifacts, and surfaces benchmark results in the dashboard.

The requested change removes the benchmark feature while retaining normal observability. The implementation lives primarily in `pi/extensions/memory-system/index.ts`, where benchmark request/report types, `.pi/memory/benchmarks/` helpers, default benchmark prompts, child-process orchestration, dashboard benchmark readers, dashboard benchmark views, command completions, command dispatch, and status text are currently colocated with the rest of the memory system.

## Goals / Non-Goals

**Goals:**

- Remove the supported `/memory benchmark` command and all benchmark execution paths.
- Remove benchmark-specific request/report data models, report rendering, local benchmark path helpers, and child pi execution logic.
- Remove dashboard benchmark browsing and report-opening behavior while preserving overview, memory-entry, and recent-turn inspection.
- Preserve normal memory telemetry, `/memory stats`, `/memory status`, `/memory dashboard`, memory health/export/query/save/pin/forget/refresh behavior, and the rule that telemetry is not durable semantic memory.
- Update OpenSpec requirements so implementation and documentation no longer promise benchmark support.

**Non-Goals:**

- Deleting users' existing `.pi/memory/benchmarks/` directories or migrating old benchmark reports.
- Removing runtime memory telemetry or memory statistics.
- Replacing the benchmark with a different evaluation framework.
- Redesigning the memory dashboard beyond removing benchmark-specific views and actions.

## Decisions

### Delete benchmark execution instead of hiding the command

Remove `/memory benchmark` from completions and command dispatch, and delete the functions that build benchmark suites, spawn child `pi` runs, summarize benchmark passes, and render reports.

Alternative considered: leave the code in place behind an undocumented command. Rejected because the feature is explicitly being removed, and hidden execution code would keep maintenance, cost, and safety concerns alive.

### Leave historical benchmark files untouched but unsupported

Do not add cleanup logic for `.pi/memory/benchmarks/`. Existing artifacts may remain on disk, but the memory extension should stop creating, reading, summarizing, or linking to them as a supported feature.

Alternative considered: delete old benchmark directories automatically. Rejected because these files are user-local artifacts and automatic deletion would be surprising and potentially destructive.

### Keep runtime observability data structures separate from benchmark-only structures

Retain telemetry fields and stats needed for normal observed turns, but remove benchmark-only request/report types and dashboard benchmark summaries. If telemetry records still contain historical benchmark tag fields, readers should tolerate them without exposing benchmark UX.

Alternative considered: remove every benchmark-named telemetry field immediately. Rejected unless proven safe during implementation, because historical stats may contain benchmark-tagged records and tolerant parsing is preferable to breaking stats reads.

### Simplify dashboard navigation to non-benchmark views

Update the dashboard view model and renderer so available views are overview, memories, and turns. Overview should summarize observed runtime telemetry without a latest benchmark panel, and safe actions should no longer include benchmark report opening.

Alternative considered: keep benchmark report browsing as a read-only historical viewer. Rejected because the proposal removes benchmark artifacts as a first-class supported behavior.

## Risks / Trade-offs

- **Risk: stale benchmark references remain in status text, completions, or dashboard empty states** → Mitigation: search for `benchmark`, `MemoryBenchmark`, benchmark path helpers, and `/memory benchmark` references during implementation and remove or reword each supported surface.
- **Risk: removing shared helpers accidentally breaks `/memory stats` or dashboard turn aggregation** → Mitigation: separate benchmark-only helpers from telemetry readers before deletion and verify stats/dashboard behavior after edits.
- **Risk: existing benchmark-tagged telemetry causes parsing errors** → Mitigation: keep telemetry parsers tolerant of unknown or historical benchmark fields even though benchmark UI is removed.
- **Risk: users with old benchmark reports lose discoverability** → Mitigation: document that old files may remain on disk but are no longer produced or surfaced by Pi.

## Migration Plan

1. Update OpenSpec delta specs to remove benchmark requirements and adjust dashboard/system requirements.
2. Remove benchmark command completions and command dispatch.
3. Delete benchmark-only types, default request definitions, child-run orchestration, report rendering, and benchmark path helpers.
4. Remove dashboard benchmark data loading, benchmark view models, benchmark tab/detail rendering, and report-opening actions.
5. Reword status, empty-state, and non-interactive messages to point to `/memory stats` and dashboard runtime views rather than benchmark reports.
6. Run type checks or targeted tests available in this dotfiles/pi extension setup.

Rollback is restoring the removed benchmark code and OpenSpec requirements from version control. Existing benchmark artifacts do not need migration for rollback.

## Open Questions

- Should historical benchmark tag fields in telemetry event types be removed now or kept as tolerated legacy metadata until a later cleanup?
