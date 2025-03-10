return {
	{
		"folke/snacks.nvim",
		priority = 1000,
		lazy = false,
		opts = {
			quickfile = require("friendsfriend.plugins.snacks.quickfile"),
			words = require("friendsfriend.plugins.snacks.words"),
			statuscolumn = require("friendsfriend.plugins.snacks.statuscolumn"),
			rename = require("friendsfriend.plugins.snacks.rename"),
			picker = require("friendsfriend.plugins.snacks.picker"),
			dashboard = require("friendsfriend.plugins.snacks.dashboard"),
			lazygit = require("friendsfriend.plugins.snacks.lazygit"),
			image = require("friendsfriend.plugins.snacks.image"),
		},
		keys = require("friendsfriend.keymap.snacks-core"),
	},
}
