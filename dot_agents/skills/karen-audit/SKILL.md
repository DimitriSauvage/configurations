---
name: karen-audit
description: Conduire un audit UI/UX d'une application web via une session karen audit active — navigation, clics et captures via MCP, contexte fiable (DOM stabilisé, exposé à l'arbre d'accessibilité), exploration systématique de chaque page (liens internes, contrôles sans URL, états croisés, états vides/erreur), cohérence inter-pages via la mémoire d'audit, passerelle mobile obligatoire page par page, checklist WCAG 2.2 AA orientée top-issues, heuristiques de Nielsen, audit fonctionnel des parcours, préambule documentation (chemin fourni par l'utilisateur, gaps implémentation ↔ doc), audit de la codebase en lecture seule (dette visible + conformité aux standards du framework détecté via lint/typecheck/test du projet), dépôt de constats catégorisés et vérifiés (category/severity/check du référentiel), demande d'aide utilisateur, intégration des réponses utilisateur, rapport final consolidé automatiquement par le CLI dans karen-audit-report.md.
---

# Karen Audit — audit UI/UX piloté par l'agent

KarenUI mode audit : l'utilisateur lance `karen audit`, ouvre l'application dans
Chrome avec l'extension KarenUI active, et l'agent (cette compétence) mène un
audit en quatre volets :

1. **Audit visuel/a11y** — pages, accessibilité (WCAG 2.2 AA), heuristiques de
   Nielsen, lisibilité et contenu.
2. **Audit fonctionnel** — parcours utilisateurs, découvrabilité, ergonomie des
   chemins.
3. **Audit responsive** — passerelle mobile obligatoire à chaque page, puis
   paliers transversaux (tablette, desktop compact) par redimensionnement réel
   de la fenêtre Chrome.
4. **Audit de la codebase** — cartographie du code derrière les pages visitées,
   conformité aux standards du framework détecté (tooling du projet en lecture
   seule), conformité à la documentation fournie en préambule.

L'agent dépose des constats catégorisés dans Karen au fil de l'eau, puis
intègre les réponses de l'utilisateur dans le résumé de clôture ; le CLI écrit
alors automatiquement le rapport consolidé `karen-audit-report.md` (périmètre,
bilan par référentiel, couverture de navigation, réponses, priorités).

## Prérequis

1. `karen audit` est lancé **dans un process détaché** (voir « Démarrage
   détaché » ci-dessous) — jamais dans un runner à timeout, qui tuerait le
   serveur en cours d'audit. Bannière affichée, plage de ports 4000–4010 ; la
   session démarre en mode `audit` — vérifiable via `karen_get_status`.
2. Chrome est ouvert avec l'extension KarenUI connectée (icône active).
3. L'application à auditer est ouverte dans l'onglet actif.

### Démarrage détaché et diagnostic de panne

Lancer `karen audit` hors de tout runner à timeout (shell direct, `nohup`) :

```bash
nohup karen audit > /tmp/karen-audit.log 2>&1 & disown
curl -s http://localhost:4000/health   # → HTTP 200 : serveur démarré
```

En cas d'erreur MCP « connexion » pendant l'audit, diagnostiquer en un
`curl` avant toute autre action :

- HTTP `000` : le process serveur est mort — relancer en détaché (commande
  ci-dessus), puis reprendre l'audit.
- HTTP `200` avec `"wsClients": 0` : le serveur vit mais l'extension est
  déconnectée — elle se reconnecte d'elle-même (backoff) ; **poller**
  `/health` jusqu'à `"wsClients": 1` (ou relancer `karen_get_status`)
  plutôt que d'attendre à l'aveugle avec des `sleep`.
- HTTP `200` avec `"wsClients": 1` mais `karen_navigate` en timeout : onglet
  suivi endormi — l'extension s'**auto-réveille** depuis TASK-109
  (`chrome.tabs.reload` + retry, réponse porte `woke: true`) ;
  `karen_navigate` retente lui-même une fois. Double échec : vérifier
  `lastSeenAt` (ancien = onglet muet) et, seule action humaine restante,
  demander à l'utilisateur de **recharger l'onglet suivi**.

`/health` retourne `{ status, port, complaints, mode, wsClients, lastSeenAt }`
(`lastSeenAt` = timestamp ISO du dernier message WS reçu, `null` si aucun).

### Procédure de démarrage « zéro touch » (TASK-116)

Objectif : la session démarre et se déroule **sans aucune action utilisateur**
ni focus sur Chrome. Séquence au démarrage de chaque session :

1. Serveur détaché (ci-dessus) → **poller `/health`** jusqu'à
   `wsClients >= 1` — aucun appel MCP avant.
2. `karen_navigate({ url, waitFor: { selector: 'main' } })` — un onglet
   endormi s'auto-réveille (`woke: true` dans la réponse, cas normal au
   démarrage, à poursuivre sans commentaire) ; sinon `waitFor` confirme que
   la page est rendue.
3. `karen_get_page_context` — contexte complet = page prête pour la première
   observation ; en yolo, `karen_evaluate` permet de lire une valeur précise
   du state framework avant de conclure.
4. Dérouler l'audit, puis `karen_complete_audit` (restauration automatique du
   viewport initial).
5. Échec d'auto-wake uniquement : demander le rechargement de l'onglet suivi
   (seule intervention humaine prévue).

## Connexion MCP

```bash
claude mcp add karen http://localhost:<port>/mcp
```

(opencode : entrée `"karen": {"type": "remote", "url": "http://localhost:<port>/mcp"}`
sous `mcp` dans `opencode.json`.)

## Outils MCP

