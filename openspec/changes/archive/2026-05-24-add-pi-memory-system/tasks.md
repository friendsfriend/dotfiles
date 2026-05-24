## 1. Extension Foundation

- [x] 1.1 Choose extension location and create the memory extension module structure.
- [x] 1.2 Define memory storage paths, file formats, entry metadata, and token budget configuration.
- [x] 1.3 Implement safe local memory read/write helpers for Markdown and JSON memory files.

## 2. User Commands

- [x] 2.1 Add `/memory show` or equivalent command to inspect stored memory grouped by type/source.
- [x] 2.2 Add `/memory pin` command to record explicit user preferences or durable notes.
- [x] 2.3 Add `/memory forget` command to remove or suppress memory entries.
- [x] 2.4 Add `/memory refresh` or equivalent command to rebuild deterministic repo/OpenSpec orientation indexes.

## 3. OpenSpec and Repo Orientation

- [x] 3.1 Implement startup/reload indexing for OpenSpec changes, specs, and workflow state.
- [x] 3.2 Implement compact repo orientation memory for pi/OpenSpec-relevant project structure.
- [x] 3.3 Mark observed memory with source metadata and detect stale source-backed entries.

## 4. Memory Injection

- [x] 4.1 Use `before_agent_start` to select a bounded memory card for each turn.
- [x] 4.2 Prioritize pinned preferences, active OpenSpec state, and recent session decisions in injected memory.
- [x] 4.3 Display or expose injected-memory status so the user can audit what was included.

## 5. Session Memory and Compaction

- [x] 5.1 Extract session decisions, assumptions, rejected options, and preferences after agent turns.
- [x] 5.2 Record inferred memory distinctly from pinned memory.
- [x] 5.3 Customize compaction to preserve active OpenSpec change, current task, artifacts, decisions, blockers, validation state, and next steps.

## 6. Workflow Integration and Validation

- [x] 6.1 Update OpenSpec pi skills/prompts to describe memory as orientation, not authority.
- [x] 6.2 Verify exact file reads are still required before edits and exact claims.
- [x] 6.3 Validate memory commands and injection behavior in explore, propose, apply, and archive workflows.
