# NOMAD-2026-008 — Trois niveaux d'interface : Développeur, Atelier, Client

| Rubrique | Contenu |
|---|---|
| Date | 04/11/2026 |
| Demandeur | Nathan |
| Exécutant | Claude Code |
| Niveau | Visuelle |
| Statut | Lot 1 réalisé — en attente de la décision de Nathan ; lots 2 et 3 à suivre |

## Objectif
Une seule application, trois niveaux d'interface au choix, qui affichent les mêmes calculs :
1. **Développeur** : l'interface actuelle, la plus simple et la plus détaillée, avec un seul changement (ci-dessous).
2. **Atelier** : la maquette **B « Pro technique »**.
3. **Client** : la maquette **C « Vitrine client »**.

Image : trois portes pour entrer dans le même atelier. Les outils et les mesures sont les mêmes ; seul ce qu'on montre change.

## Contexte et problème
- L'interface actuelle est complète mais longue. Dans l'onglet Base, quand on descend dans les réglages (structure, ouvertures, porte, sas, plancher), le dôme 3D sort de l'écran : on règle sans voir l'effet.
- Pour travailler vite à l'atelier, il faut une vue plus dense et rangée (B).
- Pour montrer à un client, il faut une vue simple et belle, sans les réglages techniques (C).
- Maquettes de départ : `docs/maquettes/ui-2026-11/` (B = `maquette-B.png` ; C = `maquette-C1-dome.png`, `maquette-C2-amenagement.png`). Niveau Atelier = **disposition de B avec les couleurs de A** (« Atelier bois »), décidé le 04/11/2026.
- Le niveau Client **est** le mode client prévu pour Nomad Vision. Le prototype NV1 (fiche + 3D) n'existe que dans l'ancien HTML du projet Claude ; il n'a jamais été porté dans le dépôt : à reprendre dans le Lot 3.

## Résultat attendu

### Lot 1 — Niveau Développeur (l'actuel, amélioré)
- Tout reste comme aujourd'hui : mêmes réglages, mêmes textes, même détail.
- **Changement unique** : dans Base (et ensuite dans les autres onglets qui ont une vue + des réglages), on peut faire défiler toutes les options **en gardant le dôme visible**.
  - La vue 3D reste fixée à l'écran pendant que la colonne des réglages défile (comme un tableau de bord qui reste devant les yeux pendant qu'on cherche dans la boîte à gants).
  - **Les cadres sont réglables** : (1) le cadre de la vue 3D, (2) le cadre des options. On peut les agrandir ou les réduire (poignée à glisser entre les deux, et un bouton pour replier un cadre).
  - La taille choisie est mémorisée sur cet ordinateur.

### Lot 2 — Niveau Atelier (maquette B)
- Trois colonnes : propriétés à gauche (réglages rangés par groupe : Dôme, Porte et sas, Plancher…), vue 3D au centre (repère x/y/z, échelle), mesures à droite (tableaux alignés), barre d'état avec la légende des statuts.
- Même chose pour Cover+, Design, Quadrisphère, Informations (maquettes B de ces écrans à faire avant de coder).

### Lot 3 — Niveau Client (maquette C)
- 3D plein écran, une phrase, trois chiffres parlants, options en pastilles ; réglages techniques et chiffres de fabrication masqués.
- Onglets proposés : Votre dôme, Toile, Aménagement, Pavillon (à confirmer).
- Bouton « Préparer le devis » : **grisé « bientôt »** tant que le devis n'existe pas (décidé le 04/11/2026).

### Passage d'un niveau à l'autre
- Un sélecteur **Développeur · Atelier · Client**, visible dans les trois niveaux (en haut à droite).
- Le niveau choisi est mémorisé sur cet ordinateur ; changer de niveau ne change aucun réglage ni aucun calcul.
- Niveau au démarrage : **Développeur** pour l'instant (décidé le 04/11/2026).
- Pas de code PIN pendant la bêta : un simple sélecteur passe d'un niveau à l'autre (décidé le 04/11/2026 ; remplace le PIN prévu pour Nomad Vision).

## Périmètre autorisé
- Feuilles de style et mise en page : `src/index.html`, nouveaux fichiers d'interface dans `src/ui/` (un par niveau si utile).
- `src/app/app.js` : seulement le branchement du sélecteur (reste sous 2 000 lignes).
- **Exclus** : tous les calculs (`src/core`, `src/geometry`, `src/textile`, `src/fabrication`, `src/products/*` hors affichage), les cotes, les patrons, les statuts.

