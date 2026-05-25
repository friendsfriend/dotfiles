## Context

The current Pi memory extension stores scoped entries in SQLite, records telemetry, exposes inspection/dashboard/benchmark commands, and injects a bounded memory card before agent turns by scoring stored entries against the prompt. This helped preserve context but created token overhead and opaque context: the agent receives memory before it has intentionally asked what past information is relevant.

The repository graph extension already follows the desired token model: it is pull-based, fresh, compact, and used for navigation. The missing piece is that graph results are mostly structural. One-line file responsibility summaries would make graph search and task-context output more useful without turning summaries into automatic prompt context.

The target architecture separates three surfaces:

- **Notes**: memory tools answer what happened in the past and let agents explicitly save durable notes.
- **Map**: repo graph answers where to look and annotates file nodes with compact summaries.
- **Truth**: read, grep, and command tools provide exact current facts and remain authoritative.

This change supersedes the narrower `optimize-memory-injection-token-efficiency` direction by making memory tool-queried after session start rather than simply making per-turn injection more conservative.

## Goals / Non-Goals

**Goals:**

- Reduce automatic memory injection to a minimal session-start boot hint and optional pinned preference summary.
- Remove routine per-turn memory-card selection/injection after session start.
- Make memory access explicit through query/show/history tools and commands.
- Make durable memory writes intentional: agents or users save decisions, history, blockers, preferences, or other durable notes through explicit save/pin flows.
- Stop promoting generic read/bash/tool output into semantic memory automatically.
- Keep telemetry and observability available without treating telemetry as durable prompt memory.
- Add one-line file summaries to repo graph file results.
- Prefer read-derived file summaries when they are tied to the current file hash, with deterministic graph-native summaries as fallback.
- Preserve exact-read guardrails: summaries guide navigation but do not replace file reads or exact searches.

**Non-Goals:**

- Do not remove the SQLite-backed memory store or existing inspection/export/dashboard surfaces.
- Do not delete existing memory entries during migration.
- Do not make graph summaries authoritative for edits, exact claims, or validation.
- Do not introduce embeddings or external semantic search services.
- Do not require an LLM call during every graph query.
- Do not make agents store every observation; explicit saves should be selective.

## Decisions

### Decision 1: Memory is queried, not carried

After session start, memory will no longer automatically inject a selected card before every turn. The session-start context should be intentionally tiny: a reminder that memory query/save tools exist, optionally a bounded list of pinned global preferences, and the orientation-not-authority rule. Agents should query memory when a task asks about prior work, continuation, decisions, preferences, or historical investigation.

Alternatives considered:
- Keep per-turn injection but lower the budget. This still pays token cost speculatively and can include irrelevant context.
- Disable memory entirely. This loses useful past-work lookup and explicit durable notes.

### Decision 2: Explicit save is the primary durable write path

Durable semantic memory should be created by explicit user pinning or agent save calls. The agent decides what is worth saving: decisions, completed investigations, blockers, assumptions, preferences, workflow state, and concise history. Automatic lifecycle events may still store telemetry, benchmarks, and file-summary cache data, but those are not semantic prompt memory.

Alternatives considered:
- Continue automatic extraction at agent turn end. This often stores prompt echoes or inferred fragments without enough intent.
- Store all large tool outputs and filter later. This pollutes the store and pushes cleanup complexity downstream.

### Decision 3: Memory tools focus on past work

Memory command/tool output should be optimized for answering “what happened before?” rather than “what should be injected now?”. Query and show surfaces should support filtering by scope, type, related files, change name, recency, and text query where practical. Existing dashboard/stats remain useful for observability, but semantic memory should feel like an inspectable work journal.

Alternatives considered:
- Keep memory entries grouped mostly by implementation type/source. This is useful for diagnostics but less useful for task continuation.

### Decision 4: File summaries are graph annotations, not prompt memory

