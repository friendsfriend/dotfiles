#!/bin/bash

is_copilot_installed() {
  gh extension list | grep -q "github/gh-copilot"
}

is_copilot_authenticated() {
  gh auth status > /dev/null 2>&1
}

if is_copilot_installed && is_copilot_authenticated; then
  echo "Github cli is already authenticated and the copilot extension is installed. Skipping setup."
else
  read -r -p "Do you want to set up Github Copilot now? (y/n): " choice
  if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
    if is_copilot_authenticated; then
      echo "Already authenticated with GitHub."
    else
      gh auth login
    fi
    gh extension install github/gh-copilot
  fi
fi

