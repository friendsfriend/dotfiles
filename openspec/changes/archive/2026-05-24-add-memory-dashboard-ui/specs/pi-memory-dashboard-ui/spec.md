## ADDED Requirements

### Requirement: Interactive memory dashboard command
The system SHALL provide an interactive `/memory dashboard` command for browsing memory effectiveness telemetry and benchmark results.

#### Scenario: User opens the dashboard with telemetry available
- **WHEN** the user invokes `/memory dashboard` in an interactive pi session and telemetry data exists
- **THEN** the system presents an interactive TUI dashboard with overview, benchmark, memory-entry, and recent-turn views

#### Scenario: User opens the dashboard before telemetry exists
- **WHEN** the user invokes `/memory dashboard` and no memory telemetry or benchmark data exists
- **THEN** the dashboard shows an empty-state message explaining that data will appear after observed turns or benchmark runs

### Requirement: Dashboard overview view
The dashboard SHALL provide an overview view summarizing memory effectiveness at a glance.

#### Scenario: Overview is displayed
- **WHEN** the dashboard opens or the user selects the overview view
- **THEN** the system shows observed turn count, memory hit rate, injected memory tokens, estimated avoided tokens, estimated net savings, actual provider token and cost totals when available, and latest benchmark summary when available

#### Scenario: Overview includes visual indicators
- **WHEN** overview metrics include percentages or deltas
- **THEN** the system represents key metrics with compact terminal-friendly visual indicators such as ASCII bars, signs, badges, or summary labels

### Requirement: Benchmark run browser
The dashboard SHALL allow users to browse benchmark runs and inspect benchmark details.

#### Scenario: User selects benchmark view
- **WHEN** the user selects the benchmark runs view
- **THEN** the system lists available benchmark runs with timestamp, model, input-token delta, cost delta when available, tool-call delta, and quality assertion summary

#### Scenario: User opens a benchmark run
- **WHEN** the user selects a benchmark run
- **THEN** the system shows baseline versus memory-assisted metrics for tokens, cost, latency, tool calls, memory hits, injected tokens, estimated avoided tokens, and quality assertions

#### Scenario: User opens a benchmark report
- **WHEN** the selected benchmark run has a Markdown report
- **THEN** the dashboard provides a way to open or display that report from the benchmark detail view

### Requirement: Memory entry browser
The dashboard SHALL allow users to browse memory entries by observed usefulness.

#### Scenario: User selects memory entries view
- **WHEN** the user selects the memory entries view
- **THEN** the system lists memory entries with ID, type, source kind, stale state, hit count, last-used time when available, and estimated avoided tokens

#### Scenario: User opens a memory entry
- **WHEN** the user selects a memory entry
- **THEN** the system shows the entry text, metadata, source information when available, hit count, estimated avoided tokens, stale state, and recent turns or benchmark requests that used the entry when available

### Requirement: Recent turn browser
The dashboard SHALL allow users to inspect recent memory-observed turns.

#### Scenario: User selects recent turns view
- **WHEN** the user selects the recent turns view
- **THEN** the system lists recent turns with timestamp, memory hit count, estimated memory-card tokens, provider input/output tokens when available, tool count, duration, and cost when available

#### Scenario: User opens a recent turn
- **WHEN** the user selects a recent turn
- **THEN** the system shows prompt summary, selected memory IDs, provider/model usage when available, tool-call summaries, latency, cost when available, and estimated savings data

### Requirement: Dashboard keyboard navigation
The dashboard SHALL support keyboard navigation for browsing and closing the UI.

#### Scenario: User navigates the dashboard
- **WHEN** the dashboard is focused
- **THEN** arrow keys or equivalent navigation keys move between items or views, enter opens the selected item, escape returns to the previous view or closes the dashboard, and a refresh key reloads data from disk

#### Scenario: Dashboard closes
- **WHEN** the user cancels or exits the dashboard
- **THEN** the system closes the dashboard and returns to the normal pi prompt without dispatching an agent request

### Requirement: Dashboard responsive rendering
The dashboard SHALL render safely across terminal widths.

#### Scenario: Terminal width is narrow
- **WHEN** the dashboard renders in a narrow terminal
- **THEN** the system truncates or wraps long labels and omits nonessential columns rather than emitting lines wider than the terminal width

#### Scenario: Theme changes or dashboard data refreshes
- **WHEN** the dashboard theme changes or the user refreshes data
- **THEN** the dashboard invalidates cached rendering and redraws with current theme and data

### Requirement: Dashboard safe actions
The dashboard SHALL keep v1 actions safe and inspectable.

#### Scenario: User performs a safe dashboard action
- **WHEN** the user refreshes data, opens a benchmark report, or opens an item detail
- **THEN** the action does not modify memory entries or telemetry data except for optional UI state

#### Scenario: Destructive memory action is available
- **WHEN** the dashboard offers a destructive action such as forgetting a memory entry
- **THEN** the system requires explicit confirmation before changing stored memory
