require "nvchad.mappings"

local map = vim.keymap.set

-- Spell Checking
map("n", "<leader>sd", "<cmd>set spell spelllang=de_de<CR>", { desc = "Spell Check German" })
map("n", "<leader>se", "<cmd>set spell spelllang=en_us<CR>", { desc = "Spell Check English" })
map("n", "<leader>sx", "<cmd>set spell nospell<CR>", { desc = "Spell Check Disable" })

-- YAML Companion
map("n", "<leader>ys", "<cmd>Telescope yaml_schema<CR>", { desc = "YAML Select Schema" })

-- Git
map("n", "<leader>gg", "<cmd>LazyGit<CR>", { desc = "Git LazyGit" })
map("n", "<leader>gs", "<cmd>AdvancedGitSearch<CR>", { desc = "Git Advanced Search" })

-- Gopher
map("n", "<leader>gsj", "<cmd> GoTagAdd json <CR>", { desc = "Go Add JSON struct tags" })
map("n", "<leader>gsy", "<cmd> GoTagAdd yaml <CR>", { desc = "Go Add YAML struct tags" })

-- Glow
map("n", "<leader>gl", "<cmd>Glow<CR>", { desc = "Markdown Preview" })

-- LSP ------------------------------------

-- INSERT: Show Signature Help
map("i", "<C>h", function()
  vim.lsp.buf.signature_help()
end, { desc = "lsp: show signature help" })

-- NORMAL: Rename element
map("n", "<leader>lr", function()
  require "nvchad.lsp.renamer"()
end, { desc = "lsp: rename" }, "NvRenamer")

-- NORMAL & VISUAL: Show usages
map("n", "<leader>lu", "<cmd>Trouble lsp_references toggle focus=true<cr>", { desc = "trouble: show references" })
map("v", "<leader>lu", "<cmd>Trouble lsp_references toggle focus=true<cr>", { desc = "trouble: show references" })

-- NORMAL & VISUAL: Show hover action
map("n", "<leader>lh", function()
  vim.lsp.buf.hover()
end, { desc = "lsp: show hover action" })
map("v", "<leader>lh", function()
  vim.lsp.buf.hover()
end, { desc = "lsp: show hover action" })

-- NORMAL & VISUAL: Show implementations
map("n", "<leader>li", "<cmd>Trouble lsp_implementations toggle focus=true<cr>", { desc = "lsp: show implementations" })
map("v", "<leader>li", "<cmd>Trouble lsp_implementations toggle focus=true<cr>", { desc = "lsp: show implementations" })

-- NORMAL & VISUAL: Go to definition
map("n", "<leader>ld", function()
  vim.lsp.buf.definition()
end, { desc = "lsp: go to definition" })
map("v", "<leader>ld", function()
  vim.lsp.buf.definition()
end, { desc = "lsp: go to definition" })

-- NORMAL & VISUAL: Show code actions
map("n", "<leader>la", function()
  vim.lsp.buf.code_action()
end, { desc = "lsp: show code actions" })
map("v", "<leader>la", function()
  vim.lsp.buf.code_action()
end, { desc = "lsp: show code actions" })

-- NORMAL & VISUAL: Show workspace symbol
map("n", "<leader>lw", function()
  vim.lsp.buf.workspace_symbol()
end, { desc = "lsp: show workspace symbol" })
map("v", "<leader>lw", function()
  vim.lsp.buf.workspace_symbol()
end, { desc = "lsp: show workspace symbol" })

-- NORMAL & VISUAL: Go to next error
map("n", "<leader>le", function()
  vim.diagnostic.goto_next()
end, { desc = "lsp: go to next error" })
map("v", "<leader>le", function()
  vim.diagnostic.goto_next()
end, { desc = "lsp: go to next error" })

-- NORMAL & VISUAL: Go to previous error
map("n", "<leader>lE", function()
  vim.diagnostic.goto_next()
end, { desc = "lsp:go to previous error" })
map("v", "<leader>lE", function()
  vim.diagnostic.goto_next()
end, { desc = "lsp: go to previous error" })

-- NORMAL & VISUAL: Error and Warn lists
map(
  "n",
  "<leader>lte",
  "<cmd>Trouble diagnostics toggle focus=true filter={severity=vim.diagnostic.severity.ERROR}<cr>",
  { desc = "trouble: toggle trouble diagnostics" }
)
map(
  "v",
  "<leader>lte",
  "<cmd>Trouble diagnostics toggle focus=true filter={severity=vim.diagnostic.severity.ERROR}<cr>",
  { desc = "trouble: toggle trouble diagnostics" }
)
map(
  "n",
  "<leader>ltw",
  "<cmd>Trouble diagnostics toggle focus=true filter={severity=vim.diagnostic.severity.WARN}<cr>",
  { desc = "trouble: toggle trouble diagnostics" }
)
map(
  "v",
  "<leader>ltw",
  "<cmd>Trouble diagnostics toggle focus=true filter={severity=vim.diagnostic.severity.WARN}<cr>",
  { desc = "trouble: toggle trouble diagnostics" }
)

-- END LSP ------------------------------------

-- TERMINAL -----------------------------------
-- Open floating terminal
map({ "n", "t" }, "<C-t>", function()
  require("nvchad.term").toggle {
    pos = "float",
    id = "floatTerm",
    float_opts = {
      relative = "editor",
      border = "rounded",
      style = "minimal",
      row = 0.2,
      col = 0.1,
      width = 0.8,
      height = 0.6,
    },
  }
end, { desc = "terminal toggle floating term" })

-- Center when going through search results
map("n", "n", "nzzzv", {})
map("n", "N", "Nzzzv", {})

-- Center when half page up / down
map("n", "<C-d>", "<C-d>zz", {})
map("n", "<C-u>", "<C-u>zz", {})
