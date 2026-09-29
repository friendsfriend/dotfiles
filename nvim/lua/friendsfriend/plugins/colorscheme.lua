local omarchy_colors = vim.fn.expand("~/.local/state/omarchy/current/theme/colors.toml")
local omarchy_neovim = vim.fn.expand("~/.local/state/omarchy/current/theme/neovim.lua")
local has_omarchy = vim.fn.executable("omarchy-theme-color") == 1

if has_omarchy and vim.fn.filereadable(omarchy_colors) == 1 then
	local mode = vim.fn.system({ "omarchy-theme-color", "--file", omarchy_colors, "mode" }):gsub("%s+$", "")
	if mode == "light" or mode == "dark" then
		vim.o.background = mode
	end
end

if has_omarchy and vim.fn.filereadable(omarchy_neovim) == 1 then
	-- Omarchy's generated file also contains a LazyVim spec; this config is not LazyVim.
	local omarchy_plugins = dofile(omarchy_neovim)
	local theme = omarchy_plugins[1]
	local theme_colors = theme.opts and theme.opts.colors
	local colorscheme = omarchy_plugins[2].opts.colorscheme
	theme.config = function(plugin, opts)
		local main = require("lazy.core.loader").get_main(plugin)
		if main and opts and next(opts) then
			local module = require(main)
			if type(module.setup) == "function" then
				module.setup(opts)
			end
		end

		local function set_selection_highlight()
			if theme_colors and theme_colors.background and theme_colors.foreground then
				local selection = { fg = theme_colors.background, bg = theme_colors.foreground }
				vim.api.nvim_set_hl(0, "Visual", selection)
				vim.api.nvim_set_hl(0, "VisualNOS", selection)
			end
		end
		vim.api.nvim_create_autocmd("ColorScheme", {
			pattern = colorscheme,
			callback = set_selection_highlight,
		})
		vim.cmd.colorscheme(colorscheme)
		set_selection_highlight()
	end
	return theme
end

-- Catppuccin Mocha fallback outside Omarchy.
return {
	"catppuccin/nvim",
	name = "catppuccin",
	priority = 1000,
	config = function()
		require("catppuccin").setup({
			autointegrations = true,
		})

		vim.cmd([[colorscheme catppuccin-mocha]])
	end,
}
