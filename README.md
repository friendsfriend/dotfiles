# Dotfiles

This repository is used to mangage my personal dotfiles across different devices.
It contains:

- [ZSH](docs/zsh.md)
- [NVIM](docs/nvim.md)
- [TMUX](docs/tmux.md)
- [WEZTERM](docs/wezterm.md)

## Installation

The files in this repository are managed via [Chezmoi](https://www.chezmoi.io/).
Please install chezmoi on your target device and check out the project.

```bash
sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply friendsfriend
```

## Changing files

If you want to make changes, apply the changes on your dotfiles.
After that use the following commands to sync your changes with the repository.

```bash
# If file already exists in repository
chezmoi re-add {filepath}
# If file doesnt exist in repository
chezmoiz add {filepath}
# Switches to the path where the repository is checked out
chezmoi cd
# Add your changes to git
git add .
# Commit your changes
git commit -m "Commit Message containing your changes"
# Push
git push
```
