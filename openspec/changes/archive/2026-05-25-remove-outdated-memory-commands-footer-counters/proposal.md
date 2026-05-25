## Why

The memory system has shifted to a tool-queried model, but the `/memory` slash command still exposes older inspection, dashboard, cleanup, and diagnostics flows that are no longer aligned with that direction. Removing the stale command surface and showing concise memory activity in the footer makes memory behavior easier to understand: agents query history explicitly, save durable notes explicitly, and users can see how often memory was used during the session.

## What Changes

- **BREAKING** Remove the `/memory` slash command and all of its subcommands, completions, and command-only UI/reporting surfaces.
- Keep `memory_query` as the explicit advisory lookup tool for prior decisions, investigations, blockers, assumptions, preferences, related files, and OpenSpec history.
- Keep `memory_save` as the explicit durable semantic write tool for concise decisions, completed investigations, blockers, assumptions, next steps, preferences, and workflow state.
- Replace lifecycle-oriented memory footer text with session-local activity counters showing:
  - number of explicit memory queries
  - total number of results returned by those queries
  - number of explicit durable semantic writes
- Treat footer writes as explicit semantic saves only, not telemetry appends, file-summary cache writes, imports, refresh/index updates, stale marking, exports, or other internal storage mutations.
- Remove or retire command-only dashboard/stat/health/export/cleanup code paths that are no longer reachable after the command surface is removed.
- Preserve existing SQLite-backed storage, scoped query behavior, explicit save behavior, startup boot context, telemetry persistence where still useful internally, and exact-read guardrails.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-memory-system`: Remove user-facing memory slash-command controls and require footer counters for explicit query/save activity while preserving tool-queried memory semantics.
- `pi-memory-observability`: Replace stats-command observability as a required user surface with a compact footer counter surface for session-local memory activity.
- `pi-memory-dashboard-ui`: Remove the interactive memory dashboard command requirement because the `/memory` command surface is being removed.

## Impact

- Affected implementation: `pi/extensions/memory-system/index.ts`, especially `pi.registerCommand("memory", ...)`, command argument parsing, command-only renderers, dashboard component/data loading, stats/health command output, and footer status updates via `ctx.ui.setStatus("memory", ...)`.
- Affected specs: `openspec/specs/pi-memory-system/spec.md`, `openspec/specs/pi-memory-observability/spec.md`, and `openspec/specs/pi-memory-dashboard-ui/spec.md`.
- No new runtime dependencies are expected.
- Existing memory data remains in SQLite and remains available to `memory_query`; this change removes stale command surfaces, not stored entries.
- Existing telemetry files may remain on disk but should no longer be required for removed command/dashboard/stat surfaces.
