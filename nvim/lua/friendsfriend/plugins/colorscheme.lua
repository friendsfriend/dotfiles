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
	local omarchy_plugins = dofile(omarchy_neovim)
	local aether = omarchy_plugins[1]
	local theme_colors = aether.opts and aether.opts.colors
	aether.config = function(_, opts)
		require("aether").setup(opts)
		local function set_selection_highlight()
			local colors = theme_colors
			if colors and colors.background and colors.foreground then
				local selection = { fg = colors.background, bg = colors.foreground }
				vim.api.nvim_set_hl(0, "Visual", selection)
				vim.api.nvim_set_hl(0, "VisualNOS", selection)
			end
		end
		vim.api.nvim_create_autocmd("ColorScheme", {
			pattern = "aether",
			callback = set_selection_highlight,
		})
		vim.cmd.colorscheme("aether")
		set_selection_highlight()
	end
	return omarchy_plugins
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
