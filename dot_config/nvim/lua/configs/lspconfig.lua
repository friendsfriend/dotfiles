local configs = require "nvchad.configs.lspconfig"

local on_attach = configs.on_attach
local on_init = configs.on_init
local capabilities = configs.capabilities

local lspconfig = require "lspconfig"
local servers = {
  "biome",
  "lua_ls",
  "gopls",
  "texlab",
  "zls",
  "cssls",
  "htmx",
  "autotools_ls",
  "svelte",
  "dockerls",
  "docker_compose_language_service",
  "taplo",
  "rust_analyzer",
  "typst_lsp",
}

-- Generic
for _, lsp in ipairs(servers) do
  lspconfig[lsp].setup {
    on_attach = on_attach,
    on_init = on_init,
    capabilities = capabilities,
  }
end

-- TypeScript
lspconfig.tsserver.setup {
  on_attach = on_attach,
  on_init = on_init,
  capabilities = capabilities,
  init_options = {
    preferences = {
      disableSuggestions = true,
    },
  },
}

-- HTML
lspconfig.html.setup {
  on_attach = on_attach,
  on_init = on_init,
  capabilities = capabilities,
  filetypes = { "html", "templ", "heex" },
}

-- Vue
lspconfig.volar.setup {
  on_attach = on_attach,
  on_init = on_init,
  capabilities = capabilities,
  filetypes = { "typescript", "javascript", "javascriptreact", "typescriptreact", "vue", "json" },
}

-- Elixir
lspconfig.elixirls.setup {
  on_attach = on_attach,
  on_init = on_init,
  capabilities = capabilities,
  cmd = { vim.fn.expand "$HOME/.local/share/nvim/mason/packages/elixir-ls/language_server.sh" },
}

-- Helm
lspconfig.helm_ls.setup {
  on_attach = on_attach,
  on_init = on_init,
  capabilities = capabilities,
  filetypes = { "helm", "helm.yaml" },
}

-- YAML
local yaml_config = require "configs.yaml"
lspconfig.yamlls.setup(yaml_config)

-- JSON
lspconfig.jsonls.setup {
  on_attach = on_attach,
  on_init = on_init,
  capabilities = capabilities,
  settings = {
    json = {
      schemas = require("schemastore").json.schemas(),
      validate = { enable = true },
    },
  },
}
