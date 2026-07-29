# dotfiles

Mon poste de travail versionné. Machine neuve opérationnelle en 10 minutes, café compris.

Géré avec [chezmoi](https://www.chezmoi.io) + un `Brewfile` pour les outils.

## Installation sur une machine vierge

Une seule ligne :

```sh
sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply yparent
```

chezmoi demande ton nom et ton email (pour le gitconfig), déploie les configs, puis un script `run_once` installe Homebrew si besoin et lance `brew bundle`.

## Ce qui est installé

**Terminal** : [Ghostty](https://ghostty.org), [zellij](https://zellij.dev), [starship](https://starship.rs)

**Remplaçants modernes** : [zoxide](https://github.com/ajeetdsouza/zoxide), [atuin](https://atuin.sh), [bat](https://github.com/sharkdp/bat), [eza](https://eza.rocks), [ripgrep](https://github.com/BurntSushi/ripgrep), [fzf](https://github.com/junegunn/fzf)

**Docker & K8s** : [lazydocker](https://github.com/jesseduffield/lazydocker), [dive](https://github.com/wagoodman/dive), [hadolint](https://github.com/hadolint/hadolint), [trivy](https://trivy.dev), [k9s](https://k9scli.io), kubectl, [kubectx/kubens](https://github.com/ahmetb/kubectx), [stern](https://github.com/stern/stern), [helm](https://helm.sh)

**Les discrets** : [jq](https://jqlang.github.io/jq/), [yq](https://github.com/mikefarah/yq), [direnv](https://direnv.net), [mise](https://mise.jdx.dev)

**IA** : [Claude Code](https://claude.com/claude-code) (installé par le script, pas via brew)

## Le quotidien

```sh
chezmoi update                      # récupérer les dernières configs sur une machine
chezmoi edit ~/.zshrc               # modifier une config gérée
chezmoi add ~/.config/outil/config  # ajouter une nouvelle config
chezmoi cd                          # aller dans le repo pour commit + push
```

## Structure

```
dot_zshrc                     -> ~/.zshrc          (aliases docker/k8s, inits, fonctions)
dot_gitconfig.tmpl            -> ~/.gitconfig      (nom/email demandés au premier apply)
dot_config/starship.toml      -> prompt (git, contexte k8s, docker, terraform)
dot_config/ghostty/config     -> terminal
dot_config/zellij/config.kdl  -> multiplexeur
dot_config/atuin/config.toml  -> historique (avec filtre anti-secrets)
dot_config/mise/config.toml   -> versions globales (node, python)
dot_config/bat/config         -> bat
Brewfile                      -> la liste des outils
run_once_install.sh.tmpl      -> installe tout au premier apply
```

Forke, vire mes configs, mets les tiennes. La structure fait le boulot.