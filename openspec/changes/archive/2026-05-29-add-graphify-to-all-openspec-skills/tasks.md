## 1. Shared Guidance Definition

- [x] 1.1 Draft a concise shared graphify integration block covering OpenSpec-first state, graphify-skill navigation handoff, freshness guidance, and exact-read authority boundaries.
- [x] 1.2 Confirm the shared wording does not make graphify mandatory and preserves fallback to OpenSpec CLI/context plus exact reads and targeted search.

## 2. OpenSpec Skill Updates

- [x] 2.1 Update `pi/skills/openspec-propose/SKILL.md` to explicitly load/use the graphify skill when repository/history/navigation context is needed.
- [x] 2.2 Update `pi/skills/openspec-apply-change/SKILL.md` to explicitly load/use the graphify skill after exact OpenSpec artifact reads and before broad discovery.
- [x] 2.3 Update `pi/skills/openspec-explore/SKILL.md` to explicitly load/use the graphify skill for advisory codebase and history navigation in explore mode.
- [x] 2.4 Update `pi/skills/openspec-archive-change/SKILL.md` to include graphify skill handoff and post-archive update guidance without using graphify as archive authority.
- [x] 2.5 Update `pi/skills/openspec-verify-change/SKILL.md` to allow graphify skill navigation while preserving verifier verdict evidence boundaries.
- [x] 2.6 If installed global OpenSpec skill files under `~/.pi/agent/skills/` are not symlinks to the project skill files, update or document the installation/sync path needed to propagate the same guidance.

## 3. Validation

- [x] 3.1 Search OpenSpec skill files for graphify guidance and verify all `/opsx-*` skills include the shared handoff stance.
- [x] 3.2 Verify no updated skill claims graphify is authoritative for OpenSpec state, artifact contents, file contents, implementation correctness, archive completion, or verifier verdicts.
- [x] 3.3 Run `openspec status --change add-graphify-to-all-openspec-skills --json` and confirm the change remains apply-ready.
- [x] 3.4 Recommend `/graphify . --update` after implementation if `graphify-out/graph.json` exists so graph-backed navigation reflects the skill/spec changes.
