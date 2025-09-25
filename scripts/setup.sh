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
read -r -p "Do you want the minimal, work or omarchy setup? (minimal/work/omarchy): " setup_type

# Set the DOTFILES_ENV environment variable
export DOTFILES_ENV="$setup_type"

echo "You selected the following configuration: $DOTFILES_ENV"

case "$DOTFILES_ENV" in
  minimal)
    ~/dotfiles/scripts/dependencies.sh
    ~/dotfiles/scripts/setup-copilot.sh
    ~/dotfiles/scripts/stow.sh
    ;;
  work)
    ~/dotfiles/scripts/dependencies.sh
    ~/dotfiles/scripts/setup-copilot.sh
    ~/dotfiles/scripts/stow.sh
    ;;
  omarchy)
    ~/dotfiles/scripts/dependencies.sh
    ~/dotfiles/scripts/setup-omarchy.sh
    ~/dotfiles/scripts/setup-copilot.sh
    ~/dotfiles/scripts/stow.sh
    ;;
  *)
    echo "Invalid DOTFILES_ENV value. Please set it to 'minimal', 'work' or 'omarchy'."
    exit 1
    ;;
esac


