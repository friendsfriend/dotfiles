return {
	"gbprod/substitute.nvim",
	keys = {
		{ "s", function() require("substitute").operator() end, desc = "Substitute with motion" },
		{ "ss", function() require("substitute").line() end, desc = "Substitute line" },
		{ "S", function() require("substitute").eol() end, desc = "Substitute to end of line" },
		-- skip visual "S": mini-surround owns it (visual surround add)
		{ "s", function() require("substitute").visual() end, desc = "Substitute in visual mode", mode = "x" },
	},
	opts = {},
}
