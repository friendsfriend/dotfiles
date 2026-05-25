## Context

`repo_graph` currently builds one broad graph from the repository filesystem, including `openspec/` artifacts and OpenSpec-specific node kinds and query modes. That made sense for initial navigation, but it blends two different questions:

- Repository graph: "What implementation/source/config files exist and how are they related?"
- OpenSpec context: "What workflow state, active changes, artifacts, tasks, and capabilities are current?"

The current mixed model can surface archived OpenSpec change directories in graph overview/search results even when `openspec list --json` reports no active changes. Both facts can be true, but mixing them in one structural graph is confusing and weakens the authority model.

## Goals / Non-Goals

**Goals:**
- Make `repo_graph` ignore `openspec/` completely during filesystem traversal.
- Remove OpenSpec-specific node kinds and query modes from the repository graph tool surface.
- Add a dedicated OpenSpec context tool that reports fresh workflow/artifact context from OpenSpec CLI output and current artifact files.
- Update workflow guidance so agents use OpenSpec context first for change/task state, then `repo_graph` for implementation navigation derived from the task or artifact text.
- Preserve exact-file verification: OpenSpec context and graph output remain navigation/context, while `read` remains authoritative for file contents.

**Non-Goals:**
- Replacing the OpenSpec CLI.
- Replacing `read` for exact OpenSpec artifacts or implementation files.
- Building a semantic/vector search engine for specs or source code.
- Persisting OpenSpec context as durable memory.

## Decisions

### Split tools by truth source

Create a dedicated OpenSpec context tool instead of keeping OpenSpec modes inside `repo_graph`.

- `openspec_context` obtains workflow state from OpenSpec CLI commands such as `openspec list --json`, `openspec status --change <name> --json`, and instruction/status commands where appropriate.
- `repo_graph` obtains structural implementation navigation from direct filesystem scans, but excludes `openspec/`.

Alternative considered: keep one `repo_graph` tool with clearer labels for archived/active OpenSpec artifacts. Rejected because it still mixes filesystem structure with OpenSpec workflow semantics and keeps encouraging agents to ask the wrong tool for workflow state.

### Ignore `openspec/` at traversal time

Add `openspec` to the repo graph ignored-directory set or equivalent traversal filter. This should happen before node creation so no OpenSpec directories, files, headings, tasks, capabilities, changes, summaries, or related nodes enter the graph.

Alternative considered: scan `openspec/` but filter OpenSpec nodes from output. Rejected because filtered scans can still affect ranking, summaries, counts, performance, and future query modes.

### Move OpenSpec query modes out of `repo_graph`

OpenSpec-specific `repo_graph` modes such as `openspec-change`, `task-context`, and `capability` should be removed or replaced with guidance pointing to `openspec_context`.

The new tool should support equivalent workflow-oriented queries:
- overview of active changes and stable capabilities
- change details and artifact paths
- task status/context for a change
- capability specs and related changes
- archive/apply readiness where useful

### Keep implementation navigation as a second step

The intended workflow becomes:

```text
openspec_context(change/task)  ->  read exact OpenSpec artifacts  ->  repo_graph(query from task/design text)  ->  read exact implementation files
```

This preserves the useful handoff between OpenSpec and repository navigation without making `repo_graph` understand OpenSpec artifacts directly.

### Keep outputs explicit about authority

Both tools should continue to include guidance that their outputs are context/navigation only:
- OpenSpec context should recommend exact artifact reads for claims or edits.
- Repo graph should recommend exact implementation file reads before editing and exact grep for literal strings.

## Risks / Trade-offs

- **Breaking existing `repo_graph` OpenSpec modes** → Provide clear prompt/tool guidance and optionally a short error message directing callers to `openspec_context`.
- **Losing convenient one-call task-to-file suggestions** → Preserve the workflow by having `openspec_context` expose task text/artifact paths and recommend a follow-up `repo_graph` implementation query.
- **OpenSpec CLI availability or errors** → Surface CLI errors clearly and fall back only to bounded artifact discovery when safe; do not pretend workflow state is known.
- **Duplicated artifact path discovery** → Keep OpenSpec artifact discovery inside `openspec_context`; do not reintroduce `openspec/` scanning into `repo_graph`.
- **Agent guidance drift** → Update skills/prompts and tests so workflows consistently use the split model.

## Migration Plan

1. Add `openspec_context` extension with overview, change, tasks, capability, task-context, and archive/apply readiness modes.
2. Update `repo_graph` traversal ignores to exclude `openspec/` completely.
3. Remove OpenSpec node kinds, scanners, and query modes from `repo_graph`, or make deprecated modes return a concise pointer to `openspec_context` during transition.
4. Update OpenSpec skills/prompts to use `openspec_context` for workflow state and `repo_graph` only for implementation/source/config navigation.
5. Add tests confirming `repo_graph` results contain no `openspec/` paths and that `openspec_context` reports active/archived changes and task context correctly.

Rollback is to disable the new OpenSpec context extension and restore prior `repo_graph` OpenSpec scanning/modes, though that would reintroduce the semantic mixing this change removes.
