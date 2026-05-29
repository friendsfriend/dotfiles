## 1. Remove legacy context extensions

- [x] 1.1 Remove the `repo_graph` Pi extension registration and delete or disable `pi/extensions/repo-graph/` implementation code.
- [x] 1.2 Remove the Pi memory system extension registration and delete or disable `pi/extensions/memory-system/` implementation code.
- [x] 1.3 Remove memory boot-context injection, footer memory activity counters, and LLM-facing `memory_query`/`memory_save` tool registration.
- [x] 1.4 Remove or update tests that target removed repo graph and memory behavior, preserving only migration/absence checks where useful.
- [x] 1.5 Remove the already-deleted OpenSpec launcher and Codex usage limits extensions from active specs and installation cleanup.
- [x] 1.6 Decouple OpenSpec verifier pass handling from removed launcher state.

## 2. Add graphify-centered guidance

- [x] 2.1 Update developer/global Pi tool guidance to remove `repo_graph`, `memory_query`, and `memory_save` instructions.
- [x] 2.2 Add graphify guidance that explains graph queries are advisory navigation, exact reads remain authoritative, and `/graphify . --update` maintains graph freshness.
- [x] 2.3 Update `pi/prompts/opsx-*.md` to replace repo graph and memory guidance with OpenSpec-context-then-graphify guidance.
- [x] 2.4 Update `pi/skills/openspec-*/SKILL.md` to replace repo graph and memory guidance with graphify guidance.

## 3. Update OpenSpec context integration

- [x] 3.1 Update `pi/extensions/openspec-context/` task-context output so follow-up suggestions mention graphify queries instead of `repo_graph`.
- [x] 3.2 Ensure `openspec_context` remains independent of graphify for active changes, task progress, artifact paths, and capability context.
- [x] 3.3 Update OpenSpec context tests to assert graphify handoff text and absence of `repo_graph` suggestions.

## 4. Installation and asset linking

- [x] 4.1 Update `scripts/stow.sh` or related installation scripts so removing `pi/extensions/repo-graph` and `pi/extensions/memory-system` does not break Pi agent asset linking.
- [x] 4.2 Ensure stale repository-managed symlinks for removed Pi extensions are not recreated and are handled safely without deleting user-owned regular files, including `repo-graph`, `memory-system`, `openspec-launcher`, and `codex-usage-limits`.
- [x] 4.3 Validate the installation script behavior for supported `DOTFILES_ENV` values (`minimal`, `work`, and `omarchy`) using syntax checks or safe dry-run style validation where possible.

## 5. Spec and documentation cleanup

- [x] 5.1 Search for `repo_graph`, `memory_query`, `memory_save`, memory boot context, and memory footer references across Pi prompts, skills, extension code, tests, install scripts, and docs.
- [x] 5.2 Replace stale references with graphify/OpenSpec/exact-tool guidance or remove them when the referenced feature no longer exists, and add removal deltas for removed launcher/Codex specs.
- [x] 5.3 Document that existing on-disk memory data is not automatically deleted but is no longer read by Pi after this change.

## 6. Validation

- [x] 6.1 Run OpenSpec validation for `replace-context-tools-with-graphify`.
- [x] 6.2 Run the repository-supported TypeScript/test validation for remaining Pi extensions.
- [x] 6.3 Run literal searches confirming no active prompt/tool registration still exposes `repo_graph`, `memory_query`, or `memory_save` outside archived OpenSpec history and this change's migration notes.
- [x] 6.4 Run shell validation for installation scripts, including `bash -n scripts/stow.sh` and any repository-supported install-script checks.
- [x] 6.5 If `graphify-out/graph.json` exists, run `/graphify . --update` or document why graph update was skipped.
