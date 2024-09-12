local M = require("yaml-companion").setup {
  -- Built in file matchers
  builtin_matchers = {
    -- Detects Kubernetes files based on content
    kubernetes = { enabled = true },
    cloud_init = { enabled = true },
  },
  -- Additional schemas available in Telescope picker
  schemas = {},
  -- Pass any additional options that will be merged in the final LSP config
  lspconfig = {
    flags = {
      debounce_text_changes = 150,
    },
    settings = {
      redhat = { telemetry = { enabled = false } },
      yaml = {
        validate = true,
        format = { enable = true },
        hover = true,
        schemaStore = {
          enable = true,
          url = "https://www.schemastore.org/api/json/catalog.json",
        },
        schemaDownload = { enable = true },
        schemas = {},
        trace = { server = "debug" },
      },
    },
  },
}

return M
