# dotfiles

Mon poste de travail versionné. Machine neuve opérationnelle en 10 minutes, café compris.

Géré avec [chezmoi](https://www.chezmoi.io) + un `Brewfile` pour les outils.

## Installation sur une machine vierge

Une seule ligne :

```sh
sh -c "./start_install.sh"
```

chezmoi demande ton nom et ton email (pour le gitconfig), déploie les configs, puis un script `run_once` installe Homebrew si besoin et lance `brew bundle`.

## Le quotidien

```sh
chezmoi update                      # récupérer les dernières configs sur une machine
chezmoi edit ~/.zshrc               # modifier une config gérée
chezmoi add ~/.config/outil/config  # ajouter une nouvelle config
chezmoi cd                          # aller dans le repo pour commit + push
```
