---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.1"
---

Implement tasks from an OpenSpec change.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx-apply <other>`).

2. **Check status to understand the schema**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand:
   - `schemaName`: The workflow being used (e.g., "spec-driven")
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - `contextFiles`: artifact ID -> array of concrete file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If `state: "blocked"` (missing artifacts): show message, suggest using openspec-continue-change
   - If `state: "all_done"`: congratulate, suggest archive
   - Otherwise: proceed to implementation

4. **Read context files**

   Read every file path listed under `contextFiles` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Use OpenSpec context, then graphify before broad discovery (when available)**

   Use `openspec_context` for OpenSpec workflow state, task/capability context, artifact paths, and apply/archive readiness. Read exact OpenSpec artifact files before making exact claims or implementing from their contents.

   After reading required OpenSpec context files and before broad exploratory `grep`/`find`/`bash` discovery, use graphify queries against `graphify-out/graph.json` to locate likely implementation files, relationships, prior archived changes, and cross-document context when the graph is available.

   Remember the tool roles:
   - `openspec_context` tells you fresh OpenSpec workflow/artifact context.
   - Exact OpenSpec artifact reads tell you WHAT to do.
   - graphify tells you WHERE to look in implementation/source/configuration/history, as advisory navigation.
   - `read` tells you WHAT IS EXACTLY THERE.
   - `edit` changes files.

   Treat both context tools as navigation only: always `read` exact files before exact claims or edits, and still use `grep`/equivalent exact search when you need literal string occurrences.

7. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on
   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: `- [ ]` → `- [x]`
   - Continue to next task

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

8. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - If all done: check whether `.pi/verifier/*.md` policies exist in the OpenSpec project root. If policies exist, offer to run `/opsx-verify <change>` before archive. If no policies exist, suggest archive.
   - If paused: explain why and wait for guidance

**Output During Implementation**

```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

**Output On Completion**

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! If repository verifier policies exist under `.pi/verifier/*.md`, run `/opsx-verify <change>` before archive. Otherwise this change is ready to archive.
```

**Output On Pause (Issue Encountered)**

```
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

**Context Integration**
- Graphify output is advisory navigation only, not authority.
- Graphify may help identify prior decisions, archived changes, related files, or cross-document context, but you MUST still run the OpenSpec CLI commands and read every context file from `contextFiles` before implementation.
- Before editing or making exact claims about a file, read the exact current file contents even if graphify mentions it.
- If `openspec_context` or graphify is available, they are orientation only: use `openspec_context` for workflow context and graphify for advisory implementation/history navigation after exact artifact reads, not as authority.

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names
- Use `openspec_context` for OpenSpec workflow/task/capability context; prefer graphify before broad exploratory `grep`/`find`/`bash` discovery when locating implementation files or prior context, while keeping `read` authoritative and `grep` appropriate for exact string search

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly
