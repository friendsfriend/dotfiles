// Reused from ~/devenv/tui Catppuccin UI palette.
export const colors = {
  red: '#f38ba8', peach: '#fab387', yellow: '#f9e2af', green: '#a6e3a1',
  teal: '#94e2d5', sky: '#89dceb', blue: '#89b4fa', lavender: '#b4befe',
  text: '#cdd6f4', subtext1: '#bac2de', overlay2: '#9399b2', overlay0: '#6c7086',
  surface1: '#45475a', surface0: '#313244', base: '#1e1e2e', mantle: '#181825', crust: '#11111b',
} as const;

export const uiColors = {
  primary: colors.blue,
  success: colors.green,
  warning: colors.yellow,
  error: colors.red,
  info: colors.sky,
  accent: colors.lavender,
  textPrimary: colors.text,
  textSecondary: colors.subtext1,
  textMuted: colors.overlay2,
  bgBase: colors.base,
  bgMantle: colors.mantle,
  bgCrust: colors.crust,
  bgSurface0: colors.surface0,
  bgSurface1: colors.surface1,
  border: colors.surface1,
} as const;
