## Why

The memory observability benchmark change will produce telemetry and Markdown reports, but users also need an exploratory UI to build intuition about memory effectiveness. A dashboard turns raw stats into an interactive cockpit for browsing benchmark runs, top memory entries, recent turns, costs, savings estimates, and quality signals.

## What Changes

- Add an interactive `/memory dashboard` command for browsing memory telemetry and benchmark results.
- Provide dashboard views for overview, benchmark runs, memory entries, and recent turns.
- Support list/detail navigation so users can inspect why a memory was useful, which benchmark requests improved or regressed, and which turns used which memories.
- Show compact visual indicators such as ASCII bars, deltas, hit rates, token/cost summaries, and quality assertion summaries.
- Provide practical actions from the dashboard where safe, such as opening benchmark reports, refreshing dashboard data, and inspecting memory entries.
- Reuse telemetry and report artifacts produced by the memory observability benchmark system instead of creating a separate data store.

## Capabilities

### New Capabilities
- `pi-memory-dashboard-ui`: Interactive TUI dashboard for exploring memory effectiveness, benchmark runs, memory entries, and recent turn telemetry.

### Modified Capabilities
- `pi-memory-system`: The memory command surface is extended with an interactive dashboard entry point.

## Impact

- Affects `pi/extensions/memory-system/index.ts` or a related memory UI module by adding dashboard command handling and custom TUI components.
- Reads generated `.pi/memory/stats.jsonl` and `.pi/memory/benchmarks/**` data from the memory observability benchmark change.
- Uses pi TUI APIs such as `ctx.ui.custom()`, `SelectList`, `Markdown`, status/notification updates, and custom components where needed.
- Adds no external telemetry service and does not change the underlying memory storage format except for optional dashboard UI preferences if needed.
