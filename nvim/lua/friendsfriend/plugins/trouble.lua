return {
	{
		"folke/trouble.nvim",
		dependencies = { "nvim-tree/nvim-web-devicons", "folke/todo-comments.nvim" },
		opts = {
			focus = true,
			warn_no_results = false,
			open_no_results = true,
			win = {
				type = "float",
				border = "rounded",
			},
			keys = {
				q = "close",
				["<cr>"] = "jump_close",
				["<esc>"] = "close",
			},
		},
		cmd = "Trouble",
		keys = {
			{
				"<leader>dd",
				"<cmd>Trouble diagnostics toggle<cr>",
				desc = "Diagnostics (Trouble)",
			},
			{
				"<leader>dD",
				"<cmd>Trouble diagnostics toggle filter.buf=0<cr>",
				desc = "Buffer Diagnostics (Trouble)",
			},
			{
				"<leader>dl",
				"<cmd>Trouble loclist toggle<cr>",
				desc = "Location List (Trouble)",
			},
			{
				"<leader>dt",
				"<cmd>Trouble todo toggle<CR>",
				desc = "Open todos in trouble",
			},
		},
	},
}
