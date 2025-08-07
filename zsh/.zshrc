# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
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

# zsh theme
zinit ice depth=1; zinit light romkatv/powerlevel10k
# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
[[ ! -f ~/.p10k_ext.zsh ]] || source ~/.p10k_ext.zsh

# zsh plugins
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-completions
zinit light zsh-users/zsh-autosuggestions
zinit light Aloxaf/fzf-tab

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

# fzf-tab styling
zstyle ":fzf-tab:complete:brew-(install|uninstall|search|info):*-argument-rest" fzf-preview 'brew info $word'
zstyle ":fzf-tab:complete:*:*" fzf-preview 'bat --color=always $realpath 2>/dev/null || eza -1a --icons=always --color=always $realpath'
zstyle ":fzf-tab:*" fzf-min-height 50

# --- setup fzf theme ---
export FZF_DEFAULT_OPTS=" \
--color=bg+:#313244,bg:#1e1e2e,spinner:#f5e0dc,hl:#f38ba8 \
--color=fg:#cdd6f4,header:#f38ba8,info:#cba6f7,pointer:#f5e0dc \
--color=marker:#b4befe,fg+:#cdd6f4,prompt:#cba6f7,hl+:#f38ba8 \
--color=selected-bg:#45475a \
--color=border:#313244,label:#cdd6f4"

# history setup
HISTFILE=$HOME/.zhistory
SAVEHIST=1000
HISTSIZE=999
setopt share_history
setopt hist_expire_dups_first
setopt hist_ignore_dups
setopt hist_verify

# completion using arrow keys (based on history)
bindkey '^[[A' history-search-backward
bindkey '^[[B' history-search-forward

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

export EDITOR=nvim

# Highlight man pages
export MANPAGER="sh -c 'col -bx | bat -l man -p'"
export MANROFFOPT="-c"

# Highlight --help messages
alias -g -- -h="-h 2>&1 | bat --language=help --style=plain"
alias -g -- --help="--help 2>&1 | bat --language=help --style=plain"

# ---- Shell Integrations ----
eval "$(fzf --zsh)"
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
