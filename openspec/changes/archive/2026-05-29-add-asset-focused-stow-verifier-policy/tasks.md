## 1. Repository Verifier Policy

- [x] 1.1 Create `.pi/verifier/` if it does not already exist.
- [x] 1.2 Add `.pi/verifier/stow-installation.md` with an asset-focused policy that classifies changed files as installable assets, exempt repository files, or ambiguous cases.
- [x] 1.3 Document acceptable installation coverage evidence, including `stow_folder`, `stow_file`, explicit symlink commands, and helper-based coverage such as `stow_pi_agent_assets`.
- [x] 1.4 Document exemptions for non-installable paths such as OpenSpec artifacts, scripts, documentation, generated graph output, dependency lists, Git metadata, and verifier policy files.
- [x] 1.5 Include Pi agent asset rules for `pi/extensions/`, `pi/prompts/`, `pi/skills/`, and any future Pi asset categories.

## 2. Verification and Spec Checks

- [x] 2.1 Confirm the policy is a direct child Markdown file under `.pi/verifier/` so the existing verifier extension can load it.
- [x] 2.2 Run OpenSpec validation for `add-asset-focused-stow-verifier-policy` and fix any artifact issues.
- [x] 2.3 Review the policy against `scripts/stow.sh` to ensure current repository assets would be classified correctly.
- [x] 2.4 Verify repository status shows the intended new policy and OpenSpec change artifacts only.
