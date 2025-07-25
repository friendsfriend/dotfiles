#!/bin/bash
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
    echo "Running stow command..."
    stow -t "$target" "$source"
}

# Stow links the folders in the repository to the specified config locations so that the system finds them
case "$DOTFILES_ENV" in
    minimal)
        stow_folder "$HOME"/ zsh
        stow_folder "$HOME"/.config/nvim/ nvim
        stow_folder "$HOME"/.config/ghostty/ ghostty
        stow_folder "$HOME"/ p10k
        stow_folder "$HOME"/.config/opencode/ opencode
        stow_folder "$HOME"/ tmux
        ;;
    work)
        stow_folder "$HOME"/ zsh
        stow_folder "$HOME"/.config/nvim/ nvim
        stow_folder "$HOME"/.config/ghostty/ ghostty
        stow_folder "$HOME"/.config/aerospace/ aerospace
        stow_folder "$HOME"/.config/sketchybar/ sketchybar
        stow_folder "$HOME"/ p10k
        stow_folder "$HOME"/.config/opencode/ opencode
        stow_folder "$HOME"/ tmux
        cd ideavim || exit
        stow_folder "$HOME"/ ideavimrc
        stow_folder "$HOME"/ ataman
        cd .. || exit
        ;;
    *)
        echo "Invalid DOTFILES_ENV value. Please set it to 'minimal' or 'work'."
        exit 1
        ;;
esac