| Outil                      | Usage                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `karen_get_status`         | Diagnostic : mode de session, URL active, port, nombre de plaintes.                                                                                                                                                                                                                                                                                                                                                           |
| `karen_navigate`           | Navigue l'onglet suivi vers une URL, renvoie `{url, title, summary}` (contexte sur DOM stabilisé ; `waitFor`/`settleMs` en options).                                                                                                                                                                                                                                                                                          |
| `karen_get_page_context`   | Structure de la page courante (titres, landmarks, formulaires, images, `viewport`, `overflow`…) — éléments exposés à l'arbre d'accessibilité uniquement. Le résumé porte `elementIndex` (TASK-122) : table des éléments interactifs indexés, chaque entrée avec `target` re-résolvable — **utilisez `elementIndex[n].target` tel quel** dans `karen_inspect`/`karen_click`/`karen_fill_form`, ne recomposez pas l'expression. |
| `karen_capture_screenshot` | Capture JPEG de l'onglet visible (renvoyée en image).                                                                                                                                                                                                                                                                                                                                                                         |
| `karen_resize_viewport`    | Redimensionne la vraie fenêtre Chrome, renvoie la taille réellement appliquée. Le viewport initial est mémorisé et restauré automatiquement à la clôture (TASK-115) — resize libre en session.                                                                                                                                                                                                                                |
| `karen_inspect`            | Vérifie la résolution d'expressions de ciblage **sans créer de constat** — `{targets}` (+ `ignoredSelectors` si partielle).                                                                                                                                                                                                                                                                                                   |
| `karen_click`              | Clique un élément de la page (résolution unique, visible, actif ; hosts d'éléments custom délégués automatiquement à leur bouton interne) et renvoie le contexte rafraîchi `{url, title, summary}`. `capture: true` (TASK-112) enchaîne la capture dans le même appel (toasts éphémères).                                                                                                                                     |
| `karen_fill_form`          | (yolo uniquement) Remplit des champs `{cssSelector, value}` — écho-vérifié (TASK-107) : `echo` = valeur relue, `warning` si divergence → vérifier le binding avant de conclure (section « Mode YOLO »). `capture: true` = capture enchaînée.                                                                                                                                                                                  |
| `karen_submit_form`        | (yolo uniquement) Soumet un `<form>` — confirmer les comportements réels de validation et de confirmation. `capture: true` (TASK-112) = capture enchaînée (toast de confirmation).                                                                                                                                                                                                                                            |
| `karen_evaluate`           | (yolo uniquement) Évalue une expression JS en lecture seule dans le main world — lire le state framework (Vue, caches) pour départager stale UI vs refetch. Interdit d'écrire/muter/déclencher des effets.                                                                                                                                                                                                                    |
| `karen_get_audit_trail`    | Mémoire inter-pages : dernier contexte connu par URL visitée — cohérence entre les pages (cf. section dédiée).                                                                                                                                                                                                                                                                                                                |
| `karen_create_complaint`   | Dépose un constat catégorisé — ciblé par sélecteurs CSS ou global.                                                                                                                                                                                                                                                                                                                                                            |
| `karen_request_user_help`  | **Données sensibles uniquement** (ex. identifiants) : pose une question dans le panel KarenUI (bloquant, 10 min max). Toute autre question → console.                                                                                                                                                                                                                                                                         |
| `karen_complete_audit`     | Clôture l'audit avec un résumé final.                                                                                                                                                                                                                                                                                                                                                                                         |

Exemples :

```json
karen_inspect({ "cssSelectors": ["nav ul li a", "aside[role='complementary']"] })
```

```json
karen_click({ "cssSelector": "nav ul li button.tab-details" })
```

Adressage sémantique (TASK-104, préférer aux chemins `:nth-of-type` fragiles) :

```json
karen_click({ "cssSelector": "role=button[name='Enregistrer']" })
```

```json
karen_click({ "cssSelector": "text='Annuler'" })
```

Chaque cible résolue porte `requestedSelector` (écho de l'expression) et un
`cssSelector` unique rejouable — `role=` s'appuie sur le rôle implicite natif
(`button`, `link`, `textbox`…) ou `[role=…]` explicite, filtré par nom
accessible (`aria-labelledby` → `aria-label` → `title` → `placeholder` →
texte) ; `text=` vise le plus petit élément portant exactement ce texte
normalisé.

Attente d'état (TASK-106) — `karen_navigate`, `karen_click`,
`karen_fill_form`, `karen_submit_form` acceptent `waitFor: {selector?, text?,
urlContains?, networkIdleMs?}` et `settleMs` (0–2000, défaut 250) pour
attendre la condition avant de répondre (poll 50 ms, plafond 8 s). Si la
condition n'est pas atteinte, la réponse porte `waitFor.satisfied: false` +
note — l'action reste exécutée, ce n'est pas une erreur. Fini les appels de
confirmation en rafale :

```json
karen_click({ "cssSelector": "role=button[name='Enregistrer']", "waitFor": { "text": "Enregistré" } })
```

Sorties allégées (TASK-108) — `karen_navigate` et `karen_get_page_context`
acceptent `lean: true` : résumé réduit (images omises, champs actifs seuls,
overflow omis si vide). À utiliser sur les navigations exploratoires pour
limiter le volume de contexte ; réservez le contexte complet aux pages
réellement auditées. `karen_get_audit_trail` accepte `since` (ISO 8601),
`urlPrefix` et `limit` (1–200, défaut 50) pour filtrer côté CLI sans recharger
la mémoire complète.

Traversée shadow DOM (TASK-111) — le contexte inclut les shadow roots
ouverts : les éléments du shell applicatif (FAB, toasts, nav hors `main`)
apparaissent dans `buttonsLinks`/`landmarks`/`formFields` avec
`origin: 'shell'` (vs `origin: 'pilet'` pour le rendu dans `main`).
**Auditez ces éléments shell aussi** — un badge de FAB non identifié ou un
toast non référencé est un constat comme un autre.

### Cycle de vie de l'audit

Après une clôture (`karen_complete_audit`), toute `karen_navigate` **rouvre
automatiquement l'audit** : nouveau round (constats conservés, pages visitées
réinitialisées), le retour porte une `note` l'indiquant. Un round suivant se
déroule comme le premier et se clôture de même — utile pour vérifier des
corrections ou approfondir une zone, sans relancer `karen audit`.

Les outils `karen_get_complaints`, `karen_reply` et `karen_resolve` restent
disponibles pour relire ou commenter les constats déposés. Transitions
(param `id`) : `karen_reply` → `in_progress` ou `agent_needs_info`
(`needs_info: true`), `karen_resolve` → `resolved` — interdit depuis `open`,
répondre d'abord via `karen_reply`.

## Mode YOLO — exploration par formulaires (optionnel)

Lancé avec `karen audit --yolo`, l'audit gagne deux outils — `karen_fill_form`
et `karen_submit_form` — et un droit : **remplir et soumettre des formulaires**
pour explorer ce que la navigation et le clic n'atteignent pas seuls :

- **parcours métier** de bout en bout (formulaires multi-étapes, tunnels) ;
- **états d'erreur** (soumission incomplète, format invalide, rejet serveur) ;
- **validation** (limites de champs, valeurs extrêmes, champs requis) ;
- **données limites** (chaîne vide, très longue, caractères spéciaux).

Règles :

1. **Le yolo est un mode d'exploration, rien d'autre** : il n'a **aucun effet**
   sur la génération e2e (skill karen-e2e, méthodologie inchangée) et ne
   change pas la posture de constat — observer, puis `karen_create_complaint`.
2. **Annoncer avant toute action potentiellement irréversible** (paiement,
   suppression, envoi d'email) : dire dans ta console ce que tu vas soumettre
   et pourquoi, puis agir.
3. **Identifiants de connexion** : règle inchangée — via
   `karen_request_user_help` uniquement, jamais inventés ni devinés.
4. **Fidélité du remplissage (TASK-107)** : chaque résultat porte `echo` (la
   valeur **relue** dans le DOM après saisie — setter natif + `input`/`change`,
   focus avant / blur après). Un `warning` signale une divergence écho ≠
   valeur demandée — typique d'un champ contrôlé mal bindé ou d'un wrapper
   qui écrase la valeur : **vérifier le binding avant de conclure** (le
   résultat `ok: true` avec warning n'est pas une preuve de saisie effective).
   Les hosts custom elements (tag contenant un tiret) sont percés : le champ
   interne unique est rempli ; plusieurs champs remplissables → erreur
   demandant de préciser le champ interne direct.
5. **Phénomènes éphémères (TASK-112)** : dès qu'un toast, tooltip ou bandeau
   auto-dismiss est attendu après un clic/fill/submit, passer `capture: true`
   — la capture d'écran est enchaînée dans le **même appel MCP** (le toast de
   5 s est toujours à l'écran). Échec de capture non bloquant (`captureNote`
   dans la réponse, l'action reste réussie — retenter `karen_capture_screenshot`).
6. **Lecture du state (TASK-114)** : en cas de doute « UI périmée vs refetch
   en cours », `karen_evaluate({ expression })` lit le state framework en
   **main world** (ex. `document.querySelector('h1')?.textContent`,
   `window.__VUE_DEVTOOLS_GLOBAL_HOOK__ !== undefined`, propriété d'un store
   exposé). **Lecture seule** : jamais de setter, de dispatch ni d'appel
   mutateur — toute écriture est interdite. Combiner avec `waitFor` sur les
   actions pour dater l'observation.

## Parcours d'audit type

1. `karen_get_status` — vérifier la connexion, le mode `audit` et l'URL active.
2. **Préambule documentation** : demander à l'utilisateur, **dans ta console**
   (question directe dans ta conversation), le ou les chemins de
   documentation du projet audité (spec
   fonctionnelle, critères d'acceptation, README — une seule question, la
   réponse « pas de documentation » est valide et clôt le préambule). La doc
   lue servira au volet codebase à constater les gaps implémentation ↔ doc.
3. **Boucle par page** (volet visuel/a11y + exploration + passerelle mobile) :
   pour chaque page —
   1. `karen_navigate({ url })` ;
   2. `karen_get_page_context` + `karen_capture_screenshot` ;
   3. checklist WCAG et heuristiques Nielsen (sections ci-dessous), constats au
      fil de l'eau ;
   4. **exploration** de la page (liens internes, `karen_click`, états croisés)
      — chaque route ou état découvert entre à son tour dans la boucle ;
   5. **passerelle mobile** (375 px, taille réellement appliquée vérifiée,
      constats ancrés).
4. **Volet fonctionnel** : parcours utilisateurs clés de bout en bout (avec
   `karen_click` pour les contrôles), jugements de découvrabilité et
   d'ergonomie (section dédiée).
5. **Volet responsive transversal** : paliers 768 / 1280 sur un échantillon de
   pages représentatives, lecture d'`overflow` (section dédiée).
6. **Volet codebase** : cartographie du code derrière les pages et constats
   visités, conformité aux standards du framework détecté (tooling du projet
   en lecture seule), conformité à la documentation du préambule (section
   dédiée).
7. **Relecture** : `karen_get_complaints` — relire tous les constats et
   intégrer les réponses de l'utilisateur au résumé de clôture.
8. **Restauration puis clôture** : restaurer la taille d'origine de la fenêtre
   (`karen_resize_viewport`) puis `karen_complete_audit` avec le résumé final —
   le CLI écrit alors automatiquement le rapport `karen-audit-report.md`
   (section « Rapport final »).

Un constat à la fois ; **explorer chaque page avant de la juger** (section
suivante) ; ne jamais modifier le code source ni le DOM de l'application : en
mode audit, l'agent observe et signale — `karen_click` simule une action
utilisateur native, il ne modifie rien (seule exception : le mode yolo,
section « Mode YOLO » — remplissage/soumission de formulaires pour
l'exploration).

Le contexte de page retourné par `karen_navigate`, `karen_get_page_context`
et `karen_click` est mesuré sur un **DOM stabilisé** : aucune mutation
pendant 250 ms (plafond 2,5 s). Il est fiable dès la première lecture — un
contexte vide ou partiel reflète un état réel de la page (empty state,
contenu manquant), pas un chargement SPA en cours. Pas besoin de capture de
contrôle ni de re-contexte pour « vérifier que c'est chargé » : la capture
sert à juger le visuel, pas la fin du rendu.

## Exploration par page (obligatoire)

Une page n'est couverte que si elle a été **explorée** : se contenter du rendu
initial (contexte + capture) laisse inaperçus onglets, modales, filtres, états
vides et erreurs — la majorité des surfaces d'usage réelles.

Pour chaque page, avant de conclure :

1. **Inventorier les liens internes** : `buttonsLinks` du contexte de page et
   `href` de la navigation ; visiter chaque route joignable (chaque route
   découverte entre à son tour dans la boucle par page).
2. **Actionner les contrôles sans URL** : onglets, accordéons, filtres, tris,
   modales, menus hamburgers — via `karen_click` (le clic renvoie le contexte
   rafraîchi : rejuger la page dans le nouvel état).
3. **Croiser les états** : au minimum un état par dimension (filtre ×
   pagination × tri) et recontextualiser après chaque changement.
4. **Chercher les états dégénérés** : liste vide, recherche sans résultat, page
   d'erreur — ces états sont souvent les moins soignés.
5. **Explorer avant de juger** : un constat d'absence (« aucune pagination »,
   « aucun moyen de revenir ») n'est valable qu'après cette exploration.

Il n'y a **aucune limite de pages** : l'ancienne règle « visiter chaque page
une fois » est abolie. Une exploration qui découvre des routes non visitées
n'est pas finie.

## Cohérence inter-pages (mémoire d'audit)

`karen_get_audit_trail()` retourne la mémoire des pages visitées : une entrée
par URL `{ url, title, summary, visitedAt }` — dernier contexte connu, ordre
de première visite. Volatile : réinitialisée à chaque démarrage d'audit (et
donc à chaque nouveau round après clôture).

À chaque arrivée sur une nouvelle page, relire le trail et comparer avec les
pages déjà vues :

1. **Navigation** : mêmes entrées, même ordre, mêmes libellés d'une page à
   l'autre — une entrée qui disparaît ou change d'intitulé est un écart.
2. **Titres et hiérarchie** : un `h1` unique par page, structure de titres
   comparable entre pages de même type.
3. **Landmarks récurrents** : `main`, `nav`, `complementary` présents partout
   où ils le sont ailleurs.
4. **Style des libellés** : casse, terminologie, placement des actions
   (« Créer » vs « Ajouter », bouton primaire au même endroit).

Tout écart entre pages → constat cross-pages (catégorie `ux` ou `ui`),
distinct des constats intra-page déjà déposés : le message cite les pages
concernées (ex. « la nav de /accueil liste 4 entrées, celle de /pricing en
liste 3 »).

## Passerelle mobile par page (obligatoire)

Le responsive n'est pas un volet tardif : chaque page visitée subit sa
passerelle mobile au sein de la boucle.

1. `karen_resize_viewport({ width: 375, height: 667 })`.
2. **Lire la taille réellement appliquée** dans la réponse (et sa `note`
   éventuelle) : Chrome borne la fenêtre (ex. 375 × 667 demandé, 500 × 812
   appliqué). **Annoter la taille appliquée dans les constats responsive**
   déposés à ce palier.
3. `karen_get_page_context` — lire `viewport` (taille courante) et `overflow`
   (`horizontal`, `elements`) ; `karen_capture_screenshot` — contenus coupés,
   chevauchements, zones inatteignables.
4. Constats : catégories `ui` ou `a11y`, ancrés aux éléments d'`overflow.elements`.
5. Repasser à la taille d'exploration avant de continuer la page (ou restaurer
   la taille d'origine si l'audit se termine).

Les paliers 768 / 1280 restent un volet transversal sur pages représentatives
(section « Audit responsive »).

## Checklist WCAG 2.2 AA — top issues

Inspecter dans cet ordre (les champs de `karen_get_page_context` fournissent la
matière première) :

1. **Nom accessible** : boutons et liens sans libellé (`buttonsLinks` avec
   `hasAccessibleName: false`). Grave sur les boutons icônes seuls.
2. **Labels de formulaires** : champs sans label (`formFields` avec
   `label: null`), champs requis non signalés.
3. **Alternatives d'images** : images sans `alt` (`images` avec
   `hasAlt: false`), textes alternatifs génériques (« image », « photo »).
