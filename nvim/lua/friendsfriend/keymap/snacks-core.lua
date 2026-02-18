return {
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
	{"<leader>fb", function() require("snacks").picker.buffers() end, desc = "[F]ind: Buffers",},
	{"<leader>fC", function() require("snacks").picker.cliphist() end, desc = "[F]ind: Clipboard History",},
	{"<leader>fm", function() require("snacks").picker.man() end, desc = "[F]ind: [M]an page",},
	{"<leader>fu", function() require("snacks").picker.undo() end, desc = "[F]ind: [U]ndo History",},
	{"<leader>fp", function() require("snacks").picker.zoxide() end, desc = "[F]ind: [Projects]",},

  -- lsp
	{"<leader>ld", function() require("snacks").picker.lsp_definitions() end, desc = "[L]sp [D]efinition",},
	{"<leader>lD", function() require("snacks").picker.lsp_declarations() end, desc = "[L]sp: [D]eclaration",},
	{"<leader>lu", function() require("snacks").picker.lsp_references() end, nowait = true, desc = "[L]sp: [R]eferences",},
	{"<leader>lI", function() require("snacks").picker.lsp_implementations() end, desc = "[L]sp: [I]mplementation",},
	{"<leader>lT", function() require("snacks").picker.lsp_type_definitions() end, desc = "[L]sp: T[y]pe Definition",},

	-- Git Stuff
	{"<leader>gb", function() require("snacks").picker.git_branches({ layout = "select" }) end, desc = "[G]it: [B]ranches",},
	{"<leader>gg", function() require("snacks").lazygit() end, desc = "[G]it: UI",},
	{"<leader>gl", function() require("snacks").lazygit.log() end, desc = "[G]it: [L]ogs (Lazygit)",},

  -- explorer 
	{"<leader>ee", function() require("snacks").explorer.reveal() end, desc = "[E]xplorer",},
}
