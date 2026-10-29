---
name: karen-doc
description: Produire ou mettre à jour la documentation front d'une application web via une session karen doc active — exploration systématique de l'app (navigation, contexte de page, captures via MCP), de la codebase (framework, routes, composants, stores, couche API) et de la documentation existante, plan de documentation validé par l'utilisateur (point de validation obligatoire, aucune écriture avant), rédaction en anglais dans un markdown clair et concis (chaque doc répond « pour qui, pour quoi, comment », mermaid pour les schémas logiques, un fichier par sujet, index depuis le README, captures d'écran stockées dans docs/assets/), mode mise à jour (diff docs ↔ code, réécriture du seul divergent, captures périmées régénérées), phase graphe de connaissance en fin de session (nœuds JSON dans .karen-graph/ avec sources hashées, vues régénérées par la CLI, boucle qualité karen graph — voir le skill karen-graph), discipline anti-invention (toute affirmation vérifiable dans le code ou confirmée par l'utilisateur, scope figé au plan validé).
---

# Karen Doc — documentation front pilotée par l'agent

KarenUI mode documentation : l'utilisateur lance `karen doc`, ouvre l'application
dans Chrome avec l'extension KarenUI active, et l'agent (cette compétence)
explore l'application, sa codebase et sa documentation existante pour produire
ou mettre à jour la documentation front **directement dans le repo cible**.

Contrairement au mode audit, il n'y a **aucun rapport généré par le CLI** : le
livrable, ce sont les fichiers markdown écrits dans le repo (README indexé,
`docs/` par sujet, captures dans `docs/assets/`). La session se termine par
`Ctrl+C` quand la documentation est livrée.

## Prérequis

1. `karen doc` est lancé **dans un process détaché** (voir « Démarrage
   détaché » ci-dessous) — jamais dans un runner à timeout, qui tuerait le
   serveur en cours de session. Bannière affichée, plage de ports 4000–4010 ;
   la session démarre en mode `documentation` — vérifiable via
   `karen_get_status` ou `/health`.
2. Chrome est ouvert avec l'extension KarenUI connectée (icône active).
3. L'application à documenter est ouverte dans l'onglet actif.
4. Le repo cible (celui où écrire les docs) est le CWD du CLI.

### Démarrage détaché et diagnostic de panne

Lancer `karen doc` hors de tout runner à timeout (shell direct, `nohup`) :

```bash
nohup karen doc > /tmp/karen-doc.log 2>&1 & disown
curl -s http://localhost:4000/health   # → HTTP 200 : serveur démarré
```

En cas d'erreur MCP « connexion » pendant la session, diagnostiquer en un
`curl` avant toute autre action :

- HTTP `000` : le process serveur est mort — relancer en détaché (commande
  ci-dessus), puis reprendre la documentation.
- HTTP `200` avec `"wsClients": 0` : le serveur vit mais l'extension est
  déconnectée — elle se reconnecte d'elle-même (backoff) ; **poller**
  `/health` jusqu'à `"wsClients": 1` (ou relancer `karen_get_status`)
  plutôt que d'attendre à l'aveugle avec des `sleep`.

`/health` retourne `{ status, port, complaints, mode, wsClients, lastSeenAt }` — le mode
attendu ici est `"documentation"`.

Démarrage « zéro touch » (TASK-116) : poller `/health` jusqu'à
`wsClients >= 1`, puis premier `karen_navigate` avec `waitFor` — un onglet
endormi s'auto-réveille (`woke: true`, cas normal, à poursuivre sans
commentaire) ; dérouler la session sans action utilisateur ni focus.

Première navigation d'une SPA (TASK-120) : le shell peut ne pas avoir fini de
monter → le tool retente seul (polling du contexte, plafond 250 ms) et ne
renvoie jamais un contexte vide muet. Ne passez `waitFor` que si un `hint`
du retour le demande (contexte resté vide) — sinon laissez le tool gérer.

## Connexion MCP

```bash
claude mcp add karen http://localhost:<port>/mcp
```

(opencode : entrée `"karen": {"type": "remote", "url": "http://localhost:<port>/mcp"}`
sous `mcp` dans `opencode.json`.)

