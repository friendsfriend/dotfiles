## Why

Pi currently carries three overlapping context systems: OpenSpec context, deterministic repo graph tooling, and durable memory. Now that graphify provides a persistent, auditable graph with token-reduction benefits, keeping the older repo graph and memory systems creates duplicated maintenance, confusing agent guidance, and competing sources of navigation context.

## What Changes

- Introduce graphify as the single graph-backed navigation and historical-context substrate for Pi/OpenSpec workflows.
- **BREAKING**: Remove the `repo_graph` tool/extension and replace repo-navigation guidance with graphify graph queries.
- **BREAKING**: Remove the Pi memory system extension, including `memory_query`, `memory_save`, SQLite memory storage, memory telemetry, memory health, and footer memory activity counters.
- **BREAKING**: Remove the OpenSpec launcher and Codex usage limits Pi extensions/specs from this dotfiles setup.
- Update `openspec_context` so it remains the authoritative OpenSpec workflow/artifact context tool but may suggest graphify queries for implementation/source/history navigation.
- Update OpenSpec prompts/skills to use: OpenSpec CLI/context for workflow truth, graphify for map/history retrieval, and exact `read`/`grep`/`bash` for authority.
- Keep the dotfiles installation/stow scripts working after extension removal so only remaining Pi agent assets are linked or installed.
- Add graphify update expectations around OpenSpec apply/archive so the graph remains useful after repository changes.

## Capabilities

### New Capabilities
- `graphify-context-tooling`: Graphify-backed navigation and context behavior for Pi/OpenSpec workflows, including query/update guidance and authority boundaries.

### Modified Capabilities
- `openspec-context-tooling`: Replace follow-up `repo_graph` suggestions with graphify query/update guidance while preserving exact OpenSpec artifact reads as authoritative.
- `repo-graph-tooling`: Retire the built-in `repo_graph` capability in favor of graphify.
- `pi-memory-system`: Retire durable Pi memory tools/storage and route historical/context lookup through graphify plus exact source reads.
- `pi-memory-health`: Retire memory health diagnostics because the Pi memory store is removed.
- `pi-memory-observability`: Retire memory-specific telemetry/observability because token savings and graph stats move to graphify outputs.
- `openspec-pi-launcher`: Retire the interactive OpenSpec launcher capability; users invoke explicit `/opsx-*` prompts directly.
- `openspec-verification`: Decouple verifier pass behavior from removed OpenSpec launcher state.
- `pi-codex-usage-limits-ui`: Retire the Codex usage limits footer/UI capability.

## Impact

- Affected implementation: `pi/extensions/repo-graph/`, `pi/extensions/memory-system/`, `pi/extensions/codex-usage-limits/`, `pi/extensions/openspec-launcher/`, `pi/extensions/openspec-context/`, generated/global Pi resource installation paths, and `scripts/stow.sh` Pi asset linking behavior.
- Affected prompts/skills: `pi/prompts/opsx-*.md` and `pi/skills/openspec-*/SKILL.md` references to `repo_graph`, `memory_query`, or `memory_save`.
- Affected specs/tests: repo graph and memory specs/tests become removal or migration validation; OpenSpec context tests should assert graphify suggestions replace repo graph suggestions.
- User-facing behavior changes: agents no longer receive memory boot hints or memory tools, and no longer have a built-in `repo_graph` tool. Users must build/update `graphify-out/graph.json` for graph-backed context benefits.
