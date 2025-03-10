#!/bin/bash
set -e

# Clone the repository if it doesn't exist
if [[ ! -d "$HOME/dotfiles" ]]; then
    echo "Cloning the repository to ~/dotfiles..."
    git clone https://github.com/friendsfriend/dotfiles.git "$HOME/dotfiles"
    cd "$HOME/dotfiles" || exit
else
    cd "$HOME/dotfiles" || exit
    echo "Repository already exists in ~/dotfiles. Continuing with the existing repository."
fi

# Prompt the user to choose the setup type
read -r -p "Do you want the minimal or work setup? (minimal/work): " setup_type

# Set the DOTFILES_ENV environment variable
export DOTFILES_ENV="$setup_type"


./dependencies.sh
./setup-copilot.sh
./stow.sh

