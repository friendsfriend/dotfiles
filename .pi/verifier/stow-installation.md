# Stow Installation Coverage Policy

This repository uses `scripts/stow.sh` as the installation entrypoint for source-controlled dotfile assets. When verifying an OpenSpec change, check that changed installable assets are reachable from the stow script, while avoiding false failures for repository files that are not intended to be installed.

## Required evidence

Before returning `VERDICT: PASS`, inspect:

1. The current changed-file list or git diff when available.
2. `scripts/stow.sh`.
3. The selected OpenSpec change artifacts when installability is ambiguous, especially `proposal.md`, `design.md`, `tasks.md`, and affected specs.

If changed-file context or `scripts/stow.sh` cannot be inspected, return `VERDICT: FAIL` or an inconclusive failure rather than passing without evidence.

## Changed-file classification

Classify each changed path as one of:

- **Installable asset**: a source-controlled user-facing dotfile/configuration asset that should be linked or installed into a user config/runtime location by setup.
- **Exempt repository file**: a file that is not itself installed as a dotfile asset.
- **Ambiguous**: an asset-like path whose installation intent is unclear from the path alone.

For ambiguous paths, inspect the change artifacts. PASS only if the artifacts either show stow coverage or explicitly explain why the path is intentionally non-installable.

## Installable asset examples

Treat these as installable assets unless the change artifacts explicitly say otherwise:

- Top-level dotfile/config areas such as `nvim/`, `zsh/`, `ghostty/`, `sketchybar/`, `tmux/`, `sesh/`, `btop/`, `fastfetch/`, `p10k/`, `opencode/`, `voxtype/`, `aerospace/`, `ideavim/`, `hyprland/`, `waybar/`, and `walker/`.
- Profile-specific config entrypoints under installable areas, such as SketchyBar or Aerospace profile files.
- Source-controlled Pi agent assets under `pi/extensions/`, `pi/prompts/`, and `pi/skills/`.
- Any new source-controlled top-level configuration directory intended for use after setup.

## Exempt path examples

Do not require stow installation coverage for these paths unless the change artifacts explicitly describe them as installable user-facing assets:

- `openspec/` change/spec artifacts.
- `.pi/verifier/*.md` verifier policy files. These policies are repository-local verification configuration and MUST NOT be stowed or linked into global Pi agent config.
- `scripts/` implementation files.
- Documentation such as `README.md` and other Markdown files outside installable asset directories.
- Generated graph output under `graphify-out/`.
- Dependency/package list files such as `scripts/brew-minimal.txt`, `scripts/brew-work.txt`, `scripts/omarchy.txt`, and related setup input lists.
- Git metadata and ignore/config files such as `.gitignore`.

## Acceptable stow coverage evidence

An installable asset is covered when `scripts/stow.sh` reaches it for the relevant supported `DOTFILES_ENV` profile through one of these mechanisms:

- `stow_folder <target> <source>` where `<source>` is the asset directory or a parent that installs the changed asset.
- `stow_file <target> <source>` where `<source>` is the changed file or a parent-managed source.
- Explicit symlink commands such as `ln -s`, `ln -sf`, or `ln -sfn` for profile-specific files.
- A helper invoked by the relevant profile that links the changed asset category.

For profile-specific assets, verify coverage against the appropriate `minimal`, `work`, or `omarchy` branch. If the affected profile is unclear, require either coverage in all relevant profiles or an explicit rationale in the change artifacts.

## Pi agent assets

`pi/extensions/`, `pi/prompts/`, and `pi/skills/` are installable Pi agent asset categories. They are covered when `scripts/stow.sh` invokes `stow_pi_agent_assets` and that helper links each category into the corresponding `$HOME/.pi/agent/` discovery directory.

If a change introduces a new Pi agent asset category outside `pi/extensions/`, `pi/prompts/`, or `pi/skills/`, require `scripts/stow.sh` to link that category into the correct Pi discovery location, or require the change artifacts to explain why the category is intentionally non-installable.

## Failure conditions

Return `VERDICT: FAIL` when:

- A changed installable asset is not reachable from `scripts/stow.sh` for any relevant supported setup profile.
- A changed asset-like path is ambiguous and the change artifacts do not explain whether it should be installed.
- A new Pi agent asset category is added but `scripts/stow.sh` does not link it and the change artifacts do not justify that omission.
- Required evidence cannot be inspected.

Return `VERDICT: PASS` only when every changed installable asset is covered by the stow script or has an explicit, in-scope non-installable rationale in the OpenSpec change artifacts.
