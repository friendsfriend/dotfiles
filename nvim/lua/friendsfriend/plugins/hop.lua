return {
	{
		"smoka7/hop.nvim",
		version = "*",
		config = function()
			require("hop").setup({
				quit_key = "<ESC>",
				jump_on_sole_occurrence = true,
			})

			-- place this in one of your configuration file(s)
			local hop = require("hop")
			local directions = require("hop.hint").HintDirection
			vim.keymap.set("", "f", function()
				hop.hint_char1({ direction = directions.AFTER_CURSOR, current_line_only = false })
			end, { remap = true })
			vim.keymap.set("", "F", function()
				hop.hint_char1({ direction = directions.BEFORE_CURSOR, current_line_only = false })
			end, { remap = true })
			vim.keymap.set("", "<C-f>", function()
				hop.hint_patterns({ direction = directions.AFTER_CURSOR, current_line_only = false })
			end, { remap = true })
			vim.keymap.set("", "<C-S-f>", function()
				hop.hint_patterns({ direction = directions.BEFORE_CURSOR, current_line_only = false })
			end, { remap = true })
		end,
	},
}
