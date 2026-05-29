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
3. Use OpenSpec CLI/`openspec_context` as the fresh workflow and artifact state source for the selected change. If repository/history/source/configuration navigation is needed before or during verification, load or follow the graphify skill when `graphify-out/graph.json` exists or graphify is otherwise available. Graphify is advisory navigation only: verifier findings and verdicts must be confirmed against current OpenSpec CLI output, exact files, policy contents, diffs, or safe verification command output.
4. If graph metadata appears stale (for example, graph report commit differs from current `git rev-parse HEAD`) or freshness cannot be determined, treat graph results as potentially stale and recommend `/graphify . --update` when navigation quality matters. Do not fail verification solely because graphify is unavailable or stale.
5. Invoke the verifier workflow with `/opsx-verify <change>` so the global verifier extension can run the independent read-only verifier agent, inject `.pi/verifier/*.md` policies, parse `VERDICT: PASS` / `VERDICT: FAIL`, and manage the bounded feedback loop.

Do not substitute main-agent review for the verifier workflow. Do not treat graphify-only output as pass/fail evidence.

**Context Integration**
- OpenSpec CLI/`openspec_context` provide fresh workflow and artifact context for change selection and verification setup.
- The graphify skill may be used for advisory repository/history/source/configuration navigation when available, before broad exploratory filesystem discovery.
- Exact OpenSpec state, exact file reads, policy contents, diffs, and safe command output are authoritative for verifier findings and verdicts.
