return {
	"rmagatti/auto-session",
	lazy = false,
	keys = {
		{ "<leader>sf", "<cmd>AutoSession search<CR>", desc = "Session search" },
		{ "<leader>ss", "<cmd>AutoSession save<CR>", desc = "Save session" },
		{ "<leader>st", "<cmd>AutoSession toggle<CR>", desc = "Toggle autosave" },
	},
	config = function()
		require("auto-session").setup({
			suppressed_dirs = { "~/", "~/Projects", "~/Downloads", "/" },

			git_use_branch_name = true,
			git_auto_restore_on_branch_change = true,
			bypass_save_filetypes = { "alpha", "dashboard", "snacks_dashboard" },

			session_lens = {
				picker = "snacks", -- "telescope"|"snacks"|"fzf"|"select"|nil Pickers are detected automatically but you can also set one manually. Falls back to vim.ui.select
				load_on_setup = true, -- Only used for telescope, registers the telescope extension at startup so you can use :Telescope session-lens
				previewer = "summary", -- 'summary'|'active_buffer'|function - How to display session preview. 'summary' shows a summary of the session, 'active_buffer' shows the contents of the active buffer in the session, or a custom function
				picker_opts = {
					preset = "telescope",
				},

				---@type SessionLensMappings
				mappings = {
					-- Mode can be a string or a table, e.g. {"i", "n"} for both insert and normal mode
					delete_session = { "i", "<C-d>" }, -- mode and key for deleting a session from the picker
					alternate_session = { "i", "<C-s>" }, -- mode and key for swapping to alternate session from the picker
					copy_session = { "i", "<C-y>" }, -- mode and key for copying a session from the picker
				},
			},
		})
	end,
}
