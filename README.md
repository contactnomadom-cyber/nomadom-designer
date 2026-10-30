# Nomad'Om Designer

Logiciel de conception et de fabrication de dômes géodésiques de **Nomad'Om** : géométrie, structure, toile (**Cover+**), aménagement intérieur (Design) et pavillon **Quadrisphère**.
Le produit livré est **un seul fichier HTML**, qui marche hors ligne : `dist/nomadom-designer.html`.

> Règle n° 1 : **justesse avant fonctionnalités.** Mieux vaut refuser un calcul que produire un patron faux.
> Chaque résultat porte un statut : 🟢 vérifié · 🟡 calculé · 🟠 non vérifié en atelier · 🔴 refusé.

---

## Pour Nathan

- **Le fichier à utiliser** : `dist/nomadom-designer.html` (télécharger, ouvrir dans le navigateur).
- **Ce qui a changé** : `CHANGELOG.md`.
- **Revenir à une ancienne version** : chaque version publiée correspond à un commit intitulé « Version X.Y.Z » (voir `CHANGELOG.md` et l'historique sur GitHub) ; demander à une session de récupérer `dist/nomadom-designer.html` de ce commit. Optionnel : sur GitHub, « Releases » → « Draft a new release » sur ce commit pour marquer la version.
- **Vérification en 5 minutes avant d'accepter une version** :
  1. le numéro de version en bas de page est celui annoncé ;
  2. les 5 onglets s'ouvrent (Base, Cover+, Design, Quadrisphère, Informations) ;
  3. dôme de référence 3V Kruschke 7/12 Ø 5 m : 🟢 géométrie, 30 A / 35 B / 80 C / 20 D, et 18 morceaux en Étages ;
  4. changer un réglage (diamètre), vérifier que tout se met à jour, revenir à 5 m ;
  5. cas refusé (laize 600 mm) : message clair, export bloqué ;
  6. le rapport de contrôle de la session dit « TOUT PASSE ».

---

## Pour les sessions d'IA

Toutes les consignes (économie de tokens, commandes, tests à lancer selon les fichiers, règles Git et de publication, pièges connus, format du compte rendu) sont dans **`CLAUDE.md`**, lu automatiquement à l'ouverture du dépôt. Un seul endroit, pas de doublon.

**Pour Nathan — débloquer une lecture approfondie** : par défaut, les IA lisent le code de façon ciblée pour économiser les tokens. Si une IA doit tout comprendre en profondeur (audit, bug introuvable, refonte), elle doit te le demander en disant quoi lire, pourquoi et à quel coût. Tu l'autorises en écrivant : **« LECTURE APPROFONDIE AUTORISÉE »**, éventuellement suivi du périmètre (par exemple « pour src/app »). L'accord ne vaut que pour la tâche en cours.

---

## Commandes

| Commande | Effet |
|---|---|
| `node scripts/build.mjs` | Assemble `dist/nomadom-designer.html` à partir de `src/index.html` + modules (`build/manifest.json`) |
| `node scripts/test-all.mjs` | Assemble puis lance toute la batterie **sur le fichier assemblé** ; rapport dans `build/check/report.md` |
| `node scripts/test-all.mjs --quick` | Contrôle rapide (≈ 3 min), ne vaut pas feu vert |
| `node scripts/test-all.mjs --only engine,t_beta,…` | Tests ciblés selon les fichiers modifiés (table dans `CLAUDE.md`), ne vaut pas feu vert |
| `node scripts/code-map.mjs [module] [-f fonction]` | Carte du code : où se trouve une fonction, sans lire les fichiers en entier |
| `node scripts/release.mjs` | Feu vert seulement si le HTML de `dist/` est exactement celui qui a passé le contrôle complet |
| `node scripts/split.mjs fichier.html` | Redécoupe un HTML assemblé en gabarit + modules (amorçage, ou vérifier un fichier reçu) |

Prérequis : Node 18+ ; pour les tests navigateur, Python 3 + Playwright + Chromium (`--use-gl=swiftshader`). Aucune dépendance npm.

---

## Arborescence

```text
nomadom-designer/
├── README.md · CHANGELOG.md · package.json
├── build/manifest.json        # quel module va dans quelle balise <script> du HTML
├── src/
│   ├── index.html             # gabarit : HTML + CSS + marqueurs {{MODULE:id}}
│   ├── app/app.js             # interface (onglets Base, Cover+, Informations) : affiche, ne calcule pas
│   ├── core/                  # dome-engine.js (géométrie : icosaèdre, 1V–8V, méthodes, symétries, coupes),
│   │                          # dome-state.js (objet dôme unique : tout l'état du projet, clé de dôme),
│   │                          # status.js (statuts 🟢🟡🟠🔴 et barrière avant patrons/exports)
│   ├── geometry/              # ouvertures.js (portes, fenêtres), unfold.js (triangles de base, dépliage 2D)
│   ├── textile/               # etages.js (découpe en étages), toile.js (marges, laize, GoodKarma), peel.js (vue aplatie)
│   ├── fabrication/           # nesting.js (rouleau), optim.js (moins de toile), export.js (fiches de traçage),
│   │                          # plan-rules.js (laize, rangée du bas, comparatif, CSV)
│   ├── rendering/             # design3d.js (WebGL2 maison), design3d-three.js (Three.js)
│   ├── ui/info.js             # onglet Informations, aide
│   └── products/
│       ├── habitat/           # design.js, designui.js (aménagement intérieur)
│       └── quadrisphere/      # quadri-geom.js, quadri-ui.js
├── vendor/three/threekit-r169.js   # Three.js r169 empaqueté (ne pas modifier)
├── data/references/           # références de validation figées (antiprism/, domerama/, domes/, workshop/)
├── tests/
│   ├── node/                  # engine, textile, arcs, peel, dome-state, unfold, status, plan-rules, compare-strategies (logique pure)
│   └── browser/               # Playwright : t_beta, t_status, t_names, t_cleanup, t_laize, t_bottom, t_kruschke_align, t_stale_optim, t_smoke_quadri, t_axes_block, t_openings
├── docs/                      # architecture (ADR), audits, validation, glossaire
├── scripts/                   # build, test-all, release, split
└── dist/nomadom-designer.html # fichier livré (généré, jamais modifié à la main)
```

Les modules gardent pour l'instant leur nom historique (`etages`, `toile`…) ; ils prendront leur nom anglais au fil des chantiers (voir `docs/glossary.md`).

## Documents du projet Claude « Acidome Cover+ »
Les preuves de validation détaillées (`VALIDATION.md`, `VALIDATION-2V.md`, `VALIDATION-BASE.md`, `ETAGES.md`), la feuille de route Nomad Vision et les moteurs Kumiko (pas encore intégrés) sont dans le projet Claude ; ils seront rapatriés dans `docs/` et `src/products/` quand un chantier les touchera.
