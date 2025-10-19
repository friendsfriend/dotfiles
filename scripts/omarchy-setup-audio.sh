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
    echo "Creating symlink for $3 from $source to $target"
    
    cd ~/dotfiles || exit
    stow -t "$target" "$source"
    cd ~/dotfiles/scripts || exit
}

# Stow links the folders in the repository to the specified config locations so that the system finds them
case "$DOTFILES_ENV" in
    minimal)
        echo "minimal mac setup doesnt support linux audio setup" 
        ;;
    work)
        echo "work mac setup doesnt support linux audio setup" 
        ;;
    omarchy)
        echo "Setting up audio services"
        cd ~/dotfiles/linux-audio/systemd/
        stow_folder $HOME/.config/systemd/user/  scarlett
        cd ~/dotfiles/
        systemctl --user enable scarlett-virtual-input-line.service
        systemctl --user daemon-reload
	      ;;
    *)
        echo "Invalid DOTFILES_ENV value. Please set it to 'minimal', 'work' or 'omarchy'."
        exit 1
        ;;
  esac
