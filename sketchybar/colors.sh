#!/usr/bin/env bash

source "${DOTFILES_DIR:-$HOME/dotfiles}/scripts/theme-colors.sh"

export WHITE=0xffffffff
export BAR_COLOR="$(theme_ansi muted)"
export FONT_COLOR="$(theme_ansi foreground)"
export ITEM_BACKGROUND="$(theme_ansi background)"
export ITEM_BACKGROUND_COLOR="$ITEM_BACKGROUND"
export ITEM_BACKGROUND_BORDER_COLOR="$(theme_ansi_alpha foreground 66)"
export ALERT_RED="$(theme_ansi red)"
export ALERT_YELLOW="$(theme_ansi yellow)"
export ALERT_PURPLE="$(theme_ansi accent)"
