## Why

When using pi with OpenAI Codex models, subscription usage limits are not visible in the TUI, so it is easy to keep working without noticing remaining quota or reset timing. Showing the current Codex usage limit status next to the selected model gives immediate, low-friction visibility exactly when it is relevant.

## What Changes

- Add a small pi UI extension that displays current OpenAI Codex usage-limit information in the TUI footer/status area next to the selected model.
- Only show the usage-limit indicator when the active model is an OpenAI Codex model.
- Refresh the displayed usage data when the Codex model is selected and periodically or opportunistically while it remains selected.
- Hide or clear the indicator when switching away from OpenAI Codex models.
- Handle missing credentials, unavailable usage-limit data, and API failures gracefully without disrupting pi.

## Capabilities

### New Capabilities
- `pi-codex-usage-limits-ui`: Shows OpenAI Codex usage-limit status in pi only while an OpenAI Codex model is selected.

### Modified Capabilities

## Impact

- Adds or updates a project-local pi extension under `.pi/extensions/`.
- Uses pi extension APIs such as model selection events and footer/status rendering.
- May call an OpenAI/Codex account usage endpoint or CLI/API helper using existing user credentials.
- No breaking changes to existing OpenSpec specs, shell configuration, or pi usage are expected.
