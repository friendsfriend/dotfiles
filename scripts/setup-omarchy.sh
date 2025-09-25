#!/bin/bash


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

echo "Removing hyprland montior.conf..."
rm -rf ~/.config/hypr/monitors.conf
echo "Removing hyprland input.conf..."
rm -rf ~/.config/hypr/input.conf
echo "Removing hyprland bindings.conf..."
rm -rf ~/.config/hypr/bindings.conf

echo "Removing predefinded ghostty config..."
rm -rf ~/.config/ghostty
echo "Removing preinstalled nvim config..."
rm -rf ~/.config/nvim

echo "Starting to remove omarchy bloatware..."
remove_packages_omarchy ~/dotfiles/scripts/omarchy-bloat.txt
