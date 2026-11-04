# NOMAD-2026-008 — Trois niveaux d'interface : Développeur, Atelier, Client

| Rubrique | Contenu |
|---|---|
| Date | 04/11/2026 |
| Demandeur | Nathan |
| Exécutant | Claude Code |
| Niveau | Visuelle |
| Statut | Brouillon (à construire avec Nathan) |

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
- Maquettes de départ : `docs/maquettes/ui-2026-11/` (B = `maquette-B.png` ; C = `maquette-C1-dome.png`, `maquette-C2-amenagement.png`). La maquette A (« Atelier bois ») n'est plus retenue pour ce chantier — à confirmer.

## Résultat attendu

### Lot 1 — Niveau Développeur (l'actuel, amélioré)
- Tout reste comme aujourd'hui : mêmes réglages, mêmes textes, même détail.
- **Changement unique** : dans Base (et ensuite dans les autres onglets qui ont une vue + des réglages), on peut faire défiler toutes les options **en gardant le dôme visible**.
  - La vue 3D reste fixée à l'écran pendant que la colonne des réglages défile (comme un tableau de bord qui reste devant les yeux pendant qu'on cherche dans la boîte à gants).
  - **Les cadres sont réglables** : (1) le cadre de la vue 3D, (2) le cadre des options. On peut les agrandir ou les réduire (poignée à glisser entre les deux, et un bouton pour replier un cadre).
  - La taille choisie est mémorisée sur cet ordinateur.
- [Suite de la demande de Nathan coupée : « le cadre où il y a toutes les options pour ajouter… » — à compléter.]

### Lot 2 — Niveau Atelier (maquette B)
- Trois colonnes : propriétés à gauche (réglages rangés par groupe : Dôme, Porte et sas, Plancher…), vue 3D au centre (repère x/y/z, échelle), mesures à droite (tableaux alignés), barre d'état avec la légende des statuts.
- Même chose pour Cover+, Design, Quadrisphère, Informations (maquettes B de ces écrans à faire avant de coder).

### Lot 3 — Niveau Client (maquette C)
- 3D plein écran, une phrase, trois chiffres parlants, options en pastilles ; réglages techniques et chiffres de fabrication masqués.
- Onglets proposés : Votre dôme, Toile, Aménagement, Pavillon (à confirmer).
- Bouton « Préparer le devis » : caché ou grisé « bientôt » tant que le devis n'existe pas (à décider).

### Passage d'un niveau à l'autre
- Un sélecteur **Développeur · Atelier · Client**, visible dans les trois niveaux (en haut à droite).
- Le niveau choisi est mémorisé sur cet ordinateur ; changer de niveau ne change aucun réglage ni aucun calcul.
- Niveau au démarrage : à décider (proposition : Atelier).

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
- [ ] Lots 2 et 3 : écrans conformes aux maquettes validées après la revue Gemini.
- [ ] Les deux dômes de référence restent identiques.

## Tests attendus
- Contrôle complet existant (aucune suite affaiblie).
- Nouveau test navigateur `t_ui_levels.py` : sélecteur, mémorisation, vue 3D visible pendant le défilement, redimensionnement, mêmes chiffres dans les trois niveaux.

## Revue Gemini
Oui : maquettes B (tous les onglets) et C avant de coder les lots 2 et 3 ; paquet `REVUE-GEMINI.md` à mettre à jour (A remplacée par B).

## Risques
- Casser des tests navigateur qui cherchent des éléments par leur identifiant : garder les identifiants existants.
- Trois interfaces à maintenir : chaque nouvelle fonction devra prévoir son affichage dans les trois niveaux (ou être déclarée « Développeur seulement »).

## Questions ouvertes pour Nathan
1. Fin de ta phrase : « le cadre où il y a toutes les options pour ajouter… » ?
2. La maquette A (Atelier bois) est-elle abandonnée, ou garde-t-on ses couleurs pour le niveau Atelier avec la disposition de B ?
3. Niveau au démarrage : Atelier, Développeur ou le dernier utilisé ?
4. Niveau Client : onglets montrés, et bouton devis caché ou grisé ?
5. Le niveau Développeur doit-il être protégé (caché derrière un réglage) pour qu'un client ne tombe pas dessus ?

## Autorisation de Nathan
—

## Compte rendu (Claude Code)
—

## Décision finale de Nathan
—
