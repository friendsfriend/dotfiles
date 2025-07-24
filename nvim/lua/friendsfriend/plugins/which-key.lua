-- Whichkey delivers a popup showing available shortcuts whenever you press you leader key.
return {
	"folke/which-key.nvim",
	event = "VeryLazy",
	init = function()
		vim.o.timeout = true
		vim.o.timeoutlen = 500
	end,
	dependencies = {
		"nvim-tree/nvim-web-devicons",
	},
	opts = {},
}
