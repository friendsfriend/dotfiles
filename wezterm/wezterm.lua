local wezterm = require 'wezterm'
local config = wezterm.config_builder()
local act = wezterm.action

-- ── Appearance ────────────────────────────────────────────────────────────────

-- Use current Omarchy colors when available; fall back to Catppuccin Mocha.
local fallback_colors = {
  background = '#1e1e2e',
  foreground = '#cdd6f4',
  bright_foreground = '#cdd6f4',
  cursor = '#cdd6f4',
  accent = '#89b4fa',
  muted = '#585b70',
  red = '#f38ba8',
  green = '#a6e3a1',
  yellow = '#f9e2af',
  blue = '#89b4fa',
  magenta = '#f5c2e7',
  cyan = '#94e2d5',
  bright_red = '#f38ba8',
  bright_green = '#a6e3a1',
  bright_yellow = '#f9e2af',
  bright_blue = '#89b4fa',
  bright_magenta = '#f5c2e7',
  bright_cyan = '#94e2d5',
}

local function load_omarchy_colors()
  if package.config:sub(1, 1) == '\\' then return nil end

  local home = os.getenv('HOME')
  if not home then return nil end

  local theme_file = home .. '/.local/state/omarchy/current/theme/colors.toml'
  local file = io.open(theme_file, 'r')
  if not file then return nil end
  file:close()

  local probe = io.popen('command -v omarchy-theme-color 2>/dev/null')
  if not probe then return nil end
  local available = probe:read('*l')
  probe:close()
  if not available or available == '' then return nil end

  local colors = {}
  local command = string.format('omarchy-theme-color --file %q --all 2>/dev/null', theme_file)
  local output = io.popen(command)
  if not output then return nil end
  for line in output:lines() do
    local key, value = line:match('^([%w_]+)\t(#[%x]+)$')
    if key and value then colors[key] = value end
  end
  output:close()
  return colors.background and colors.foreground and colors or nil
end

local omarchy_colors = load_omarchy_colors()
if omarchy_colors then
  local colors = fallback_colors
  for key, value in pairs(omarchy_colors) do colors[key] = value end

  config.colors = {
    background = colors.background,
    foreground = colors.foreground,
    cursor_bg = colors.cursor,
    cursor_fg = colors.background,
    -- Invert theme foreground/background for readable selection.
    selection_bg = colors.foreground,
    selection_fg = colors.background,
    ansi = {
      colors.background,
      colors.red,
      colors.green,
      colors.yellow,
      colors.blue,
      colors.magenta,
      colors.cyan,
      colors.foreground,
    },
    brights = {
      colors.muted,
      colors.bright_red,
      colors.bright_green,
      colors.bright_yellow,
      colors.bright_blue,
      colors.bright_magenta,
      colors.bright_cyan,
      colors.bright_foreground,
    },
  }
else
  config.color_scheme = 'Catppuccin Mocha'
end

-- Mirrors ghostty: font-family = MesloLGL Nerd Font / font-size = 16
config.font = wezterm.font('MesloLGL Nerd Font')
config.font_size = 16.0

-- Mirrors ghostty: window-padding-x/y = 10
config.window_padding = {
  left   = 10,
  right  = 10,
  top    = 10,
  bottom = 10,
}

-- Mirrors ghostty: macos-titlebar-style = hidden
-- RESIZE keeps the window resizable without showing a full title bar.
config.window_decorations = 'RESIZE'

-- Hide the tab bar (tmux handles multiplexing instead)
config.enable_tab_bar = false

-- Use PowerShell 7 (pwsh) if available, otherwise fall back to Windows PowerShell 5.1.
-- Automatically picks up pwsh once installed without needing to change this config.
local function get_powershell()
  local is_windows = package.config:sub(1, 1) == '\\'
  local command = is_windows and 'where pwsh 2>NUL' or 'command -v pwsh 2>/dev/null'
  local handle = io.popen(command)
  if handle then
    local result = handle:read('*l')
    handle:close()
    if result and result ~= '' then
      return { 'pwsh', '-NoLogo' }
    end
  end
  return is_windows and { 'powershell.exe', '-NoLogo' } or nil
