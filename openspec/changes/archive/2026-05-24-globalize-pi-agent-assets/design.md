## Context

Pi auto-discovers global extensions, prompt templates, and skills from `~/.pi/agent/extensions/`, `~/.pi/agent/prompts/`, and `~/.pi/agent/skills/`. It also auto-discovers project-local assets from `.pi/extensions/`, `.pi/prompts/`, and `.pi/skills/`.

This repository currently stores pi assets under project-local `.pi/` paths:

```text
.pi/extensions/
.pi/prompts/
.pi/skills/
```

That makes the assets available in this repository but not in other pi sessions. The repository also contains generated `.pi/memory/` files, which are runtime data and should not be treated like installable source assets.

## Goals / Non-Goals

**Goals:**

- Move source-controlled pi agent assets into a visible dotfiles area named `pi/`.
- Install/link those assets into global pi discovery locations using `scripts/stow.sh`.
- Keep pi runtime state and generated data out of source-controlled/stow-managed asset installation.
- Preserve extension, prompt, and skill behavior after relocation.
- Make installation available through existing `DOTFILES_ENV` profiles.

**Non-Goals:**

- Redesigning memory storage; hybrid memory storage is handled by a separate change.
- Managing `~/.pi/agent/auth.json`, `settings.json`, `sessions/`, installed packages, or launcher state.
- Packaging these assets as npm/git pi packages in this change.
- Changing prompt template or skill content beyond path relocation needs.

## Decisions

### Use `pi/` as the source-controlled dotfiles package root

The repository should maintain pi agent assets under:

```text
pi/extensions/
pi/prompts/
pi/skills/
```

This avoids conflating source-controlled assets with project-local `.pi/` runtime/discovery behavior and makes the area visible in normal file listings.

Alternative considered: keep using `.pi/` and stow from there. Rejected because `.pi/` is also where project-local runtime/generated files currently live, making it too easy to accidentally source-control or stow generated memory data.

### Link only individual asset items into `~/.pi/agent/`

The stow script should create or reuse the global pi agent asset directories:

```text
~/.pi/agent/extensions/
~/.pi/agent/prompts/
~/.pi/agent/skills/
```

It should then symlink each repository-managed extension, prompt template, and skill item into the matching directory. The script must not replace or own the asset directories themselves, because a user may have additional machine-local pi assets installed there. Runtime state files and directories under `~/.pi/agent/` must also be left alone.

Alternative considered: stow an entire `pi` package directly to `$HOME` or stow the full asset directories. Rejected because it could conflict with existing `~/.pi/agent` runtime state or machine-local pi assets and make rollback/destructive cleanup riskier.

### Apply pi asset linking consistently across relevant profiles

The `minimal`, `work`, and `omarchy` profiles should all install the global pi assets, because the intent is to improve pi usage across the system rather than only one desktop profile.

Alternative considered: install only in macOS profiles. Rejected because pi itself is cross-platform and the existing repository has multiple OS/profile bootstrap flows.

### Preserve local generated memory separately

Generated `.pi/memory/` files should not be moved as part of this asset relocation. Existing local generated memory can remain in place until the hybrid memory storage change migrates it explicitly.

Alternative considered: move all `.pi/` content into `pi/`. Rejected because memory entries, backups, corrupt quarantines, and generated indexes are runtime data rather than installable assets.

## Risks / Trade-offs

- Existing project-local `.pi` discovery may stop loading assets in this repository after the move → The global symlinks must be installed before relying on the moved assets in new sessions.
- Stow conflicts may occur if `~/.pi/agent/extensions`, `prompts`, or `skills` already contain real files → Detect or fail visibly rather than overwrite runtime/user-managed files silently.
- Hidden references to `.pi/extensions`, `.pi/prompts`, or `.pi/skills` may remain in docs/specs → Search and update relevant source-controlled references during implementation.
- Runtime files or machine-local assets under `~/.pi/agent` could be damaged by over-broad linking → Keep linking limited to explicit repository-managed asset items.
