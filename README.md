# My personal dotfiles

This repository contains all my personal dotfiles.
The goal is to have a synchronisable state across multiple maschines.

## Installation

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/friendsfriend/dotfiles/main/setup.sh)"
```

This script clones the repository and runs the included setup scripts. This will do the following things:

- Ask you which type of setup you want (minimal / work)
- Install brew if not installed
- Install all dependencies that are stated in brew.txt
  stow.sh:
- Install the Github cli and the copilot extension if wanted
- Link the config files to the proper locations with GNU stow. This will create a virtual link between the actual config repository and the git repository so that your config is always in sync with the git repository.

If add additional files to the dotfiles repo remember to run the stow script again.

```bash
./stow.sh
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
