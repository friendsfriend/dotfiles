#!/bin/bash
set -e

install_brew() {
  which -s brew
  if [[ $? != 0 ]] ; then
    # Install Homebrew
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  else
    brew update
  fi
}

install_packages_arch() {
  local package_file=$1
  while IFS='' read -r line || [[ -n "$line" ]]; do
  yay -Sy "$line" --noconfirm
  done < "$package_file"
}

install_packages() {
  local package_file=$1
  while IFS='' read -r line || [[ -n "$line" ]]; do
    brew install "$line"
  done < "$package_file"
}


case "$DOTFILES_ENV" in
  minimal)
    install_brew
    install_packages "./brew-minimal.txt"
    ;;
  work)
    install_brew
    install_packages "./brew-work.txt"
    ;;
  arch)
    install_packages_arch "./arch.txt"
    ;;
  *)
    echo "Invalid DOTFILES_ENV value. Please set it to 'minimal', 'work' or 'arch'."
    exit 1
    ;;
esac


