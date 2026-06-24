---
name: openspec-verify-change
description: "OpenSpec-aware code review and validation for the current implementation slice of an active change. Use after one or more tasks are completed, between OpenSpec tasks, before archive, or whenever the user asks to verify current changes. Safe for partial changes: remaining incomplete tasks are progress context, not automatic failures."
license: MIT
compatibility: "Requires openspec CLI. The /opsx-verify extension and Hunk integration are optional helpers when available."
metadata:
  author: openspec
  version: "1.1"
  generatedBy: "1.3.1"
---

# OpenSpec Current-Scope Review

Run a read-only, OpenSpec-aware code review of the current implementation slice for a selected active change.

This skill is meant to be called **between tasks** as well as near the end of a change. The complete change may still be unfinished. Do **not** fail the review solely because planned tasks remain incomplete.

**Input**: Optionally specify a change name. If omitted, automatically use the current OpenSpec change for this working branch/session. Prefer the obvious in-progress change from conversation context, branch naming, OpenSpec status, or the single active change in the project. Do not ask for a proposal/change id unless there are multiple plausible active changes and no reliable current-change signal.

## Local Setup Alignment

- OpenSpec root discovery walks upward from the current directory and stops at the git root. If no `openspec/config.yaml` is found before the git root, stop.
- `/opsx-verify` runs the verifier in a separate subagent process.
- Ask the user to select the verifier model each run.
- Exclude the currently selected main-session model from verifier model choices.
- Verifier pass state is repo-local at `.pi/verifier/state.json` and should be gitignored.
- Hunk is optional. Publish Hunk comments only when Hunk is installed and an active session exists; otherwise continue with the normal report.

## Review Semantics

- **Primary scope**: current git changes plus tasks already marked complete for the selected OpenSpec change.
- **OpenSpec awareness**: proposal, design, specs, and tasks define intent and boundaries for the current slice.
- **Partial progress rule**: unchecked or not-yet-started tasks are not errors. Mention them only as progress context.
- **Blocking findings**: fail only for concrete, actionable issues in the reviewed slice, such as bugs, security risks, broken tests, premature task checkboxes, scope drift, or implementation that contradicts accepted artifacts.
- **PASS meaning**: the current reviewed slice is acceptable. It does not mean the whole change is archive-ready unless all required tasks are complete.

## Steps

1. **Confirm OpenSpec project root**

   Walk upward from the current directory until either:

   - `openspec/config.yaml` is found: use that directory as the OpenSpec project root.
   - `.git` is found first: stop and report that no OpenSpec project was found in this repository.

   Do not continue above the git root.

2. **Select the current change automatically**

   If a change name was provided, use it. If not, infer the current OpenSpec change without prompting by checking, in order:

   - clear conversation context from the current session
   - current git branch name when it matches an active OpenSpec change id or contains one
   - `openspec status --json` / `openspec list --json` active-change output
   - the single active OpenSpec change in the project

   Use the inferred current change immediately when there is exactly one plausible match. Only ask the user to choose when multiple active changes are equally plausible and there is no reliable current branch/session signal.

3. **Load fresh OpenSpec context**

   Run fresh commands for the selected change:

   ```bash
   openspec status --change "<change>" --json
   openspec instructions apply --change "<change>" --json
   ```

   Read the context files reported by the apply instructions output. For spec-driven changes this usually includes proposal, design, specs, and tasks, but do not assume file names when the CLI gives concrete paths.

4. **Establish the current review scope**

   Inspect current repository changes incrementally:

   ```bash
   git status --short
   git diff --name-only
   git diff --cached --name-only
   ```

   Then read targeted diffs/files. Avoid dumping a large full diff into context. Identify:

   - changed files relevant to the selected change
   - nearby existing implementations, helpers, components, hooks, utilities, styles, tokens, or patterns that the change should reuse
   - tasks marked complete
   - tasks still incomplete, as context only
   - any code that appears outside the accepted OpenSpec scope

5. **Perform the review**

   Review like a senior code reviewer, with OpenSpec artifacts as the acceptance criteria:

   - Correctness and edge cases
   - Security, privacy, and unsafe logging
   - API/schema/contract compatibility
   - Maintainability, simplicity, cleanliness, and fit with existing architecture
   - Code reuse and utilization: avoid duplicated logic, one-off helpers, parallel abstractions, unused exports, dead code, unused variables/imports, unreachable branches, and underused existing APIs/components
   - CSS/style reuse and consistency: prefer existing design tokens, variables, utilities, components, mixins, naming conventions, layout patterns, responsive patterns, and theming mechanisms over hardcoded or duplicated styles
   - Consistency across code and CSS: check naming, file organization, formatting, component structure, state handling, error handling, accessibility patterns, and user-facing copy against surrounding code
   - Cleanliness: flag incidental complexity, overly broad changes, commented-out code, debugging artifacts, noisy logs, unnecessary dependencies, and stale or redundant files
   - Test coverage or equivalent validation for risky/user-visible behavior
   - Documentation, generated files, or specs when required by the reviewed slice
   - Completed task checkboxes: verify they are actually implemented
   - Proposal/design/spec alignment: flag scope drift or artifact drift caused by the current implementation

6. **Run safe validation when useful**

   Run focused tests, type checks, lint, or build commands when they are safe and relevant. If you skip validation, state why. Failed checks are findings only when they apply to the reviewed slice.

7. **Optional verifier/Hunk workflow**

   If the user explicitly wants the bounded verifier/fix loop, run:

   ```bash
   /opsx-verify <change>
   ```

   The extension asks for a verifier subagent model each run and excludes the currently selected main-session model. It follows the same current-scope semantics: it should not fail solely because future tasks remain incomplete.

   Hunk comments are optional. If a live Hunk session exists, verifier findings may be published there. If not, continue with the report only.

## Output Format

```markdown
## OpenSpec Current-Scope Review: <change>

**Scope:** <changed files reviewed; completed tasks reviewed>
**Progress:** <N>/<M> tasks complete. Remaining tasks are not evaluated yet.

### What Looks Good
- <brief positives, if any>

### Findings
#### Blocking
- <file:line> <issue, evidence, requested fix>

#### Non-blocking / Notes
- <optional observations, progress notes, reuse opportunities, consistency/cleanliness improvements, or future-task reminders>

### Reuse, Consistency, and Cleanliness
- <whether the implementation reuses existing code/components/styles appropriately>
- <notable duplication, unused code/CSS, naming/style inconsistencies, or cleanup opportunities>

### OpenSpec Alignment
- <how the current slice aligns with proposal/design/spec/tasks>
- <any artifact drift or premature task completion>

### Validation
- <commands run and results, or why skipped>

VERDICT: PASS | FAIL
```

Use `VERDICT: PASS` when there are no blocking findings for the current reviewed slice. Use `VERDICT: FAIL` only when there are concrete blocking findings to fix now.

## Guardrails

- Read-only review: do not edit files, mark tasks, or apply fixes while using this skill.
- Do not report incomplete future tasks as errors.
- Do not claim archive readiness unless OpenSpec reports all required tasks complete and the review covered the full implemented scope.
- Do not treat cached or generated summaries as authoritative. Exact files, diffs, OpenSpec CLI output, policy files, and safe command output are authoritative.
