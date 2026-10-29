---
name: karen
description: Résoudre les plaintes visuelles KarenUI d'une session karen diff active — connexion MCP locale, lecture des plaintes, localisation du code source via sourceHint/pageUrl/componentHint, correction, puis karen_reply/karen_resolve.
---

# Karen — revue visuelle de code pilotée par l'IA

KarenUI : l'utilisateur capture des plaintes sur des éléments du DOM via une
extension Chrome, un serveur local (`karen diff`) les centralise, et l'agent
(cette compétence) les résout en corrigeant le code source.

## Prérequis

1. `karen diff` est lancé dans le projet à auditer (bannière affichée, plage de
   ports 4000–4010).
2. Trouver le port : `curl http://localhost:<port>/health` sur la plage, ou
   lire le port dans la bannière. Réponse attendue :
   `{"status":"ok","port":<port>,"complaints":<n>}`.

## Connexion MCP

```bash
claude mcp add karen http://localhost:<port>/mcp
```

(Cursor : entrée `{"mcpServers":{"karen":{"url":"http://localhost:<port>/mcp"}}}`
dans `.cursor/mcp.json`.)

## Outils MCP

| Outil                  | Usage                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `karen_get_status`     | Diagnostic : URL active, nombre de plaintes, port.                                     |
| `karen_get_complaints` | Liste les plaintes (filtre `status` : `open`, …).                                      |
| `karen_reply`          | Répond (param `id`), passe en `in_progress` (`needs_info: true` → `agent_needs_info`). |
| `karen_resolve`        | Passe en `resolved` (param `id`) — interdit depuis `open` : reply d'abord.             |

## Localisation DOM → code

Chaque cible `targets[]` porte un snapshot riche. Essayer dans cet ordre :

0. **`sourceHint`** (si présent) : `{ framework, componentName, file?, line?, column? }`
   capté en dev (Vue `__vueParentComponent`, React `__source`). Si `file` est
   présent, ouvrir ce fichier (et la ligne) directement.
1. **`componentHint`** : `grep -rn "NomComposant" src/`
2. **`data-testid`** / attributs `data-*` : grep exact.
3. **Chaîne de classes distinctive** (ex. Tailwind) : grep d'un fragment.
4. **`innerText`** : grep + vérification contextuelle (tagName, `pageUrl` de la
   plainte, voisinage).

`pageUrl` (si présent) = URL de la page capturée — elle délimite où chercher
dans une app multi-pages. `outerHTMLSnippet` confirme une piste (structure,
attributs aria).

## Workflow de résolution

1. `karen_get_complaints({ status: "open" })` — prendre **une** plainte.
2. Localiser via la stratégie ci-dessus.
3. Corriger le code source.
4. Vérifier (HMR de l'app cible, puis lint/typecheck/test du projet).
5. `karen_reply({ id, message })` — citer le fichier corrigé et le fix.
6. `karen_resolve({ id, summary })` — résumé une ligne.

Si la cible est ambiguë ou introuvable : `karen_reply` avec `needs_info: true`
— ne jamais deviner.

Règles : jamais `karen_resolve` sans code vérifié ; jamais toucher au DOM de
l'app cible autrement qu'en corrigeant le code source ; une plainte à la fois.

## Auto-install de cette compétence

```bash
karen skill path                      # chemin du SKILL.md embarqué
karen skill print                     # l'affiche sur stdout
karen skill install <repertoire>      # le copie dans <repertoire>/karen/SKILL.md
```

Un agent peut installer ce skill dans son répertoire de compétences via
`karen skill install` — aucun serveur requis.
