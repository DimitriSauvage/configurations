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
if ! command -v brew >/dev/null 2>&1; then
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
[ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
[ -x /home/linuxbrew/.linuxbrew/bin/brew ] && eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"

info "Outils (Brewfile)"
brew bundle --file="{{ .chezmoi.sourceDir }}/Brewfile" || true


info "Zsh par défaut"
if [ "$(basename "${SHELL:-}")" != "zsh" ] && command -v zsh >/dev/null 2>&1; then
  chsh -s "$(command -v zsh)" || echo "Change ton shell manuellement : chsh -s $(command -v zsh)"
fi

chezmoi apply -v $USER

info "Terminé. Ouvre un nouveau terminal."
