return {
	{
		"NickvanDyke/opencode.nvim",
		dependencies = {
			"folke/snacks.nvim",
		},
		---@type opencode.Config
		opts = {
			win = {
				position = "float",
				enter = true,
			},
		},
		keys = {
			{
				"<leader>cc",
				function()
					require("opencode").toggle()
				end,
				desc = "Toggle opencode",
				mode = "n",
			},
			{
				"<leader>ca",
				function()
					require("opencode").ask()
				end,
				desc = "Ask opencode",
				mode = { "n", "v" },
			},
			{
				"<leader>cf",
				function()
					require("opencode").ask("@file ")
				end,
				desc = "Ask opencode about current file",
				mode = { "n", "v" },
			},
			{
				"<leader>cn",
				function()
					require("opencode").command("/new")
				end,
				desc = "New session",
			},
			{
				"<leader>cr",
				function()
					require("opencode").prompt("Review @file for correctness and readability")
				end,
				desc = "Review file",
			},
			{
				"<leader>ce",
				function()
					require("opencode").prompt("Fix these @diagnostics")
				end,
				desc = "Fix errors",
			},
			{
				"<leader>cc",
				function()
					require("opencode").prompt("Optimize @selection for performance and readability")
				end,
				desc = "Optimize selection",
				mode = "v",
			},
			{
				"<leader>cd",
				function()
					require("opencode").prompt("Add documentation comments for @selection")
				end,
				desc = "Document selection",
				mode = "v",
			},
			{
				"<leader>ct",
				function()
					require("opencode").prompt("Add tests for @selection")
				end,
				desc = "Test selection",
				mode = "v",
			},
		},
	},
}
