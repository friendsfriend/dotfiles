## REMOVED Requirements

### Requirement: Benchmark suite
**Reason**: The memory benchmark feature is being removed to keep memory observability focused on normal runtime telemetry and statistics instead of active child-run evaluation.

**Migration**: Users should use `/memory stats` and `/memory dashboard` to inspect observed runtime memory behavior. Existing `.pi/memory/benchmarks/` artifacts may remain on disk but are no longer generated or surfaced as supported output.

### Requirement: Baseline versus memory-assisted benchmark
**Reason**: Baseline-versus-memory-assisted benchmark execution depends on the removed benchmark runner and memory measurement pass controls.

**Migration**: Users should compare normal runtime telemetry over time through `/memory stats` rather than invoking benchmark comparison passes.

### Requirement: Benchmark model selection
**Reason**: Benchmark-specific model selection only applies to the removed child-run benchmark runner.

**Migration**: No replacement benchmark model option is provided. Normal Pi model selection remains outside the memory observability feature.

### Requirement: Benchmark report storage
**Reason**: Benchmark report generation and `.pi/memory/benchmarks/` storage are removed as first-class memory observability behavior.

**Migration**: Existing benchmark report directories may remain for manual inspection, but Pi no longer creates, reads, or opens benchmark reports as supported memory output.

### Requirement: Benchmark progress and UI feedback
**Reason**: Benchmark progress notifications only apply while running the removed benchmark feature.

**Migration**: Runtime memory observability continues to expose stats, status, and dashboard feedback for normal observed turns.
