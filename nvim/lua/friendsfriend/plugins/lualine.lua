-- Introduces a status line on the bottom with useful information
return {
	"nvim-lualine/lualine.nvim",
	dependencies = {
		"nvim-tree/nvim-web-devicons",
		"catppuccin/nvim",
	},
	config = function()
		local lualine = require("lualine")
		local lazy_status = require("lazy.status") -- to configure lazy pending updates count

		-- CodeCompanion integration
		local CodeCompanion = require("lualine.component"):extend()

		CodeCompanion.processing = false
		CodeCompanion.spinner_index = 1

		local spinner_symbols = {
			"⠋",
			"⠙",
			"⠹",
			"⠸",
			"⠼",
			"⠴",
			"⠦",
			"⠧",
			"⠇",
			"⠏",
		}
		local spinner_symbols_len = 10

		function CodeCompanion:init(options)
			CodeCompanion.super.init(self, options)

			local group = vim.api.nvim_create_augroup("CodeCompanionHooks", {})

			vim.api.nvim_create_autocmd({ "User" }, {
				pattern = "CodeCompanionRequest*",
				group = group,
				callback = function(request)
					if request.match == "CodeCompanionRequestStarted" then
						self.processing = true
					elseif request.match == "CodeCompanionRequestFinished" then
						self.processing = false
					end
				end,
			})
		end

		function CodeCompanion:update_status()
			if self.processing then
				self.spinner_index = (self.spinner_index % spinner_symbols_len) + 1
				return spinner_symbols[self.spinner_index]
			else
				return nil
			end
		end

		-- configure lualine with modified theme
		lualine.setup({
			options = {
				theme = "catppuccin",
				globalstatus = true,
			},
			sections = {
				lualine_x = {
					{
						lazy_status.updates,
						cond = lazy_status.has_updates,
						color = { fg = "#ff9e64" },
					},
					{ "fileformat" },
					{ "filetype" },
					CodeCompanion,
				},
			},
			extensions = { "mason", "lazy" },
		})
	end,
}
