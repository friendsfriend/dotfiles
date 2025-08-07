pacman -S --needed git base-devel
git clone --depth 1 https://github.com/HyDE-Project/HyDE ~/HyDE
cd ~/HyDE/Scripts
./install.sh

rm -rf ~/.config/hypr/userprefs.conf
rm -rf ~/.config/hypr/monitors.conf
rm -rf ~/.config/hypr/keybindings.conf
rm -rf ~/.config/hypr/windowrules.conf
rm -rf ~/.config/hyde/config.toml

stow_folder "$HOME"/.config/hypr/ /hyprland/hyde/hypr/
stow_folder "$HOME"/.config/hyde/ /hyprland/hyde/hyde/


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

