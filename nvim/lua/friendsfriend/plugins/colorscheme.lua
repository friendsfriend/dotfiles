-- Sets the colorscheme to catppuccin-mocha
return {
	{
		"catppuccin/nvim",
		name = "catppuccin",
		priority = 1000,
		config = function()
			require("catppuccin").setup({
				autointegrations = true,
			})

			vim.cmd([[colorscheme catppuccin-mocha]])
		end,
	},
}