end

config.default_prog = get_powershell()

-- ── Behaviour ─────────────────────────────────────────────────────────────────

-- Mirrors ghostty: confirm-close-surface = false
config.window_close_confirmation = 'NeverPrompt'

-- Mirrors ghostty: quit-after-last-window-closed = false
config.quit_when_all_windows_are_closed = false

-- ── Keybindings (tmux passthrough) ────────────────────────────────────────────
-- All bindings mirror ghostty/keybinds using the same tmux sequences.
-- On Windows, SUPER = Win key. Win+1-9 may conflict with Windows taskbar
-- shortcuts — disable those in Settings > Personalisation > Taskbar if needed.

config.keys = {
  -- New WezTerm window (Ctrl+Alt+T)
  -- Mirrors ghostty: global:ctrl+alt+t=new_window
  { key = 't', mods = 'CTRL|ALT', action = act.SpawnWindow },

  -- Switch to tmux window 1-9 (Win+N → Ctrl+b N)
  -- Mirrors ghostty: super+digit_N=text:\x02\xNN
  { key = '1', mods = 'SUPER', action = act.SendString('\x021') },
  { key = '2', mods = 'SUPER', action = act.SendString('\x022') },
  { key = '3', mods = 'SUPER', action = act.SendString('\x023') },
  { key = '4', mods = 'SUPER', action = act.SendString('\x024') },
  { key = '5', mods = 'SUPER', action = act.SendString('\x025') },
  { key = '6', mods = 'SUPER', action = act.SendString('\x026') },
  { key = '7', mods = 'SUPER', action = act.SendString('\x027') },
  { key = '8', mods = 'SUPER', action = act.SendString('\x028') },
  { key = '9', mods = 'SUPER', action = act.SendString('\x029') },

  -- Sesh session picker (Win+o → Ctrl+b T)
  -- Mirrors ghostty: super+o=text:\x02\x54
  { key = 'o', mods = 'SUPER', action = act.SendString('\x02T') },

  -- Last sesh session (Win+u → Ctrl+b L)
  -- Mirrors ghostty: super+u=text:\x02\x4c
  { key = 'u', mods = 'SUPER', action = act.SendString('\x02L') },

  -- New tmux window (Win+t → Ctrl+b c)
  -- Mirrors ghostty: super+t=text:\x02\x63
  { key = 't', mods = 'SUPER', action = act.SendString('\x02c') },

  -- Close tmux pane (Win+w → Ctrl+b x)
  -- Mirrors ghostty: super+w=text:\x02\x78
  { key = 'w', mods = 'SUPER', action = act.SendString('\x02x') },

  -- Tmux window picker via fzf (Win+p → Ctrl+b w)
  -- Mirrors ghostty: super+p=text:\x02\x77
  { key = 'p', mods = 'SUPER', action = act.SendString('\x02w') },

  -- Rename tmux window (Win+r → Ctrl+b ,)
  -- Mirrors ghostty: super+r=text:\x02\x2c
  { key = 'r', mods = 'SUPER', action = act.SendString('\x02,') },

  -- Previous tmux window (Win+h → Ctrl+b p)
  -- Mirrors ghostty: super+h=text:\x02\x70
  { key = 'h', mods = 'SUPER', action = act.SendString('\x02p') },

  -- Next tmux window (Win+l → Ctrl+b n)
  -- Mirrors ghostty: super+l=text:\x02\x6e
  { key = 'l', mods = 'SUPER', action = act.SendString('\x02n') },

  -- Horizontal split (Win+- → Ctrl+b ")
  -- Mirrors ghostty: super+-=text:\x02\x22
  { key = '-', mods = 'SUPER', action = act.SendString('\x02"') },

  -- Vertical split (Win+\ → Ctrl+b %)
  -- Mirrors ghostty: super+\=text:\x02\x25
  { key = '\\', mods = 'SUPER', action = act.SendString('\x02%') },
}

return config
