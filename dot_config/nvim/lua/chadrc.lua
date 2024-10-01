---@class ChadrcConfig
local M = {}

M.ui = {
  theme = "nightowl",
  statusline = {
    theme = "default",
    separator_style = "arrow",
  },
  tabufline = {
    --  more opts
    order = { "treeOffset", "buffers", "tabs" },
  },
}

-- M.plugins = "plugins"

-- M.mappings = require "mappings"

return M
