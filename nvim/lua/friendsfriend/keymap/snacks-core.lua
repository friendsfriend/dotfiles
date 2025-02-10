return {
  -- Words
	{"<leader>wn", function() require("snacks").words.jump(vim.v.count1) end, desc = "[W]ord: [N]ext Reference", mode = { "n", "t" },},
	{"<leader>wp", function() require("snacks").words.jump(-vim.v.count1) end, desc = "[W]ord: [P]revious Reference", mode = { "n", "t" },},

  -- Rename
	{"<leader>rr", function() require("snacks").rename.rename_file() end, desc = "[R]ename: Current File",},

	-- Picker
	{"<leader><space>", function() require("snacks").picker.smart() end, desc = "Search Everywhere",},
	{"<leader>ff", function() require("snacks").picker.files() end, desc = "[F]ind: [F]iles",},
	{"<leader>fs", function() require("snacks").picker.grep() end, desc = "[F]ind: [S]tring",},
	{"<leader>fw", function() require("snacks").picker.grep_word() end, desc = "[F]ind: [W]ord / Visual Selection", mode = { "n", "x" },},
	{"<leader>fk", function() require("snacks").picker.keymaps({ layout = "ivy" }) end, desc = "[F]ind [K]eymaps",},
	{"<leader>fh", function() require("snacks").picker.help() end, desc = "[F]ind: [H]elp Pages",},
	{"<leader>fr", function() require("snacks").picker.recent() end, desc = "[F]ind: [R]ecent",},
	{"<leader>fS", function() require("snacks").picker.search_history() end, desc = "[F]ind: [S]earch History",},
	{"<leader>fc", function() require("snacks").picker.command_history() end, desc = "[F]ind: [C]ommands",},
	{"<leader>fe", function() require("snacks").picker.diagnostics() end, desc = "[F]ind: [E]rrors and Warnings",},

  -- lsp
	{"<leader>ld", function() require("snacks").picker.lsp_definitions() end, desc = "[L]sp [D]efinition",},
	{"<leader>lD", function() require("snacks").picker.lsp_declarations() end, desc = "[L]sp: [D]eclaration",},
	{"<leader>lu", function() require("snacks").picker.lsp_references() end, nowait = true, desc = "[L]sp: [R]eferences",},
	{"<leader>lI", function() require("snacks").picker.lsp_implementations() end, desc = "[L]sp: [I]mplementation",},
	{"<leader>lT", function() require("snacks").picker.lsp_type_definitions() end, desc = "[L]sp: T[y]pe Definition",},

	-- Git Stuff
	{"<leader>gb", function() require("snacks").picker.git_branches({ layout = "select" }) end, desc = "[G]it: [B]ranches",},
	{"<leader>gg", function() require("snacks").lazygit() end, desc = "[G]it: UI",},
	{"<leader>gl", function() require("snacks").lazygit.log() end, desc = "[G]it: [L]ogs",},
	{"<leader>gs", function() require("snacks").picker.git_status() end, desc = "[G]it: [S]tatus",},
}
