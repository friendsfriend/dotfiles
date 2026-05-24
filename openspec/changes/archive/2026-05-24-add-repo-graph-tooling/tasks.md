## 1. Tool Foundation

- [x] 1.1 Choose extension location and create the repo graph tool module structure.
- [x] 1.2 Define graph node, edge, query, ranking, and result schemas.
- [x] 1.3 Register the `repo_graph` tool with prompt snippets and guidelines that prefer graph navigation before broad discovery searches.

## 2. Deterministic Graph Construction

- [x] 2.1 Implement per-call graph construction from the current filesystem with ignored-directory handling.
- [x] 2.2 Add filesystem nodes and containment/file-type edges.
- [x] 2.3 Add Markdown heading/link scanning for docs, pi prompts, and skills.
- [x] 2.4 Add OpenSpec scanning for changes, proposals, designs, tasks, specs, capabilities, and delta relationships.
- [x] 2.5 Add simple source/config scanning for imports, exports, symbols, package scripts, config references, and shell/script links where feasible.

## 3. Query Modes

- [x] 3.1 Implement `overview` query mode with compact repository and OpenSpec structure output.
- [x] 3.2 Implement `search` query mode with ranked matching nodes and deterministic reasons.
- [x] 3.3 Implement `neighbors` and `reverse-deps` query modes with bounded depth/output.
- [x] 3.4 Implement `openspec-change`, `task-context`, and `capability` query modes for OpenSpec workflows.
- [x] 3.5 Implement `symbols` query mode for supported source relationships.

## 4. Result Quality and Safety

- [x] 4.1 Return compact, ranked, action-oriented results with suggested next reads.
- [x] 4.2 Ensure the tool does not persist graph data as durable memory.
- [x] 4.3 If any cache is added, validate cache inputs so external behavior remains never-stale.
- [x] 4.4 Ensure graph results instruct the agent to read exact files before editing.

## 5. OpenSpec Workflow Integration

- [x] 5.1 Update OpenSpec apply workflow guidance to use `repo_graph` after required context files and before broad grep/find/bash discovery.
- [x] 5.2 Update OpenSpec explore/propose guidance to use `repo_graph` for architecture and integration discovery when available.
- [x] 5.3 Validate that graph-guided workflows still use `read` for authoritative file contents and grep for exact string searches.

## 6. Validation

- [x] 6.1 Test graph queries before and after file changes to confirm results reflect the current filesystem.
- [x] 6.2 Test OpenSpec change and task-context queries against active changes.
- [x] 6.3 Compare tool-call behavior against broad grep/find exploration to confirm graph results reduce blind discovery.
