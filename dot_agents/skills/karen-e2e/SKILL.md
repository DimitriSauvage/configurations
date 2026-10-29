---
name: karen-e2e
description: Générer, à la demande explicite de l'utilisateur, des tests e2e Playwright maintenables, rapides et exprimés en langage métier (esprit DDD) via une session karen doc active — périmètre des parcours critiques validé par l'utilisateur avant toute écriture (point de validation obligatoire), détection de Playwright dans le projet cible avec scaffold proposé et conditionné à l'accord (jamais d'installation sans validation), standards de tests (sélecteurs robustes getByRole/getByLabelText/getByTestId, auto-waiting sans sleep arbitraire, tests isolés et indépendants, données créées via fixtures et utilitaires factorisés dans e2e/utils/, page objects seulement si la duplication le justifie), langage naturel du domaine dans describe/test et helpers, boucle d'exécution `npx playwright test` itérée jusqu'au vert, parcours impossible à automatiser signalé plutôt qu'écrit bancal.
---

# Karen E2E — tests e2e Playwright pilotés par l'agent

KarenUI, compétence e2e : l'utilisateur demande explicitement la génération de
tests e2e Playwright, et l'agent (cette compétence) explore les parcours de
l'application via une session `karen doc` active, puis écrit une suite de
tests **directement dans le repo cible**.

Cette compétence est **déclenchée uniquement sur demande** : elle n'est jamais
lancée d'elle-même pendant une documentation. Le livrable, ce sont les tests
(`e2e/`, `playwright.config.ts`), pas un rapport — le CLI n'en produit aucun.

## Prérequis

1. `karen doc` est lancé **dans un process détaché** (voir « Démarrage
   détaché » ci-dessous) — jamais dans un runner à timeout, qui tuerait le
   serveur en cours de session. Bannière affichée, plage de ports 4000–4010 ;
   la session démarre en mode `documentation` — vérifiable via
   `karen_get_status` ou `/health`.
2. Chrome est ouvert avec l'extension KarenUI connectée (icône active).
3. L'application à couvrir est ouverte dans l'onglet actif, en environnement
   de test si possible (données reproductibles).
4. Le repo cible (celui où écrire les tests) est le CWD du CLI.

### Démarrage détaché et diagnostic de panne

Lancer `karen doc` hors de tout runner à timeout (shell direct, `nohup`) :

```bash
nohup karen doc > /tmp/karen-doc.log 2>&1 & disown
curl -s http://localhost:4000/health   # → HTTP 200 : serveur démarré
```

En cas d'erreur MCP « connexion » pendant la session, diagnostiquer en un
`curl` avant toute autre action :

- HTTP `000` : le process serveur est mort — relancer en détaché (commande
  ci-dessus), puis reprendre la génération.
- HTTP `200` avec `"wsClients": 0` : le serveur vit mais l'extension est
  déconnectée — elle se reconnecte d'elle-même (backoff) ; **poller**
  `/health` jusqu'à `"wsClients": 1` plutôt que d'attendre à l'aveugle avec
  des `sleep`.

`/health` retourne `{ status, port, complaints, mode, wsClients }` — le mode
attendu ici est `"documentation"`.

## Connexion MCP

```bash
claude mcp add karen http://localhost:<port>/mcp
```

(opencode : entrée `"karen": {"type": "remote", "url": "http://localhost:<port>/mcp"}`
sous `mcp` dans `opencode.json`.)

## Outils MCP

| Outil                      | Rôle ici                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `karen_get_status`         | Diagnostic : mode de session, URL active, port.                                                                                                       |
| `karen_navigate`           | Visite les écrans d'un parcours, renvoie `{url, title, summary}`.                                                                                     |
| `karen_get_page_context`   | Structure de la page (titres, landmarks, formulaires, liens) — repère les rôles et libellés **futurs sélecteurs** (`getByRole`, `getByLabelText`).    |
| `karen_capture_screenshot` | Capture de repérage — mémoriser un état d'écran, jamais livrée.                                                                                       |
| `karen_resize_viewport`    | Redimensionne la fenêtre — utile si un parcours dépend du viewport.                                                                                   |
| `karen_inspect`            | Vérifie la résolution d'un sélecteur CSS — utile pour confirmer qu'un `data-testid` existe.                                                           |
| `karen_click`              | Exécute une action utilisateur réelle et renvoie le contexte rafraîchi — rejouer le parcours pas à pas.                                               |
| `karen_get_audit_trail`    | Mémoire inter-pages : dernier contexte connu par URL visitée.                                                                                         |
| `karen_request_user_help`  | **Données sensibles uniquement** (ex. identifiants) : pose une question dans le panel KarenUI (bloquant, 10 min max). Toute autre question → console. |

