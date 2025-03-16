return {
	{
		"yetone/avante.nvim",
		event = "VeryLazy",
		version = false, -- Set this to "*" to always pull the latest release version, or set it to false to update to the latest code changes.
		opts = {
			-- add any opts here
			-- for example
			provider = "copilot",
			mappings = {
				--- @class AvanteConflictMappings
				diff = {
					ours = "<Leader>do",
					theirs = "<Leader>dt",
					all_theirs = "<Leader>da",
					both = "<Leader>db",
					cursor = "<Leader>dd",
					next = "<Leader>dn",
					prev = "<Leader>dp",
				},
				suggestion = {
					accept = "<TAB>",
					next = "<C-j>",
					prev = "<C-k>",
					dismiss = "<C-x>",
				},
				jump = {
					next = "<Leader>cn",
					prev = "<Leader>cp",
				},
				submit = {
					normal = "<CR>",
					insert = "<C-s>",
				},
				sidebar = {
					apply_all = "<Leader>caa",
					apply_cursor = "<Leader>cao",
					retry_user_request = "<Leader>cur",
					edit_user_request = "<Leader>cue",
					switch_windows = "<Tab>",
					reverse_switch_windows = "<S-Tab>",
					remove_file = "d",
					add_file = "<Leader>cf",
					close = { "<Esc>", "q" },
					close_from_input = nil, -- e.g., { normal = "<Esc>", insert = "<C-d>" }
				},
			},
		},
		-- if you want to build from source then do `make BUILD_FROM_SOURCE=true`
		build = "make",
		-- build = "powershell -ExecutionPolicy Bypass -File Build.ps1 -BuildFromSource false" -- for windows
		dependencies = {
			"nvim-treesitter/nvim-treesitter",
			"stevearc/dressing.nvim",
			"nvim-lua/plenary.nvim",
			"MunifTanjim/nui.nvim",
			--- The below dependencies are optional,
			"hrsh7th/nvim-cmp", -- autocompletion for avante commands and mentions
			"nvim-tree/nvim-web-devicons", -- or echasnovski/mini.icons
			{
				"zbirenbaum/copilot.lua",
				cmd = "Copilot",
				event = "InsertEnter",
				config = function()
					require("copilot").setup({})
				end,
			}, -- for providers='copilot'
		},
	},
}