File summaries should annotate graph file nodes. They help the agent choose which file to read. They are not automatically injected into memory cards and are never authoritative. A file summary must be short, avoid secrets/raw code/line-level claims, and be shown with exact-read expectations.

Alternatives considered:
- Store file summaries as normal memory entries. This risks reintroducing prompt-context noise.
- Only use path/symbol matches in graph. This misses a high-value, low-token navigation label.

### Decision 5: Use read-derived summaries with deterministic fallback

When the agent reads a file, the system may create or update a one-line file summary tied to repository identity, path, and content hash. Repo graph should use that summary only when the current file hash matches. If no valid read-derived summary exists, graph should compute a deterministic fallback from current scan data: path, file type, OpenSpec artifact role, Markdown headings, symbols, imports, package scripts, and config keys.

Alternatives considered:
- Generate LLM summaries during every graph scan. This adds latency/cost and weakens the deterministic nature of graph queries.
- Use only read-derived summaries. First-time graph queries would lack summaries.

### Decision 6: Keep graph fresh while allowing validated overlays

The graph remains freshly computed from the filesystem on each query. A read-derived summary overlay can be attached only after hash validation against the current file. Stale summaries are omitted from ranking and display or explicitly marked stale in diagnostics. Deterministic summaries are derived from the current graph scan and therefore remain fresh.

Alternatives considered:
- Persist the whole graph. Existing graph specs intentionally avoid stale persisted graph state.

### Decision 7: Preserve telemetry as observability, not durable notes

Telemetry should continue recording memory/query/save usage, graph summary source, selected boot context, provider usage when available, and dashboard data. Telemetry records are not semantic memories unless an agent explicitly saves a distilled note.

Alternatives considered:
- Promote telemetry summaries into memory automatically. This repeats the current tool-exhaust problem.

## Risks / Trade-offs

- **Risk: Agents forget to query memory when prior work matters.** → Mitigate with a minimal session-start hint, clear tool descriptions, and workflow guidance that suggests memory query for continuation/history questions.
- **Risk: Agents forget to save important decisions.** → Mitigate with an explicit save tool that is easy to call and guidance to save durable decisions or completed work.
- **Risk: Session-start-only pinned preferences are missed in very long sessions.** → Mitigate by making preferences queryable and keeping the boot hint concise; agents can query preferences when behavior preferences matter.
- **Risk: Existing generated memory entries clutter history views.** → Mitigate through filtering, type/source labels, and optional cleanup/migration tasks without deleting data automatically.
- **Risk: File summaries become stale or misleading.** → Mitigate with content-hash validation for read-derived summaries and deterministic fallback from current scans.
- **Risk: Summary text leaks secrets or raw code.** → Mitigate with strict one-line summary rules, redaction, and omission when summary quality is uncertain.
- **Risk: Repo graph queries become slower.** → Mitigate by bounding deterministic summary extraction and avoiding LLM calls during graph scans.

## Migration Plan

- Keep existing SQLite memory data inspectable.
- Introduce or reuse fields/tags to distinguish explicit semantic notes from legacy/generated entries.
- Disable routine per-turn injection while retaining a minimal session-start boot hint.
- Stop automatic durable semantic writes from large tool results and turn-end inference; retain telemetry where useful.
- Add file-summary cache storage keyed by repo, path, and content hash or equivalent metadata.
- Update graph rendering/ranking to attach validated read-derived summaries or deterministic fallback summaries.
- Rollback path: re-enable prior per-turn injection and ignore graph summary overlays without migrating stored data.

## Open Questions

- Should the minimal session-start boot hint include pinned global preferences by default, or only a reminder that preference memory can be queried?
- Should explicit agent save be exposed as a dedicated tool, a `/memory save` command, or both?
- Should read-derived file summaries be generated deterministically from read content, produced by the agent through explicit save, or generated by a lightweight internal summarizer?
- How should legacy inferred/tool memories be classified in history views so they remain inspectable but do not dominate past-work queries?