## Contraintes
- `CLAUDE.md` : justesse avant fonctionnalités ; un seul HTML hors ligne (polices embarquées, rien depuis Internet).
- ADR-0002 : les avertissements d'étanchéité et les statuts 🟢🟡🟠🔴 restent visibles au niveau Développeur et Atelier ; au niveau Client, aucune option déconseillée n'est proposée.
- Les deux dômes de référence ne changent pas.
- Un lot à la fois, chacun testé et montré à Nathan avant le suivant.

## Critères d'acceptation (vérifiables)
- [ ] Lot 1 : dans Base, en faisant défiler les réglages jusqu'au plancher, la vue 3D reste entièrement visible.
- [ ] Lot 1 : les deux cadres se redimensionnent et se replient ; la taille est retrouvée après rechargement.
- [ ] Lot 1 : aucun texte, réglage ou chiffre n'a disparu par rapport à 0.9.17 (tests existants tous verts).
- [ ] Sélecteur : passer Dev → Atelier → Client → Dev ne change aucun résultat (même clé de dôme, mêmes chiffres).
- [ ] Lots 2 et 3 : écrans conformes aux maquettes validées par Nathan.
- [ ] Les deux dômes de référence restent identiques.

## Tests attendus
- Contrôle complet existant (aucune suite affaiblie).
- Nouveau test navigateur `t_ui_levels.py` : sélecteur, mémorisation, vue 3D visible pendant le défilement, redimensionnement, mêmes chiffres dans les trois niveaux.

## Revue Gemini
Reportée à plus tard (décision de Nathan du 04/11/2026, dans la ligne du 01/11). `REVUE-GEMINI.md` reste prêt pour ce moment-là.

## Risques
- Casser des tests navigateur qui cherchent des éléments par leur identifiant : garder les identifiants existants.
- Trois interfaces à maintenir : chaque nouvelle fonction devra prévoir son affichage dans les trois niveaux (ou être déclarée « Développeur seulement »).

## Questions tranchées le 04/11/2026
1. Phrase coupée : sans objet (abandonnée).
2. Maquette A : on garde ses couleurs sur la disposition de B pour le niveau Atelier.
3. Démarrage : niveau Développeur pour l'instant.
4. Client : devis grisé « bientôt » ; onglets proposés (Votre dôme, Toile, Aménagement, Pavillon) à confirmer au Lot 3.
5. Pas de protection pendant la bêta : sélecteur libre entre les trois niveaux, pas de code PIN.
6. Revue Gemini reportée.

## Autorisation de Nathan
04/11/2026 : « On lance le Lot 1 et on avance. »

## Compte rendu (Claude Code)
**Lot 1 — 04/11/2026, branche `feature/NOMAD-2026-008-niveaux-ui` (partie de `feature/NOMAD-2026-006-plancher`).**
1. Onglet Base : la vue 3D est dans un cadre fixe à gauche ; tous les réglages (dôme, structure, chiffres clés, ouvertures, porte, sas, plancher, montants, triangles) sont dans une colonne à droite qui défile. Une poignée entre les deux règle la largeur (double-clic = taille par défaut, flèches ← → au clavier) ; deux petits boutons replient l'un ou l'autre cadre. Taille et repli sont mémorisés sur l'ordinateur. Sur écran étroit (tablette en portrait), la vue passe au-dessus des réglages.
2. Fichiers : `src/ui/split-layout.js` (nouveau), `src/index.html` (mise en page de Base, styles), `build/manifest.json`, `src/app/app.js` (+7 lignes : redessiner la vue quand son cadre change), `tests/browser/t_ui_levels.py` (nouveau), `scripts/test-all.mjs` (ajout du test).
3. Tests : `t_beta, t_names, t_openings, t_floor, t_door, t_ui_levels` → OK 6/6. Identifiants existants tous conservés. Comptage de référence inchangé (30 A · 35 B · 80 C · 20 D).
4. Reste : appliquer les mêmes cadres aux autres onglets (Cover+, Design, Quadrisphère) si Nathan valide ; sélecteur de niveau avec le Lot 2.

## Décision finale de Nathan
—
