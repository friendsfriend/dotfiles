## Context

The current memory extension stores entries in SQLite, exposes `memory_query` and `memory_save` tools, records telemetry events, provides a session-start boot context, and still registers a broad `/memory` slash command. That command contains older user-facing flows for inspection, scoped listing, status, stats, dashboard, pinning, forgetting, refreshing, health checks, exports, and generated-memory cleanup.

Recent memory direction has moved away from automatic per-turn memory cards and toward explicit tool use: memory is queried when historical context is relevant and saved only when a durable note is intentionally worth preserving. The remaining slash-command surface now overlaps with or contradicts that simpler model. Users should be able to see whether memory was actually used in the current session without opening command-specific dashboards or stats views.

## Goals / Non-Goals

**Goals:**

- Remove the `/memory` slash command and all command-only branches, completions, and UI surfaces.
- Keep `memory_query` and `memory_save` as the supported LLM-facing memory access paths.
- Add session-local footer counters for explicit memory activity:
  - query calls
  - total query results returned
  - explicit durable semantic saves
- Make the footer counter semantics narrow and understandable: writes mean explicit semantic saves, not internal storage mutations.
- Preserve SQLite storage, scoped query filtering, explicit save metadata, startup boot context, and exact-read guardrails.
- Delete command-only dashboard/stats/health/export rendering code when no longer referenced.

**Non-Goals:**

- Do not delete existing memory entries or migrate user data.
- Do not remove SQLite storage or the explicit query/save tools.
- Do not reintroduce automatic per-turn memory injection.
- Do not add a new replacement slash command, dashboard, or stats command.
- Do not count telemetry appends, file-summary cache writes, import/migration writes, startup indexing, stale marking, or export generation as footer writes.
- Do not make footer counters historical across sessions.

## Decisions

### Decision 1: Remove the slash command rather than shrinking it

The implementation should delete `pi.registerCommand("memory", ...)` instead of preserving a reduced `/memory status` or `/memory query` command. The explicit tools already define the desired agent-facing interface, and keeping a reduced command would preserve two mental models: command-driven memory management and tool-queried memory.

Alternatives considered:
- Keep `/memory query` and `/memory save` as user commands. This leaves a command surface that can drift from the tool interface and weakens the intended simplification.
- Keep `/memory status` for diagnostics. The footer counters provide the desired lightweight visibility, and deeper diagnostics can be reintroduced later as a separate, intentionally scoped capability if needed.

### Decision 2: Use extension footer status, not a custom footer

The memory extension should update the existing extension status slot through `ctx.ui.setStatus("memory", text)`. A custom footer would replace Pi's built-in footer and risk conflicting with unrelated footer data such as model, branch, token, and other extension statuses.

The status text should be compact, for example:

```text
mem q2/r5/w1
```

Where `q` is explicit memory query count, `r` is total results returned across those queries, and `w` is explicit durable semantic save count.

Alternatives considered:
- Replace the whole footer with a custom component. This is unnecessary for three counters and would be more invasive.
- Keep lifecycle text such as `memory: ready` or `memory: query-only`. That text explains state but does not answer whether memory was actually used.

### Decision 3: Keep counters session-local and in memory

Counters should reset when the extension runtime starts or reloads. They should live in simple in-memory state near the current `lastInjection` and telemetry state. This keeps the footer fast and predictable and avoids scanning telemetry files for historical totals.

Alternatives considered:
- Load counters from telemetry on startup. This introduces I/O and ambiguity around scope, sessions, and duplicate records.
- Persist a separate counter file. This creates another memory artifact for a display-only feature.

### Decision 4: Increment counters inside the shared tool helpers

The cleanest path is to update counters in the shared `queryMemory` and `saveMemory` flows or wrappers used by the registered tools, not in command handlers. Since the slash command is being removed, the tools become the supported entry points. Query result count should be `entries.length + fileSummaries.length`, matching current telemetry result count behavior.

The save counter should increment after `saveMemory` successfully creates the explicit durable memory entry. If `saveMemory` throws, the footer write count should not increment.

Alternatives considered:
- Count every call to lower-level `addEntry`. This would include generated singleton entries, pins if any remain, imports, and internal storage behavior, making the footer misleading.
- Derive counters from telemetry records. This creates a delayed and failure-prone path for live UI updates.

### Decision 5: Preserve telemetry where still useful but decouple it from removed surfaces

The telemetry writer can remain for normal event recording, query/save audit trails, and any future debugging. However, command-only readers/renderers such as stats and dashboard loading should be removed if they become unreachable. Telemetry remains an internal observability artifact, not a user-facing memory command feature.

Alternatives considered:
- Remove all telemetry. That is broader than the requested command cleanup and may affect future observability work.
- Keep all telemetry readers and dashboard code unused. That leaves dead code and undercuts the simplification goal.

## Risks / Trade-offs

- **Risk: Users lose manual `/memory` inspection and cleanup workflows.** → Mitigation: This is an intentional breaking simplification; `memory_query` remains available to the agent for targeted history retrieval, and existing data is not deleted.
- **Risk: Footer counters may be interpreted as all-time memory usage.** → Mitigation: Use spec and implementation comments to define them as session-local; reset them on session start/reload.
- **Risk: Removing command-only helpers accidentally removes logic still used by tools or lifecycle hooks.** → Mitigation: Delete in dependency-aware passes, run TypeScript/tests, and search for references before removal.
- **Risk: `ctx.ui.setStatus` calls from lifecycle hooks overwrite counter text.** → Mitigation: centralize footer status rendering in a helper and call it from session startup, query, save, and relevant lifecycle events instead of setting ad hoc lifecycle labels.
- **Risk: Query result counts differ between displayed output and footer.** → Mitigation: derive the footer result increment from the same result object rendered by `memory_query`.

## Migration Plan

1. Add a small session-local counter state and a helper that renders `mem qN/rN/wN` into the memory extension status slot.
2. Replace existing lifecycle status strings with calls to the counter-rendering helper.
3. Update `memory_query` execution to increment query count and total result count after successful query completion.
4. Update `memory_save` execution to increment write count after successful explicit save.
5. Remove the `/memory` command registration and command-only helpers/renderers that no longer have references.
6. Run type checks/tests and exact-string searches for removed command names, completions, and dashboard/stat references.
7. Rollback path: restore the previous `/memory` command registration and lifecycle footer text from version control if the simplified surface proves insufficient.

## Open Questions

None. The proposal intentionally treats footer counters as session-local and writes as explicit durable semantic saves only.
