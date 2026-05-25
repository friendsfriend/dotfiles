---
description: Run the OpenSpec verifier for a change (Experimental)
---

Run the OpenSpec verifier workflow for a change.

**Input**: Optionally specify a change name after `/opsx-verify` (e.g., `/opsx-verify add-auth`). If omitted, you MUST prompt the user to select an active change rather than guessing.
**Provided arguments**: $@

**Delegation**

The global `openspec-verifier` extension owns verifier mechanics. When this prompt is expanded instead of handled by the extension command, follow these steps:

1. If no change name was provided, run `openspec list --json` and use the AskUserQuestion tool to let the user select an active change.
2. Verify the current directory is inside an initialized OpenSpec project (`openspec/config.yaml` exists in the current directory or an ancestor). If not, report that no OpenSpec project was found and do not run verification.
3. Ask the user to run `/opsx-verify <change>` so the extension can execute the independent verifier agent, policy injection, verdict parsing, and bounded feedback loop.

Do not perform verification yourself from this prompt; the verifier step must use the independent verifier workflow.
