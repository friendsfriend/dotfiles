-- adds a dashboard when starting nvim
return {
	enabled = true,
	sections = {
		{ section = "header" },
		{ section = "keys", gap = 1, padding = 1 },
		{ section = "startup" },
	},
}
