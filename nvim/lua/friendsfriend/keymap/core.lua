-- set leader key to space
vim.g.mapleader = " "

local keymap = vim.keymap -- for conciseness

-- Number incrementation
keymap.set("n", "<leader>+", "<C-a>", { desc = "Increment number" }) -- increment
keymap.set("n", "<leader>-", "<C-x>", { desc = "Decrement number" }) -- decrement

-- tab managment
keymap.set("n", "<leader>to", "<cmd>tabnew<CR>", { desc = "Open new tab" }) -- open new tab
keymap.set("n", "<leader>tx", "<cmd>tabclose<CR>", { desc = "Close current tab" }) -- close current tab
keymap.set("n", "<leader>tl", "<cmd>tabn<CR>", { desc = "Go to next tab" }) --  go to next tab
keymap.set("n", "<leader>th", "<cmd>tabp<CR>", { desc = "Go to previous tab" }) --  go to previous tab
keymap.set("n", "<leader>tn", "<cmd>tabn<CR>", { desc = "Go to next tab" }) --  go to next tab
keymap.set("n", "<leader>tp", "<cmd>tabp<CR>", { desc = "Go to previous tab" }) --  go to previous tab
keymap.set("n", "<leader>tf", "<cmd>tabnew %<CR>", { desc = "Open current buffer in new tab" }) --  move current buffer to new tab

-- quickfixlist
keymap.set("n", "<C-k>", function()
	local success = pcall(vim.cmd, "cprev")
	if not success then
		vim.cmd("cfirst")
	end
end, { desc = "Quickfix List: Previous entry" })

keymap.set("n", "<C-j>", function()
	local success = pcall(vim.cmd, "cnext")
	if not success then
		vim.cmd("cfirst")
	end
end, { desc = "Quickfix List: Next entry" })

keymap.set("n", "<leader>qp", function()
	local _ = pcall(vim.cmd, "colder")
end, { desc = "Quickfix List: Older" })

keymap.set("n", "<leader>qn", function()
	local _ = pcall(vim.cmd, "cnewer")
end, { desc = "Quickfix List: Newer" })
