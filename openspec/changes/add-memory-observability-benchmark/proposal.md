## Why

The current pi memory system injects relevant repo memory and shows a small per-turn status, but it does not persist enough telemetry to understand whether memory is actually effective. Users need auditable runtime statistics and a repeatable benchmark that measures memory hits, estimated avoided context, actual provider token usage, tool-call behavior, cost, latency, and quality impact.

## What Changes

- Add persistent memory observability that records per-turn memory injection events, selected memory IDs, estimated card tokens, estimated avoided tokens, actual provider usage, tool-call summaries, latency, and cost when available.
- Extend `/memory` UI/commands with statistics and benchmark status/report surfaces so users can inspect hit rate, top-hit memories, token overhead, estimated savings, actual token/cost deltas, and benchmark summaries.
- Add a memory benchmark runner that executes a suite of 10 read-only context-heavy requests in comparable passes, including a baseline with memory injection disabled and a memory-assisted pass.
- Store benchmark inputs and outputs under `.pi/memory/benchmarks/` with machine-readable JSON/JSONL and human-readable Markdown reports.
- Include quality checks for benchmark answers using deterministic assertions so memory savings do not hide answer regressions.
- Default benchmark runs to a cheap OpenAI model such as `openai/gpt-4o-mini`, while allowing model override.

## Capabilities

### New Capabilities
- `pi-memory-observability`: Runtime memory telemetry, memory statistics reporting, benchmark execution, benchmark reports, and quality/economic measurement for the pi memory system.

### Modified Capabilities
- `pi-memory-system`: Memory controls and injection behavior are extended with observable stats, benchmark commands, and a way to run comparison passes with memory injection disabled for measurement.

## Impact

- Affects `pi/extensions/memory-system/index.ts` by adding telemetry capture, benchmark orchestration, command handling, reporting, and memory-enable/disable controls for benchmark passes.
- Adds generated local data under `.pi/memory/`, especially stats and benchmark report files.
- Uses existing pi extension lifecycle events including memory injection, provider request/response, message completion, tool calls/results, and turn completion.
- May invoke child `pi -p` runs from the benchmark command with a configurable provider/model and restricted tool set.
- Does not change source files outside the memory extension and OpenSpec artifacts unless implementation identifies a necessary extension split.
