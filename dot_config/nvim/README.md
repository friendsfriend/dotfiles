# NvChad Custom Config

![Neovim](https://img.shields.io/badge/NeoVim-%2357A143.svg?&style=for-the-badge&logo=neovim&logoColor=white)

## Installation

Install the NvChad configuration by using the following command:

```bash
git clone https://github.com/SRTigers98/nvchad-config ~/.config/nvim --depth 1
```

Then follow the next steps in the [installation guide](https://nvchad.com/docs/quickstart/install).

## Required software

To install the required software for LSPs, formatters, linters and plugins, open **nvim** and run the **:MasonInstallAll** command.
Some software may be required for mason to install the required tools.

### Additional software

| Plugin                   | Software                                            |
| ------------------------ | --------------------------------------------------- |
| lazygit.nvim             | [lazygit](https://github.com/jesseduffield/lazygit) |
| advanced-git-search.nvim | [ripgrep](https://github.com/BurntSushi/ripgrep)    |

## Update

To update the configuration just use the **git pull** command to update the repository.

## Troubleshooting

> Installation with `:MasonInstallAll` fails

Read the logs and check if you are missing a tool to install a package.
If not, try removing the folder `${HOME}/.local/share/nvim/` and run `:MasonInstallAll` again.
