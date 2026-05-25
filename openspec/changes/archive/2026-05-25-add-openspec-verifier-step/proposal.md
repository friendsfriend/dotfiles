## Why

The OpenSpec workflow currently moves directly from apply to archive once implementation tasks are complete. Some repositories need an independent, policy-driven verifier step after implementation so a separate agent can check project-specific quality rules and feed failures back to the main agent before archive.

## What Changes

- Add an OpenSpec verify workflow action that runs after apply and before archive when verifier policies are configured for the repository.
- Add a globally defined OpenSpec verifier agent/runner in the dotfiles Pi resources.
- Load all project-local verifier policy Markdown files from `.pi/verifier/*.md` and inject them into the verifier agent.
- Integrate verification into the existing OpenSpec launcher and `/opsx-*` command family with `/opsx-verify <change>`.
- Prompt the user after completed apply work to run verification when project verifier policies exist.
- Feed verifier failures back to the main agent and continue a bounded fix-and-verify loop until the verifier passes or the maximum round count is reached.
- Keep archive user-controllable while making verification the recommended next action after apply when policies exist.

## Capabilities

### New Capabilities
- `openspec-verification`: Defines the OpenSpec verification workflow step, global verifier agent behavior, project policy loading, verdict handling, and bounded feedback loop.

### Modified Capabilities
- `openspec-pi-launcher`: Adds verify workflow action discovery, candidate selection, workflow-stage ordering, prompt tracking, and post-apply verify prompting to the existing launcher behavior.

## Impact

- Affected Pi resources:
  - `pi/extensions/openspec-launcher/index.ts`
  - `pi/extensions/openspec-launcher/openspec-launcher.test.ts`
  - new verifier extension/resource files under `pi/extensions/openspec-verifier/`
  - new `/opsx-verify` prompt and optional `openspec-verify-change` skill resources
  - archive/apply prompt or skill text where needed to reference the verify step
- Affected OpenSpec specs:
  - new `openspec-verification` capability spec
  - delta requirements for `openspec-pi-launcher`
- New project convention:
  - project verifier policies live under `.pi/verifier/*.md`
- No core Pi changes are required.