4. **Langue de la page** : attribut `lang` absent du `<html>` (`lang: null`).
5. **Hiérarchie de titres** : absence de `h1`, sauts de niveau (h2 → h4),
   titres utilisés pour le style et non la structure.
6. **Landmarks** : page sans `main`, `nav` absent sur un site à menu,
   régions redondantes sans label distinctif.
7. **Focus et clavier** (via captures et jugement) : indicateur de focus
   invisible, éléments interactifs hors ordre de tabulation, menus au survol
   inatteignables au clavier.
8. **Contrôles imbriqués** : un élément interactif dans un autre (ex.
   `div role="button"` contenant un vrai `<button>`) — double arrêt de
   tabulation, action ambiguë. Fréquent sur les tableaux, kanbans et cartes
   cliquables.
9. **Variantes responsive masquées** : le contexte de page liste uniquement
   les éléments **exposés à l'arbre d'accessibilité** — les variantes
   `display: none`, `inert`, `aria-hidden` et les éléments hors layout
   (rect 0×0) en sont exclues à l'extraction. Deux variantes visibles
   simultanément dans le contexte (double nav desktop/mobile,
   `tablist` + `listbox` coexistants) sont donc un vrai défaut d'exposition,
   à constater directement sans inspection préalable. Réciproquement, un
   élément présent dans le DOM mais absent du contexte est un candidat
   « contenu caché aux technologies d'assistance » : le confirmer via
   `karen_inspect` avant constat.
