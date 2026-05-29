## Context

The repository already has an OpenSpec verifier extension that loads direct child Markdown policy files from `.pi/verifier/` and injects them into an independent read-only verifier agent. The current repository has no project-local verifier policies, so verification has no repository-specific rule for catching dotfile assets that are added to source control but omitted from `scripts/stow.sh`.

`scripts/stow.sh` is the installation entrypoint for supported profiles. It links standard config directories with `stow_folder`, installs Pi agent assets through `stow_pi_agent_assets`, and handles a few explicit symlink cases such as SketchyBar profile entrypoints, Aerospace config, and Voxtype's macOS application-support path.

## Goals / Non-Goals

**Goals:**

- Add a project-local verifier policy that focuses on changed installable dotfile assets rather than every changed repository file.
- Make the policy concrete enough for the verifier agent to inspect `git diff --name-only`, `scripts/stow.sh`, and OpenSpec change artifacts.
- Require failures when a new or materially changed user-facing asset is not reachable through the stow script and no explicit non-installable rationale exists.
- Keep verifier mechanics unchanged by using the existing `.pi/verifier/*.md` policy-loading behavior.

**Non-Goals:**

- Do not implement a static analyzer or parser for `scripts/stow.sh`.
- Do not require all repository changes to be stow-installed; specs, docs, scripts, generated graph output, and repository-local policy files can be exempt.
- Do not change profile behavior in `scripts/stow.sh` unless implementation reveals that a changed asset is genuinely missing from the install flow.
- Do not alter the global `openspec-verifier` extension.

## Decisions

### Use a Markdown verifier policy instead of extension code

The policy will be implemented as `.pi/verifier/stow-installation.md`. This uses the existing verifier policy loading contract and keeps repository-specific judgments separate from global verifier mechanics.

Alternative considered: add hard-coded stow checks to the verifier extension. That would make the extension dotfiles-specific and reduce reuse for other OpenSpec projects.

### Classify changed files by installability

The policy will instruct the verifier to classify changed files into installable assets, exempt repository files, or unclear cases. Installable assets include user-facing config areas and Pi agent assets. Exempt paths include OpenSpec artifacts, scripts, docs, generated graph output, Git metadata, and verifier policy files themselves. `.pi/verifier/*.md` files are repository-local verification configuration and should not be stowed into global Pi agent config.

Alternative considered: require every changed path to appear in `scripts/stow.sh`. That is too strict for documentation, specifications, scripts, and the policy file that enables this verification.

### Verify coverage through script reachability, not exact command syntax

The verifier should accept coverage when an asset is reachable through `stow_folder`, `stow_file`, explicit `ln -s`/`ln -sf`, or helper functions such as `stow_pi_agent_assets`. For profile-specific assets, coverage should be checked against the relevant `DOTFILES_ENV` branch.

Alternative considered: require a single standardized linking helper for all assets. That would be cleaner long-term, but it is unnecessary for the policy and would broaden the change into a stow script refactor.

### Allow explicit non-installable rationale

If a changed asset-like path is intentionally not installed, the verifier can pass only when the change artifacts explain that rationale. This preserves flexibility for experiments, source-only assets, or future assets installed by another mechanism.

Alternative considered: force every asset-like path to be stowed immediately. That risks blocking legitimate source-only changes.

## Risks / Trade-offs

- **Verifier judgment is language-model based** → The policy must be specific and checklist-oriented to reduce ambiguity.
- **False positives for unusual assets** → Allow explicit rationale in proposal/design/tasks/specs when a path is intentionally not installed.
- **False negatives for indirect installation** → Require the verifier to inspect both changed files and the actual `scripts/stow.sh` flow rather than trusting directory names alone.
- **Policy file under `.pi/` may look like hidden runtime state** → Scope the new capability as repository-local verifier policy, not Pi agent runtime state, global Pi agent config, or source-controlled Pi agent assets.