## Outils MCP

| Outil                      | Usage                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `karen_get_status`         | Diagnostic : mode de session, URL active, port.                                                                                                                                                                                                                                                                                                                                                             |
| `karen_navigate`           | Navigue l'onglet suivi vers une URL, renvoie `{url, title, summary}` (contexte sur DOM stabilisé ; `lean: true` → résumé réduit ; contexte vide (SPA) → retry auto puis `hint` `waitFor`).                                                                                                                                                                                                                  |
| `karen_get_page_context`   | Structure de la page courante (titres, landmarks, formulaires, images, `viewport`, `overflow`…) — éléments exposés à l'arbre d'accessibilité uniquement. Le résumé porte `elementIndex` (TASK-122) : table des éléments interactifs indexés, chaque entrée avec `target` re-résolvable — **utilisez `elementIndex[n].target` tel quel** dans `karen_inspect`/`karen_click`, ne recomposez pas l'expression. |
| `karen_capture_screenshot` | Capture JPEG de l'onglet visible (renvoyée en image) — à sauvegarder dans `docs/assets/` du repo cible.                                                                                                                                                                                                                                                                                                     |
| `karen_resize_viewport`    | Redimensionne la vraie fenêtre Chrome, renvoie la taille réellement appliquée (captures responsive).                                                                                                                                                                                                                                                                                                        |
| `karen_inspect`            | Vérifie la résolution d'expressions de ciblage (CSS, `role=`, `text=`) — utile pour cibler un écran avant capture.                                                                                                                                                                                                                                                                                          |
| `karen_click`              | Clique un élément de la page (résolution unique, visible, actif ; hosts d'éléments custom délégués automatiquement à leur bouton interne) et renvoie le contexte rafraîchi `{url, title, summary}`.                                                                                                                                                                                                         |
| `karen_fill_form`          | (yolo uniquement) Remplit des champs (`{cssSelector, value}`) — écho-vérifié : `echo` = valeur relue, `warning` si divergence → vérifier le binding.                                                                                                                                                                                                                                                        |
| `karen_submit_form`        | (yolo uniquement) Soumet un `<form>` — décrire les écrans de confirmation, d'erreur et de validation réels.                                                                                                                                                                                                                                                                                                 |
| `karen_get_audit_trail`    | Mémoire inter-pages : dernier contexte connu par URL visitée — cohérence entre les pages.                                                                                                                                                                                                                                                                                                                   |
| `karen_request_user_help`  | **Données sensibles uniquement** (ex. identifiants) : pose une question dans le panel KarenUI (bloquant, 10 min max). Toute autre question → console.                                                                                                                                                                                                                                                       |

**Outils refusés en mode documentation** (gate audit-seul) : `karen_create_complaint`
et `karen_complete_audit`. La documentation n'a ni constat ni clôture : la
session s'arrête par `Ctrl+C` quand la doc est livrée.

**Mode yolo** (`karen doc --yolo`) : `karen_fill_form` et `karen_submit_form`
deviennent disponibles pour une **exploration enrichie** — remplir et soumettre
des formulaires pour atteindre et décrire les états réels (confirmation,
erreur, validation) que la navigation seule n'expose pas. Deux règles :
annoncer à l'utilisateur avant toute action potentiellement **irréversible**
(paiement, suppression, envoi d'email), et se souvenir que le yolo ne change
**rien** à la méthodologie : l'écriture de doc reste inchangée (plan figé,
anti-invention, sources croisées) — le yolo élargit l'exploration, pas le
livrable.

**Questions utilisateur** : toute question se pose **dans ta console** (ta
conversation) — validation du plan, incertitudes, demandes de fichiers.
`karen_request_user_help` est **réservé aux données sensibles (ex.
identifiants)** — jamais de secrets dans ta conversation.

**Captures** : `karen_capture_screenshot` renvoie l'image à l'agent — c'est à
lui de l'écrire sur disque (`docs/assets/<sujet>-<ecran>.jpg` du repo cible) et
de la référencer en markdown relatif (`![](docs/assets/...)`). Les captures
documentent l'app **réelle**, jamais une maquette.

## Les cinq phases

1. **Phase 0 — Exploration** (obligatoire) — app, codebase, doc existante.
   Rien n'est écrit avant la fin de cette phase.
2. **Phase 1 — Plan de documentation** (validation utilisateur obligatoire) —
   sommaire proposé, validé, puis figé : c'est le scope.
3. **Phase 2 — Rédaction** — standards de qualité, captures incluses.
4. **Phase 3 — Mise à jour** (mode update) — diff docs ↔ code, réécriture du
   seul divergent.
5. **Phase 4 — Graphe de connaissance** (toujours) — nœuds JSON dans
   `.karen-graph/` puis boucle qualité `karen graph` (détails : skill
   karen-graph).

## Phase 0 — Exploration (obligatoire)

Trois sources, toutes obligatoires avant de proposer un plan :

### L'application (via MCP)

- `karen_get_status` — vérifier la connexion, le mode `documentation`, l'URL.
- `karen_navigate` — visiter chaque écran accessible depuis la navigation
  (liens internes, puis contrôles sans URL via `karen_click`).
- `karen_get_page_context` sur chaque écran — intention, contenu, formulaires.
- Captures de repérage (non définitives) pour mémoriser les écrans clés.
- `karen_get_audit_trail` — maintenir la cohérence inter-écrans.

Objectif : connaître les **écrans clés** de l'app et l'intention de chacun.

### La codebase

- Framework, structure des répertoires, conventions (lint, tests).
- Routes et entrées de navigation ; composants majeurs par écran.
- Stores / état global ; couche API (endpoints consommés).
- Tooling disponible (commandes dev, build, test) — utile pour `testing.md`.

### La documentation existante

- README, `docs/`, commentaires significatifs, ADR éventuels.
- Classer chaque élément : **à jour**, **périmé** (diverge du code), ou
  **absent** (sujet non couvert).
- En mode update, la doc existante se lit **entièrement et d'abord** (Phase 3).

**Interdit** : écrire le moindre fichier avant la fin de cette phase.

## Phase 1 — Plan de documentation (validation utilisateur obligatoire)

Constituer le plan, puis **attendre la validation de l'utilisateur** — point
de passage obligatoire, aucune écriture avant.

Le plan contient :

- Le **sommaire** : liste des fichiers `docs/` (existants à mettre à jour ou
  nouveaux), avec pour chacun son sujet et sa répond à « pour qui, pour quoi,
  comment ».
- Le **périmètre** : ce qui sera créé, ce qui sera mis à jour, ce qui est
  explicitement hors scope.
- Les **écrans à capturer** (une capture par écran clé).
- L'**index README** : comment la doc sera reliée depuis le README.

Soumettre le plan **dans ta console** (ta conversation, sous forme lisible et
résumée) et attendre l'accord explicite de l'utilisateur ; intégrer les
retours avant de démarrer la rédaction.

**Toute incertitude comportementale** (que fait réellement cette feature ?
quel est le rôle de ce champ ?) → question posée **dans ta console**,
**jamais d'hypothèse**. Si l'utilisateur ne répond pas, laisser la zone non
documentée et le signaler — ne pas combler par invention.

Le plan validé **fige le scope** : pas de fichier doc non demandé. Un sujet
nouveau découvert en cours de route → nouvelle validation utilisateur.

## Phase 2 — Rédaction (standards)

### Langue et format

- **Anglais** pour toute la documentation produite.
- Markdown, textes clairs et **concis** : phrases courtes, listes, tableaux.
  Pas de remplissage, pas de paraphrase.
- Chaque document répond à trois questions, dès son introduction :
  **pour qui** (audience), **pour quoi** (problème résolu), **comment**
  (usage concret).

### Structure

- **Un fichier par sujet** : `architecture.md`, `modules/<domaine>.md`,
  `testing.md`, `getting-started.md`… Un sujet qui grandit devient un fichier,
  pas une section interminable.
- **Index depuis le README** : une section type « Where to start » — liste
  ordonnée de liens vers les fichiers `docs/`, du plus utile au plus
  spécialisé.
- Schémas : **mermaid** pour les schémas logiques uniquement (flux,
  machine à états, architecture de composants). Une capture d'écran ne se
  remplace jamais par un schéma, et inversement.

### Illustrations UI

- `karen_capture_screenshot` par écran clé → sauvegarder dans
  `docs/assets/` du repo cible, référencer en chemin relatif.
- Une capture par écran clé ; recadrer/renommer si utile (outil image),
  ne jamais retoucher le contenu.
- Pour une app responsive : capturer les paliers pertinents via
  `karen_resize_viewport` (ex. mobile + desktop) quand le comportement visuel
  diffère.

### Vérification

- Avant de rédiger un fait, le vérifier sur **au moins deux sources** :
  observation via MCP + code. Une seule source incertaine = question
  utilisateur.
- Relire chaque fichier : chaque affirmation vérifiable, chaque lien valide,
  chaque capture existante.

## Phase 3 — Mise à jour (mode update)

Quand la doc existe déjà, la mise à jour suit un ordre strict :

1. **Lire l'existant d'abord**, entièrement — comprendre l'intention du
   document avant de le modifier.
2. **Diff docs ↔ code** : ce que la doc affirme vs ce que le code fait. Le
   code fait foi : la doc divergente est corrigée.
3. **Ne réécrire que ce qui a divergé** — préserver l'historique, la voix et
   les intentions valides de l'existant. Pas de réécriture cosmétique.
4. **Régénérer les captures périmées** (UI changée) — même emplacement, même
   nom si le sujet est inchangé.
5. **Signaler à l'utilisateur** : zones documentées à l'aveugle faute de
   réponse, code non trivial non documenté, doc absente sur un sujet sensible.

## Phase 4 — Graphe de connaissance (toujours)

En fin de session, après la doc livrée, générer ou mettre à jour le graphe
de connaissance `.karen-graph/` — même discipline, autre livrable. Le
détail complet (format des nœuds, granularité, contenus par genre, boucle
qualité) vit dans le **skill karen-graph** ; résumé opérationnel :

1. **Mode update** : `karen graph validate --strict` d'abord — corriger les
   nœuds périmés (hash des sources ≠) avant tout nouveau contenu.
2. Écrire les nœuds JSON (`nodes/<kind>/<id>.json`) à partir de ce qui a
   déjà été exploré et validé pendant la session : `sources[]` obligatoires
   avec hash, `summary` autonome, liens uniquement vers des nœuds réels,
   identifiants métier (droits, endpoints, messages) recopiés du code.
3. Réutiliser les nœuds existants via des liens (pas de doublon) — un
   nouveau sujet = un nouveau nœud, un sujet disparu = suppression du
   fichier.
4. Boucle qualité : `karen graph validate` → corrections → `karen graph
index` → `karen graph code` → `karen graph validate --strict` final
   (doit passer).
5. Ne jamais éditer à la main : `manifest.json`, `README.md`, `SKILL.md`,
   `nodes/code/` — générés par la CLI.

## Discipline

- **Toute affirmation documentée est vérifiable dans le code ou confirmée par
  l'utilisateur** (question posée dans ta console). Interdiction d'inventer :
  pas de comportement supposé, pas d'API supposée, pas de nom de fichier
  deviné.
- **Scope figé au plan validé** : pas de doc non demandée, pas de sujet
  improvisé.
- **La documentation ne corrige pas le code** : une divergence code ↔
  comportement attendu se note et se signale, elle ne se « répare » pas en
  cours de documentation.
- **Les captures reflètent l'app réelle**, au moment de la session.
- **Le graphe suit la même discipline** que la doc : sources lues et
  hashées, liens prouvés, identifiants exacts — et fichiers générés
  (`manifest.json`, vues, modules) jamais édités à la main.
- Rester dans le repo cible : pas de fichiers hors `docs/`, `docs/assets/`,
  `.karen-graph/` et README (hors index).

## Auto-install de cette compétence

```bash
karen skill path karen-doc              # chemin du SKILL.md embarqué
karen skill print karen-doc             # l'affiche sur stdout
karen skill install <repertoire>        # copie tous les skills dont karen-doc
```

Un agent peut installer ce skill dans son répertoire de compétences via
`karen skill install` — aucun serveur requis.
