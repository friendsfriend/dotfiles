return {
	"sindrets/diffview.nvim",
	dependencies = {
		"lewis6991/gitsigns.nvim",
	},
	config = function()
		local function get_default_branch_name()
			local res = vim.system({ "git", "rev-parse", "--verify", "main" }, { capture_output = true }):wait()
			return res.code == 0 and "main" or "master"
		end

		-- Git History for whole repository
		vim.keymap.set("n", "<leader>gs", "<cmd>DiffviewFileHistory<cr>", { desc = "Git history" })
		-- Git History for file
		vim.keymap.set("n", "<leader>gf", "<cmd>DiffviewFileHistory --follow %<cr>", { desc = "Git File history" })
		-- Git History for selection
		vim.keymap.set("v", "<leader>gs", "<Esc><Cmd>'<,'>DiffviewFileHistory --follow<CR>", { desc = "Range history" })
		-- Diff against local master branch
		vim.keymap.set("n", "<leader>gdml", function()
			vim.cmd("DiffviewOpen " .. get_default_branch_name())
		end, { desc = "Diff against master" })

		-- Diff against remote master branch
		vim.keymap.set("n", "<leader>gdmr", function()
			vim.cmd("DiffviewOpen HEAD..origin/" .. get_default_branch_name())
		end, { desc = "Diff against origin/master" })
		-- Highlight changed words.
		vim.keymap.set(
			"n",
			"<leader>ghc",
			require("gitsigns").toggle_word_diff,
			{ desc = "Toggle highlighting of git changes" }
		)

		-- Highlight added lines.
		vim.keymap.set(
			"n",
			"<leader>gha",
			require("gitsigns").toggle_linehl,
			{ desc = "Toggle highlighting of git added lines" }
		)

		-- Highlight removed lines.
		vim.keymap.set(
			"n",
			"<leader>ghd",
			require("gitsigns").preview_hunk_inline,
			{ desc = "Toggle highlighting of git deleted lines" }
		)
	end,
}
