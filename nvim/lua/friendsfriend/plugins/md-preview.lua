-- Adds a markdown preview shortcut
return {
	"topazape/md-preview.nvim",
	dependencies = {
		"akinsho/toggleterm.nvim",
	},
	ft = { "md", "markdown", "mkd", "mkdn", "mdwn", "mdown", "mdtxt", "mdtext", "rmd", "wiki" },
	config = function()
		require("md-preview").setup({
			exec = "mdcat",
			exec_path = "",
			args = { "--local" },

			term = {
				-- reload term when rendered markdown file changed
				reload = {
					enable = true,
					events = { "InsertLeave", "TextChanged" },
				},
				direction = "vertical", -- choices: vertical / horizontal
				keys = {
					close = { "q" },
					refresh = "r",
				},
			},
		})
	end,
	keys = require("friendsfriend.keymap.md-preview"),
}
