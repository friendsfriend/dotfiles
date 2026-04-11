# GlazeWM

Windows tiling window manager, equivalent to AeroSpace on macOS.

## Setup

GlazeWM reads its config from `%USERPROFILE%\.glzr\glazewm\config.yaml`.

Run the install script to link this directory there:

```powershell
.\scripts\install-windows.ps1
```

This creates a **directory junction** (no admin rights required) from
`%USERPROFILE%\.glzr\glazewm` → `<dotfiles>/glazewm`.

If you prefer a real symbolic link instead, enable Developer Mode in
*Settings > System > For developers* and run:

```powershell
.\scripts\install-windows.ps1 -UseSymlink
```

## Keybindings

| Key | Action |
|---|---|
| `Alt+1..7` | Switch to workspace |
| `Alt+Shift+1..7` | Move window to workspace |
| `Alt+Left/Right/Up/Down` | Focus in direction |
| `Alt+F` | Toggle fullscreen |
| `Alt+W` | Close window |
| `Alt+Tab` | Previous workspace |
| `Alt+Ctrl+B` | Launch Brave |
| `Alt+V` | Toggle tiling direction |
| `Alt+Shift+Space` | Toggle float |
| `Alt+R` | Enter resize mode |
| `Alt+Shift+R` | Reload config |
| `Alt+Shift+E` | Exit GlazeWM |

## App-to-workspace rules

One example rule is provided (Brave → workspace 3). Add your own in the
`window_rules` section of `config.yaml` following the same pattern.
