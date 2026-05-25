## Why

Pi's memory system currently injects generated memory before the agent has decomposed the user's goal, which can spend hundreds of prompt tokens on irrelevant or stale context. Repo graph tooling already demonstrates a more token-efficient pattern: fresh, compact, pull-based navigation should handle repository discovery while memory focuses on durable human continuity such as preferences, explicit decisions, and active workflow state.

## What Changes

- Make automatic memory injection more conservative by default, prioritizing pinned preferences, explicit decisions, and active workflow continuity over generated observations.
- Demote large tool-result summaries and other tool exhaust to cold/inspectable memory that remains available for commands, stats, dashboard, and targeted retrieval but is not injected automatically.
- Score memory against the user's effective intent rather than the full workflow/instruction prompt so generic OpenSpec or tool-use boilerplate does not cause irrelevant matches.
- Preserve existing SQLite storage, inspection, export, dashboard, telemetry, and measurement controls.
- Keep repo graph and exact read/grep/bash tools as the preferred path for repository topology and current truth instead of using durable memory as a repository map.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `pi-memory-system`: Tighten memory injection, tool-result memory promotion, and token-efficiency behavior.

## Impact

- Affected implementation: `pi/extensions/memory-system/index.ts`, especially memory scoring/selection, prompt summarization, tool-result recording, telemetry, and command output around injection/status.
- Affected specs: `openspec/specs/pi-memory-system/spec.md` via a delta spec for injection relevance and tool-exhaust handling.
- No new runtime dependencies are expected.
- Existing memory storage remains compatible; existing generated memories may become non-injectable without being deleted.