10. **`disabled` vs `readonly`** : formulaire en vue lecture rendu avec des
    champs `disabled` (inatteignables au focus, contenu non copiable) au lieu
    de `readonly`.
11. **Nœuds de formulaire sans nom accessible** : `<form>` sans
    `aria-label`/`aria-labelledby`, canvas/iframe sans fallback textuel.
12. **`aria-label` non traduits** : libellés techniques en anglais sur une
    interface française (ex. `aria-label="Close"` sur les modales).
13. **`aria-current`** : page courante de la navigation non signalée
    (`aria-current="page"`), état actif d'un onglet ou filtre non exposé.

Le calcul programmatique de contraste est hors périmètre : juger visuellement
via `karen_capture_screenshot` et signaler les contrastes manifestement
insuffisants.

## Discipline de dépôt des constats

- **Un constat = un fait vérifié**, formulé à partir du contexte de page ou
  d'une capture — jamais d'une supposition.
- **Se fier au contexte a11y-centré ; `karen_inspect` en exception** : le
  contexte liste déjà uniquement l'exposé à l'arbre d'accessibilité — pas
  d'inspection systématique pour écarter des « doublons » invisibles. Réserver
  `karen_inspect` aux cas limites : confirmer une présence/absence suspecte
  (élément dans le DOM mais absent du contexte), vérifier une cible avant un
  constat d'absence — affirmer « sans label », « sans nom accessible »,
  « aucun lien de retour » exige une vérification préalable ; un sélecteur qui
  ne résout pas invalide l'affirmation.
