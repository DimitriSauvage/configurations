#!/bin/bash
# Exécuté une seule fois par chezmoi au premier apply.
set -euo pipefail

info() { printf "\n\033[1;34m==> %s\033[0m\n" "$1"; }

# Dépendances système sur Linux (Homebrew en a besoin)
if [ "$(uname -s)" = "Linux" ] && command -v apt-get >/dev/null 2>&1; then
  info "Dépendances système (apt)"
  sudo apt-get update -qq
  sudo apt-get install -y -qq build-essential curl git unzip
fi

info "Homebrew"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

info "Outils (Brewfile)"
brew bundle install


info "Zsh par défaut"
if [ "$(basename "${SHELL:-}")" != "zsh" ] && command -v zsh >/dev/null 2>&1; then
  chsh -s "$(command -v zsh)" || echo "Change ton shell manuellement : chsh -s $(command -v zsh)"
fi

sh -c "$(curl -fsLS get.chezmoi.io)"
# Initialize the normal chezmoi source directory
chezmoi init https://github.com/DimitriSauvage/configurations

# Apply everything
chezmoi apply -v

mise install

info "Terminé. Ouvre un nouveau terminal."

# Plannotator
curl -fsSL https://plannotator.ai/install.sh | bash

# CodeGraph
npm i -g @colbymchenry/codegraph
/bin/bash -c "codegraph install"
