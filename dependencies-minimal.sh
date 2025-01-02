#!/bin/bash

# Install brew if not installed (package manager)
which -s brew
if [[ $? != 0 ]] ; then
    # Install Homebrew
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    brew update
    brew upgrade
fi

# Install all homebrew packages
while IFS='' read -r line || [[ -n "$line" ]]; do
    brew install "$line"
done < "./brew-minimal.txt"
