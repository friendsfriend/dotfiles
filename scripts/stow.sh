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

link_pi_agent_asset_items() {
    local target_dir="$1"
    local source_dir="$2"

    if [[ -z "$target_dir" || -z "$source_dir" ]]; then
        echo "Usage: link_pi_agent_asset_items <target_dir> <source_dir>"
        return 1
    fi

    if [[ ! -d "$target_dir" ]]; then
        echo "Target directory '$target_dir' does not exist. Creating it..."
        mkdir -p "$target_dir"
    fi

    if [[ ! -d "$source_dir" ]]; then
        echo "Pi agent asset source '$source_dir' does not exist. Skipping..."
        return 0
    fi

    shopt -s nullglob
    for source_path in "$source_dir"/*; do
        local source_abs
        local target_path
        source_abs="$(cd "$(dirname "$source_path")" && pwd)/$(basename "$source_path")"
        target_path="$target_dir/$(basename "$source_path")"

        if [[ -e "$target_path" || -L "$target_path" ]]; then
            echo "Pi agent asset '$target_path' already exists. Skipping..."
            continue
        fi

        echo "Creating symlink for pi agent asset from $source_abs to $target_path"
        ln -s "$source_abs" "$target_path"
    done
    shopt -u nullglob
}

stow_pi_agent_assets() {
    link_pi_agent_asset_items "$HOME"/.pi/agent/extensions pi/extensions
    link_pi_agent_asset_items "$HOME"/.pi/agent/prompts pi/prompts
    link_pi_agent_asset_items "$HOME"/.pi/agent/skills pi/skills
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
        mkdir -p "$HOME"/.config/aerospace
        ln -sf ~/dotfiles/aerospace/work/aerospace.toml "$HOME"/.config/aerospace/aerospace.toml
        stow_folder "$HOME"/ p10k
        stow_folder "$HOME"/.config/opencode/ opencode
        stow_folder "$HOME"/ tmux
        stow_folder "$HOME"/.config/sesh/ sesh
        stow_folder "$HOME"/.config/btop/ btop
        stow_pi_agent_assets
        stow_folder "$HOME"/.config/voxtype/ voxtype
        stow_folder "$HOME"/.config/hunk/ hunk
        link_voxtype_macos_config
        ;;
    work)
        stow_folder "$HOME"/.config/fastfetch/ fastfetch
        stow_folder "$HOME"/.config/btop/ btop
        stow_folder "$HOME"/ zsh
        stow_folder "$HOME"/.config/nvim/ nvim
        stow_folder "$HOME"/.config/ghostty/ ghostty
        stow_folder "$HOME"/.config/sketchybar/ sketchybar
        ln -sf ~/dotfiles/sketchybar/work/sketchybarrc "$HOME"/.config/sketchybar/sketchybarrc
        mkdir -p "$HOME"/.config/aerospace
        ln -sf ~/dotfiles/aerospace/work/aerospace.toml "$HOME"/.config/aerospace/aerospace.toml
        stow_folder "$HOME"/ p10k
        # stow_folder "$HOME"/.config/opencode/ opencode
        stow_folder "$HOME"/ tmux
        stow_folder "$HOME"/.config/sesh/ sesh
        cd ~/dotfiles/ideavim || exit
        stow_folder "$HOME"/ ideavimrc
        stow_folder "$HOME"/ ataman
        cd ~/dotfiles || exit
        stow_pi_agent_assets
        stow_folder "$HOME"/.config/voxtype/ voxtype
        link_voxtype_macos_config
        stow_folder "$HOME"/.config/hunk/ hunk
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
        stow_folder "$HOME"/.config/hunk/ hunk
        stow_pi_agent_assets
        hyprctl reload
	;;
    *)
        echo "Invalid DOTFILES_ENV value. Please set it to 'minimal', 'work' or 'omarchy'."
        exit 1
        ;;
  esac
cd ~/dotfiles/scripts || exit
