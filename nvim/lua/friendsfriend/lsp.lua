local keymap = vim.keymap -- for conciseness
vim.api.nvim_create_autocmd("LspAttach", {
	group = vim.api.nvim_create_augroup("UserLspConfig", {}),
	callback = function(ev)
		-- Buffer local mappings.
		-- See `:help vim.lsp.*` for documentation on any of the below functions
		local opts = { buffer = ev.buf, silent = true }
		-- set keybinds
		opts.desc = "See available code actions"
		keymap.set("n", "<leader>la", vim.lsp.buf.code_action, opts) -- see available code actions, in visual mode will apply to selection

		opts.desc = "Lsp hover"
		keymap.set("n", "K", function()
			vim.lsp.buf.hover({ border = "single", max_height = 25, max_width = 120 })
		end, opts)

		opts.desc = "Diagnostic hover"
		keymap.set("n", "H", function()
			vim.diagnostic.open_float({ border = "single", max_height = 25, max_width = 120 })
		end, opts)

		opts.desc = "Smart rename"
		keymap.set("n", "<leader>lr", vim.lsp.buf.rename, opts) -- smart rename

		opts.desc = "Go to previous diagnostic"
		keymap.set("n", "<leader>lep", function()
			vim.diagnostic.jump({ count = -1, float = true })
		end, opts) -- jump to previous diagnostic in buffer

		opts.desc = "Go to next diagnostic"
		keymap.set("n", "<leader>len", function()
			vim.diagnostic.jump({ count = 1, float = true })
		end, opts) -- jump to next diagnostic in buffer
	end,
})

-- vim.lsp.inlay_hint.enable(true)

local severity = vim.diagnostic.severity

vim.diagnostic.config({
	signs = {
		text = {
			[severity.ERROR] = " ",
			[severity.WARN] = " ",
			[severity.HINT] = "󰠠 ",
			[severity.INFO] = " ",
		},
	},
	virtual_text = { current_line = true },
	-- virtual_lines = { current_line = true },
})
