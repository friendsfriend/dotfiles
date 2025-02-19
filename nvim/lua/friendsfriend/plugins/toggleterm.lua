return {
	-- amongst your other plugins
	{
		"akinsho/toggleterm.nvim",
		version = "*",
		config = function()
			require("toggleterm").setup({
				size = 20,
				open_mapping = [[<C-p>]], -- Key mapping to toggle the terminal
				shade_filetypes = {},
				shade_terminals = true,
				shading_factor = 2,
				start_in_insert = true,
				insert_mappings = true,
				terminal_mappings = true,
				persist_size = true,
				direction = "float", -- Can be 'vertical', 'horizontal', 'float', or 'tab'
				close_on_exit = true,
				shell = vim.o.shell, -- Use the shell configured in Neovim
				float_opts = {
					border = "curved",
					width = math.floor(vim.o.columns * 0.8),
					height = math.floor(vim.o.lines * 0.8),
				},
			})

			local Terminal = require("toggleterm.terminal").Terminal

			local scooter = Terminal:new({
				hidden = true,
				direction = "float",
			})

			vim.keymap.set("n", "<leader>srr", function()
				scooter.cmd = "scooter"
				scooter:toggle()
			end, {
				noremap = true,
				silent = true,
				desc = "Scooter for workspace",
			})
			vim.keymap.set("n", "<leader>srf", function()
				scooter.cmd = "scooter " .. vim.api.nvim_buf_get_name(0)
				scooter:toggle()
			end, {
				noremap = true,
				silent = true,
				desc = "Scooter for file",
			})
		end,
	},
}
