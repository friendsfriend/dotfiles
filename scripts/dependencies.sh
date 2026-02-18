#!/usr/bin/env bash
set -e

install_brew() {
  which -s brew
  if [[ $? != 0 ]] ; then
    # Install Homebrew
    echo "Installing homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  else
    brew update
  fi
}

install_packages_omarchy() {
  local package_file=$1
  while IFS='' read -r line || [[ -n "$line" ]]; do
  echo "Installing ${line}..."
  yay -Sy "$line" --noconfirm --needed
  done < "$package_file"
}

install_packages() {
  local package_file=$1
  while IFS='' read -r line || [[ -n "$line" ]]; do
    echo "Installing ${line}..."
    brew install "$line"
  done < "$package_file"
}

case "$DOTFILES_ENV" in
  minimal)
    install_brew
    install_packages ~/dotfiles/scripts/brew-minimal.txt
    ;;
  work)
    install_brew
    install_packages ~/dotfiles/scripts/brew-work.txt
    ;;
  omarchy)
    install_packages_omarchy ~/dotfiles/scripts/omarchy.txt
    ;;
  *)
    echo "Invalid DOTFILES_ENV value. Please set it to 'minimal', 'work' or 'omarchy'."
    exit 1
    ;;
esac


