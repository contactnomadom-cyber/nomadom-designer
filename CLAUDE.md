# CLAUDE.md — consignes pour toute session sur ce dépôt

Nomad'Om Designer : conception et fabrication de dômes géodésiques (géométrie, toile **Cover+**, aménagement Design, pavillon Quadrisphère). Livré en **un seul HTML hors ligne** : `dist/nomadom-designer.html`, généré depuis `src/`. Propriétaire : Nathan, artisan, pas développeur. **Justesse avant fonctionnalités** ; **étanchéité avant tout** (toile et futures couvertures solides) : ordre de priorité de tout choix **faisabilité technique → performance → écoulement des eaux → étanchéité**, puis seulement présentation, esthétique, économie ; une option déconseillée reste visible avec avertissement mais sans document de fabrication (ADR-0002) ; statuts 🟢 vérifié · 🟡 calculé · 🟠 non vérifié en atelier · 🔴 refusé. Réponses en français, simples, une analogie par notion nouvelle.

## Carnet d'idées
- `docs/IDEES-A-TRAITER.md` : base de travail des prochaines versions. **Chaque nouvelle idée de Nathan y est ajoutée** (date, décidé, questions ouvertes) ; une idée réalisée passe dans « Fait » avec sa version. À consulter avant de proposer la suite.

## Économie de tokens (obligatoire)
- **Ne jamais lire en entier** : `vendor/` (Three.js, 733 ko), `dist/`, `build/check/`, `docs/audits/` (rapports longs, à consulter par recherche).
- Trouver avant de lire : `node scripts/code-map.mjs` (carte), `node scripts/code-map.mjs app` (fonctions d'un module), `node scripts/code-map.mjs -f nomFonction`, `git grep -n "motif"`. Puis lire **seulement** les lignes utiles (offset/limit).
- `src/app/app.js` (≈ 2 600 lignes) : jamais en entier.
- Ne pas relire ce qui est déjà dans la conversation ; ne pas relancer un test sans changement pertinent.
- Les copies de modules et de tests dans le projet Claude « Acidome Cover+ » sont **historiques** : ne pas les lire pour coder.
- Périmètre strict : ne modifier que ce que la tâche demande ; aucune refactorisation ni renommage hors périmètre.
- Si la demande est floue : une question courte avant d'explorer.
- **Exception, lecture approfondie** (audit, bug introuvable, refonte) : les limites ci-dessus sont levées **seulement** si Nathan écrit « LECTURE APPROFONDIE AUTORISÉE » (avec le périmètre, ex. « … pour src/app »). Ne jamais se l'accorder soi-même : d'abord demander, en une ligne, quoi lire, pourquoi et le coût estimé. L'accord vaut pour la tâche en cours seulement ; « vendor/ » reste exclu sauf mention explicite.

## Commandes officielles (aucune dépendance npm)
| But | Commande |
|---|---|
| Assembler | `node scripts/build.mjs` |
| Tests ciblés (pendant le travail) | `node scripts/test-all.mjs --only <suites>` |
| Contrôle rapide (≈ 3 min) | `node scripts/test-all.mjs --quick` |
| Contrôle complet (≈ 10 min, avant fusion/publication) | `node scripts/test-all.mjs` |
| Feu vert de publication | `node scripts/release.mjs` |

## Quels tests selon les fichiers modifiés
| Fichiers modifiés | `--only` |
|---|---|
| `src/core/dome-engine.js` | `engine,arcs,textile,t_beta,t_status,t_kruschke_align` |
| `src/geometry/ouvertures.js` | `engine,t_beta,t_smoke_quadri` |
| `src/textile/*`, `src/fabrication/*` | `textile,peel,trace,t_beta,t_laize,t_bottom,t_stale_optim,t_axes_block` |
| `src/app/app.js` | `t_beta` + le test de la zone touchée (`t_status`, `t_names`, `t_cleanup`, `t_laize`…) |
| `src/products/habitat/*`, `src/rendering/*` | `t_beta,t_smoke_quadri` |
| `src/products/quadrisphere/*` | `t_smoke_quadri` |
| `src/ui/info.js`, `src/index.html` | `t_beta,t_names` |
| Toute nouvelle fonction | ajouter son test, dans `tests/node` (logique) ou `tests/browser` (interface) |
Les deux dômes de référence (3V Kruschke 7/12 Ø 5 m ; 2V Chords 1/2 Ø 5,30 m) ne doivent **jamais** changer.

## Règles Git et publication
1. Une branche par chantier (`feature/…`, `fix/…`) ; `git fetch origin main` avant de commencer et avant de pousser.
2. Modifier les sources ; **jamais** `dist/` à la main ; plus de scripts de patch par remplacement de texte.
3. Une seule session intégratrice fusionne dans `main`, relance le contrôle complet, puis `release.mjs`, puis publie le seul fichier `dist/nomadom-designer.html`.
4. Version : pied de page et badge (`src/index.html`), `package.json`, `CHANGELOG.md`, commit « Version X.Y.Z — … ». Les étiquettes Git sont refusées par le proxy.
5. Ne jamais supprimer, affaiblir ou ignorer un test pour passer au vert ; une référence ne change qu'avec preuve et accord de Nathan.

## Pièges connus
- Pas de `"type": "module"` dans `package.json` (casse les `require` des tests et modules).
- Tests navigateur : 3 en parallèle au plus (au-delà, Chromium ne charge plus la page).
- Une ligne de 130 ko dans `vendor/three/` : ne jamais la lire.
- Conventions : code en anglais, interface et termes d'atelier en français (`docs/glossary.md`) ; unités internes en mètres ; renommer seulement ce que le chantier touche. Décisions : `docs/architecture/`.

## Compte rendu de fin de tâche (court)
1. Ce qui a changé pour Nathan (2–4 lignes, sans code).
2. Fichiers touchés.
3. Tests lancés et résultat (`OK n/n` ou l'échec précis).
4. Ce qui reste à faire ou à décider.
