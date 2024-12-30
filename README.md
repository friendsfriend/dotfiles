# My personal dotfiles

This repository contains all my personal dotfiles.
The goal is to have a synchronisable state across multiple maschines.

## Installation

Clone this repository to a location of your liking

```bash
git clone https://github.com/friendsfriend/dotfiles.git
```

Now run the installation scripts. This will do the following things:

dependencies.sh:

- Install brew if not installed
- Install all dependencies that are stated in brew.txt
  stow.sh:
- Link the config files to the proper locations with GNU stow. This will create a virtual link between the actual config repository and the git repository so that your config is always in sync with the git repository.

```bash
./dependencies.sh
./stow.sh
```

If you do any changes to your dotfiles remember to run the stow script again.

```bash
./stow
```

You are set to go now.
If you want to change your config or update the repository you can just edit them in your local repository and manage it with git.

## Local ZSH adaption

If you want to create a local zshrc that overrides the defaults provided by this repository you can create it in this repository as `zsh/.zshrc_local`.
The provided values will override the values defined in `zsh/.zshrc`.
This way you can apply maschine specific settigs like $PATH modifications.
The git repository will automatically ignore that file.
