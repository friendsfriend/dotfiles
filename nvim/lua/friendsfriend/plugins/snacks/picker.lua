return {
	enabled = true,
	layout = {
		-- presets options : "default" , "ivy" , "ivy-split" , "telescope" , "vscode", "select" , "sidebar"
		-- override picker layout in keymaps function as a param below
		preset = "telescope", -- defaults to this layout unless overidden
		cycle = false,
	},
	layouts = {
		select = {
			preview = false,
			layout = {
				backdrop = false,
				width = 0.6,
				min_width = 80,
				height = 0.4,
				min_height = 10,
				box = "vertical",
				border = "rounded",
				title = "{title}",
				title_pos = "center",
				{ win = "input", height = 1, border = "bottom" },
				{ win = "list", border = "none" },
				{ win = "preview", title = "{preview}", width = 0.6, height = 0.4, border = "top" },
			},
		},
		telescope = {
			reverse = true, -- set to false for search bar to be on top
			layout = {
				box = "horizontal",
				backdrop = false,
				width = 0.8,
				height = 0.9,
				border = "none",
				{
					box = "vertical",
					{ win = "list", title = " Results ", title_pos = "center", border = "rounded" },
					{
						win = "input",
						height = 1,
						border = "rounded",
						title = "{title} {live} {flags}",
						title_pos = "center",
					},
				},
				{
					win = "preview",
					title = "{preview:Preview}",
					width = 0.50,
					border = "rounded",
					title_pos = "center",
				},
			},
		},
		ivy = {
			layout = {
				box = "vertical",
				backdrop = false,
				width = 0,
				height = 0.4,
				position = "bottom",
				border = "top",
				title = " {title} {live} {flags}",
				title_pos = "left",
				{ win = "input", height = 1, border = "bottom" },
				{
					box = "horizontal",
					{ win = "list", border = "none" },
					{ win = "preview", title = "{preview}", width = 0.5, border = "left" },
				},
			},
		},
	},
}
