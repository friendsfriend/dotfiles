## Context

Pi currently has overlapping context mechanisms:

- `openspec_context` gives fresh OpenSpec workflow/artifact state.
- `repo_graph` gives fresh deterministic repository navigation outside `openspec/`.
- `memory_query`/`memory_save` provide durable semantic notes, SQLite-backed storage, memory telemetry, health, and footer counters.
- graphify now provides a persistent graph (`graphify-out/graph.json`), audit report, community detection, query/path/explain commands, update flow, and token-reduction benchmark.

The requested direction is to simplify Pi around OpenSpec plus graphify: OpenSpec remains the source of workflow truth, graphify becomes the map/history layer, and exact file/command tools remain authoritative for current contents.

## Goals / Non-Goals

**Goals:**

- Remove the built-in repo graph extension and all guidance that asks agents to call `repo_graph`.
- Remove the Pi memory system extension and LLM-facing memory tools.
- Remove the OpenSpec launcher and Codex usage limits extensions/specs from this dotfiles setup.
- Preserve `openspec_context` as the fresh OpenSpec workflow/artifact tool.
- Keep installation/stow scripts valid after extension directories or assets are removed.
- Add explicit graphify guidance for OpenSpec propose/apply/verify/archive workflows.
- Make graphify the recommended token-efficient navigation/history layer while keeping exact reads authoritative.
- Avoid hidden context injection from removed memory behavior.

**Non-Goals:**

- Reimplement graphify inside Pi.
- Make graphify graph contents authoritative for exact code, spec, or command claims.
- Delete user graphify outputs such as `graphify-out/graph.json` or memory database files from disk automatically.
- Remove generic exact tools such as `read`, `bash`, `grep`/`rg`, or OpenSpec CLI usage.

## Decisions

### Use graphify as an external graph substrate, not a Pi-internal clone

Pi should not recreate graphify's persistent graph, community detection, HTML/report outputs, or query logic. Instead, Pi/OpenSpec guidance should detect/use `graphify-out/graph.json` and the graphify CLI where available.

Alternative considered: port graphify behavior into the existing `repo_graph` extension. Rejected because that preserves two graph systems and misses graphify's audit trail and token benchmark outputs.

### Keep OpenSpec context separate from graphify

`openspec_context` should continue to answer current workflow questions from OpenSpec CLI/filesystem state. It may suggest graphify follow-up queries, but it must not depend on graphify to report active changes, task status, artifact paths, or capability specs.

Alternative considered: make graphify the only OpenSpec context source. Rejected because graphify is persistent and update-driven, while OpenSpec workflow state must be fresh for each workflow action.

### Remove repo graph rather than wrapping it

The `pi/extensions/repo-graph/` extension, tests, prompt snippets, and OpenSpec prompt references should be removed or replaced with graphify guidance. Transitional references should point to graphify only if a compatibility message is needed during implementation; the final desired state has no registered `repo_graph` tool.

Alternative considered: keep `repo_graph` as a thin wrapper over graphify. Rejected because the user explicitly wants to remove the other tools and because a wrapper would continue to expose the old API surface.

### Remove memory tools and automatic memory boot context

The memory extension should be removed as an active Pi extension. Agents should no longer receive memory boot hints, `memory_query`, or `memory_save`. Historical repository context should come from graphify graph queries and exact artifacts/files, not a separate SQLite semantic store.

Alternative considered: keep `memory_save` for user preferences only. Rejected for this change because it keeps a second persistent context system. User preferences that must survive sessions should be represented by normal dotfiles/configuration or graphify-ingested notes.

### Remove launcher and Codex usage extensions/specs

The OpenSpec launcher and Codex usage limits extensions have already been removed from the Pi asset set. Their stable OpenSpec specs should be retired in the same change so archived requirements do not describe features that are no longer installed. Users can invoke explicit `/opsx-*` prompts directly instead of `/openspec`, and Codex usage can be checked through provider-native or external account surfaces.

Alternative considered: leave the specs as historical documentation. Rejected because active stable specs would continue to claim required behavior for removed extensions.

### Graphify update is explicit and workflow-aware

OpenSpec prompts/skills should recommend `/graphify . --update` after changes that alter specs, docs, prompts, skills, or implementation files enough to affect future navigation. Archive workflows should include graphify update as a post-archive step when `graphify-out/graph.json` exists.

### Installation links only active Pi assets

`scripts/stow.sh` currently links every child of `pi/extensions`, `pi/prompts`, and `pi/skills` into `$HOME/.pi/agent/...`. Removing extension directories changes what gets linked, but the script must remain safe when a source directory is empty or when stale symlinks already exist. Implementation should ensure removed `repo-graph`, `memory-system`, `codex-usage-limits`, and `openspec-launcher` extension symlinks are not recreated and should consider pruning broken/stale symlinks for those removed assets without deleting user-owned non-symlink files.

## Risks / Trade-offs

- **Risk: Loss of explicit durable memory for preferences or decisions.** → Mitigation: document graphify-backed notes/raw ingestion as the replacement path and keep exact project files as authority.
- **Risk: graphify graph can become stale.** → Mitigation: OpenSpec workflows must treat graphify as advisory and recommend/update graphify after apply/archive; exact reads remain mandatory.
- **Risk: Removing tools breaks existing prompts/tests.** → Mitigation: update all Pi prompts/skills and tests in the same change; use literal searches for `repo_graph`, `memory_query`, and `memory_save` during validation.
- **Risk: Installation leaves stale symlinks to removed extensions or fails when extension assets are absent.** → Mitigation: validate `scripts/stow.sh` with the supported `DOTFILES_ENV` values and make Pi asset linking tolerate removed asset directories and stale symlink cleanup.
- **Risk: graphify may not be installed in every environment.** → Mitigation: workflows should degrade to exact OpenSpec context plus `read`/`grep`/`bash` discovery and tell the user to run graphify for token-reduction benefits.
- **Risk: Existing stored memory data remains orphaned.** → Mitigation: do not delete user data automatically; document that old memory storage is no longer read by Pi after this change.
