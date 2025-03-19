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
								-- calling it in a function would prevent mcphub from being loaded before it's needed
								callback = function()
									return require("mcphub.extensions.codecompanion")
								end,
								description = "Call tools and resources from the MCP Servers",
								opts = {
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
		dependencies = {
			"nvim-lua/plenary.nvim",
			"nvim-treesitter/nvim-treesitter",
			"ravitemer/mcphub.nvim",
		},
	},
}
