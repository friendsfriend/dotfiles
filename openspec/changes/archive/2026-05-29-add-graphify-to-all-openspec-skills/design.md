## Context

OpenSpec workflows in this repository use Pi skills for `/opsx-*` actions. Several skills already mention graphify as advisory repository navigation, and stable specs already establish that OpenSpec context is fresh workflow state while graphify is the persistent graph/history map. The remaining inconsistency is that this guidance is not uniformly expressed across every OpenSpec command/skill, and some workflows do not explicitly load or follow the graphify skill when graph-backed navigation is useful.

The graph may also be stale because it is persistent and update-driven. Therefore, graphify must remain advisory: it can identify likely files, archived changes, relationships, and history, but exact OpenSpec CLI output, artifact reads, implementation file reads, grep/search, and command output remain authoritative.

## Goals / Non-Goals

**Goals:**

- Give every OpenSpec command/skill a consistent graphify integration stance.
- Make the graphify skill the preferred guidance source for graph-backed navigation when `graphify-out/graph.json` exists or graphify is otherwise available.
- Preserve `openspec_context` as the fresh workflow/artifact state source.
- Preserve exact reads and commands as authority for claims, edits, implementation, archive, and verifier verdicts.
- Include graph freshness guidance so agents warn or recommend update when graph-backed navigation may be stale.

**Non-Goals:**

- Do not make graphify mandatory for OpenSpec workflows.
- Do not make graphify output authoritative for OpenSpec status, task completion, artifact contents, implementation correctness, or verifier verdicts.
- Do not reimplement graphify or add a new graph tool.
- Do not change OpenSpec CLI schemas or artifact dependency behavior.

## Decisions

### Use a shared graphify integration block across OpenSpec skills

Each OpenSpec skill should use the same conceptual sequence:

1. Use OpenSpec CLI/`openspec_context` for current workflow state.
2. Read exact OpenSpec artifacts before making artifact-based claims.
3. When repository/history/source/configuration navigation is needed, load/use the graphify skill if graphify is available.
4. Treat graphify results as hints, then read exact files or run exact commands before claims or edits.

Alternative considered: leave each skill with bespoke wording. Rejected because inconsistent wording is the current problem and makes graphify usage dependent on which `/opsx-*` action was invoked.

### Prefer conditional handoff over hard dependency

The skills should not fail when graphify is missing or stale. They should continue with OpenSpec context plus exact reads and targeted search, while telling the user that running or updating graphify can improve graph-backed navigation.

Alternative considered: require graphify before all OpenSpec commands. Rejected because OpenSpec workflow actions must remain usable in small repositories, fresh clones, and environments where graphify is not installed.

### Keep verify read-only and evidence-based

The verify workflow may use graphify to locate files and prior context, but the verifier must base pass/fail findings on current OpenSpec state, exact file contents, diffs, policies, and safe verification commands. Graphify cannot be verdict evidence by itself.

Alternative considered: skip graphify in verify to avoid stale evidence. Rejected because graphify is still useful as a navigation map if its advisory boundary is explicit.

### Add freshness checks as guidance, not validation

When a graph exists, skills should notice obvious freshness signals such as graph report commit metadata differing from current `git rev-parse HEAD`, or otherwise describe graphify as potentially stale. The response should recommend `/graphify . --update` when navigation quality matters, but should not block OpenSpec work solely on graph freshness.

## Risks / Trade-offs

- **Risk: Agents over-trust graphify.** → Mitigation: repeat authority boundaries in skills and specs; require exact reads/commands before claims, edits, archive, or verification verdicts.
- **Risk: Extra guidance adds prompt bulk.** → Mitigation: use a concise shared block and reference the graphify skill instead of duplicating the full graphify workflow.
- **Risk: Graphify may be stale.** → Mitigation: include freshness warning/update guidance and continue with exact reads.
- **Risk: Verify workflow becomes ambiguous.** → Mitigation: explicitly distinguish navigation hints from verifier evidence.
