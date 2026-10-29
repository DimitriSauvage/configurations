---
name: karen-graph
description: Générer et mettre à jour le graphe de connaissance projet (.karen-graph/) en fin de session karen doc — nœuds JSON par notion (features, écrans, actions, rôles, APIs, erreurs) écrits par l'agent avec liens typés et sources hashées, vues générées (README.md, SKILL.md) régénérées uniquement par la CLI, scan code déterministe via karen graph code (modules, imports, auto-link vers le fonctionnel), boucle qualité (write → karen graph validate → fix → karen graph index → karen graph code → validate --strict final), mode update stale-first (nœuds périmés détectés par le re-hash des sources corrigés en priorité), discipline anti-invention (toute affirmation vérifiable dans le code ou confirmée par l'utilisateur, sources[] obligatoires, aucun lien inventé).
---

# Karen Graph — graphe de connaissance projet

KarenUI graphe de connaissance : l'agent transforme ce qu'il a exploré et
documenté en **graphe requêtable** dans `.karen-graph/` — consommé ensuite par
n'importe quel agent IA (Claude, Gemini, OpenRouter), hors session KarenUI,
pour répondre aux questions fonctionnelles sur le projet (par ex. « comment
créer une requête de recrutement ? » : droits requis, écran, formulaire,
erreurs, APIs appelées).

Séparation stricte des rôles :

- **L'agent écrit les nœuds JSON** (`nodes/<kind>/<id>.json`) et **uniquement
  eux**.
- **La CLI génère tout le reste** : `README.md`, `SKILL.md`, `manifest.json`
  (stats), `nodes/code/` (modules). Ne jamais éditer ces fichiers à la main.

## Quand générer le graphe

- **Fin de session `karen doc`** (phase graphe, toujours) — init si le graphe
  n'existe pas, mise à jour sinon.
- **Session `karen doc` en mode update** : commencer par
  `karen graph validate --strict` — la liste des nœuds périmés (source modifiée
  ou supprimée depuis la dernière écriture) pilote les corrections en
  priorité, avant tout nouveau contenu.

## Layout `.karen-graph/`

| Fichier                  | Écrit par | Rôle                                                                                     |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------- |
| `manifest.json`          | CLI       | Schéma, projet (nom, description, `docRoot`), config (lang, scan code), sessions, stats. |
| `nodes/<kind>/<id>.json` | Agent     | Un nœud par notion — source de vérité du graphe.                                         |
| `nodes/code/<id>.json`   | CLI       | Modules de code (`karen graph code`) — jamais écrits à la main.                          |
| `README.md`              | CLI       | Index lisible (`karen graph index`) — ne pas éditer.                                     |
| `SKILL.md`               | CLI       | Entrypoint des agents externes (`karen graph index`) — ne pas éditer.                    |

## Format d'un nœud

```json
{
  "id": "recrutement-creer-requete",
  "kind": "feature",
  "title": "Créer une requête de recrutement",
  "summary": "Synthèse autonome, exploitable sans lire les sources.",
  "updatedAt": "2026-09-17T10:00:00.000Z",
  "sources": [{ "path": "src/pages/recruitment/CreatePage.tsx", "hash": "0123456789abcdef" }],
  "docRefs": ["docs/features/recruitment-create.md"],
  "edges": [{ "to": "recrutement-liste", "type": "navigates-to" }]
}
```

- `id` : slug kebab-case stable d'une session à l'autre — c'est la clé de
  mise à jour.
- `summary` : **autonome** — un agent externe doit comprendre la notion sans
  ouvrir les fichiers sources.
- `sources[]` : fichiers réellement lus pour écrire le nœud ; `hash` = sha256
  du fichier tronqué à 16 caractères hexa (`karen graph validate` le recalcule
  pour détecter la péremption). Un nœud sans source lue n'existe pas.
- `docRefs[]` : markdown du repo détaillant la notion — les détails longs
  vivent là, pas dans le nœud.

## Granularité

- Un nœud `feature` = **un parcours utilisateur** (pas un écran, pas un
  composant). Plusieurs écrans d'un même parcours → un feature + des écrans
  liés par `navigates-to`.
