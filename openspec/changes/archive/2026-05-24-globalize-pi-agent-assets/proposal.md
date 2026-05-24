## Why

The repository's pi extensions, prompts, and skills currently live under project-local `.pi/` paths, so their commands and quality improvements only load when pi runs inside this repository. These agent assets should be dotfiles-managed source files that can be installed into the user's global pi agent configuration and improve all pi sessions.

## What Changes

- Move source-controlled pi agent assets from hidden `.pi/` source paths into a visible `pi/` dotfiles area.
- Use the dotfiles stow script to install pi extensions, prompt templates, and skills into pi's global agent discovery locations under `~/.pi/agent/`.
- Preserve pi runtime state such as authentication, settings, sessions, launcher state, installed packages, and generated memory as local user data rather than stow-managed repository files.
- Keep project/runtime generated memory out of the asset move; hybrid memory storage is handled by a separate change.
- Preserve existing extension, prompt, and skill contents while changing where they are maintained and installed from.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `scripts`: Extend stow-managed linking to install dotfiles-managed pi agent assets globally.

## Impact

- Affected source layout: `.pi/extensions/`, `.pi/prompts/`, and `.pi/skills/` move to `pi/extensions/`, `pi/prompts/`, and `pi/skills/`.
- Affected installation script: `scripts/stow.sh`.
- Affected specification: `openspec/specs/scripts/spec.md` via a change delta.
- Runtime user data under `~/.pi/agent/` must remain untouched except for installing/linking the intended asset subdirectories.
