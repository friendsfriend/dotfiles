## Context

The current memory extension stores canonical entries in SQLite and exposes inspection, health, stats, dashboard, benchmark, and pin/forget commands. Before each agent turn, `before_agent_start` calls `selectMemoryCard(event.prompt, entries, defaultConfig)`, which scores all live entries against the raw prompt and injects a bounded card when entries clear the score threshold.

That design is bounded but still speculative: the raw prompt often includes workflow instructions, tool-use guidance, OpenSpec boilerplate, and previously injected memory text before the agent has identified the user's effective goal. Current telemetry and storage inspection also show many active `tool/observed/medium` entries created from large tool results. Those entries remain useful for inspection and observability, but they are weak candidates for automatic context because memory is advisory and exact files/commands must still be read before authoritative claims.

Repo graph tooling has a complementary model: it is fresh, query-time, and explicitly not durable memory. This change keeps that separation by making memory focus on human continuity and decisions, while repo graph and exact tools handle repository topology and current truth.

## Goals / Non-Goals

**Goals:**

- Reduce default prompt tokens spent on speculative memory injection.
- Keep pinned preferences, explicit repo decisions, and active workflow continuity easy to inject when relevant.
- Prevent large tool-result summaries and other generated tool exhaust from being automatically injected.
- Score memory against an effective user-intent query that excludes workflow boilerplate and memory-card echoes where feasible.
- Preserve inspectability: cold memory remains visible through `/memory show`, `/memory status`, `/memory stats`, dashboard, exports, and telemetry.
- Maintain compatibility with the existing SQLite schema unless implementation discovers a very small additive metadata field is necessary.

**Non-Goals:**

- Do not remove SQLite memory storage or existing user memory commands.
- Do not make memory authoritative for file contents, command output, or OpenSpec state.
- Do not replace `repo_graph`, `read`, `grep`, or `bash` for fresh repository discovery and exact verification.
- Do not delete existing generated memory entries as part of this change.
- Do not introduce semantic embeddings or external retrieval services.

## Decisions

### Decision 1: Treat automatic injection as hot-memory only

Automatic injection will prefer a small hot set: pinned global/repo preferences, explicit durable decisions, active OpenSpec/workflow state, and recent continuation-relevant session decisions. Generated observations such as repo orientation, tool outputs, command results, telemetry, and rejected/inferred low-confidence candidates remain in the cold store unless explicitly pinned or otherwise promoted by quality gates.

Alternatives considered:
- Keep the current bounded-card behavior and lower the token budget. This reduces cost but still allows irrelevant generated entries to consume the smaller budget.
- Disable memory injection entirely by default. This maximizes token savings but loses valuable pinned preferences and workflow continuity.

### Decision 2: Demote large tool-result summaries to cold memory

Large tool results will continue to be recorded for telemetry/inspection where useful, but they must not become automatic injection candidates merely because the prompt mentions tools or file operations. If implementation keeps storing them as memory entries, it should mark them low-confidence/non-injectable via existing quality, lifecycle, source kind, or new internal eligibility logic. If a tool result reveals a reusable durable fact, that fact should be distilled separately and pass normal quality gates before injection eligibility.

Alternatives considered:
- Stop recording large tool outputs completely. This improves noise but loses observability and dashboard value.
- Continue storing and scoring them with a larger penalty. This is fragile because generic workflow prompts often include tool names and can overcome a simple penalty.

### Decision 3: Score against effective user intent, not the full prompt envelope

Memory selection should derive a compact intent query from the prompt before scoring. The query should exclude obvious boilerplate such as injected memory cards, long OpenSpec workflow instructions, code blocks, and tool-use guardrails when possible, while preserving the user's actual request. This keeps scoring simple and inspectable without adding external dependencies.

Alternatives considered:
- Use an LLM call to classify intent before memory selection. This would cost tokens and latency before the turn starts.
- Keep raw prompt scoring. This is the current failure mode and over-matches generic terms like `tool`, `read`, `OpenSpec`, and `task`.

### Decision 4: Make cold memory discoverable without default injection

Inspection and observability commands should make clear which entries are injection-eligible versus cold/inspectable. Status/stats should continue reporting card size and selected IDs, and should make it easy to see when memory selected zero entries intentionally.

Alternatives considered:
- Hide cold entries from normal commands. This would make behavior harder to audit.
- Automatically forget cold entries. This would be destructive and unnecessary for token efficiency.

### Decision 5: Preserve graph-first repository navigation

Repository orientation memory should not compete with repo graph for automatic prompt context. The memory system may keep repo orientation exports and entries for inspection, but agent repository discovery should use `repo_graph` and exact tools when available.

Alternatives considered:
- Store richer repo maps in memory. This duplicates repo graph, risks staleness, and increases injection pressure.

## Risks / Trade-offs

- **Risk: Useful inferred memory is no longer injected automatically.** → Mitigate by keeping explicit pinning, recent continuation heuristics, and inspectable commands.
- **Risk: Users perceive memory as less active because fewer cards appear.** → Mitigate with status/stats messaging that distinguishes intentional zero-token selection from disabled or failed memory.
- **Risk: Intent extraction strips too much from unusual prompts.** → Keep extraction conservative and fall back to the original prompt when no useful query remains.
- **Risk: Existing tests or benchmarks assume tool-result entries can be selected.** → Update tests to assert cold visibility and hot injection behavior separately.
- **Risk: More nuanced eligibility logic becomes hard to understand.** → Keep rules explicit, deterministic, and visible through health/status output where practical.

## Migration Plan

- Keep existing SQLite entries and schema compatible.
- Do not delete existing tool-result memories; make them non-injectable or cold by selection policy.
- Existing pinned preferences and durable decisions remain eligible.
- Existing dashboard, stats, export, and health views continue to show stored entries.
- Rollback is straightforward: restore the previous `selectMemoryCard` and tool-result eligibility behavior without data migration.

## Open Questions

- Should cold/non-injectable status be represented as a persisted field, as tags/quality/lifecycle conventions, or only as selection logic?
- Should `/memory pin` support promoting an existing cold entry by ID, or is pinning new text sufficient for this change?
- What exact continuation heuristics should qualify recent inferred session decisions for automatic injection?
