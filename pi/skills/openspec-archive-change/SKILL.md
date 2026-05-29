---
name: openspec-archive-change
description: Archive a completed change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.1"
---

Archive a completed change in the experimental workflow.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run `openspec status --change "<name>" --json` to check artifact completion.

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - `artifacts`: List of artifacts with their status (`done` or other)

   **If any artifacts are not `done`:**
   - Display warning listing incomplete artifacts
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

3. **Check task completion status**

   Read the tasks file (typically `tasks.md`) to check for incomplete tasks.

   Count tasks marked with `- [ ]` (incomplete) vs `- [x]` (complete).

   **If incomplete tasks found:**
   - Display warning showing count of incomplete tasks
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

   **If no tasks file exists:** Proceed without task-related warning.

4. **Recommend verification when policies exist**

   Before archive, check whether `.pi/verifier/*.md` policies exist in the OpenSpec project root. If policies exist, recommend running `/opsx-verify <change>` first unless the user explicitly wants to archive now. Archive remains user-controllable; do not hard-block archive solely because verification has not run or has not passed.

5. **Assess delta spec sync state**

   Use OpenSpec CLI/`openspec_context` for fresh archive readiness and artifact context when available. If repository/history/source/configuration navigation is needed while assessing sync or archive impact, load or follow the graphify skill when `graphify-out/graph.json` exists or graphify is otherwise available. Graphify can suggest related archived changes or files, but it is advisory only and never replaces OpenSpec CLI output, exact task/spec reads, or exact command output for archive decisions.

   If graph metadata appears stale (for example, graph report commit differs from current `git rev-parse HEAD`) or freshness cannot be determined, treat graph results as potentially stale and recommend `/graphify . --update` when navigation quality matters. Do not block archive solely because graphify is unavailable or stale.

   Check for delta specs at `openspec/changes/<name>/specs/`. If none exist, proceed without sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at `openspec/specs/<capability>/spec.md`
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes needed: "Sync now (recommended)", "Archive without syncing"
   - If already synced: "Archive now", "Sync anyway", "Cancel"

   If user chooses sync, use Task tool (subagent_type: "general-purpose", prompt: "Use Skill tool to invoke openspec-sync-specs for change '<name>'. Delta spec analysis: <include the analyzed delta spec summary>"). Proceed to archive regardless of choice.

6. **Perform the archive**

   Create the archive directory if it doesn't exist:
   ```bash
   mkdir -p openspec/changes/archive
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move the change directory to archive

   ```bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```

7. **Update graphify when available**

   If `graphify-out/graph.json` exists, run `/graphify . --update` or an equivalent graphify update command after archive so graph-backed navigation reflects moved OpenSpec artifacts and any synced specs. This is required archive maintenance when a graph exists, but it is not archive validation and is not evidence that archive/sync was correct.

   If the graphify update fails, report the failure clearly and keep the archive result intact; do not move the archived change back or claim graph navigation is current.

8. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Whether specs were synced (if applicable)
   - Graphify update status when `graphify-out/graph.json` exists
   - Note about any warnings (incomplete artifacts/tasks or graphify update failure)

**Output On Success**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs (or "No delta specs" or "Sync skipped")

All artifacts complete. All tasks complete.
```

**Context Integration**
- Use OpenSpec CLI/`openspec_context` for fresh workflow, readiness, artifact, and task state before graph-backed repository navigation.
- When repository/history/source/configuration navigation is needed, load or follow the graphify skill if graphify is available; use it before broad exploratory filesystem discovery.
- Graphify output is advisory navigation only and may help identify related archived changes or graph context.
- Do not archive, sync, or report exact status from graphify or context output alone; verify with OpenSpec CLI output and exact file reads.
- If graphify appears stale, graph freshness cannot be determined, or graphify/context output conflicts with current files or CLI output, current files and CLI output win. Run `/graphify . --update` after archive when `graphify-out/graph.json` exists.

**Guardrails**
- Always prompt for change selection if not provided
- Use artifact graph (openspec status --json) for completion checking
- Don't block archive on warnings - just inform and confirm
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- Show clear summary of what happened
- If sync is requested, use openspec-sync-specs approach (agent-driven)
- If delta specs exist, always run the sync assessment and show the combined summary before prompting
- If `graphify-out/graph.json` exists after archive, run graphify update instead of only recommending it
