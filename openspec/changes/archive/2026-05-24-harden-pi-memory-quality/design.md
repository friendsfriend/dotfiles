## Context

The current project-local memory system lives in `.pi/extensions/memory-system/index.ts` and stores generated repo memory under `.pi/memory/`. It records entries in `entries.json`, writes human-readable preference and repo-orientation files, refreshes an OpenSpec index, injects bounded memory cards before agent turns, summarizes large tool results, infers session memories from decision-like lines, and contributes memory context during compaction.

Recent inspection showed two important failure modes. First, `entries.json` can become invalid JSON and cause memory operations to throw during startup, injection, commands, or agent-end extraction. Second, inferred session memory can capture code fragments, documentation lines, previous memory cards, and duplicate self-referential entries, reducing memory usefulness and risking recursive context pollution.

The design must preserve the current local, inspectable storage model and the principle that memory is orientation, not authority. It should also coexist with the active memory observability and dashboard proposals by producing cleaner data and health signals those features can report.

## Goals / Non-Goals

**Goals:**

- Make memory storage fail open: corrupted memory files must not break agent turns or commands.
- Provide explicit health diagnostics for storage validity, recovery actions, duplicates, suspected junk, stale observed entries, and injection quality.
- Improve inferred memory quality by excluding low-value, recursive, or unsafe candidates before they are stored.
- Deduplicate repeated entries and enforce singleton semantics for generated summaries.
- Improve freshness for command-derived and OpenSpec-derived memory.
- Select memory cards using relevance and source trust instead of broad source-type boosts alone.
- Keep all generated data local under `.pi/memory/` and compatible with existing entries where possible.

**Non-Goals:**

- Adding vector search, embeddings, cloud telemetry, or external databases.
- Making memory authoritative for edits or exact claims.
- Fully solving long-term knowledge management across repositories.
- Replacing observability, benchmark, or dashboard changes; this change improves the underlying quality and durability they observe.
- Automatically deleting user-pinned preferences without explicit user action.

## Decisions

### Add a resilient storage layer with backup and quarantine

Memory reads will go through a safe loader that validates `entries.json`. If the file parses, the loader returns entries normally. If parsing fails, the loader attempts bounded recovery of the latest parseable array prefix or falls back to `entries.json.bak` when available. The corrupt file is copied or renamed to a timestamped quarantine file such as `.pi/memory/entries.corrupt.<timestamp>.json`, and normal memory operations continue with recovered or empty entries.

Writes remain atomic through temporary files and rename, but successful writes also maintain a previous-valid backup. After writing, the system validates the JSON it wrote so a bad serialization path does not replace the only valid copy silently.

Alternative considered: let JSON parse failures surface to the user. Rejected because memory is auxiliary context and must not make the agent unusable.

### Introduce memory health as a first-class diagnostic surface

Add a `/memory doctor` or `/memory health` subcommand that inspects storage and entry quality. The report should include storage validity, backup/quarantine state, active entry counts, pinned count, stale count, duplicate groups, suspected junk inferred entries, singleton duplication, and the last injection summary when known. Long output opens in the editor UI; short summaries can be notifications or console output.

The health command can initially be read-only plus an explicit repair mode if needed. Destructive actions such as forgetting entries should stay behind existing `/memory forget` or require confirmation in future UI work.

Alternative considered: only improving `/memory status`. Rejected because status should remain concise, while quality diagnostics need room for detail and remediation hints.

### Replace regex-only session extraction with a candidate pipeline

Session memory extraction will move from scanning every message line for broad words to a staged pipeline:

1. Build candidates only from appropriate user/assistant conversation surfaces.
2. Exclude memory-card messages, tool outputs, code blocks, stack traces, raw type definitions, file-path-only lines, and lines containing existing memory IDs.
3. Classify candidates as preference, decision, blocker, assumption, or next-step when they have durable repo value.
4. Apply quality gates for minimum completeness, maximum size, duplicate/self-reference checks, and actionability.
5. Store accepted candidates with tags and metadata indicating inferred origin.

