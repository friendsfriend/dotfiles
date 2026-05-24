## 1. Research and Setup

- [x] 1.1 Inspect existing `.pi/extensions/` patterns and confirm extension naming/location for `codex-usage-limits`.
- [x] 1.2 Verify runtime model metadata for OpenAI Codex models, including provider and model id values.
- [x] 1.3 Identify the safest available Codex usage-limit data source in the local environment without exposing credentials.

## 2. Extension Implementation

- [x] 2.1 Create `.pi/extensions/codex-usage-limits/index.ts` as a project-local pi extension.
- [x] 2.2 Implement Codex model detection using `openai-codex` provider metadata with a narrow Codex fallback if needed.
- [x] 2.3 Implement an isolated usage-limit fetcher that returns normalized available/unavailable/error states.
- [x] 2.4 Add refresh orchestration for `session_start`, `model_select`, and a conservative active-Codex interval.
- [x] 2.5 Prevent overlapping refreshes and clean up timers on session shutdown/reload.

## 3. UI Behavior

- [x] 3.1 Render a compact loading, available, unavailable, or error indicator with pi status/footer APIs.
- [x] 3.2 Clear the indicator immediately when the selected model is not OpenAI Codex.
- [x] 3.3 Ensure the extension is a no-op when `ctx.hasUI` is false.
- [x] 3.4 Keep status text short enough for normal footer widths and avoid replacing unrelated footer content unless necessary.

## 4. Validation

- [x] 4.1 Run TypeScript or pi extension validation available in this repo and fix any type errors.
- [x] 4.2 Test startup/reload with a restored OpenAI Codex model and confirm the indicator refreshes.
- [x] 4.3 Test switching from Codex to a non-Codex model and confirm the indicator disappears.
- [x] 4.4 Test missing or unavailable usage data and confirm pi continues without uncaught errors or secret logging.
