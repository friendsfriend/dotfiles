#!/usr/bin/env bash


remove_packages_omarchy() {
  local package_file=$1
  while IFS='' read -r line || [[ -n "$line" ]]; do
  if pacman -Qs "$line" > /dev/null ; then
    echo "removing ${line}..."
    yay -Rnsu "$line" --noconfirm
  else
    echo "package $line is not installed"
  fi
  done < "$package_file"
}


echo "Setting up omarchy"

rm -rf ~/.config/hypr
mkdir ~/.config/hypr

echo "Removing predefinded ghostty config..."
rm -rf ~/.config/ghostty
echo "Removing preinstalled nvim config..."
rm -rf ~/.config/nvim
echo "Removing preinstalled waybar config..."
rm -rf ~/.config/waybar

echo "Starting to remove omarchy bloatware..."
remove_packages_omarchy ~/dotfiles/scripts/omarchy-bloat.txt
