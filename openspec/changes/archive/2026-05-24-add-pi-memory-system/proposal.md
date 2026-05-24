## Why

Pi sessions can spend many tokens rediscovering project context, OpenSpec workflow state, user preferences, and decisions that were already established earlier in the conversation. A repo-scoped memory system can reduce repeated context loading while keeping important OpenSpec coding state visible, auditable, and under user control.

## What Changes

- Add a pi memory extension focused on OpenSpec coding workflows.
- Maintain repo-scoped memory for pinned preferences, OpenSpec workflow summaries, session decisions, rejected options, and compact repo orientation notes.
- Inject a small, relevant memory card before agent turns instead of repeatedly rereading the same background context.
- Provide user-facing commands to inspect, refresh, pin, and forget memory.
- Integrate with pi compaction so long sessions preserve OpenSpec-specific state such as active change, current task, design decisions, modified artifacts, blockers, and next steps.
- Treat memory as orientation, not authority: exact file reads remain required before implementation edits or exact claims.

## Capabilities

### New Capabilities
- `pi-memory-system`: Defines repo-scoped memory behavior for pi, including write points, retrieval, injection, user controls, OpenSpec-aware compaction, and safety/staleness rules.

### Modified Capabilities

- None.

## Impact

- Adds project or user pi extension code for memory indexing, storage, injection, and commands.
- Adds `.pi/memory/` or equivalent local storage for inspectable memory artifacts.
- May update OpenSpec pi skills/prompts to explain how memory should be used during propose, explore, apply, and archive workflows.
- Affects pi session context size and compaction behavior, but should not alter existing OpenSpec CLI behavior.
