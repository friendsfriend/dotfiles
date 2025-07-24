-- Package manager for lsp servers
local servers = {
	"bashls",
	"ts_ls",
	"html",
	"cssls",
	"tailwindcss",
	"kotlin_lsp",
	"lua_ls",
	"pyright",
	"gopls",
	"yamlls",
	"jsonls",
}

local tools = {
	"stylua", -- lua formatter
	"shellcheck", -- bash
	"biome",
}

return {
	"williamboman/mason.nvim",
	dependencies = {
		"williamboman/mason-lspconfig.nvim",
		"WhoIsSethDaniel/mason-tool-installer.nvim",
	},
	config = function()
		local mason = require("mason")
		local mason_lspconfig = require("mason-lspconfig")
		local mason_tool_installer = require("mason-tool-installer")

		-- enable mason and configure icons
		mason.setup({
			ui = {
				icons = {
					package_installed = "✓",
					package_pending = "➜",
					package_uninstalled = "✗",
				},
			},
		})

		mason_lspconfig.setup({
			-- list of servers for mason to install
			ensure_installed = servers,
		})

		mason_tool_installer.setup({
			ensure_installed = tools,
		})
	end,
}
