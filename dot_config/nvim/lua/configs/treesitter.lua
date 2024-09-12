local M = {}

M.opts = {
  ensure_installed = {
    -- defaults
    "vim",
    "lua",
    -- text
    "markdown",
    "json",
    "json5",
    "xml",
    "yaml",
    "toml",
    "csv",
    "kdl",
    -- tex
    "bibtex",
    "latex",
    -- typst
    "typst",
    -- programming
    "go",
    "zig",
    "javascript",
    "jsdoc",
    "typescript",
    "elixir",
    "rust",
    -- web
    "html",
    "css",
    "svelte",
    "vue",
    "heex",
    -- tools
    "gomod",
    "gosum",
    "make",
    "dockerfile",
    -- scripting
    "bash",
    -- vcs
    "gitignore",
    "gitattributes",
    "gitcommit",
    "git_config",
    "git_rebase",
    -- database
    "sql",
    -- gRPC
    "proto",
    -- config
    "ssh_config",
    "gpg",
  },
}

return M
