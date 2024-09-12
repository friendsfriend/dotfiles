local filetypes = {
  go = {
    require("formatter.filetypes.go").gofmt,
    require("formatter.filetypes.go").goimports,
  },
  lua = {
    require("formatter.filetypes.lua").stylua,
  },
  markdown = {
    require("formatter.filetypes.markdown").prettier,
  },
  sh = {
    require("formatter.filetypes.sh").shfmt,
  },
  tex = {
    require("formatter.filetypes.latex").latexindent,
  },
  yaml = {
    require("formatter.filetypes.yaml").prettier,
  },
  zig = {
    require("formatter.filetypes.zig").zigfmt,
  },
  javascript = {
    require("formatter.filetypes.javascript").biome,
  },
  javascriptreact = {
    require("formatter.filetypes.javascript").biome,
  },
  typescript = {
    require("formatter.filetypes.typescript").biome,
  },
  typescriptreact = {
    require("formatter.filetypes.typescript").biome,
  },
  json = {
    require("formatter.filetypes.json").biome,
  },
  elixir = {
    require("formatter.filetypes.elixir").mixformat,
  },
  html = {
    require("formatter.filetypes.html").prettier,
  },
  css = {
    require("formatter.filetypes.css").prettier,
  },
  svelte = {
    require("formatter.filetypes.svelte").prettier,
  },
  vue = {
    require("formatter.filetypes.vue").prettier,
  },
  toml = {
    require("formatter.filetypes.toml").taplo,
  },
  rust = {
    require("formatter.filetypes.rust").rustfmt,
  },
  ["*"] = {
    require("formatter.filetypes.any").remove_trailing_whitespace,
  },
}

if vim.fs.find { ".prettierrc", ".prettierrc.yaml" } then
  filetypes.javascript = {
    require("formatter.filetypes.javascript").prettier,
  }
  filetypes.javascriptreact = {
    require("formatter.filetypes.javascript").prettier,
  }
  filetypes.typescript = {
    require("formatter.filetypes.typescript").prettier,
  }
  filetypes.typescriptreact = {
    require("formatter.filetypes.typescript").prettier,
  }
  filetypes.json = {
    require("formatter.filetypes.json").prettier,
  }
end

require("formatter").setup {
  logging = true,
  log_level = vim.log.levels.WARN,
  filetype = filetypes,
}

vim.api.nvim_create_autocmd({ "BufWritePost" }, {
  command = "FormatWriteLock",
})
