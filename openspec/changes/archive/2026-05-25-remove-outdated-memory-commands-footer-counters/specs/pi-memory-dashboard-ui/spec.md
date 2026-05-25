## REMOVED Requirements

### Requirement: Interactive memory dashboard command
**Reason**: The `/memory dashboard` entry point is being removed with the rest of the `/memory` slash-command surface.
**Migration**: Use footer memory activity counters for lightweight current-session visibility. Agents use `memory_query` for targeted memory lookup.

### Requirement: Dashboard overview view
**Reason**: The interactive memory dashboard UI is being removed as a command-only surface.
**Migration**: No dashboard overview replacement is provided in this change; footer counters show query, result, and write activity for the current session.

### Requirement: Memory entry browser
**Reason**: The interactive memory dashboard UI is being removed as a command-only surface.
**Migration**: Agents can retrieve relevant stored memory through `memory_query` with scoped filters.

### Requirement: Recent turn browser
**Reason**: The interactive memory dashboard UI is being removed as a command-only surface.
**Migration**: Existing telemetry persistence may remain for internal auditing, but no `/memory dashboard` recent-turn browser is required.

### Requirement: Dashboard keyboard navigation
**Reason**: The dashboard component is no longer required after removing `/memory dashboard`.
**Migration**: No dashboard navigation replacement is needed.

### Requirement: Dashboard responsive rendering
**Reason**: The dashboard component is no longer required after removing `/memory dashboard`.
**Migration**: The footer status remains compact and SHALL fit within Pi's existing footer status rendering behavior.

### Requirement: Dashboard safe actions
**Reason**: The dashboard component is no longer required after removing `/memory dashboard`.
**Migration**: No dashboard actions remain. Durable memory writes continue through explicit `memory_save` behavior.
