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

stow_file() {
    local target="$1"
    local source="$2"

    # Check if both parameters are provided
    if [[ -z "$target" || -z "$source" ]]; then
        echo "Usage: stow_with_target_check <target> <source>"
        return 1
    fi

    if [[ -d "$target" ]]; then
        echo "Target file '$target' is an existing directory. Skipping..."
        return 0
    fi

    if [[ -f "$target" ]]; then
        echo "Target file '$target' already exist. Skipping..."
        return 0
    fi
    
    if [[ -L "$target" ]]; then
        echo "Target symlink '$target' already exists. Skipping..."
        return 0
    fi

    # Run the stow command
    echo "Creating symlink for $3 from $source to $target"
    
    ln -s "$source" "$target"
}

# Stow links the folders in the repository to the specified config locations so that the system finds them

cd ~/dotfiles || exit
case "$DOTFILES_ENV" in
    minimal)
        stow_folder "$HOME"/.config/fastfetch/ fastfetch
        stow_folder "$HOME"/ zsh
        stow_folder "$HOME"/.config/nvim/ nvim
        stow_folder "$HOME"/.config/ghostty/ ghostty
        stow_folder "$HOME"/.config/sketchybar/ sketchybar
        ln -sf ~/dotfiles/sketchybar/minimal/sketchybarrc "$HOME"/.config/sketchybar/sketchybarrc
        ln -sf ~/dotfiles/aerospace/work/aerospace.toml "$HOME"/.config/aerospace/aerospace.toml
        stow_folder "$HOME"/ p10k
        stow_folder "$HOME"/.config/opencode/ opencode
        stow_folder "$HOME"/ tmux
        stow_folder "$HOME"/.config/sesh/ sesh
        stow_folder "$HOME"/.config/btop/ btop
        ;;
    work)
        stow_folder "$HOME"/.config/fastfetch/ fastfetch
        stow_folder "$HOME"/.config/btop/ btop
        stow_folder "$HOME"/ zsh
        stow_folder "$HOME"/.config/nvim/ nvim
        stow_folder "$HOME"/.config/ghostty/ ghostty
        stow_folder "$HOME"/.config/sketchybar/ sketchybar
        ln -sf ~/dotfiles/sketchybar/work/sketchybarrc "$HOME"/.config/sketchybar/sketchybarrc
        ln -sf ~/dotfiles/aerospace/work/aerospace.toml "$HOME"/.config/aerospace/aerospace.toml
        stow_folder "$HOME"/ p10k
        # stow_folder "$HOME"/.config/opencode/ opencode
        stow_folder "$HOME"/ tmux
        stow_folder "$HOME"/.config/sesh/ sesh
        cd ~/dotfiles/ideavim || exit
        stow_folder "$HOME"/ ideavimrc
        stow_folder "$HOME"/ ataman
        cd ~/dotfiles || exit
        ;;
    omarchy)
        stow_folder "$HOME"/.config/hypr/ hyprland
        stow_folder "$HOME"/.config/waybar/ waybar
        stow_folder "$HOME"/.config/walker/ walker
        stow_folder "$HOME"/.config/fastfetch/ fastfetch
        stow_folder "$HOME"/.config/btop/ btop
        stow_folder "$HOME"/ zsh
        stow_folder "$HOME"/.config/nvim/ nvim
        stow_folder "$HOME"/.config/ghostty/ ghostty
        stow_folder "$HOME"/ p10k
        stow_folder "$HOME"/.config/opencode/ opencode
        stow_folder "$HOME"/ tmux
        stow_folder "$HOME"/.config/sesh/ sesh
        hyprctl reload
	;;
    *)
        echo "Invalid DOTFILES_ENV value. Please set it to 'minimal', 'work' or 'omarchy'."
        exit 1
        ;;
  esac
cd ~/dotfiles/scripts || exit
