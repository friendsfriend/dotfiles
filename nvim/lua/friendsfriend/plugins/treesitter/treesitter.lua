local parsers = {
	"json", "javascript", "typescript", "tsx", "yaml", "html", "css", "prisma", "markdown", "markdown_inline",
	"bash", "lua", "vim", "dockerfile", "gitignore", "vimdoc", "c", "kotlin", "java",
}

return {
	"nvim-treesitter/nvim-treesitter",
	branch = "main",
	lazy = false,
	dependencies = {
		{ "nvim-treesitter/nvim-treesitter-textobjects", branch = "main" },
	},
	lazy = false,
	build = ":TSUpdate",
	config = function()
		local treesitter = require("nvim-treesitter")

		treesitter.setup()
		treesitter.install({
			"json",
			"javascript",
			"typescript",
			"tsx",
			"yaml",
			"html",
			"css",
			"prisma",
			"markdown",
			"markdown_inline",
			"bash",
			"lua",
			"vim",
			"dockerfile",
			"gitignore",
			"vimdoc",
			"c",
			"kotlin",
			"java",
		})

		vim.api.nvim_create_autocmd("FileType", {
			callback = function(args)
				if pcall(vim.treesitter.start, args.buf) then
					vim.bo[args.buf].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
				end
			end,
		})

		vim.treesitter.language.register("bash", "zsh")
	end,
}
