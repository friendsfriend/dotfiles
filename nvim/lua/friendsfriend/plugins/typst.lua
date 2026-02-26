return {
	"chomosuke/typst-preview.nvim",
	ft = "typst",
	version = "1.*",
	config = function()
		vim.keymap.set({ "n", "<leader>tp", "<cmd>TypstPreview<cr>", { desc = "Start typst live preview" } })
	end,
}
