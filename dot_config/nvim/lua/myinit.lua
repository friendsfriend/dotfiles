-- show spaces as dots
vim.cmd "set list"
vim.cmd "set lcs+=space:·"

-- set indentation
vim.cmd "set expandtab"
vim.cmd "set shiftwidth=2"

-- filetypes
require "filetypes.helm"
