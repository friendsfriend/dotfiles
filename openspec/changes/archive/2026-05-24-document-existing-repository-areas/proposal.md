## Why

The repository contains many existing dotfile areas and setup scripts, but there are currently no OpenSpec specs describing their intended behavior. Capturing the current repository-area contracts will make future changes safer by documenting what each area is responsible for and which profile/platform flows must keep working.

## What Changes

- Add baseline specs for existing repository areas instead of introducing new runtime behavior.
- Document setup/profile behavior for scripts, including macOS, Omarchy/Linux, and Windows linking flows.
- Document desktop/window-manager areas such as AeroSpace, GlazeWM, Hyprland, SketchyBar, and Waybar.
- Document terminal/editor/tooling areas such as Ghostty, Neovim, Zsh, IdeaVim, keyboard layouts, and terminal utilities.
- No application/config implementation changes are intended as part of this change.

## Capabilities

### New Capabilities
- `scripts`: Bootstrap, dependency installation, profile selection, stow linking, Omarchy setup, Windows link installation, and helper scripts.
- `aerospace`: macOS AeroSpace tiling window manager configuration for workspace and monitor behavior.
- `glazewm`: Windows GlazeWM tiling window manager configuration, keybindings, and app-to-workspace behavior.
- `hyprland`: Omarchy Hyprland configuration split across startup, bindings, input, visual, monitor, plugin, portal, idle/lock, and window-rule files.
- `sketchybar`: macOS SketchyBar status bar configuration with minimal/work variants, items, plugins, and resources.
- `waybar`: Omarchy Waybar status bar configuration and styling.
- `ghostty`: Ghostty terminal configuration, options, keybinds, and theme behavior.
- `nvim`: Neovim configuration entrypoint and expected editor configuration ownership.
- `zsh`: Zsh shell configuration, Powerlevel10k integration, and local override behavior.
- `keyboard-layouts`: macOS custom keyboard layout bundle installation and input-source configuration.
- `ideavim`: IntelliJ IdeaVim and Ataman configuration for Vim-like IDE behavior.
- `terminal-tools`: Supporting terminal/system tools including btop, fastfetch, tmux, sesh, p10k, WezTerm, Walker, linux-audio, and opencode assets.
- `windows`: Windows-specific dotfile linking for GlazeWM, Zebar, WezTerm, and Neovim.

### Modified Capabilities

None.

## Impact

- Adds OpenSpec documentation under `openspec/changes/document-existing-repository-areas/specs/` and implementation tasks for promoting those specs.
- Does not change shell scripts, application configuration files, package lists, or runtime behavior.
- Future changes can validate against these baseline specs to avoid accidentally breaking existing dotfile behavior.
