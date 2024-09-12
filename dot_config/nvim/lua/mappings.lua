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

-- LSP
map("i", "<C>h", function()
  vim.lsp.buf.signature_help()
end, { desc = "lsp: show signature help" })

map("n", "<leader>lr", function()
  vim.lsp.buf.rename()
end, { desc = "lsp: rename current variable / function" })

map("n", "<leader>lu", function()
  vim.lsp.buf.references()
end, { desc = "lsp: show references" })

map("n", "K", function()
  vim.lsp.buf.hover()
end, { desc = "lsp: show hover action" })

map("n", "<leader>ld", function()
  vim.lsp.buf.definition()
end, { desc = "lsp: go to definition" })

map("n", "<leader>la", function()
  vim.lsp.buf.code_action()
end, { desc = "lsp: show code actions" })

map("n", "<leader>lw", function()
  vim.lsp.buf.workspace_symbol()
end)

-- Center when going through search results
map("n", "n", "nzzzv", {})
map("n", "N", "Nzzzv", {})

-- Center when half page up / down
map("n", "<C-d>", "<C-d>zz", {})
map("n", "<C-u>", "<C-u>zz", {})
