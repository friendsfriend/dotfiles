-- Scooter: interactive find & replace TUI via snacks terminal
local M = {}

function M.open()
	local cwd = vim.fn.getcwd()
	require("snacks").terminal({ "scooter", cwd }, {
		cwd = cwd,
		win = {
			style = "terminal",
			position = "float",
			width = 0.8,
			height = 0.8,
			title = " Scooter ",
			title_pos = "center",
		},
	})
end

return M
