-- core for all the plugins in this folder
return {
	"folke/snacks.nvim",
	priority = 1000,
	lazy = false,
	opts = {
		dashboard = require("friendsfriend.plugins.snacks.dashboard"),
		explorer = require("friendsfriend.plugins.snacks.explorer"),
		image = require("friendsfriend.plugins.snacks.image"),
		input = require("friendsfriend.plugins.snacks.input"),
		lazygit = require("friendsfriend.plugins.snacks.lazygit"),
		picker = require("friendsfriend.plugins.snacks.picker"),
		quickfile = require("friendsfriend.plugins.snacks.quickfile"),
		rename = require("friendsfriend.plugins.snacks.rename"),
		statuscolumn = require("friendsfriend.plugins.snacks.statuscolumn"),
		toggle = require("friendsfriend.plugins.snacks.toggle"),
	},
	keys = require("friendsfriend.keymap.snacks-core"),
}
