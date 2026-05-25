## Context

The repository already has Pi resources for an OpenSpec-centered workflow: `/opsx-explore`, `/opsx-propose`, `/opsx-apply`, `/opsx-archive`, an interactive `/openspec` launcher, OpenSpec context tooling, and repo graph tooling. The launcher currently tracks a simple per-repository stage and prioritizes archive after apply when implementation tasks are complete.

The desired verifier is specifically an OpenSpec flow step, not a generic post-edit hook. It should be globally implemented in the dotfiles Pi resources while reading project-local verification policies from `.pi/verifier/*.md` in the OpenSpec project root. Verification should happen after apply, before archive, and verifier failures should drive bounded follow-up fix turns in the main agent session.

## Goals / Non-Goals

**Goals:**
- Add `/opsx-verify <change>` as a first-class OpenSpec workflow action.
- Add a global verifier extension/agent resource that runs an independent verifier agent for a selected OpenSpec change.
- Inject all Markdown policy files from `.pi/verifier/*.md`, sorted deterministically, into the verifier prompt.
- Integrate verify into the existing `/openspec` launcher ordering and candidate selection.
- Prompt the user after completed apply work when verifier policies exist.
- Feed verifier failures back to the main agent and automatically re-run verification after fix turns until pass or a round limit is reached.
- Keep archive possible as a user-controlled action, while making verification the recommended path when configured.

**Non-Goals:**
- No Pi core changes.
- No generic verification hook outside the OpenSpec workflow.
- No generic workflow engine.
- No hard archive block when verification has not passed.
- No perfect sandboxing guarantee for verifier commands.
- No attempt to infer policies outside `.pi/verifier/*.md`.

## Decisions

### Decision: Implement verification as a dedicated OpenSpec Pi extension plus `/opsx-verify` resources

Add a new global resource area under `pi/extensions/openspec-verifier/` for verifier mechanics and a new `/opsx-verify` prompt/skill for workflow invocation. The launcher will integrate with this extension rather than embedding all verifier mechanics directly.

Rationale: launcher code should stay focused on discovery and UI dispatch, while the verifier extension owns policy loading, subagent execution, verdict parsing, loop state, and feedback messages.

Alternative considered: put all verifier behavior into `openspec-launcher`. This would reduce files but couple UI/menu behavior to subagent orchestration and make future verifier changes riskier.

### Decision: Use `.pi/verifier/*.md` as the only project policy source

The verifier extension discovers the OpenSpec project root, loads regular Markdown files directly under `<root>/.pi/verifier/`, sorts them lexicographically, and injects their contents with file-boundary headings.

Rationale: this keeps policies simple, reviewable, repo-local, and independent of implementation code. Sorting avoids nondeterministic verifier behavior.

Alternative considered: JSON/YAML verifier configuration. This is unnecessary for V0 and would add ceremony before the policy format has proven insufficient.

### Decision: Keep the verifier agent global and read-only by default

The verifier agent prompt and runner are defined in the dotfiles Pi resources, and verifier child runs use read/search tools plus bash for verification commands where available. The verifier is instructed not to edit files. Fixes are performed by the main agent after verifier feedback is injected into the main session.

Rationale: separating judge from actor improves review independence and keeps all code changes visible in the main conversation.

Alternative considered: allow the verifier to edit. This would blur responsibilities and make it harder to understand which agent changed what.

### Decision: Parse a strict verdict and bound the loop

Verifier output must include `VERDICT: PASS` or `VERDICT: FAIL`. Failure reports are sent to the main agent with instructions to fix only verifier findings. The extension re-runs verification after the main agent completes the fix turn until pass or a configurable maximum number of rounds is reached.

Rationale: an explicit verdict makes automation reliable, and a round limit prevents infinite repair loops caused by flaky checks, impossible policies, or verifier mistakes.

Alternative considered: let the main agent decide whether verifier output is satisfactory. This is more flexible but makes the loop less reliable and easier for the main agent to stop prematurely.

### Decision: Treat verification as a soft archive gate

The launcher prioritizes Verify after Apply when policies exist, and archive prompts may warn when a configured verifier has not passed for the current change. Archive remains possible with user confirmation.

Rationale: verifier agents can be wrong or blocked. The user should remain able to archive intentionally.

Alternative considered: hard-block archive until verification passes. This would be safer but too brittle for a local workflow tool.

### Decision: Track verification pass state against current change/diff when practical

When running inside a git repository, record a hash of the current diff and the loaded policy contents when verification passes. The launcher and archive guidance can treat the pass as stale if the diff or policies change. If git state is unavailable, fall back to session-local pass state.

Rationale: a verification pass should not imply future edits are also verified.

Alternative considered: track only change name. This would be simpler but would allow stale verification to look current.

## Risks / Trade-offs

- Verifier policies may be overly broad or impossible → bound the loop and surface the final failure report to the user after the maximum round count.
- Test commands invoked by the verifier may mutate caches or generated files → the global verifier prompt should prefer safe commands and explicitly avoid intentional file modifications; projects can encode command expectations in policy files.
- Existing dirty worktree changes may confuse verification → the verifier prompt should focus on the OpenSpec change and current diff, and implementation can include changed-file/diff context where available.
- Post-apply detection may be imperfect → use `/opsx-verify` as a manual path and rely on OpenSpec CLI task state after apply rather than only prompt submission.
- Additional subagent calls cost time/tokens → ask the user before running verification after apply and keep the loop bounded.
