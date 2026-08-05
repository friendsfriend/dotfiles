#!/usr/bin/env zsh
# XDG config home (iris + other tools)
export XDG_CONFIG_HOME="$HOME/.config"
export PATH="$HOME/.pi/agent/bin:$HOME/.local/bin:$PATH"

# Herdr server may inherit stale IRIS_* from its launching shell. Keep valid
# values in iris's child shell, where iris is the direct parent.
if [ -n "$HERDR_ENV" ] && [ -n "$IRIS_PID" ] && [ "$PPID" != "$IRIS_PID" ]; then
  unset IRIS_PID IRIS_IS_CHILD IRIS_FD
fi

# Run before other shell setup: iris replaces this shell, then its child zsh
# loads the complete config once.
if (( $+commands[iris] )); then
  eval "$(iris init zsh)"
fi

# Zinit plugin manager
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
[ ! -d $ZINIT_HOME ] && mkdir -p "$(dirname $ZINIT_HOME)"
[ ! -d $ZINIT_HOME/.git ] && git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
source "${ZINIT_HOME}/zinit.zsh"

# Override macos path for ruby
if [ -d "/opt/homebrew/opt/ruby/bin" ]; then
  export PATH=/opt/homebrew/opt/ruby/bin:$PATH
  export PATH=`gem environment gemdir`/bin:$PATH
fi

# zsh plugins
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-completions

# Load completions
if type brew &>/dev/null; then
  fpath=("$(brew --prefix)/share/zsh/site-functions" $fpath)
fi
fpath=($HOME/.zfunc $fpath)
autoload -U compinit
compinit

# Completion styling
zstyle ":completion:*" list-colors '${(s.:.)LS_COLORS}'
zstyle ":completion:*" menu no

# Persistent history backend indexed by IRIS
HISTFILE="$HOME/.zhistory"
HISTSIZE=1000
SAVEHIST=1000
setopt share_history

# ----- Bat (better cat) -----
export BAT_THEME="Catppuccin Mocha"

# ---- Alias -----------------
alias ls="eza -1a --icons=always --color=always"
alias vim="nvim"
alias v="nvim"
alias cat="bat"
alias find="fd"
alias rm="rm -i"
alias cd..="cd .."
eval $(thefuck --alias)
eval $(thefuck --alias fk)
alias cd="z"
alias top="btop"
alias npm="pnpm"

export EDITOR=nvim

# Highlight man pages
export MANPAGER="sh -c 'col -bx | bat -l man -p'"
export MANROFFOPT="-c"

# Highlight --help messages
alias -g -- -h="-h 2>&1 | bat --language=help --style=plain"
alias -g -- --help="--help 2>&1 | bat --language=help --style=plain"

# ---- Shell Integrations ----
eval "$(zoxide init zsh)"

if [ -f ~/.zshrc_local ]; then
    source ~/.zshrc_local
fi

# makes yazi open files with the default app configured by the OS
# Also adds y as an alias to open yazi
function y() {
	local tmp="$(mktemp -t "yazi-cwd.XXXXXX")" cwd
	yazi "$@" --cwd-file="$tmp"
	if cwd="$(command cat -- "$tmp")" && [ -n "$cwd" ] && [ "$cwd" != "$PWD" ]; then
		builtin cd -- "$cwd"
	fi
	rm -f -- "$tmp"
}

# Ctrl+X Ctrl+E -> Edit current command in editor
autoload -z edit-command-line
zle -N edit-command-line
bindkey "^E" edit-command-line

# bun completions
[ -s "/Users/fabiankellner/.bun/_bun" ] && source "/Users/fabiankellner/.bun/_bun"

# pnpm
export PNPM_HOME="/Users/fabiankellner/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME/bin:"*) ;;
  *) export PATH="$PNPM_HOME/bin:$PATH" ;;
esac
# pnpm end

# Pi
export PATH="/opt/homebrew/bin:$PATH"

# Prompt
ZLE_RPROMPT_INDENT=0
export STARSHIP_CONFIG="$HOME/.config/starship/starship.toml"
if (( $+commands[starship] )); then
  eval "$(starship init zsh)"
fi
