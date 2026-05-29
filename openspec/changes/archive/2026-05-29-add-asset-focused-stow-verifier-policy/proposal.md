## Why

Repository changes can add or modify source-controlled dotfile assets that are never installed by `scripts/stow.sh`, leaving apparently completed OpenSpec work unavailable after setup. The existing verifier workflow can load project-local policy files, but this repository does not yet define a policy that checks asset installation coverage.

## What Changes

- Add an asset-focused repository verifier policy under `.pi/verifier/` that requires installable user-facing dotfile assets to be covered by `scripts/stow.sh`.
- Define practical exemptions for non-installable repository files such as OpenSpec artifacts, scripts, docs, generated graph output, and verifier policy files.
- Require the verifier to inspect changed files, `scripts/stow.sh`, and relevant change artifacts before passing a change.
- Document that this repository's verification behavior includes asset installation coverage for stow-managed dotfiles.

## Capabilities

### New Capabilities

- `dotfiles-verifier-policies`: Project-local verifier policies that enforce repository-specific OpenSpec verification rules for dotfiles changes.

### Modified Capabilities

- `scripts`: Document that stow-managed linking is protected by repository verification policy for changed installable assets.

## Impact

- Adds `.pi/verifier/stow-installation.md` as a project-local verifier policy consumed by the existing `openspec-verifier` extension.
- Updates OpenSpec specifications for repository verifier policies and stow-managed linking expectations.
- No runtime dependency changes and no changes to the verifier extension mechanics are expected.
