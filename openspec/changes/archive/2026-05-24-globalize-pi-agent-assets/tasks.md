## 1. Source Layout Migration

- [x] 1.1 Create the visible `pi/` dotfiles asset layout with `pi/extensions/`, `pi/prompts/`, and `pi/skills/`.
- [x] 1.2 Move source-controlled extension directories from `.pi/extensions/` to `pi/extensions/` without changing extension behavior.
- [x] 1.3 Move prompt templates from `.pi/prompts/` to `pi/prompts/` without changing prompt content except path-sensitive references if needed.
- [x] 1.4 Move skills from `.pi/skills/` to `pi/skills/` without changing skill behavior except path-sensitive references if needed.
- [x] 1.5 Leave generated `.pi/memory/` data out of the new `pi/` asset layout.

## 2. Stow Installation

- [x] 2.1 Update `scripts/stow.sh` to create the required global pi agent target directories under `~/.pi/agent/`.
- [x] 2.2 Add stow/linking for pi extensions into `~/.pi/agent/extensions/` for supported setup profiles.
- [x] 2.3 Add stow/linking for pi prompts into `~/.pi/agent/prompts/` for supported setup profiles.
- [x] 2.4 Add stow/linking for pi skills into `~/.pi/agent/skills/` for supported setup profiles.
- [x] 2.5 Ensure stow logic does not replace or manage `~/.pi/agent/auth.json`, `settings.json`, `sessions/`, package installs, launcher state, or generated memory.
- [x] 2.6 Link individual pi asset items without replacing the global asset directories, preserving machine-local extensions, prompts, and skills.

## 3. Reference Updates

- [x] 3.1 Search source-controlled files for `.pi/extensions`, `.pi/prompts`, and `.pi/skills` references that now need `pi/` source-layout references.
- [x] 3.2 Update relevant OpenSpec artifacts, documentation, or scripts that describe source-controlled pi asset locations.
- [x] 3.3 Preserve references to pi's runtime discovery locations when they intentionally refer to `~/.pi/agent/...` or project-local `.pi/...` behavior.

## 4. Validation

- [x] 4.1 Run the stow script in a safe profile or dry-run-equivalent environment and verify intended pi asset links are created or reported.
- [x] 4.2 Verify pi can discover the globally installed extensions, prompts, and skills after linking.
- [x] 4.3 Verify project/runtime generated memory is not moved into `pi/` by this change.
- [x] 4.4 Run TypeScript syntax/type validation appropriate for relocated pi extensions.
- [x] 4.5 Run OpenSpec validation for the change artifacts.
