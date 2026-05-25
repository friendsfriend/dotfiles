## Why

The memory benchmark feature adds child-run orchestration, benchmark-specific telemetry, report storage, and dashboard complexity that is no longer desired. Removing it narrows the memory system to runtime observability and user inspection while avoiding confusing or costly benchmark execution paths.

## What Changes

- **BREAKING** Remove the `/memory benchmark` command, its completions, confirmation flow, child `pi` execution, default request suite, and benchmark report generation.
- Remove benchmark-specific local artifacts and readers from supported behavior, including `.pi/memory/benchmarks/` report storage as a first-class feature.
- Keep `/memory stats`, memory telemetry persistence, estimated savings, provider usage, tool telemetry, `/memory status`, and `/memory dashboard` for observing normal runtime memory behavior.
- Simplify dashboard behavior so it focuses on overview metrics, memory entries, and recent turns instead of benchmark run browsing or report opening.
- Remove benchmark-specific memory injection measurement controls and benchmark artifact isolation requirements while preserving the broader rule that telemetry is not durable semantic memory.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-memory-observability`: Remove benchmark suite, baseline comparison, model selection, benchmark report storage, and benchmark progress requirements while retaining normal telemetry and stats requirements.
- `pi-memory-system`: Remove benchmark command/control requirements from the memory command surface and status messaging while retaining memory controls, runtime telemetry separation, and dashboard entry points.
- `pi-memory-dashboard-ui`: Remove benchmark run views, benchmark detail navigation, and benchmark report actions from the dashboard contract.

## Impact

- Affects `pi/extensions/memory-system/index.ts` by deleting benchmark request/report types, path helpers, child-run orchestration, `/memory benchmark` command handling, completions, status references, and dashboard benchmark readers/views.
- Updates OpenSpec requirements under `openspec/specs/pi-memory-observability`, `openspec/specs/pi-memory-system`, and `openspec/specs/pi-memory-dashboard-ui`.
- Existing generated benchmark directories under `.pi/memory/benchmarks/` may remain on disk but will no longer be produced, surfaced, or treated as supported command output.
- No external dependencies are added.
