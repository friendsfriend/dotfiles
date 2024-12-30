#!/bin/zsh

function prompt_my_bun_version () {
  if [ -e bun.lockb ]; then
    bun_version="$(bun --version)"
    p10k segment -f yellow -i "󰳮" -t "${bun_version}"
  fi
}
