## Context

Pi already supports extensions, commands, tools, event hooks, session persistence, and custom compaction. OpenSpec workflows add structured artifacts, but agents still repeatedly rediscover active changes, task state, decisions, and user preferences across turns and sessions. The memory system should use pi extension points rather than modifying pi core.

Memory is intentionally separate from deterministic repository graph tooling. Memory is persisted, compact, and user-visible; it records durable orientation such as preferences, OpenSpec state summaries, decisions, rejected options, and session continuity. Exact file reads remain authoritative.

## Goals / Non-Goals

**Goals:**
- Reduce repeated context loading for OpenSpec coding sessions.
- Keep memory local, inspectable, and user-controllable.
- Inject only a small relevant memory card per turn.
- Preserve OpenSpec-specific state during compaction.
- Record memory at appropriate write points with source/confidence metadata.
- Make inferred memory easy to inspect and remove.

**Non-Goals:**
- Replacing exact `read` calls before editing files.
- Building a hidden global personality memory.
- Adding cloud sync or remote memory storage.
- Building vector search in the first version.
- Persisting deterministic repository graph data as memory.

## Decisions

### Use a pi extension rather than pi core changes

Implement memory as a pi extension that uses `before_agent_start`, `agent_end`, `tool_result`, and `session_before_compact` hooks, plus custom slash commands. This keeps pi core minimal and allows the workflow to evolve independently.

Alternative considered: patch pi core. Rejected because memory policy is workflow-specific and should remain optional.

### Store memory locally in inspectable files

Use project-local storage such as `.pi/memory/` with Markdown for human-authored or human-facing memory and JSON for generated indexes. Suggested structure:

```text
.pi/memory/
  preferences.md
  repo.md
  openspec-index.json
  sessions/<session-id>.md
  files/*.json
```

Alternative considered: SQLite. Deferred until query complexity requires it. Plain files are easier to review, diff, edit, and delete.

### Treat memory as orientation, not authority

Injected memory may guide the agent, but the agent must read exact files before editing or making exact claims. Memory entries should include source and confidence metadata where useful: pinned, observed, inferred, stale, or rejected.

Alternative considered: allowing memory to replace reads for known files. Rejected because stale or lossy summaries could cause incorrect edits.

### Write memory at explicit lifecycle points

Memory writes occur at distinct points:
- startup/reload: refresh deterministic repo/OpenSpec orientation indexes
- tool result: cache summaries of expensive file or command results
- agent end: extract session decisions, assumptions, rejected options, and preferences
- compaction: preserve OpenSpec workflow state in compact summaries
- manual command: pin, forget, refresh, or inspect memory

This avoids one monolithic memory update loop and makes each memory type easier to reason about.

### Inject bounded memory cards

`before_agent_start` should inject a concise memory card selected for the current turn. The card should include only relevant pinned preferences, active OpenSpec state, session decisions, and repo orientation. The extension should expose enough status to explain what was injected and roughly how many tokens it used.

### Use OpenSpec-aware compaction

Custom compaction should preserve the active change, current task, artifacts read or modified, design decisions, blockers, validation state, and next actions. This should supplement or replace generic conversation compaction when OpenSpec state is present.

## Risks / Trade-offs

- **Inferred memory can be wrong** → Mark inferred entries distinctly, keep them inspectable, and allow `/memory forget`.
- **Injected memory can grow too large** → Enforce token budgets and prioritize pinned preferences, active OpenSpec state, and recent decisions.
- **Memory can become stale** → Track source paths or timestamps for observed memory and label stale entries instead of silently trusting them.
- **Users may not trust hidden behavior** → Provide `/memory show`, `/memory status`, and clear injected-memory summaries.
- **Over-automation may fight OpenSpec workflows** → Required OpenSpec CLI calls and context file reads remain mandatory.

## Migration Plan

1. Add the memory extension in a disabled or opt-in state.
2. Implement manual commands and storage first.
3. Add OpenSpec state indexing and bounded injection.
4. Add session decision extraction and OpenSpec-aware compaction.
5. Update OpenSpec skills/prompts to describe memory usage.
6. Validate by running OpenSpec workflows and comparing token/tool-call behavior.

Rollback is disabling or removing the extension and deleting `.pi/memory/` if desired.

## Open Questions

- Should memory be global, repo-local, or both for user preferences?
- What is the default token budget for injected memory cards?
- Should inferred memories require user confirmation before becoming durable?
- Should file summary caching be part of v1 or deferred until after core memory works?