- **Aucune plainte d'investigation** : créer un constat pour « explorer » ou
  « sonder » (messages du type « Probe : … ») est interdit — les outils
  d'observation (`karen_get_page_context`, `karen_inspect`, captures) servent
  à chercher ; les constats servent à signaler.
- **Dédupliquer avant dépôt** : relire les constats existants
  (`karen_get_complaints`) et ne pas re-déposer le même défaut sur la même
  cible — un défaut de 404 est un constat, pas deux.

## Heuristiques de Nielsen (les plus opérantes en audit)

- **Visibilité de l'état du système** : action sans retour (bouton sans état
  de chargement, formulaire sans confirmation).
- **Correspondance avec le monde réel** : jargon technique à la place des
  termes utilisateur.
- **Contrôle et liberté de l'utilisateur** : action irréversible sans
  confirmation, sortie de tunnel impossible.
- **Cohérence et standards** : mêmes actions présentées différemment d'une
  page à l'autre, icônes ambigües.
- **Prévention des erreurs** : validations absentes, formats libres sans
  masque pour des données contraintes.
- **Reconnaissance plutôt que rappel** : informations demandées que
  l'utilisateur doit mémoriser d'une étape à l'autre.
- **Aide à la reconnaissance et résolution des erreurs** : messages d'erreur
  qui n'expliquent ni la cause ni la correction.

## Lisibilité et contenu

- Textes tronqués (`…` visible) sans moyen d'accéder au texte complet.
- Paragraphes muraux : densité, absence d'inter-titres.
- Fautes d'orthographe, incohérences terminologiques, casse incohérente.
- Messages système vagues (« Une erreur est survenue ») sans prochaine étape.

## Audit fonctionnel

Objectif : évaluer les **parcours**, pas seulement les pages. Le volet visuel
inspecte chaque page isolée ; le volet fonctionnel suit un utilisateur de bout
en bout et juge le chemin.

### Démarche

