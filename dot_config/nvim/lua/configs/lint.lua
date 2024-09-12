require("lint").linters_by_ft = {
  lua = { "luacheck" },
  sh = { "shellcheck" },
  tex = { "lacheck" },
  yaml = { "yamllint" },
  javascript = { "biomejs" },
  javascriptreact = { "biomejs" },
  typescript = { "biomejs" },
  typescriptreact = { "biomejs" },
  json = { "biomejs" },
  elixir = { "credo" },
  markdown = { "markdownlint" },
}

vim.api.nvim_create_autocmd({ "BufWritePost" }, {
  callback = function()
    require("lint").try_lint()
  end,
})
