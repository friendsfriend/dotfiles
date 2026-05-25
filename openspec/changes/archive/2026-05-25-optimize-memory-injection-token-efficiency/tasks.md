## 1. Selection Policy

- [x] 1.1 Add deterministic effective-intent extraction for memory selection that removes memory-card echoes, code blocks, and obvious workflow/tool boilerplate while falling back safely when extraction is inconclusive.
- [x] 1.2 Refactor memory scoring/selection so automatic injection prioritizes hot memory: pinned preferences, explicit durable decisions, active workflow state, and continuation-relevant recent decisions.
- [x] 1.3 Add or update injection eligibility logic so generated tool-result summaries, command output summaries, repo-orientation scans, telemetry artifacts, stale observations, rejected entries, and low-confidence inferred entries are cold by default.
- [x] 1.4 Ensure repository-scoped memory from other repositories remains excluded and selected memory cards still label global/repo/session scope.

## 2. Tool Exhaust and Cold Memory Handling

- [x] 2.1 Update large tool-result recording so stored summaries remain inspectable but are not automatic injection candidates unless explicitly pinned or promoted through quality gates.
- [x] 2.2 Preserve telemetry, stats, dashboard, export, show, health, and forget behavior for cold memory entries.
- [x] 2.3 Ensure existing generated memory entries are not deleted during the change and remain inspectable after the new policy is applied.

## 3. Observability and Command Feedback

- [x] 3.1 Update `/memory status` and/or health/stats output to make intentional zero-entry injection distinguishable from disabled, unavailable, or failed memory where practical.
- [x] 3.2 Keep memory injection telemetry recording selected IDs, card tokens, enabled state, estimated savings, and prompt/intent summary without making telemetry authoritative.
- [x] 3.3 Verify dashboard and stats surfaces still render selected IDs, card token counts, cold memories, and recent turns after selection-policy changes.

## 4. Validation

- [x] 4.1 Add or update tests/fixtures for effective-intent extraction with workflow boilerplate, memory-card echoes, code blocks, and ordinary short prompts.
- [x] 4.2 Add or update tests showing tool-result summaries are stored/inspectable but not auto-injected for generic tool/read/bash/OpenSpec prompts.
- [x] 4.3 Add or update tests showing pinned preferences and explicit durable decisions remain eligible for automatic injection when relevant.
- [x] 4.4 Run the project validation commands for the Pi extension and OpenSpec validation for `optimize-memory-injection-token-efficiency`.
