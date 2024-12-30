-- set leader key to space
vim.g.mapleader = " "

local keymap = vim.keymap -- for conciseness

keymap.set("n", "<leader>+", "<C-a>", { desc = "Increment number" }) -- increment
keymap.set("n", "<leader>-", "<C-x>", { desc = "Decrement number" }) -- decrement

keymap.set("n", "<leader>to", "<cmd>tabnew<CR>", { desc = "Open new tab" }) -- open new tab
keymap.set("n", "<leader>tx", "<cmd>tabclose<CR>", { desc = "Close current tab" }) -- close current tab
keymap.set("n", "<leader>tn", "<cmd>tabn<CR>", { desc = "Go to next tab" }) --  go to next tab
keymap.set("n", "<leader>tp", "<cmd>tabp<CR>", { desc = "Go to previous tab" }) --  go to previous tab
keymap.set("n", "<leader>tf", "<cmd>tabnew %<CR>", { desc = "Open current buffer in new tab" }) --  move current buffer to new tab

keymap.set("n", "<leader>bb", "<cmd>lua require'dap'.toggle_breakpoint()<cr>", { desc = "Toggle [B]reakpoint" })
keymap.set("n", "<leader>bc", "<cmd>lua require'dap'.clear_breakpoints()<cr>", { desc = "[C]lear [B]reakpoints" })
keymap.set("n", "<leader>ba", "<cmd>Telescope dap list_breakpoints<cr>", { desc = "[L]ist [B]reakpoints" })
keymap.set("n", "<leader>dc", "<cmd>lua require'dap'.continue()<cr>", { desc = "[D]ebug: [C]ontinue" })
keymap.set("n", "<leader>ds", "<cmd>lua require'dap'.step_over()<cr>", { desc = "[D]ebug: [S]tep Over" })
keymap.set("n", "<leader>di", "<cmd>lua require'dap'.step_into()<cr>", { desc = "[D]ebug: Step [I]nto" })
keymap.set("n", "<leader>do", "<cmd>lua require'dap'.step_out()<cr>", { desc = "[D]ebug: Steo [O]ut" })
keymap.set("n", "<leader>dd", function()
	require("dap").disconnect()
	require("dapui").close()
end, { desc = "[D]ebug: [D]isconnect" })
keymap.set("n", "<leader>dt", function()
	require("dap").terminate()
	require("dapui").close()
end, { desc = "[D]ebug: [T]erminate" })
keymap.set("n", "<leader>di", function()
	require("dap.ui.widgets").hover()
end, { desc = "[D]ebug: [I]nfo" })
keymap.set("n", "<leader>df", "<cmd>Telescope dap fqq:rames<cr>", { desc = "[D]ebug: [F]rames" })
keymap.set("n", "<leader>dC", "<cmd>Telescope dap commands<cr>", { desc = "[D]ebug: [C]ommands" })
