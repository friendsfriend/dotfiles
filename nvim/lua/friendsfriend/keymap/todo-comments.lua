return {
	{"<leader>ft", function() require("snacks").picker.todo_comments() end, desc = "[F]ind: [T]ODOs",},
	{"<leader>fT", function() require("snacks").picker.todo_comments({ keywords = { "TODO", "FIX", "FIXME" } }) end, desc = "[F]ind: TODOs/FIX/FIXMEs",},
}
