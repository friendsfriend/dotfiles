## 1. Verifier workflow resources

- [x] 1.1 Add a global OpenSpec verifier extension/resource area under `pi/extensions/openspec-verifier/`.
- [x] 1.2 Define the global verifier agent instructions with strict `VERDICT: PASS` / `VERDICT: FAIL` output requirements and read-only verifier behavior.
- [x] 1.3 Implement project policy discovery for direct child Markdown files under `<openspec-root>/.pi/verifier/*.md`, sorted lexicographically with file-boundary injection.
- [x] 1.4 Build the verifier context packet from current OpenSpec status/instructions, policy bundle, and git diff or changed-file context when available.

## 2. Verifier execution and feedback loop

- [x] 2.1 Run the verifier as an independent Pi/subagent process using the global verifier instructions and injected project policies.
- [x] 2.2 Parse verifier output for a machine-detectable verdict and surface inconclusive output as a failed/inconclusive result.
- [x] 2.3 On failure, send the verifier report back to the main agent as a follow-up message instructing it to fix only verifier findings within the OpenSpec change scope.
- [x] 2.4 Re-run verification after verifier-triggered fix turns until pass or the configured maximum round count is reached.
- [x] 2.5 Record verifier pass state with policy hash and git diff hash when available, falling back to session-local state when durable freshness cannot be determined.

## 3. OpenSpec command and prompt integration

- [x] 3.1 Add `/opsx-verify <change>` prompt and optional `openspec-verify-change` skill resources consistent with existing `/opsx-*` workflow commands.
- [x] 3.2 Ensure verify without a change name prompts the user to select an active change rather than guessing.
- [x] 3.3 Update apply-related instructions or extension hooks so completed `/opsx-apply <change>` turns offer verification when all tasks are complete and policies exist.
- [x] 3.4 Update archive-related instructions to recommend verification when policies exist while keeping archive user-controllable.

## 4. Launcher integration

- [x] 4.1 Extend launcher workflow stages/actions to include verify and after-verify behavior.
- [x] 4.2 Add verify candidate discovery for active changes with complete implementation tasks when project verifier policies exist.
- [x] 4.3 Add grouped verify action and verify candidate picker mirroring the existing apply/archive picker UX.
- [x] 4.4 Update workflow-aware ordering so verify is prioritized after apply when policies exist, and archive is prioritized after verification.
- [x] 4.5 Update workflow prompt tracking for `/opsx-verify <change>` while preserving the existing avoidance of repository discovery for unrelated input.

## 5. Validation

- [x] 5.1 Add or update tests for verifier policy discovery, deterministic policy ordering, verdict parsing, and pass staleness hashing.
- [x] 5.2 Update `openspec-launcher` tests for `/opsx-verify` stage tracking and verify action/candidate behavior.
- [x] 5.3 Run the relevant Pi extension tests for OpenSpec launcher/verifier resources.
- [x] 5.4 Run `openspec validate add-openspec-verifier-step --strict` and fix any artifact issues.
