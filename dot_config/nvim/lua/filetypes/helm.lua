-- https://www.reddit.com/r/neovim/comments/12ub997/how_to_prevent_yaml_ls_from_attaching_to_helm/
local function is_helm_file(path)
  local check = vim.fs.find("Chart.yaml", { path = vim.fs.dirname(path), upward = true })
  return not vim.tbl_isempty(check)
end

local function yaml_filetype(path, bufname)
  return is_helm_file(path) and "helm.yaml" or "yaml"
end

vim.filetype.add {
  extension = {
    yaml = yaml_filetype,
    yml = yaml_filetype,
  },
  filename = {
    ["Chart.yaml"] = "yaml",
  },
}
