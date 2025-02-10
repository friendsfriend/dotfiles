return {
	"stevearc/conform.nvim",
	event = { "BufReadPre", "BufNewFile" },
	config = function()
		local conform = require("conform")

		conform.setup({
			formatters_by_ft = {
				javascript = { "biomejs" },
				typescript = { "biomejs" },
				javascriptreact = { "biomejs" },
				typescriptreact = { "biomejs" },
				json = { "prettier" },
				yaml = { "prettier" },
				lua = { "stylua" },
				go = { "goimports", "gofmt" },
				bash = { "shfmt", "spellcheck" },
				zsh = { "shfmt", "spellcheck" },
				sh = { "shfmt", "spellcheck" },
			},
			format_on_save = {
				lsp_fallback = true,
				async = false,
				timeout_ms = 1000,
			},
		})

		vim.keymap.set({ "n", "v" }, "<leader>lf", function()
			conform.format({
				lsp_fallback = true,
				async = false,
				timeout_ms = 1000,
			})
		end, { desc = "Format file or range (in visual mode)" })
	end,
}
