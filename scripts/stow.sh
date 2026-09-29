#!/usr/bin/env bash
set -e

stow_folder() {
  local target="$1"
  local source="$2"

  # Check if both parameters are provided
  if [[ -z "$target" || -z "$source" ]]; then
    echo "Usage: stow_with_target_check <target> <source>"
    return 1
  fi

  # Create the target directory if it doesn't exist
  if [[ ! -d "$target" ]]; then
    echo "Target directory '$target' does not exist. Creating it..."
    mkdir -p "$target"
  fi

  # Run the stow command
  echo "Creating symlink for $3 from $source to $target"

  stow -t "$target" "$source"
}

link_btop_theme() {
  local target="$HOME/.config/btop/themes/current.theme"
  local source="$HOME/.config/btop/themes/catppuccin_mocha.theme"

  if [[ "$DOTFILES_ENV" == "omarchy" ]]; then
    source="$HOME/.local/state/omarchy/current/theme/btop.theme"
  fi

  ln -sfn "$source" "$target"
}

link_voxtype_macos_config() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    return 0
  fi

  local source="$HOME/.config/voxtype/config.toml"
  local target_dir="$HOME/Library/Application Support/voxtype"
  local target="$target_dir/config.toml"

  mkdir -p "$target_dir"

  if [[ -L "$target" ]]; then
    if [[ "$(readlink "$target")" == "$source" ]]; then
      echo "Voxtype macOS config symlink already exists. Skipping..."
      return 0
    fi

    echo "Updating Voxtype macOS config symlink from $target to $source"
    ln -sfn "$source" "$target"
    return 0
  fi

  if [[ -e "$target" ]]; then
    local backup="$target.backup.$(date +%Y%m%d-%H%M%S)"
    echo "Backing up existing Voxtype macOS config to $backup"
    mv "$target" "$backup"
  fi

  echo "Creating Voxtype macOS config symlink from $target to $source"
  ln -s "$source" "$target"
}

# Nothing else on macOS starts the daemon - the brew cask only ships the CLI
# binary, so without this F9 silently does nothing after a login/reboot.
# Voxtype.app is adhoc-signed and macOS ties the Accessibility/Input-Monitoring
# grant to that signature, so re-running app-bundle invalidates the grant and
# typing silently stops. Only install when missing; re-run by hand after
# `brew upgrade voxtype` (then re-grant permissions in System Settings).
setup_voxtype_macos_app() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    return 0
  fi

  if ! command -v voxtype >/dev/null 2>&1; then
    echo "voxtype not installed. Skipping app bundle setup..."
    return 0
  fi

  if [[ -d /Applications/Voxtype.app ]]; then
    echo "Voxtype.app already installed. Skipping..."
    return 0
  fi

  echo "Installing Voxtype.app (Login Item) so the daemon starts on login..."
  voxtype setup app-bundle
}

# Stow links the folders in the repository to the specified config locations so that the system finds them

cd ~/dotfiles || exit
case "$DOTFILES_ENV" in
minimal)
  stow_folder "$HOME"/.config/fastfetch/ fastfetch
  stow_folder "$HOME"/ zsh
  stow_folder "$HOME"/.config/nvim/ nvim
  stow_folder "$HOME"/.config/ghostty/ ghostty
  stow_folder "$HOME"/.config/herdr/ herdr
  stow_folder "$HOME"/.config/sketchybar/ sketchybar
  ln -sf ~/dotfiles/sketchybar/minimal/sketchybarrc "$HOME"/.config/sketchybar/sketchybarrc
  mkdir -p "$HOME"/.config/aerospace
  ln -sf ~/dotfiles/aerospace/minimal/aerospace.toml "$HOME"/.config/aerospace/aerospace.toml
  stow_folder "$HOME"/.config/starship starship
  stow_folder "$HOME"/ tmux
  stow_folder "$HOME"/.config/sesh/ sesh
  stow_folder "$HOME"/.config/btop/ btop
  stow_folder "$HOME"/.config/voxtype/ voxtype
  stow_folder "$HOME"/.config/hunk/ hunk
  link_voxtype_macos_config
  setup_voxtype_macos_app
  ;;
work)
  stow_folder "$HOME"/.config/fastfetch/ fastfetch
  stow_folder "$HOME"/.config/btop/ btop
  stow_folder "$HOME"/ zsh
  stow_folder "$HOME"/.config/nvim/ nvim
  stow_folder "$HOME"/.config/ghostty/ ghostty
  stow_folder "$HOME"/.config/herdr/ herdr
  stow_folder "$HOME"/.config/sketchybar/ sketchybar
  ln -sf ~/dotfiles/sketchybar/work/sketchybarrc "$HOME"/.config/sketchybar/sketchybarrc
  mkdir -p "$HOME"/.config/aerospace
  ln -sf ~/dotfiles/aerospace/work/aerospace.toml "$HOME"/.config/aerospace/aerospace.toml
  stow_folder "$HOME"/.config/starship starship
  stow_folder "$HOME"/ tmux
  stow_folder "$HOME"/.config/sesh/ sesh
  cd ~/dotfiles/ideavim || exit
  stow_folder "$HOME"/ ideavimrc
  stow_folder "$HOME"/ ataman
  cd ~/dotfiles || exit
  stow_folder "$HOME"/.config/voxtype/ voxtype
  link_voxtype_macos_config
  setup_voxtype_macos_app
  stow_folder "$HOME"/.config/hunk/ hunk
  ;;
omarchy)
  stow_folder "$HOME"/.config/fastfetch/ fastfetch
  stow_folder "$HOME"/ zsh
  stow_folder "$HOME"/.config/nvim/ nvim
  stow_folder "$HOME"/.config/ghostty/ ghostty
  stow_folder "$HOME"/.config/herdr/ herdr
  stow_folder "$HOME"/.config/starship starship
  stow_folder "$HOME"/ tmux
  stow_folder "$HOME"/.config/sesh/ sesh
  stow_folder "$HOME"/.config/hunk/ hunk
  hyprctl reload
  ;;
*)
  echo "Invalid DOTFILES_ENV value. Please set it to 'minimal', 'work' or 'omarchy'."
  exit 1
  ;;
esac

link_btop_theme
cd ~/dotfiles/scripts || exit
