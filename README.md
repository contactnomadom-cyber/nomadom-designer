# Nomad'Om Designer

Logiciel de conception et de fabrication de dômes géodésiques de **Nomad'Om** : géométrie, structure, toile (**Cover+**), aménagement intérieur (Design) et pavillon **Quadrisphère**.
Le produit livré est **un seul fichier HTML**, qui marche hors ligne : `dist/nomadom-designer.html`.

> Règle n° 1 : **justesse avant fonctionnalités.** Mieux vaut refuser un calcul que produire un patron faux.
> Chaque résultat porte un statut : 🟢 vérifié · 🟡 calculé · 🟠 non vérifié en atelier · 🔴 refusé.

---

## Pour Nathan

- **Le fichier à utiliser** : `dist/nomadom-designer.html` (télécharger, ouvrir dans le navigateur).
- **Ce qui a changé** : `CHANGELOG.md`.
- **Revenir à une ancienne version** : chaque version publiée a une étiquette Git (`v0.9.11`, …) ; demander à une session de récupérer le fichier de cette version.
- **Vérification en 5 minutes avant d'accepter une version** :
  1. le numéro de version en bas de page est celui annoncé ;
  2. les 5 onglets s'ouvrent (Base, Cover+, Design, Quadrisphère, Informations) ;
  3. dôme de référence 3V Kruschke 7/12 Ø 5 m : 🟢 géométrie, 30 A / 35 B / 80 C / 20 D, et 18 morceaux en Étages ;
  4. changer un réglage (diamètre), vérifier que tout se met à jour, revenir à 5 m ;
  5. cas refusé (laize 600 mm) : message clair, export bloqué ;
  6. le rapport de contrôle de la session dit « TOUT PASSE ».

---

## Pour les sessions d'IA (règles du dépôt)

1. **Lire** ce README, `docs/architecture/` et `docs/glossary.md` avant de commencer.
2. **Une branche par chantier** (`feature/…`, `fix/…`). Ne jamais travailler directement sur `main`.
3. **Modifier les sources** (`src/`, `vendor/`, `tests/`, `data/`) — **jamais** `dist/` à la main. Plus de scripts de patch par remplacement de texte.
4. **Assembler et contrôler** : `node scripts/test-all.mjs` (complet, ≈ 10 min) ; `--quick` pendant le travail.
5. **Une seule session intégratrice** fusionne dans `main`, reconstruit, relance le contrôle complet, puis publie. Si `main` a avancé entre-temps : fusionner, reconstruire, retester.
6. **Publier** seulement après `node scripts/release.mjs` → « FEU VERT ». Publier uniquement `dist/nomadom-designer.html`.
7. À chaque version : numéro dans le pied de page et le badge (gabarit `src/index.html`), `package.json`, `CHANGELOG.md`, étiquette Git `vX.Y.Z`.
8. **Ne jamais** supprimer, affaiblir ou ignorer un test pour « passer au vert » sans explication écrite et accord de Nathan. Une valeur de référence ne change que si l'ancienne était fausse, preuve à l'appui.
9. Les deux **dômes de référence** ne doivent jamais changer : 3V Kruschke 7/12 Ø 5 m (61 nœuds, 165 montants, 105 faces ; 30 × 824,27 / 35 × 955,73 / 80 × 1 053,72 / 20 × 1 102,64 mm) et 2V Chords 1/2 Ø 5,30 m (30 × 1 448,31 / 35 × 1 637,79 mm).
10. **Convention** : code en anglais, interface en français, termes d'atelier en français (voir `docs/glossary.md`). Renommer seulement ce que le chantier touche déjà.

---

## Commandes

| Commande | Effet |
|---|---|
| `node scripts/build.mjs` | Assemble `dist/nomadom-designer.html` à partir de `src/index.html` + modules (`build/manifest.json`) |
| `node scripts/test-all.mjs` | Assemble puis lance toute la batterie **sur le fichier assemblé** ; rapport dans `build/check/report.md` |
| `node scripts/test-all.mjs --quick` | Contrôle rapide (≈ 3 min), ne vaut pas feu vert |
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
│   ├── app/app.js             # script principal (onglets Base, Cover+, Informations ; orchestration) — à découper
│   ├── core/dome-engine.js    # géométrie des dômes (icosaèdre, 1V–8V, méthodes, symétries, coupes)
│   ├── geometry/ouvertures.js # portes et fenêtres tracées sur la structure
│   ├── textile/               # etages.js (découpe en étages), toile.js (marges, laize, GoodKarma), peel.js (vue aplatie)
│   ├── fabrication/           # nesting.js (rouleau), optim.js (moins de toile), export.js (fiches de traçage)
│   ├── rendering/             # design3d.js (WebGL2 maison), design3d-three.js (Three.js)
│   ├── ui/info.js             # onglet Informations, aide
│   └── products/
│       ├── habitat/           # design.js, designui.js (aménagement intérieur)
│       └── quadrisphere/      # quadri-geom.js, quadri-ui.js
├── vendor/three/threekit-r169.js   # Three.js r169 empaqueté (ne pas modifier)
├── data/references/           # références de validation figées (antiprism/, domerama/, domes/, workshop/)
├── tests/
│   ├── node/                  # engine, textile, arcs, compare-strategies (logique pure)
│   └── browser/               # Playwright : t_beta, t_status, t_names, t_cleanup, t_laize, t_bottom, t_kruschke_align, t_stale_optim, t_smoke_quadri
├── docs/                      # architecture (ADR), audits, validation, glossaire
├── scripts/                   # build, test-all, release, split
└── dist/nomadom-designer.html # fichier livré (généré, jamais modifié à la main)
```

Les modules gardent pour l'instant leur nom historique (`etages`, `toile`…) ; ils prendront leur nom anglais au fil des chantiers (voir `docs/glossary.md`).

## Documents du projet Claude « Acidome Cover+ »
Les preuves de validation détaillées (`VALIDATION.md`, `VALIDATION-2V.md`, `VALIDATION-BASE.md`, `ETAGES.md`), la feuille de route Nomad Vision et les moteurs Kumiko (pas encore intégrés) sont dans le projet Claude ; ils seront rapatriés dans `docs/` et `src/products/` quand un chantier les touchera.
