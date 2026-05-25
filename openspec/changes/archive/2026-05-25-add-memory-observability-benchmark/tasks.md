## 1. Telemetry Data Model and Storage

- [x] 1.1 Define TypeScript interfaces for memory injection telemetry, provider usage telemetry, tool telemetry, turn summaries, benchmark requests, benchmark pass results, and benchmark reports.
- [x] 1.2 Add constants and path helpers for `.pi/memory/stats.jsonl` and `.pi/memory/benchmarks/<run-id>/`.
- [x] 1.3 Implement append-only JSONL write helpers and safe JSON/Markdown report write helpers.
- [x] 1.4 Implement prompt and tool argument summary helpers that avoid storing excessive or unsafe data.
- [x] 1.5 Implement documented heuristic functions for estimated gross avoided tokens and estimated net saved tokens.

## 2. Runtime Observability Capture

- [x] 2.1 Extend `before_agent_start` handling to record selected memory IDs, hit count, card characters, estimated card tokens, estimated avoided tokens, and memory enabled state.
- [x] 2.2 Add memory injection disable/enable state for measurement without deleting or forgetting memory entries.
- [x] 2.3 Add `turn_start` and `turn_end` handlers to record turn timing and aggregate turn-level telemetry.
- [x] 2.4 Add `message_end` handling for assistant provider/model usage, input/output/cache tokens, and cost when available.
- [x] 2.5 Add `tool_call` and `tool_result` handling for tool counts, result sizes, errors, read paths, command summaries, and per-tool timing when available.
- [x] 2.6 Add `before_provider_request` and `after_provider_response` handling for provider payload size estimates, status codes, and response metadata when available.
- [x] 2.7 Ensure benchmark-tagged telemetry is separated from normal inferred session memory extraction where practical.

## 3. Memory Stats UI and Commands

- [x] 3.1 Extend `/memory` command completions to include `stats` and `benchmark` subcommands.
- [x] 3.2 Implement telemetry aggregation for observed turns, hit rate, injected tokens, estimated avoided tokens, estimated net savings, actual token usage, actual cost, latency, and top-hit memory entries.
- [x] 3.3 Implement `/memory stats` output with clear labels separating actual provider usage from estimated savings.
- [x] 3.4 Enhance `/memory status` to include recent observability availability and pointers to `/memory stats` or latest benchmark report.
- [x] 3.5 Present long stats output in the editor UI and short status output as a notification or console text.

## 4. Benchmark Suite and Runner

- [x] 4.1 Define the default suite of ten read-only context-heavy benchmark requests with deterministic assertions or expected facts.
- [x] 4.2 Implement benchmark argument parsing for model override, run mode, and optional confirmation behavior.
- [x] 4.3 Default benchmark model selection to `openai/gpt-4o-mini` or a configured cheap benchmark default.
- [x] 4.4 Implement unique benchmark run directory creation with `config.json` and `requests.json`.
- [x] 4.5 Implement baseline pass execution with memory injection disabled for child `pi -p` runs.
- [x] 4.6 Implement memory-assisted pass execution with memory injection enabled for child `pi -p` runs.
- [x] 4.7 Run benchmark child processes with restricted tools and read-only prompts.
- [x] 4.8 Capture per-request stdout/stderr, duration, exit status, assertion results, telemetry files, provider usage, memory hits, and tool summaries.
- [x] 4.9 Update UI status or notifications as each benchmark pass and request starts or completes.

## 5. Benchmark Reporting

- [x] 5.1 Implement aggregation of baseline versus memory-assisted deltas for input tokens, output tokens, cache tokens, total tokens, cost, latency, tool calls, memory hits, injected tokens, estimated avoided tokens, and quality assertions.
- [x] 5.2 Write per-request machine-readable benchmark results as JSONL or JSON under the benchmark run directory.
- [x] 5.3 Generate a human-readable Markdown benchmark report with summary tables and top memory entries.
- [x] 5.4 Open or display the benchmark report in the UI when the run completes interactively.
- [x] 5.5 Ensure reports label missing provider usage as unknown and never fabricate actual token or cost values.

## 6. Validation

- [x] 6.1 Run TypeScript syntax/type validation appropriate for project-local pi extensions.
- [x] 6.2 Validate `/memory stats` after at least one observed turn and inspect `.pi/memory/stats.jsonl`.
- [x] 6.3 Run a minimal benchmark or dry-run benchmark path to verify directory creation, pass orchestration, telemetry capture, and report generation.
- [x] 6.4 Verify baseline benchmark pass does not inject memory while memory-assisted pass does.
- [x] 6.5 Verify benchmark prompts and answers are not promoted into normal durable inferred session memory as preferences or design decisions.
- [x] 6.6 Review generated reports for clear separation between actual provider usage/cost and estimated memory savings.