**Outils refusés en mode documentation** (gate audit-seul) : `karen_create_complaint`
et `karen_complete_audit`. La génération e2e n'a ni constat ni clôture.

**Outils yolo — exploration uniquement, jamais ici** : `karen_fill_form` et
`karen_submit_form` (mode `--yolo`) sont réservés à l'exploration (audit,
documentation). La méthodologie e2e reste **inchangée, sans yolo** : un test
rejoue un parcours avec `karen_click` sur des états déjà atteignables — les
tools yolo ne servent jamais à produire ou valider un test.

**Questions utilisateur** : toute question se pose **dans ta console** (ta
conversation) — validation du périmètre, accord de scaffold, incertitudes.
`karen_request_user_help` est **réservé aux données sensibles (ex.
identifiants)** — jamais de secrets dans ta conversation.

## Les quatre phases

1. **Phase 0 — Périmètre** (validation utilisateur obligatoire) — parcours
   critiques identifiés, proposés, validés, puis figés : c'est le scope.
2. **Phase 1 — Détection / scaffold Playwright** — s'aligner sur l'existant,
   ou proposer un scaffold et attendre l'accord.
3. **Phase 2 — Écriture des tests** — standards de qualité, langage métier.
4. **Phase 3 — Boucle de vérification** — exécuter, corriger, itérer jusqu'au
   vert.

## Phase 0 — Périmètre (validation utilisateur obligatoire)

Cette compétence **ne démarre que sur demande explicite** de tests e2e. Si
l'utilisateur n'a pas demandé de tests, ne rien générer.

1. **Explorer les parcours candidats** : navigation via MCP
   (`karen_navigate`, `karen_get_page_context`, `karen_click`) + codebase
   (routes, flows métier, composants majeurs) pour repérer les parcours
   critiques (inscription, création, paiement, flux principal…).
2. **Proposer la liste des scénarios** dans ta console : un scénario = un parcours utilisateur de bout en
   bout, nommé en langage métier. Préciser pour chacun l'écran de départ et
   le résultat attendu.
3. **Attendre la validation** — point de passage obligatoire, aucun test
   écrit avant. Le périmètre validé **fige le scope** : pas de spec hors
   liste. Un parcours nouveau découvert en cours de route → nouvelle
   validation utilisateur.

**Toute incertitude comportementale** (données de test ? résultat attendu de
ce flux ?) → question posée **dans ta console**, **jamais d'hypothèse**.

## Phase 1 — Détection / scaffold Playwright