This keeps the system conservative: missing a marginal memory is preferable to injecting junk repeatedly.

Alternative considered: keep broad regex extraction and rely on better retrieval. Rejected because low-quality stored data still pollutes inspection, scoring, and future observability.

### Add deduplication and lifecycle metadata without breaking existing entries

Existing `MemoryEntry` records can be extended with optional fields such as `quality`, `expiresAt`, `lastUsedAt`, `hitCount`, `dedupeKey`, or `reasonRejected`. The implementation should tolerate missing fields on older entries.

Generated singleton entries such as repo orientation and OpenSpec index should use stable keys and update in place. Duplicate active entries with the same dedupe key or normalized text should be collapsed, marked rejected/forgotten, or omitted from injection depending on safety. Pinned preferences are never automatically forgotten, though duplicates can be reported.

Inferred scratch/session entries should be eligible for TTL or low priority unless they are repeatedly useful or manually pinned.

Alternative considered: migrating to a new storage format. Rejected because existing local JSON is easy to inspect and sufficient if hardened.

### Improve freshness for observed and command-derived memory

File-based observed memory remains stale when the source file hash changes. Command-derived memory should also store enough freshness metadata to detect drift: command name, relevant paths, result hash, and optional dependency file hashes. OpenSpec index memory should be considered fresh based on the current `openspec list --json` result or relevant OpenSpec artifact timestamps, not only `openspec/config.yaml`.

When freshness cannot be verified, the entry should be labeled unknown or low-trust rather than treated as authoritative. Stale or unknown generated summaries can remain visible in inspection but should be excluded or deprioritized for injection.

Alternative considered: refresh all command-derived memory before every turn. Rejected because it can add latency and cost; startup/reload/manual refresh plus targeted checks are enough for v1.

### Score memory cards by relevance and trust

Memory selection should continue to be bounded, but scoring should include prompt overlap, active change names, OpenSpec capability names, file/path mentions, tags, source kind, pinned status, freshness, recency, dedupe state, and observed usefulness. Pinned preferences remain high priority. Stale, forgotten, rejected, duplicate, expired, and suspected-junk entries are excluded. Tool-output summaries should only be selected when they have strong text/tag/path relevance.

The memory card should include compact quality/source labels so the agent understands the context is orientation. Selection details can feed existing or future observability.

Alternative considered: vector search. Deferred because the immediate problem is quality and durability, and lexical/contextual scoring is simpler and inspectable.

## Risks / Trade-offs

- Recovery may preserve incomplete or outdated entries → Quarantine originals, label recovered state, and prefer safe fallback over hard failure.
- Conservative extraction may miss useful decisions → Encourage explicit `/memory pin` and allow future promotion from observability/dashboard surfaces.
- Deduplication can hide subtly different entries → Use normalized text and stable keys carefully; report duplicate candidates before destructive cleanup where possible.
- Freshness checks can add startup latency → Limit expensive checks to refresh points and use hashes/mtimes already collected when possible.
- More scoring logic can become opaque → Keep scoring factors inspectable in health/stats output and document major weights in code comments.
- Existing corrupted memory may require one-time cleanup → Provide doctor output and safe repair/quarantine behavior rather than assuming pristine files.

## Migration Plan

1. Add safe JSON load/write helpers, backup handling, and quarantine paths while preserving the current `MemoryEntry[]` shape.
2. Add health analysis helpers that can run against current entries without modifying them.
3. Add `/memory doctor` or `/memory health` output using the health helpers.
4. Add dedupe-key generation and singleton repair for generated repo/OpenSpec entries.
5. Replace session extraction with the candidate pipeline and quality gates.
6. Extend staleness/freshness metadata for command-derived and OpenSpec-derived entries.
7. Replace memory selection scoring with relevance/trust scoring while preserving token budget behavior.
8. Validate against existing corrupted/duplicate memory data, then run normal `/memory show|status|refresh|pin|forget` flows.

Rollback is disabling the new repair/scoring/extraction paths and returning to the previous simple read/write and selection logic. Quarantined corrupt files and backups are local generated data and can be inspected or removed manually.