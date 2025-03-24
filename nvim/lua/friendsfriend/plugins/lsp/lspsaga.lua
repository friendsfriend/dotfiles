return {
	{
		"nvimdev/lspsaga.nvim",
		config = function()
			require("lspsaga").setup({
				lightbulb = {
					enable = true,
				},
				symbol_in_winbar = {
					enable = false,
				},
				diagnostic = {
					border_follow = false,
					keys = {
						exec_action = "o",
						quit = "q",
						go_action = "g",
					},
				},
				finder = {
					keys = {
						quit = { "q", "<ESC>" },
					},
				},
				code_action = {
					show_server_name = true,
					keys = {
						quit = { "q", "<ESC>" },
						exec = "<CR>",
					},
				},
				rename = {
					in_select = false,
					quit = "<ESC>",
					exec = "<CR>",
					confirm = "<CR>",
				},
			})
		end,
		dependencies = {
			"nvim-treesitter/nvim-treesitter", -- optional
			"nvim-tree/nvim-web-devicons", -- optional
		},
	},
}