- **Preflight obligatoire avant tout scaffold/run** : exécuter
  `karen e2e preflight` (défaut : cwd, ou `karen e2e preflight <dir>`) et
  **traiter le rapport avant de continuer** :
  - **blockers** (`exit code 1`) : le run est interdit. Proposer à
    l'utilisateur l'installation des deps manquantes (`@playwright/test`,
    `msw` quand `mocks/` existe — jamais d'installation sans accord) ;
  - **warnings serveur stale** (pid + commande, et absence de
    `NUXT_PUBLIC_MSW_ENABLED=true` quand le repo a une couche `mocks/`) :
    signaler explicitement que `reuseExistingServer` réutilisera ce serveur
    sans MSW — tuer le process ou faire valider l'environnement par
    l'utilisateur ; **ne jamais lancer le run avec un blocker actif**, et
    relancer le preflight après chaque correction pour confirmer le vert.
- **Playwright présent** dans le projet cible (`@playwright/test` dans le
  package.json, `playwright.config.ts`, `e2e/` existant) : s'**aligner** sur
  la config — baseURL, projets, reporters, conventions de répertoires et de
  nommage en place. Ne pas introduire une seconde convention.
- **Playwright absent** (cas fréquent) : **proposer** le scaffold dans ta
  console et **attendre l'accord** — jamais d'installation
  sans validation :
  - `@playwright/test` en devDependency ;
  - navigateurs : `npx playwright install` (+ `--with-deps` si l'utilisateur
    l'accepte) ;
  - `playwright.config.ts` minimal (baseURL de l'environnement de test,
    projet Chromium, reporter list, retries en CI) ;
  - dossier `e2e/` + script `test:e2e` dans le package.json.

Les ajouts au package.json et les dépendances sont listés à l'utilisateur
**avant** installation et restent strictement nécessaires.

## Phase 2 — Écriture des tests (standards)

### Sélecteurs robustes

- **`getByRole`** en premier (rôle + nom accessible) — c'est aussi un test
  d'accessibilité.
- **`getByLabelText`** pour les champs de formulaire.
- **`getByTestId`** en repli, quand aucun rôle/nom n'existe.
- **Jamais** de sélecteur CSS fragile (classes utilitaires, structure HTML
  interne), jamais de XPath positionnel.
- Si **aucun sélecteur robuste n'existe** pour une action clé : le signaler
  à l'utilisateur (problème d'accessibilité de l'app, à corriger dans le
  code applicatif) plutôt que d'écrire un sélecteur fragile.

### Auto-waiting et vitesse

- S'appuyer sur l'**auto-waiting** Playwright (attente visibilité, état
  enabled, réseau). **Aucun** `sleep`, aucun `waitForTimeout` arbitraire.
- Attendre un **état observable** (élément visible, réponse API, URL), pas
  une durée.
- Un test lent est un défaut : minimiser les navigations, éviter les
  captures inutiles, grouper les assertions sur une même page.

### Isolation et factorisation

- Chaque test est **indépendant** : ordre libre, pas d'état partagé entre
  tests, pas de dépendance à un test précédent.
- Les données et mises en situation sont créées via **fixtures** et
  **utilitaires factorisés** dans `e2e/utils/` — jamais de JSON collé en
  dur dans plusieurs specs.
- **Page objects seulement si la duplication le justifie** : un helper par
  action métier suffit souvent ; ne pas industrialiser prématurément.

### Langage métier (esprit DDD)

- `describe`/`test` nommés en **langage naturel du domaine** :
  « Un recruteur publie une offre », « Un candidat retire sa candidature ».
- **Une action utilisateur = une étape lisible** : chaque bloc du test
  correspond à une intention (remplir le formulaire, soumettre, vérifier la
  confirmation).
- Les helpers portent le **vocabulaire du domaine**
  (`publierOffre`, `connecterRecruteur`), pas le vocabulaire technique
  (`clickButton2`).

### Organisation

- **Un parcours validé = un fichier** `e2e/<domaine>.spec.ts`.
- Helpers partagés dans `e2e/utils/` ; fixtures dans `e2e/fixtures.ts` si
  le projet n'en a pas.

## Phase 3 — Boucle de vérification

1. Exécuter la suite : `npx playwright test` (ou le script du projet).
2. Lire les échecs, corriger le **test** (sélecteur, attente, donnée) — pas
   le code applicatif.
3. Ré-exécuter jusqu'au **vert complet**. Un commit de tests rouges n'existe
   pas.
4. Si l'environnement de test a des **prérequis** (seed de données, variable
   d'env, service tiers), les documenter dans le README du projet cible ou
   signaler à l'utilisateur.

### Parcours impossible à automatiser

Un parcours qui exige un CAPTCHA, un réseau externe non contrôlé, un email
non interceptable, un service indisponible en test → **le signaler à
l'utilisateur dans ta console** avec la raison, et le retirer
du scope (ou l'amorcer côté données si l'utilisateur le valide). Ne jamais
écrire un test bancal, intermittent ou désactivé pour « boucler » la liste.

## Discipline

- **Déclenchement sur demande uniquement** : pas de génération e2e spontanée,
  même en constatant l'absence totale de tests.
- **Périmètre figé à la validation** : pas de spec hors parcours validés, pas
  de « tant qu'à faire ».
- **Pas de dépendance ajoutée sans accord** : scaffold Playwright = accord
  explicite ; tout ajout au package.json est listé avant.
- **Ne pas modifier le code applicatif** pour faire passer un test : une
  divergence (comportement attendu ≠ comportement réel, sélecteur
  inaccessible) se signale, elle ne se « répare » pas en silence.
- **Les tests reflètent l'app réelle** observée via la session, pas un
  comportement supposé. Toute affirmation sur un flux est vérifiée dans le
  code ou confirmée par l'utilisateur.
- Rester dans le repo cible : écrire uniquement `e2e/`, `playwright.config.ts`
  et les entrées package.json strictement nécessaires.

## Auto-install de cette compétence

```bash
karen skill path karen-e2e              # chemin du SKILL.md embarqué
karen skill print karen-e2e             # l'affiche sur stdout
karen skill install <repertoire>        # copie tous les skills dont karen-e2e
```

Un agent peut installer ce skill dans son répertoire de compétences via
`karen skill install` — aucun serveur requis.
