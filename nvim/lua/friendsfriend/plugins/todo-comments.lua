return {
	{
		"folke/todo-comments.nvim",
		dependencies = { "folke/snacks.nvim" },
		event = { "BufReadPre", "BufNewFile" },
		keys = require("friendsfriend.keymap.todo-comments"),
	},
}