- **Réutiliser les nœuds existants via des liens** au lieu de dupliquer :
  une API appelée par trois features = un nœud `api`, trois liens
  `calls-api`.
- Un nœud reste **compact (< ~4 Ko)** : les détails précis (tables de champs,
  règles de validation complètes) vont dans `docRefs` — la doc markdown du
  repo, pas dans le JSON.

## Contenu attendu par genre

| Genre     | Champs spécifiques            | Contenu du nœud                                                     |
| --------- | ----------------------------- | ------------------------------------------------------------------- |
| `feature` | —                             | Prérequis (auth, droits), étapes du parcours, résultat attendu.     |
| `screen`  | `url`                         | Route/URL (motif ok), intention de l'écran.                         |
| `action`  | `trigger`                     | Champs du formulaire, validation, ce qui déclenche l'action.        |
| `role`    | `scope`                       | Identifiant métier **exact** du droit (ex. `RECVAL_ADMIN`), portée. |
| `api`     | `method`, `endpoint`          | Méthode + path, payload, erreurs métier mappées.                    |
| `error`   | `message`                     | Déclencheur, message utilisateur, résolution.                       |
| `module`  | `path`, `language`, `imports` | Généré par `karen graph code` — l'agent n'y touche jamais.          |

## Liens (`edges`)

Un lien `{ "to": "<id>", "type": "…" }` — la CLI rejette un lien dont la
cible n'existe pas ou dont les genres sont incohérents :

- `navigates-to` (feature/screen → screen)
- `requires-role` (feature/screen/action/api → role)
- `uses-action` (feature/screen → action)
- `calls-api` (feature/screen/action → api)
- `handles-error` (feature/screen/action/api → error)
- `part-of` (fonctionnel → module) — auto-géré par `karen graph code` à
  partir de `sources[]` ; ne pas l'écrire à la main.
- `imports` (module → module) — scan CLI uniquement.

## Discipline

- **Toute affirmation est vérifiable dans le code ou confirmée par
  l'utilisateur** (question posée dans ta console). Interdiction d'inventer : pas
  de droit supposé, pas d'endpoint deviné, pas de champ supposé.
- **Questions utilisateur** : toute question se pose **dans ta console** ;
  `karen_request_user_help` est réservé aux données sensibles (ex.
  identifiants) — jamais de secrets dans ta conversation.
- `sources[]` obligatoire avec le hash du fichier réellement lu.
- **Aucun lien inventé** : un `edge` = une relation prouvée (code, app,
  réponse utilisateur).
- Identifiants métier (`role`, endpoint, message d'erreur) recopiés
  **exactement** depuis le code.
- Ne jamais éditer `manifest.json`, `README.md`, `SKILL.md` ni
  `nodes/code/` — CLI uniquement.

## Boucle qualité (fin de phase graphe)

1. Écrire / mettre à jour les nœuds JSON.
2. `karen graph validate` — corriger chaque erreur signalée (nœud non
   conforme, lien vers un id inconnu, incohérence de genres), répéter.
3. `karen graph index` — régénérer les vues (README + SKILL + stats).
4. `karen graph code` — scan déterministe : modules, imports, purge,
   auto-link `part-of` depuis `sources[]`.
5. `karen graph validate --strict` final — **doit passer** : graphe valide
   et aucun nœud périmé. Un échec = reprendre à l'étape 1 sur les nœuds
   signalés.

## Mode update (stale-first)

1. `karen graph validate --strict` en début de phase : liste des nœuds
   périmés (`missing` = source supprimée, `hash-mismatch` = source modifiée).
2. Pour chaque nœud périmé : relire ses `sources[]`, corriger
   `summary`/`edges`/champs spécifiques si le comportement a divergé,
   rafraîchir `updatedAt` et les hash.
3. Sujet disparu → supprimer le fichier du nœud (les modules obsolètes sont
   purgés automatiquement par `karen graph code`).
4. Puis boucle qualité complète (ci-dessus).
