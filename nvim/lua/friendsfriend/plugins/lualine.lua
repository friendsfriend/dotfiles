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

		-- Track last 3 buffers per tab
		local function recent_buffers_component()
			local jumplist, pos = unpack(vim.fn.getjumplist())
			local current = vim.api.nvim_get_current_buf()
			local seen = {}
			local result = {}
			-- walk from current position backwards (most recent first)
			for i = pos, 1, -1 do
				local entry = jumplist[i]
				local bufnr = entry and entry.bufnr
				if bufnr and bufnr ~= current and not seen[bufnr] and vim.api.nvim_buf_is_valid(bufnr) then
					seen[bufnr] = true
					local name = vim.api.nvim_buf_get_name(bufnr)
					name = name ~= "" and vim.fn.fnamemodify(name, ":t") or "[No Name]"
					table.insert(result, name)
					if #result == 3 then
						break
					end
				end
			end
			if #result == 0 then
				return ""
			end
			return table.concat(result, "  |  ")
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
			tabline = {
				lualine_a = {
					{
						"tabs",
						mode = 2, -- show tab number + filename
						fmt = function(name, context)
							-- context.tabnr is the tab this label is being rendered for
							local tabnr = context.tabnr
							local winid = vim.api.nvim_tabpage_get_win(tabnr)
							local bufnr = vim.api.nvim_win_get_buf(winid)
							local ft = vim.bo[bufnr].filetype
							local ignored_fts = {
								snacks_picker_input = true,
								snacks_picker_list = true,
								snacks_terminal = true,
								trouble = true,
							}
							if not ignored_fts[ft] then
								return name
							end
							-- active window is a UI buffer — find the first real file buffer in this tab
							for _, win in ipairs(vim.api.nvim_tabpage_list_wins(tabnr)) do
								local b = vim.api.nvim_win_get_buf(win)
								if not ignored_fts[vim.bo[b].filetype] and vim.bo[b].buftype == "" then
									local bname = vim.api.nvim_buf_get_name(b)
									bname = bname ~= "" and vim.fn.fnamemodify(bname, ":t") or "[No Name]"
									-- preserve the tab number prefix from the original name (e.g. "1 ")
									local prefix = name:match("^%d+ ")
									return prefix and (prefix .. bname) or bname
								end
							end
							return name
						end,
					},
				},
				lualine_z = {
					{
						recent_buffers_component,
						color = function()
							-- read lualine_z's normal-mode colors and return them directly,
							-- bypassing modes.nvim which recolors named highlight groups
							local hl = vim.api.nvim_get_hl(0, { name = "lualine_z_normal", link = false })
							return { fg = hl.fg and string.format("#%06x", hl.fg), bg = hl.bg and string.format("#%06x", hl.bg) }
						end,
					},
				},
			},
			extensions = { "mason", "lazy", "trouble" },
		})
	end,
}
