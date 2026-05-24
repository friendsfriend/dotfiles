## Context

The existing memory system source is implemented as a pi extension at `pi/extensions/memory-system/index.ts`. It stores repo-scoped memory under `.pi/memory/`, injects bounded memory cards from `before_agent_start`, exposes `/memory show|status|pin|forget|refresh`, records selected entry IDs and estimated card tokens only in memory for the current process, summarizes large tool results, extracts inferred session memories at `agent_end`, and participates in OpenSpec-aware compaction.

Pi extension hooks provide the observability points needed for deeper measurement: `before_agent_start` for memory selection, `turn_start`/`turn_end` for latency and turn grouping, `message_end` for assistant usage and cost, `tool_call`/`tool_result` for tool activity, and `before_provider_request`/`after_provider_response` for provider payload and response metadata. Pi session messages also include provider/model usage with input, output, cache read/write, total tokens, and cost when the provider reports them.

## Goals / Non-Goals

**Goals:**
- Persist per-turn memory telemetry that makes memory hits, memory-card overhead, estimated avoided context, provider token usage, cost, tool-call activity, latency, and quality signals auditable.
- Provide `/memory stats` and benchmark report UI surfaces that explain runtime effectiveness in human-readable form.
- Provide `/memory benchmark` for repeatable 10-request benchmark runs that compare baseline and memory-assisted behavior using a cheap configurable model.
- Separate actual provider usage/cost from heuristic estimates so reports do not overstate savings.
- Store benchmark artifacts locally under `.pi/memory/benchmarks/` in both machine-readable and human-readable forms.

**Non-Goals:**
- Proving exact causal savings for every memory hit; avoided context remains an estimate unless measured by baseline comparison.
- Replacing the requirement to read current files before implementation edits or exact claims.
- Building vector search, cloud telemetry, or remote benchmark storage.
- Adding a general-purpose benchmarking framework outside the memory extension.

## Decisions

### Persist memory telemetry as append-only local JSONL

Add generated telemetry files under `.pi/memory/`, such as `stats.jsonl` for runtime events and `.pi/memory/benchmarks/<run-id>/` for benchmark runs. Append-only JSONL keeps records inspectable, easy to aggregate, and resilient to partial failures.

Alternative considered: only showing in-memory counters via `/memory status`. Rejected because it loses history across reloads and cannot support benchmark reports.

### Distinguish actual usage from estimated savings

Reports will show provider-reported input/output/cache/cost separately from heuristic estimates such as `estimatedGrossSavedTokens` and `estimatedNetSavedTokens`. Actual benchmark deltas are computed from comparable baseline and memory-assisted runs; per-memory avoided tokens remain labeled as estimates.

Alternative considered: a single “tokens saved” number. Rejected because it would mix measured cost with inferred avoided context and be misleading.

### Record telemetry from extension lifecycle hooks

The memory extension will maintain per-turn state keyed by turn/request timing and write events from:
- `before_agent_start`: selected memory IDs, card text size, estimated card tokens, estimated avoided tokens, memory enabled/disabled state.
- `turn_start`/`turn_end`: turn index, timing, aggregate tool results.
- `message_end`: assistant provider/model usage and cost.
- `tool_call`/`tool_result`: tool counts, arguments summaries, result sizes, errors, read paths, and safe command summaries.
- `before_provider_request`/`after_provider_response`: payload size estimate, status, and response headers when available.

Alternative considered: parsing session files after the fact only. Rejected because injection details and benchmark mode metadata are easiest to capture at event time.

### Add explicit memory measurement modes

Add internal controls so benchmark passes can run with memory injection disabled without removing stored memory. Disabled measurement mode should skip memory card injection but still allow telemetry recording. This supports a cleaner `memory-off-vs-on` benchmark than simply running the same prompts twice with memory enabled.

Alternative considered: cold/warm only. Rejected as the default because it mixes memory effectiveness with benchmark-induced warming and session learning. Cold/warm can remain an optional mode later if useful.

### Benchmark through child pi runs with constrained tools

The `/memory benchmark` command will orchestrate child `pi -p` runs using a default cheap model such as `openai/gpt-4o-mini`, configurable via command arguments. Benchmark prompts should be read-only and run with a restricted tool set. The runner writes config, request definitions, per-request JSONL, and final reports.

Alternative considered: running all benchmark prompts inside the current interactive session. Rejected because current-session history, model state, and user interaction make comparisons noisy.

### Use deterministic quality assertions first

Each benchmark request will include expected substrings or facts. Reports will count assertion pass/fail per pass and flag regressions. This prevents a memory-assisted run from being considered better solely because it uses fewer tokens while producing a worse answer.

Alternative considered: an LLM judge. Deferred because it adds cost, nondeterminism, and another model dependency; it can be added later as an optional benchmark mode.

### Make benchmark output useful in the TUI and on disk

`/memory stats` should show aggregate runtime metrics in an editor or notification depending on output size. `/memory benchmark` should show progress through passes and requests, then open or print a Markdown report with summary tables for tokens, cost, tools, latency, memory hits, and quality.

Alternative considered: JSON-only output. Rejected because the user specifically wants UI information and a feel for memory effectiveness.

## Risks / Trade-offs

- Benchmark child runs can cost money → Use a cheap default model, show estimated run count before execution when interactive, and allow model override.
- Benchmarks can mutate memory and bias results → Use explicit memory-off and memory-on modes, tag benchmark telemetry, and avoid turning benchmark answers into durable session memory when feasible.
- Tool access can be unsafe in automated runs → Default to read-only tools where possible and keep benchmark prompts read-only; if shell access is needed, restrict commands or document the risk.
- Provider usage metadata may be incomplete → Record null/unknown values and fall back to token estimates only where clearly labeled.
- Telemetry files can grow → Keep append-only files inspectable but add aggregation limits, retention guidance, or future pruning if needed.
- Quality assertions can be brittle → Keep assertions factual and report them as guardrails, not exhaustive correctness proof.

## Migration Plan

1. Extend memory storage helpers to create stats and benchmark directories without changing existing memory entry formats.
2. Add telemetry capture behind the existing memory extension lifecycle hooks.
3. Add `/memory stats` and enhanced `/memory status` output.
4. Add memory injection enable/disable controls for benchmark child runs.
5. Add benchmark suite, runner, progress UI, and report generation.
6. Validate with a small benchmark run using a cheap model and inspect generated reports.

Rollback is disabling/removing the added command paths and deleting generated `.pi/memory/stats.jsonl` or `.pi/memory/benchmarks/` data. Existing memory entries remain compatible.

## Open Questions

- Should the benchmark runner require confirmation before making provider calls in interactive mode?
- Should benchmark child runs include `bash` with an allowlist, or should the default suite avoid shell access entirely?
- Should telemetry retention be unlimited initially, or should `/memory stats` include pruning/export controls in a later change?
