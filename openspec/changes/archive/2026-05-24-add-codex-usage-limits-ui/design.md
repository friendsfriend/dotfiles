## Context

pi supports project-local TypeScript extensions in `.pi/extensions/` and exposes model-selection events plus footer/status UI APIs. The current dotfiles repository already uses project-local pi extensions, so this change can be implemented without modifying pi itself.

The target model provider is OpenAI Codex (`openai-codex`). The UI indicator must be relevant only for that provider/model family and must not add noise for other providers. Codex usage-limit data is external account state, so the extension must tolerate unavailable credentials, endpoint changes, network failures, and non-interactive pi modes.

## Goals / Non-Goals

**Goals:**
- Show a compact Codex usage-limit indicator next to the selected model in the pi TUI when an OpenAI Codex model is active.
- Hide the indicator immediately when the selected model is not OpenAI Codex.
- Fetch usage-limit information without blocking normal pi interaction.
- Fail quietly with a concise unavailable/error state rather than interrupting the agent.
- Keep the implementation project-local and reloadable with pi's normal extension discovery.

**Non-Goals:**
- Changing pi core, provider implementations, or built-in model selection behavior.
- Enforcing usage limits or blocking model calls.
- Supporting non-Codex OpenAI API billing dashboards unless they use the same discoverable data source.
- Persisting long-term usage history beyond transient extension state.

## Decisions

1. **Implement as a project-local pi extension.**
   - Use `.pi/extensions/codex-usage-limits/index.ts` so the feature is auto-discovered and can be reloaded with `/reload`.
   - Alternative considered: patch pi core footer rendering. Rejected because the requirement is user-specific and pi extensions already support model events and footer/status customization.

2. **Use the status/footer APIs instead of a large custom widget.**
   - Prefer `ctx.ui.setStatus(...)` for a small indicator that appears alongside footer metadata without replacing the entire footer.
   - If the default footer cannot place the text close enough to the model, use `ctx.ui.setFooter(...)` with a minimal wrapper that preserves git branch and existing extension statuses.
   - Alternative considered: `ctx.ui.setWidget(...)` above/below the editor. Rejected because the request is specifically to show usage next to the selected model and a widget would consume extra vertical space.

3. **Gate display by active model provider/id.**
   - Treat `ctx.model.provider === "openai-codex"` as the primary match.
   - Also allow a narrow fallback match for model/provider identifiers containing `codex` if needed after inspecting actual runtime model metadata.
   - Clear the UI status on every non-matching `model_select` event.

4. **Separate usage fetching from UI rendering.**
   - Maintain in-memory state such as `idle/loading/available/unavailable/error`, fetched values, and last refresh time.
   - Trigger refresh on `session_start` if the restored model is Codex, on `model_select` when switching to Codex, and on a bounded interval while Codex remains selected.
   - Avoid overlapping requests by tracking an in-flight promise or abort controller.

5. **Discover and isolate the usage-limit data source.**
   - During implementation, verify the available Codex/OpenAI source in the local environment before hard-coding behavior. Candidate sources include a Codex CLI command, local Codex auth/config files, or an authenticated HTTPS endpoint.
   - Encapsulate this in a small fetcher function so endpoint or command changes do not affect UI event handling.
   - Do not log tokens, raw credentials, or full response bodies.

## Risks / Trade-offs

- **Codex usage endpoint is undocumented or changes** → Keep the fetcher isolated, surface `usage unavailable` instead of failing, and avoid treating unavailable data as a fatal error.
- **Credentials are missing or expired** → Display a compact unauthenticated/unavailable state only for Codex models and optionally include debug logging without secrets.
- **Status text clutters the footer** → Keep formatting short, for example `Codex 42% • resets 3h`, and clear it outside Codex models.
- **Periodic refresh creates unnecessary traffic** → Use a conservative refresh interval, refresh on selection, and avoid concurrent fetches.
- **Non-interactive pi modes lack a TUI** → Check `ctx.hasUI` before UI updates and make the extension a no-op when UI is unavailable.
