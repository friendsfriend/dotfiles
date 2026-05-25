## MODIFIED Requirements

### Requirement: Interactive memory dashboard command
The system SHALL provide an interactive `/memory dashboard` command for browsing memory effectiveness telemetry, memory entries, and recent turn telemetry.

#### Scenario: User opens the dashboard with telemetry available
- **WHEN** the user invokes `/memory dashboard` in an interactive pi session and telemetry data exists
- **THEN** the system presents an interactive TUI dashboard with overview, memory-entry, and recent-turn views

#### Scenario: User opens the dashboard before telemetry exists
- **WHEN** the user invokes `/memory dashboard` and no memory telemetry exists
- **THEN** the dashboard shows an empty-state message explaining that data will appear after observed turns

### Requirement: Dashboard overview view
The dashboard SHALL provide an overview view summarizing memory effectiveness at a glance.

#### Scenario: Overview is displayed
- **WHEN** the dashboard opens or the user selects the overview view
- **THEN** the system shows observed turn count, memory hit rate, injected memory tokens, estimated avoided tokens, estimated net savings, and actual provider token and cost totals when available

#### Scenario: Overview includes visual indicators
- **WHEN** overview metrics include percentages or deltas
- **THEN** the system represents key metrics with compact terminal-friendly visual indicators such as ASCII bars, signs, badges, or summary labels

### Requirement: Memory entry browser
The dashboard SHALL allow users to browse memory entries by observed usefulness.

#### Scenario: User selects memory entries view
- **WHEN** the user selects the memory entries view
- **THEN** the system lists memory entries with ID, type, source kind, stale state, hit count, last-used time when available, and estimated avoided tokens

#### Scenario: User opens a memory entry
- **WHEN** the user selects a memory entry
- **THEN** the system shows the entry text, metadata, source information when available, hit count, estimated avoided tokens, stale state, and recent turns that used the entry when available

### Requirement: Dashboard safe actions
The dashboard SHALL keep v1 actions safe and inspectable.

#### Scenario: User performs a safe dashboard action
- **WHEN** the user refreshes data or opens an item detail
- **THEN** the action does not modify memory entries or telemetry data except for optional UI state

#### Scenario: Destructive memory action is available
- **WHEN** the dashboard offers a destructive action such as forgetting a memory entry
- **THEN** the system requires explicit confirmation before changing stored memory

## REMOVED Requirements

### Requirement: Benchmark run browser
**Reason**: The dashboard no longer supports memory benchmark reports or benchmark run exploration because the benchmark feature is being removed.

**Migration**: Users should use the dashboard overview, memory-entry, and recent-turn views for runtime memory observability. Historical benchmark report files may remain on disk but are no longer displayed by the dashboard.