1. Identifier les parcours clés : navigation principale, formulaires,
   actions principales (recherche, création, modification, suppression,
   paiement… selon l'application).
2. Parcourir chaque parcours via `karen_navigate` +
   `karen_get_page_context` + `karen_capture_screenshot` — et `karen_click`
   pour les contrôles qui font avancer le parcours sans changer d'URL
   (onglet de détail, modale de confirmation, filtre de liste) — de l'entrée
   (accueil, menu) jusqu'au résultat attendu.
3. Déposer les constats au fil de l'eau (catégorie `functional`).

### Grille de jugement

- **Profondeur de navigation** : trop d'étapes pour une action fréquente,
  détours inutiles, retour obligatoire à une page intermédiaire.
- **Visibilité des fonctions** : fonction cachée derrière un survol, un menu
  non explicite, une icône sans libellé — l'utilisateur ne la trouve pas.
- **Accès compliqué** : action principale sans point d'entrée visible depuis
  l'accueil, URL impossible à deviner, besoin d'une aide extérieure.
- **Chemin pas pratique** : actions redondantes, ordre d'étapes
  contre-intuitif, information demandée avant qu'elle soit utile.
- **Cohérence des libellés** : même action nommée différemment d'une page à
  l'autre, termes métier incohérents.

### Dépôt des constats

- Catégorie `functional`.
- **Cible DOM** quand un élément incriminé existe (lien, bouton, champ) :
  fournir 1+ `cssSelectors` précis — même règle de résolution clémente que les
  autres catégories.
- **Constat global** quand le jugement porte sur le parcours entier ou une
  absence de fonction : déposer **sans** `cssSelectors` (fournir un sélecteur
  sur `functional` est une erreur — voir « Format des constats »).

### Jugements d'usage

L'agent juge l'objectif (nombre d'étapes, présence d'un point d'entrée) ;
l'utilisateur tranche le subjectif. Pour les questions d'usage —
« trouvez-vous ce chemin pratique ? », « cette fonction vous semble-t-elle
découvrable ? » — poser la question **dans ta console** plutôt que trancher
seul.

Exemples :

```json
{
  "message": "Le bouton « Voir le détail » du tableau des commandes ouvre une page sans moyen de revenir à la liste.",
  "category": "functional",
  "severity": "major",
  "check": "parcours-retour",
  "cssSelectors": ["table.orders a.detail-link"]
}
```

```json
{
  "message": "La réinitialisation du mot de passe n'est accessible depuis aucune page de connexion.",
  "category": "functional",
  "severity": "major",
  "check": "fonction-cachee"
}
```

## Audit responsive

Le volet transversal complète la passerelle mobile passée page par page :
les paliers tablette et desktop compact sont appliqués à un échantillon de
pages représentatives (accueil, liste dense, formulaire, détail).

Principe : KarenUI redimensionne la **vraie fenêtre Chrome** (pas d'émulation
device) via `karen_resize_viewport`. L'agent observe le comportement réel de
l'application à chaque palier.

### Paliers

| Palier          | Taille     | Terrain                                          |
| --------------- | ---------- | ------------------------------------------------ |
| Mobile          | 375 × 667  | Passé **page par page** (voir passerelle mobile) |
| Tablette        | 768 × 1024 | Layouts intermédiaires                           |
| Desktop compact | 1280 × 800 | Fenêtre réduite, sidebar visible                 |

Valeurs ajustables selon l'application (ratio d'audience, points de rupture
déclarés). Noter la taille **réellement appliquée** renvoyée par l'outil :
Chrome peut borner la fenêtre (l'outil le signale alors dans sa réponse) —
c'est cette taille appliquée qui est annotée dans les constats.

### Séquence par palier

1. `karen_resize_viewport({ width, height })` — redimensionner.
2. `karen_get_page_context` — lire `viewport` (taille courante) et
   `overflow` : `overflow.horizontal` (défilement horizontal présent) et
   `overflow.elements` (éléments débordants, décrits `tag.classe1.classe2`,
   plafonnés à 10).
3. `karen_capture_screenshot` — juger le visuel (contenus coupés, chevauchements,
   zones inatteignables).
4. Déposer les constats : catégories `ui` ou `a11y`, **ancrés** aux éléments
   débordants listés dans `overflow.elements` (sélecteur CSS sur leurs classes).

Un élément listé dans `overflow.elements` est un débordement **réel** : les
canvas pan/zoom (`role=application`/`role=canvas`), marqueurs
`[data-allow-overflow]` et conteneurs à scroll intentionnel sont exclus du
signalement et listés dans `overflowExclusions` (TASK-110) — plus de doute
sur les éditeurs de graphe type vue-flow.

### Fin du volet

**Restaurer la taille d'origine de la fenêtre** (celle constatée au début de
l'audit, typiquement via `karen_resize_viewport`) **avant**
`karen_complete_audit` — l'utilisateur ne doit pas récupérer une fenêtre
redimensionnée.

## Audit de la codebase

Principe : l'agent cartographie le code derrière les pages visitées avec ses
propres outils (grep, lecture de fichiers), selon la stratégie ordonnée de
`docs/AGENT_GUIDE.md` :

1. `sourceHint.file` d'une cible DOM (introspection framework en dev) — ouvrir
   directement le fichier et la ligne ;
2. `componentHint` → grep du nom de composant ;
3. `data-testid` / attributs `data-*` → grep exact ;
4. chaîne de classes distinctive → grep exact ;
5. `innerText` → grep du texte avec vérification contextuelle.

### Ce que l'on cherche

- **Incohérences UI/code** : composant mort encore rendu, styles contredisant
  la maquette, double implémentation d'une même UI.
- **Dette visible** : duplication de composants, `TODO`/`FIXME` sur les
  chemins audités, valeurs codées en dur là où un token est attendu.
- **Causes probables des constats visuels** : fichier/ligne derrière un
  défaut `ui`/`a11y` — à citer dans le message du constat code.

### Conformité aux standards du framework détecté

Le volet codebase ne juge pas seulement au ressenti : il confronte le code aux
**standards de la stack détectée** dans le projet audité.

1. **Détecter la stack et le tooling** (lecture seule) : `package.json`
   (framework, scripts), fichiers de config à la racine — `eslint*`,
   `.prettierrc*`, `sonar-project.properties`, `tsconfig*`, configs équivalentes
   du framework (ex. `next.config.*`, `vite.config.*`, `.nuxtrc`).
2. **Exécuter les scripts qualité disponibles** : `lint`, `typecheck`, `test`
   tels que déclarés dans `package.json`. C'est la seule exécution de commandes
   admise dans l'audit — et toujours en lecture seule : **jamais de `--fix`**,
   jamais de modification de fichier, jamais de reformatage. Un script absent
   ou qui échoue est un signal, pas un blocage (voir grille ci-dessous).
3. **Vérifier la présence des configs qualité** : l'absence de linter,
   de formatteur ou de configuration TS stricte est en soi un constat.
4. **Conventions communautaires du framework détecté** : ce que la communauté
   attend et que le linter ne couvre pas toujours — ex. React
   (règles des hooks/dependencies, accessibilité JSX, séparation data/UI),
   Vue (ordre des blocs SFC, props typées), TypeScript (pas de `any`
   injustifié, types explicites aux frontières).

Grille de constats (`code-standards-*`) :

| Constat                                                       | Sévérité par défaut |
| ------------------------------------------------------------- | ------------------- |
| Linter/typecheck échoue (`code-standards-lint`)               | major               |
| Formatter absent ou non conforme (`code-standards-prettier`)  | minor               |
| Sonar absent, seuils qualité ignorés (`code-standards-sonar`) | minor               |
| Convention communautaire violée (`code-standards-communaute`) | major               |
| Aucune config qualité du tout (lint + format + sonar)         | minor (un constat)  |

Exemples de constats :

```json
{
  "message": "pnpm lint échoue sur le projet audité : 12 erreurs eslint (no-unused-vars, react-hooks/exhaustive-deps) — le linter est configuré mais non appliqué.",
  "category": "code",
  "severity": "major",
  "check": "code-standards-lint"
}
```

```json
{
  "message": "src/hooks/useSearch.ts : effet déclenché sans dépendances déclarées (react-hooks/exhaustive-deps) — convention React violée, risque de requête périmée.",
  "category": "code",
  "severity": "major",
  "check": "code-standards-communaute"
}
```

### Conformité à la documentation

La documentation du projet audité — demandée en **préambule** (étape 2 du
parcours type, en console) — est un référentiel d'audit à
part entière.

1. Lire les fichiers de doc fournis (spec fonctionnelle, critères
   d'acceptation, README) : extraire les **comportements attendus**
   vérifiables dans l'application (règles, parcours, validations, libellés).
2. Croiser avec ce que l'audit a observé (volets visuel et fonctionnel) et ce
   que le code révèle (cartographie).
3. Constater les **gaps implémentation ↔ doc** :
   - fonctionnalité documentée mais absente ou incomplète dans l'app ;
   - comportement de l'app divergent de la doc (validation différente, libellé
     différent, parcours différent) ;
   - documentation obsolète au regard du code (mentionnée comme écart).

Constats catégorie `functional` (pas `code` : l'écart porte sur la
fonctionnalité observée, pas sur un fichier source) :

```json
{
  "message": "La spec (docs/SPEC.md, section « Inscription ») décrit une confirmation d'email obligatoire avant première connexion — l'application connecte directement l'utilisateur sans étape de confirmation.",
  "category": "content",
  "severity": "major",
  "check": "doc-gap-comportement-divergent"
}
```

Identifiants `doc-gap-*` usuels : `doc-gap-fonctionnalite-absente`,
`doc-gap-comportement-divergent`, `doc-gap-libelle-divergent`,
`doc-gap-doc-obsolete`. Les constats `doc-gap-*` se déposent en catégorie
`content` **globale** (sans `cssSelectors`, TASK-113). Si l'utilisateur répond
« pas de documentation » :
aucun constat de ce volet, mention dans le résumé de clôture.

### Dépôt et règles

- Catégorie `code`, **constat global sans `cssSelectors`** : la cible est un
  fichier source, pas un élément DOM — citer le chemin du fichier (et la
  ligne) dans le message. Les constats de standards citent la sortie du
  tooling ; les gaps de doc sont catégorie `content`, globale (sans
  `cssSelectors`, TASK-113) sauf si un élément de page porte réellement
  l'écart.
- **Lecture seule** : l'audit codebase ne modifie aucun fichier, comme le
  reste de l'audit. Jamais de correction de code, jamais de `--fix` sur le
  tooling exécuté, jamais de reformatage.

```json
{
  "message": "src/pages/landing.tsx (ligne 42) : le composant LegacyBanner est rendu mais masqué — composant mort à supprimer.",
  "category": "code",
  "severity": "minor",
  "check": "code-composant-mort"
}
```

## Référentiel de sévérité

- **critical** — bloque l'usage : formulaire inutilisable, fonctionnalité
  inaccessible au clavier, contenu principal invisible pour les lecteurs
  d'écran, page en erreur, action principale impossible.
- **major** — gêne significative : label manquant sur un champ secondaire,
  hiérarchie de titres cassée, message d'erreur opaque, état du système
  invisible, chemin détourné ou fonction cachée, contenu coupé en responsive
  sur un palier courant.
- **minor** — amélioration : espacement, libellé approximatif, alt redondant,
  incohérence cosmétique, friction légère de parcours, composant mort.

En cas de doute entre deux niveaux : choisir le plus grave seulement si un
utilisateur réel serait bloqué.

## Format des constats

```json
{
  "message": "Le bouton d'envoi du formulaire de contact n'a pas de nom accessible.",
  "category": "a11y",
  "severity": "critical",
  "check": "wcag-4.1.2",
  "cssSelectors": ["form#contact button[type='submit']"]
}
```

- `message` : en français, factuel et localisé (nom visible de l'élément +
  page, ou chemin de fichier pour la catégorie `code`). Pas d'interprétation
  de la cause technique.
- `category` : `a11y` | `ux` | `ui` | `readability` | `content` |
  `performance` | `functional` | `code`.
- `severity` : `critical` | `major` | `minor` (référentiel ci-dessus).
- `check` : identifiant optionnel du check du **référentiel** (section
  ci-dessous) — préférer un identifiant connu du référentiel ; un identifiant
  custom reste possible (il sera compté à part dans le rapport).
- `cssSelectors` : à ancrage **obligatoire** pour `a11y`, `ux`, `ui`,
  `readability`, `performance` — au moins une expression de ciblage (sélecteur
  CSS, `role=button[name="…"]`, `text="…"`, `#id`) pointant l'élément
  incriminé ; **interdit** pour les constats globaux (`functional`, `code`) —
  les fournir est une erreur. `content` est **ancrée ou globale** (TASK-113) :
  avec `cssSelectors` quand un élément porte réellement le défaut, **sans** pour
  un défaut documentaire ou éditorial global (rattaché à la seule `pageUrl` —
  jamais d'ancrage artificiel sur un bouton sans lien sémantique).
  Résolution clémente :
  un sélecteur non résolu n'annule plus le constat — plainte créée avec les
  cibles résolues et `ignoredSelectors` listés dans la réponse ; si aucun ne
  résout, erreur nommant chaque sélecteur fourni.

## Quand demander de l'aide utilisateur

**Règle : toute question à l'utilisateur se pose dans ta console** (ta
conversation) — demandes de fichiers, chemins de documentation, jugements
d'usage, ambiguïtés métier. `karen_request_user_help` est **réservé aux
données sensibles (ex. identifiants)** — jamais de secrets dans ta
conversation.

`karen_request_user_help({ question })` est bloquant (l'utilisateur répond
dans le panel de l'extension, 10 minutes maximum). L'utiliser uniquement pour :

- obtenir des identifiants de connexion ou franchir une authentification —
  ne jamais deviner des identifiants ni les saisir dans ta conversation ;
- transmettre toute autre donnée sensible qui ne doit pas figurer dans le
  transcript de l'agent.

Une question claire et autosuffisante ; une seule demande à la fois.

## Réponses utilisateur dans le résumé de clôture

Les plaintes portent deux fils de discussion distincts : les réponses de
l'agent (`agentReplies`) et les réponses de l'utilisateur saisies dans le
panel (`userReplies`).

Avant `karen_complete_audit` :

1. `karen_get_complaints` — relire tous les constats déposés.
2. Pour chaque constat portant des `userReplies` : intégrer la réponse au
   rapport — **acceptations, nuances et désaccords figurent explicitement,
   constat par constat** (ex. « l'utilisateur confirme que le chemin est peu
   pratique », « l'utilisateur nuance : usage rare »).
3. Un désaccord ne retire pas le constat : il est rapporté tel quel dans le
   résumé.

## Référentiel des checks

Les identifiants `check` connaissent un **référentiel partagé** (catalogue
centralisé côté CLI, libellés français) — utiliser en priorité ces
identifiants, par famille :

- **A11y (WCAG 2.2 AA)** : `wcag-1.1.1`, `wcag-1.3.1`, `wcag-1.4.3`,
  `wcag-1.4.10`, `wcag-2.1.1`, `wcag-2.4.3`, `wcag-2.4.4`, `wcag-2.4.7`,
  `wcag-3.3.2`, `wcag-4.1.2`.
- **UX — heuristiques de Nielsen** : `nielsen-1-visibility`, `nielsen-2-match`,
  `nielsen-3-control`, `nielsen-4-consistency`, `nielsen-5-error-prevention`,
  `nielsen-6-recognition`, `nielsen-7-flexibility`, `nielsen-8-aesthetics`,
  `nielsen-9-recovery`, `nielsen-10-help`.
- **UX — retours d'état** : `ux-feedback`, `ux-affordance`,
  `ux-error-message`, `ux-empty-state`, `ux-loading-state`.
- **Fonctionnel** : `functional-parcours`, `functional-decouvrabilite`,
  `functional-chemin-pratique`, `functional-comportement-attendu`.
- **Gaps de documentation** : `doc-gap-fonctionnalite-absente`,
  `doc-gap-comportement-divergent`, `doc-gap-libelle-divergent`,
  `doc-gap-doc-obsolete`.
- **Codebase** : `code-standards-lint`, `code-standards-prettier`,
  `code-standards-sonar`, `code-standards-communaute`,
  `code-composant-mort`, `code-dette-visible`.

Les catégories `ui`, `readability`, `content` et `performance` n'ont pas de
catalogue figuré : y poser un `check` relève du custom (autorisé).

## Rapport final

Deux livrables distincts :

1. **Le résumé de l'agent** — `karen_complete_audit({ summary })`, en français,
   structuré ainsi :
   1. **Périmètre** : pages visitées (URLs), parcours couverts (volet
      fonctionnel), paliers responsive testés avec leurs tailles appliquées,
      fichiers de code cartographiés (volet codebase).
   2. **Bilan** : nombre de constats par sévérité puis par catégorie — les
      huit : `a11y`, `ux`, `ui`, `readability`, `content`, `performance`,
      `functional`, `code`.
   3. **Réponses utilisateur** : synthèse des `userReplies`, constat par
      constat (accords, nuances, désaccords).
   4. **Priorités** : les 3 constats à corriger en premier, avec justification.
2. **Le rapport consolidé `karen-audit-report.md`** — écrit automatiquement par
   le CLI à chaque clôture (option `karen audit --report <chemin>` pour
   personnaliser l'emplacement, défaut : `karen-audit-report.md` à la racine du
   CWD du CLI). **L'agent ne l'écrit pas lui-même** et n'a pas à le relire : le
   CLI y consolide, de façon déterministe, le résumé de l'agent, le périmètre
   (pages visitées, viewports observés, constats de codebase), le bilan par
   sévérité / catégorie / check (checks connus du référentiel avec leur libellé
   français vs custom), la couverture de navigation (liens internes découverts
   vs pages visitées, section omise sans données), les réponses utilisateur et
   les priorités critical/major.

Le résumé reste la source des parties rédigées : le rapport le reprend tel
quel, complété par les sections calculées.

## Auto-install de cette compétence

```bash
karen skill install <repertoire>   # installe karen/ ET karen-audit/
karen skill install <repertoire> karen-audit   # install ciblée
karen skill list                   # skills disponibles
```
