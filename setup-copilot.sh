#!/bin/bash

is_copilot_installed() {
  gh extension list | grep -q "github/gh-copilot"
}

is_copilot_authenticated() {
  gh auth status > /dev/null 2>&1
}

if is_copilot_installed && is_copilot_authenticated; then
  echo "GitHub Copilot is already installed and authenticated. Skipping setup."
else
  if is_copilot_authenticated; then
    echo "Already authenticated with GitHub."
  else
    gh auth login
  fi
  gh extension install github/gh-copilot
fi


