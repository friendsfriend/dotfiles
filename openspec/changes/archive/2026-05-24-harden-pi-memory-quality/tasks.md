## 1. Storage Resilience

- [x] 1.1 Add constants and path helpers for memory backups, quarantine files, and optional health output under `.pi/memory/`.
- [x] 1.2 Implement safe JSON loading for `entries.json` that returns recovered or empty entries instead of throwing on invalid JSON.
- [x] 1.3 Implement corruption quarantine that preserves invalid `entries.json` content with a timestamped filename.
- [x] 1.4 Implement previous-valid backup handling for memory entries and fallback loading from backup when the primary file is invalid.
- [x] 1.5 Update memory write helpers to validate serialized JSON, write atomically, and maintain the previous-valid backup.
- [x] 1.6 Verify normal startup, before-agent injection, agent-end extraction, and `/memory` commands do not fail when `entries.json` is invalid.

## 2. Health Diagnostics

- [x] 2.1 Define memory health report types for storage validity, recovery state, counts, duplicates, stale entries, suspected junk, singleton consistency, and remediation hints.
- [x] 2.2 Implement health analysis helpers that inspect active, stale, rejected, expired, forgotten, duplicate, and pinned entries without modifying source files.
- [x] 2.3 Add suspected-junk detection for self-referential memory-card text, existing memory IDs, raw code/type snippets, raw file paths, and tool-output fragments.
- [x] 2.4 Extend `/memory` command completions and routing with `doctor` or `health`.
- [x] 2.5 Render short health summaries to notification or console output and long health reports in the editor UI when available.
- [x] 2.6 Validate health output for empty memory, healthy memory, duplicate memory, suspected junk, stale entries, and corrupted storage cases.

## 3. Entry Metadata and Deduplication

- [x] 3.1 Extend memory entry typing with optional metadata for quality, expiration, dedupe key, hit count, last-used time, rejection reason, and recovery state while tolerating older entries.
- [x] 3.2 Implement normalized text and semantic dedupe-key helpers for generated summaries, inferred memories, and tool summaries.
- [x] 3.3 Update singleton upsert behavior so repo orientation and OpenSpec index refreshes update one active singleton instead of accumulating duplicates.
- [x] 3.4 Suppress duplicate active representatives during memory-card selection.
- [x] 3.5 Report duplicate groups in memory health output without automatically deleting pinned preferences.
- [x] 3.6 Add lifecycle handling for temporary inferred session entries, including expiration checks during inspection and injection.

## 4. Inferred Memory Quality Pipeline

- [x] 4.1 Replace broad regex-only session extraction with a candidate extraction pipeline for appropriate user and assistant conversation surfaces.
- [x] 4.2 Exclude memory-card messages, tool outputs, code blocks, stack traces, type definitions, raw docs locations, raw file paths, and lines containing existing memory IDs.
- [x] 4.3 Classify accepted candidates as preference, decision, blocker, assumption, or next-step when they have durable repository relevance.
- [x] 4.4 Apply quality gates for completeness, maximum size, duplicate/self-reference checks, and actionability before storing inferred session memory.
- [x] 4.5 Tag accepted inferred memories with source, quality, lifecycle, and classification metadata.
- [x] 4.6 Verify low-quality candidates are rejected or marked and are not promoted to durable session memory.

## 5. Freshness and Staleness

- [x] 5.1 Extend source metadata for command-derived memory with command identity, result hash, and relevant dependency metadata when available.
- [x] 5.2 Update staleness checks to handle both file-hash sources and command-result sources.
- [x] 5.3 Refresh or evaluate OpenSpec index freshness using current `openspec list --json` results or relevant OpenSpec artifact metadata instead of only `openspec/config.yaml`.
- [x] 5.4 Ensure stale, unknown-freshness, or low-trust generated summaries are visible in inspection but excluded or deprioritized during injection.
- [x] 5.5 Validate OpenSpec active-change changes are detected even when `openspec/config.yaml` does not change.

## 6. Relevance-Based Injection

- [x] 6.1 Implement scoring factors for pinned status, prompt text overlap, active change names, capability names, file/path mentions, tags, source trust, freshness, quality, recency, and observed usefulness.
- [x] 6.2 Exclude forgotten, rejected, expired, stale, suspected-junk, and duplicate-suppressed entries from injection eligibility.
- [x] 6.3 Deprioritize tool-output memory unless it strongly matches the prompt by tag, path, command, or text relevance.
- [x] 6.4 Preserve existing token budget and maximum-entry limits while applying the improved scoring.
- [x] 6.5 Include compact source/quality labels in the memory card while preserving the orientation-not-authority disclaimer.
- [x] 6.6 Update last-injection tracking so health/status output can explain selected entry counts and approximate tokens.

## 7. Integration and Compatibility

- [x] 7.1 Ensure `/memory show|status|pin|forget|refresh` continue to work with existing entries and new optional metadata.
- [x] 7.2 Ensure pinned preferences are never automatically forgotten or expired by quality/dedupe logic.
- [x] 7.3 Ensure memory observability and dashboard changes can read the updated entries without requiring a new storage backend.
- [x] 7.4 Add comments or internal documentation for scoring weights, recovery behavior, and quality gate rationale.
- [x] 7.5 Add a safe manual path to clear existing generated memory entries after backups/quarantine are in place, preserving source files and requiring explicit user action.
- [x] 7.6 Run TypeScript syntax/type validation appropriate for project-local pi extensions.
- [x] 7.7 Run OpenSpec validation for the change artifacts.

## 8. Manual Validation Scenarios

- [x] 8.1 Test invalid `entries.json` recovery by introducing a controlled malformed copy and verifying agent startup and `/memory doctor` continue safely.
- [x] 8.2 Test duplicate singleton refreshes for repo orientation and OpenSpec index memory.
- [x] 8.3 Test inferred-memory extraction against code snippets, docs paths, memory-card echoes, and a real durable decision.
- [x] 8.4 Test relevance-based injection for an OpenSpec prompt, a file-specific prompt, and an unrelated prompt.
- [x] 8.5 Test stale OpenSpec index handling after active changes differ from the stored summary.
- [x] 8.6 Test clearing existing generated memory through the explicit manual path and verify backups/quarantine files allow inspection or recovery.
- [x] 8.7 Inspect generated `.pi/memory/` backups, quarantine files, and health output for local inspectability and safe cleanup.