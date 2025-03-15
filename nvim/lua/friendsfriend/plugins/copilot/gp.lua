return {
	"robitx/gp.nvim",
	name = "gp",
	event = "BufEnter",
	config = function()
		require("gp").setup({
			providers = {
				copilot = {
					endpoint = "https://api.githubcopilot.com/chat/completions",
					secret = {
						"bash",
						"-c",
						"cat ~/.config/github-copilot/apps.json | sed -e 's/.*oauth_token...//;s/\".*//'",
					},
				},
			},
			hooks = {
				codereview = function(gp, params)
					local template = table.concat({
						"i have the following code from dotfiles/nvim/lua/friendsfriend/plugins/copilot/gp.lua:\n\n",
						"```{{filetype}}\n{{selection}}\n```\n\n",
						"please analyze for code smells and suggest improvements.",
					})
					local agent = gp.get_chat_agent()
					gp.prompt(params, gp.target.enew("markdown"), agent, template)
				end,
			},
		})
	end,

	keys = function()
		require("which-key").add({
			-- VISUAL mode mappings
			-- s, x, v modes are handled the same way by which_key
			{
				mode = { "v" },
				nowait = true,
				remap = false,
				{ "<C-g><C-t>", ":<C-u>'<,'>GpChatNew tabnew<cr>", desc = "ChatNew tabnew", icon = "󰗋" },
				{ "<C-g><C-v>", ":<C-u>'<,'>GpChatNew vsplit<cr>", desc = "ChatNew vsplit", icon = "󰗋" },
				{ "<C-g><C-x>", ":<C-u>'<,'>GpChatNew split<cr>", desc = "ChatNew split", icon = "󰗋" },
				{ "<C-g>a", ":<C-u>'<,'>GpAppend<cr>", desc = "Visual Append (after)", icon = "󰗋" },
				{ "<C-g>b", ":<C-u>'<,'>GpPrepend<cr>", desc = "Visual Prepend (before)", icon = "󰗋" },
				{ "<C-g>c", ":<C-u>'<,'>GpChatNew<cr>", desc = "Visual Chat New", icon = "󰗋" },
				{ "<C-g>g", group = "generate into new ..", icon = "󰗋" },
				{ "<C-g>ge", ":<C-u>'<,'>GpEnew<cr>", desc = "Visual GpEnew", icon = "󰗋" },
				{ "<C-g>gn", ":<C-u>'<,'>GpNew<cr>", desc = "Visual GpNew", icon = "󰗋" },
				{ "<C-g>gp", ":<C-u>'<,'>GpPopup<cr>", desc = "Visual Popup", icon = "󰗋" },
				{ "<C-g>gt", ":<C-u>'<,'>GpTabnew<cr>", desc = "Visual GpTabnew", icon = "󰗋" },
				{ "<C-g>gv", ":<C-u>'<,'>GpVnew<cr>", desc = "Visual GpVnew", icon = "󰗋" },
				{ "<C-g>i", ":<C-u>'<,'>GpImplement<cr>", desc = "Implement selection", icon = "󰗋" },
				{ "<C-g>n", "<cmd>GpNextAgent<cr>", desc = "Next Agent", icon = "󰗋" },
				{ "<C-g>p", ":<C-u>'<,'>GpChatPaste<cr>", desc = "Visual Chat Paste", icon = "󰗋" },
				{ "<C-g>r", ":<C-u>'<,'>GpRewrite<cr>", desc = "Visual Rewrite", icon = "󰗋" },
				{ "<C-g>s", "<cmd>GpStop<cr>", desc = "GpStop", icon = "󰗋" },
				{ "<C-g>t", ":<C-u>'<,'>GpChatToggle<cr>", desc = "Visual Toggle Chat", icon = "󰗋" },
				{ "<C-g>x", ":<C-u>'<,'>GpContext<cr>", desc = "Visual GpContext", icon = "󰗋" },
			},

			-- NORMAL mode mappings
			{
				mode = { "n" },
				nowait = true,
				remap = false,
				{ "<C-g><C-t>", "<cmd>GpChatNew tabnew<cr>", desc = "New Chat tabnew" },
				{ "<C-g><C-v>", "<cmd>GpChatNew vsplit<cr>", desc = "New Chat vsplit" },
				{ "<C-g><C-x>", "<cmd>GpChatNew split<cr>", desc = "New Chat split" },
				{ "<C-g>a", "<cmd>GpAppend<cr>", desc = "Append (after)" },
				{ "<C-g>b", "<cmd>GpPrepend<cr>", desc = "Prepend (before)" },
				{ "<C-g>c", "<cmd>GpChatNew<cr>", desc = "New Chat" },
				{ "<C-g>f", "<cmd>GpChatFinder<cr>", desc = "Chat Finder" },
				{ "<C-g>g", group = "generate into new .." },
				{ "<C-g>ge", "<cmd>GpEnew<cr>", desc = "GpEnew" },
				{ "<C-g>gn", "<cmd>GpNew<cr>", desc = "GpNew" },
				{ "<C-g>gp", "<cmd>GpPopup<cr>", desc = "Popup" },
				{ "<C-g>gt", "<cmd>GpTabnew<cr>", desc = "GpTabnew" },
				{ "<C-g>gv", "<cmd>GpVnew<cr>", desc = "GpVnew" },
				{ "<C-g>n", "<cmd>GpNextAgent<cr>", desc = "Next Agent" },
				{ "<C-g>r", "<cmd>GpRewrite<cr>", desc = "Inline Rewrite" },
				{ "<C-g>s", "<cmd>GpStop<cr>", desc = "GpStop" },
				{ "<C-g>t", "<cmd>GpChatToggle<cr>", desc = "Toggle Chat" },
			},

			-- INSERT mode mappings
			{
				mode = { "i" },
				nowait = true,
				remap = false,
				{ "<C-g><C-t>", "<cmd>GpChatNew tabnew<cr>", desc = "New Chat tabnew" },
				{ "<C-g><C-v>", "<cmd>GpChatNew vsplit<cr>", desc = "New Chat vsplit" },
				{ "<C-g><C-x>", "<cmd>GpChatNew split<cr>", desc = "New Chat split" },
				{ "<C-g>a", "<cmd>GpAppend<cr>", desc = "Append (after)" },
				{ "<C-g>b", "<cmd>GpPrepend<cr>", desc = "Prepend (before)" },
				{ "<C-g>c", "<cmd>GpChatNew<cr>", desc = "New Chat" },
				{ "<C-g>f", "<cmd>GpChatFinder<cr>", desc = "Chat Finder" },
				{ "<C-g>g", group = "generate into new .." },
				{ "<C-g>ge", "<cmd>GpEnew<cr>", desc = "GpEnew" },
				{ "<C-g>gn", "<cmd>GpNew<cr>", desc = "GpNew" },
				{ "<C-g>gp", "<cmd>GpPopup<cr>", desc = "Popup" },
				{ "<C-g>gt", "<cmd>GpTabnew<cr>", desc = "GpTabnew" },
				{ "<C-g>gv", "<cmd>GpVnew<cr>", desc = "GpVnew" },
				{ "<C-g>n", "<cmd>GpNextAgent<cr>", desc = "Next Agent" },
				{ "<C-g>r", "<cmd>GpRewrite<cr>", desc = "Inline Rewrite" },
				{ "<C-g>s", "<cmd>GpStop<cr>", desc = "GpStop" },
				{ "<C-g>t", "<cmd>GpChatToggle<cr>", desc = "Toggle Chat" },
			},
		})
	end,
}
