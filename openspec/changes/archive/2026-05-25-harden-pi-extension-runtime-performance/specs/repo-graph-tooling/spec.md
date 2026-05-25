## ADDED Requirements

### Requirement: Per-call graph scan caching
The repo graph tool SHALL support reusing file stat, content, and hash data within a single graph construction call to avoid repeated filesystem reads while preserving fresh per-call query semantics.

#### Scenario: One graph query scans a file in multiple phases
- **WHEN** a single repo graph query needs the same file data for Markdown scanning, source/config scanning, or file-summary freshness checks
- **THEN** the graph implementation MAY reuse data captured during that same graph construction
- **AND** the reused data SHALL NOT be persisted as durable semantic memory or reused for a later graph query without revalidation

#### Scenario: File changes between graph queries
- **WHEN** a file changes after one repo graph query completes and before the next repo graph query starts
- **THEN** the next graph query SHALL reflect the changed filesystem state
- **AND** any per-call cache from the previous query SHALL NOT cause stale graph nodes, summaries, or rankings to be returned
