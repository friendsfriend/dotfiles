local prefix = "<leader>a"

return {
	{
		"olimorris/codecompanion.nvim",
		config = function()
			require("codecompanion").setup({
				strategies = {
					chat = {
						adapter = "copilot",
						tools = {
							["mcp"] = {
								callback = function()
									return require("mcphub.extensions.codecompanion")
								end,
								description = "Call tools and resources from the MCP Servers",
								opts = {
									-- user_approval = true,
									requires_approval = true,
								},
							},
						},
					},
					inline = {
						adapter = "copilot",
					},
				},
			})
		end,
		keys = {
			{
				prefix .. "a",
				"<cmd>CodeCompanionActions<cr>",
				mode = { "n", "v" },
				desc = "Action Palette",
			},
			{
				prefix .. "c",
				"<cmd>CodeCompanionChat<cr>",
				mode = { "n", "v" },
				desc = "New Chat",
			},
			{
				prefix .. "A",
				"<cmd>CodeCompanionAdd<cr>",
				mode = "v",
				desc = "Add Code",
			},
			{
				prefix .. "i",
				"<cmd>CodeCompanion<cr>",
				mode = "n",
				desc = "Inline Prompt",
			},
			{
				prefix .. "C",
				"<cmd>CodeCompanionToggle<cr>",
				mode = "n",
				desc = "Toggle Chat",
			},
		},
		dependencies = {
			"nvim-lua/plenary.nvim",
			"nvim-treesitter/nvim-treesitter",
			"ravitemer/mcphub.nvim",
			"j-hui/fidget.nvim",
		},
	},
}
