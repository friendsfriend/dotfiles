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

		opts.desc = "Smart rename"
		keymap.set("n", "<leader>lr", vim.lsp.buf.rename, opts) -- smart rename

		opts.desc = "Show line diagnostics"
		keymap.set("n", "<leader>lE", vim.diagnostic.open_float, opts) -- show diagnostics for line

		opts.desc = "Go to previous diagnostic"
		keymap.set("n", "<leader>lep", function()
			vim.diagnostic.jump({ count = -1, float = true })
		end, opts) -- jump to previous diagnostic in buffer

		opts.desc = "Go to next diagnostic"
		keymap.set("n", "<leader>len", function()
			vim.diagnostic.jump({ count = 1, float = true })
		end, opts) -- jump to next diagnostic in buffer

		opts.desc = "Show documentation for what is under cursor"
		keymap.set("n", "<leader>lh", vim.lsp.buf.hover, opts) -- show documentation for what is under cursor
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
})
