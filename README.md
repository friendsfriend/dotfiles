# My personal dotfiles

This repository contains all my personal dotfiles.
The goal is to have a synchronisable state across multiple maschines.

*Note on Omarchy with increased terminal font size: Adjust ~/.local/share/omarchy/default/hypr/apps/system.conf as follows*

```bash
# Find the existing line and adjust the size as needed
windowrule = size 43% 80%, tag:floating-window
```

## Installation

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/friendsfriend/dotfiles/main/scripts/setup.sh)"
```

This script clones the repository and runs the included setup scripts. This will do the following things:

* Ask you which type of setup you want (minimal / work / omarchy)
* Install Dependencies
    * MacOS: Installs brew if not yet installed and uses it to install all packages from minimal.txt or work.txt
    * Omarchy: Installs all packages via pacman
* (Omarchy only) Removes unwanted preinstalled stuff and configs
* Link the config files to the proper locations with GNU stow. This will create a virtual link between the actual config repository and the git repository so that your config is always in sync with the git repository.
* (Optional) Install the Github cli and the copilot extension if wanted

If add additional files to the dotfiles repo remember to run the stow script again.

```bash
./scripts/stow.sh
```

If you want to use sketchybar with the zscaler plugin you have to run the following command

```bash
sudo ./sketchybar/resources/setup-zscaler.sh
```

You are set to go now.
If you want to change your config or update the repository you can just edit them in your local repository and manage it with git.

## Local ZSH adaption

If you want to create a local zshrc that overrides the defaults provided by this repository you can create it in this repository as `zsh/.zshrc_local`.
The provided values will override the values defined in `zsh/.zshrc`.
This way you can apply maschine specific settigs like $PATH modifications.
The git repository will automatically ignore that file.

## Wayland Path of Exile (1 & 2) price checking

As all currently available price checker dont really work well with wayland / linux in general I came up with my own solution. 

The basic idea is to use the omarchy web app functionality to spawn a window that price checks the item description in the clipboard. 

How it works:

1. Download and run Sidekick **Important: Use the linux web version** (https://github.com/Sidekick-Poe/Sidekick/releases)
2. Copy an item in either Path of Exile or Path of Exile 2
3. Use SUPER + D (defined in hyprland/bindings.conf). This will
    * Switch to workspace 9 (I asume no one uses that one)
    * Spawn omarchy web app for the item in the clipboard
4. Use SUPER + D (defined in hyprland/bindings.conf). This will
    * Kill the active app (only if you are in workspace 9)
    * Switch to workspace 1 (I always run games in the first workspace)
5. Happy price checking :)

Note: If you run into issues with Sidekick missing .NET dependencies you have to install them via pacman. I asked ChatGPT and it returned all the packages nessesairy
