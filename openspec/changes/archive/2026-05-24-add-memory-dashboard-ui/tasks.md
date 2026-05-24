## 1. Dashboard Data Loading

- [x] 1.1 Define dashboard view models for overview metrics, benchmark run summaries, memory entry summaries, and recent turn summaries.
- [x] 1.2 Implement tolerant readers for `.pi/memory/stats.jsonl`, `.pi/memory/entries.json`, and `.pi/memory/benchmarks/**` report files.
- [x] 1.3 Implement aggregation helpers for hit rate, token totals, cost totals, estimated savings, benchmark deltas, top memory entries, and recent turns.
- [x] 1.4 Handle missing telemetry, missing benchmark reports, unknown provider usage, and malformed files with safe empty states or warnings.

## 2. Command Integration

- [x] 2.1 Extend `/memory` argument completions to include `dashboard`.
- [x] 2.2 Add `/memory dashboard` command handling for interactive sessions.
- [x] 2.3 Add non-interactive fallback output that explains the dashboard requires UI and points to `/memory stats` or benchmark reports.
- [x] 2.4 Ensure opening and closing the dashboard does not dispatch an agent request.

## 3. Dashboard Component Shell

- [x] 3.1 Build the dashboard TUI shell with tabs or view selection for Overview, Benchmarks, Memories, and Turns.
- [x] 3.2 Implement keyboard navigation for moving between views, moving between items, opening details, backing out, refreshing, and closing.
- [x] 3.3 Implement shared rendering helpers for truncation, wrapping, ASCII bars, signed deltas, badges, and summary rows.
- [x] 3.4 Ensure every rendered line respects the terminal width passed to `render(width)`.
- [x] 3.5 Invalidate and redraw the dashboard correctly on theme changes and manual refresh.

## 4. Dashboard Views

- [x] 4.1 Implement Overview view showing observed turns, hit rate, injected tokens, estimated avoided tokens, estimated net savings, provider token/cost totals, and latest benchmark summary.
- [x] 4.2 Implement Benchmark Runs view listing benchmark runs with timestamp, model, token delta, cost delta, tool-call delta, and quality summary.
- [x] 4.3 Implement Benchmark Detail view showing baseline versus memory-assisted metrics and offering to open or display the Markdown report when available.
- [x] 4.4 Implement Memory Entries view listing entries by observed usefulness with ID, type, source kind, stale state, hit count, last-used time, and estimated avoided tokens.
- [x] 4.5 Implement Memory Entry Detail view showing text, metadata, source information, hit count, estimated avoided tokens, stale state, and recent usage when available.
- [x] 4.6 Implement Recent Turns view listing turn timestamp, hit count, card tokens, provider tokens, tool count, duration, and cost when available.
- [x] 4.7 Implement Recent Turn Detail view showing prompt summary, selected memory IDs, provider/model usage, tool summaries, latency, cost, and estimated savings.

## 5. Safe Actions and Report Access

- [x] 5.1 Implement refresh action that reloads dashboard data from disk without closing the dashboard.
- [x] 5.2 Implement benchmark report display or open action for selected benchmark runs with Markdown reports.
- [x] 5.3 Keep v1 dashboard actions read-only unless a destructive action is explicitly confirmed.
- [x] 5.4 If forget or pin actions are included, add explicit confirmation before modifying memory entries.

## 6. Validation

- [x] 6.1 Run TypeScript syntax/type validation appropriate for project-local pi extensions.
- [x] 6.2 Verify `/memory dashboard` opens with telemetry present and shows all four views.
- [x] 6.3 Verify `/memory dashboard` shows a useful empty state when telemetry and benchmark files are absent.
- [x] 6.4 Verify keyboard navigation, detail opening, back/close behavior, and refresh behavior.
- [x] 6.5 Verify dashboard rendering on narrow and wide terminal widths without overflowing lines.
- [x] 6.6 Verify non-interactive dashboard invocation returns a concise fallback message.
