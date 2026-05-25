---
name: openspec-verify-change
description: Run the OpenSpec verifier workflow for a selected active change. Use when the user wants to verify OpenSpec implementation work before archive.
license: MIT
compatibility: Requires openspec CLI and the openspec-verifier Pi extension.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.1"
---

Run the OpenSpec verifier workflow for a selected active change.

**Input**: Optionally specify a change name. If omitted, do not infer or auto-select: run `openspec list --json` and use the AskUserQuestion tool to let the user select an active change.

**Steps**

1. Confirm the current directory is inside an initialized OpenSpec project. If no `openspec/config.yaml` exists in the current directory or an ancestor, report that no OpenSpec project was found and stop.
2. Select a change. If a name was not provided, prompt the user to choose an active change from `openspec list --json`.
3. Invoke the verifier workflow with `/opsx-verify <change>` so the global verifier extension can run the independent read-only verifier agent, inject `.pi/verifier/*.md` policies, parse `VERDICT: PASS` / `VERDICT: FAIL`, and manage the bounded feedback loop.

Do not substitute main-agent review for the verifier workflow.
