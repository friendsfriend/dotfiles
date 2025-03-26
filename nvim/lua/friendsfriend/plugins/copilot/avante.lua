return {
	{
		"yetone/avante.nvim",
		event = "VeryLazy",
		version = false, -- Set this to "*" to always pull the latest release version, or set it to false to update to the latest code changes.
		opts = {
			provider = "copilot",
			disabled_tools = {
				"python",
			},
			mappings = {
				--- @class AvanteConflictMappings
				ask = "<leader>ca",
				edit = "<leader>ce",
				refresh = "<leader>cr",
				focus = "<leader>cf",
				toggle = {
					default = "<leader>cc",
					debug = "<leader>cd",
					hint = "<leader>ch",
					suggestion = "<leader>cs",
					repomap = "<leader>cR",
				},
				files = {
					add_current = "<leader>ca", -- Add current buffer to selected files
				},
				select_model = "<leader>c?", -- Select model command
				diff = {
					ours = "o",
					theirs = "t",
					all_theirs = "a",
					both = "b",
					cursor = "c",
					next = "<Leader>cn",
					prev = "<Leader>cp",
				},
				suggestion = {
					accept = "<TAB>",
					next = "<C-j>",
					prev = "<C-k>",
					dismiss = "<C-x>",
				},
				jump = {
					next = "n",
					prev = "p",
				},
				submit = {
					normal = "<CR>",
					insert = "<C-s>",
				},
				sidebar = {
					apply_all = "A",
					apply_cursor = "a",
					retry_user_request = "r",
					edit_user_request = "e",
					switch_windows = "<Tab>",
					reverse_switch_windows = "<S-Tab>",
					remove_file = "d",
					add_file = "@",
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
