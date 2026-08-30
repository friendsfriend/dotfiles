# Shared semantic palette for shell-based dotfiles.
# Omarchy wins when its resolver and colors.toml exist; Catppuccin Mocha is fallback.

THEME_COLORS_FILE="${OMARCHY_COLORS_FILE:-$HOME/.local/state/omarchy/current/theme/colors.toml}"

theme_is_omarchy() {
  command -v omarchy-theme-color >/dev/null 2>&1 && [[ -f "$THEME_COLORS_FILE" ]]
}

theme_color() {
  local key="${1:-}"

  if theme_is_omarchy; then
    omarchy-theme-color --file "$THEME_COLORS_FILE" "$key"
    return
  fi

  case "$key" in
    accent) printf '#89b4fa' ;;
    selection|selection_background) printf '#45475a' ;;
    muted) printf '#585b70' ;;
    background) printf '#1e1e2e' ;;
    dark_background) printf '#181825' ;;
    darker_background) printf '#11111b' ;;
    lighter_background) printf '#313244' ;;
    foreground) printf '#cdd6f4' ;;
    dark_foreground) printf '#6c7086' ;;
    light_foreground) printf '#bac2de' ;;
    bright_foreground|cursor|selection_foreground) printf '#cdd6f4' ;;
    red) printf '#f38ba8' ;;
    yellow) printf '#f9e2af' ;;
    orange) printf '#fab387' ;;
    green) printf '#a6e3a1' ;;
    cyan) printf '#94e2d5' ;;
    blue) printf '#89b4fa' ;;
    magenta|purple) printf '#f5c2e7' ;;
    brown) printf '#fab387' ;;
    bright_red) printf '#f38ba8' ;;
    bright_yellow) printf '#f9e2af' ;;
    bright_green) printf '#a6e3a1' ;;
    bright_cyan) printf '#94e2d5' ;;
    bright_blue) printf '#89b4fa' ;;
    bright_magenta|bright_purple) printf '#f5c2e7' ;;
    *) return 1 ;;
  esac
}

theme_ansi() {
  local color
  color=$(theme_color "$1") || return
  printf '0xff%s\n' "${color#\#}"
}

theme_ansi_alpha() {
  local color
  color=$(theme_color "$1") || return
  printf '0x%s%s\n' "$2" "${color#\#}"
}
