# Revue visuelle — NOMAD-2026-008 (refonte de l'interface : mode Atelier + mode Présentation)

À joindre dans la conversation Gemini, dans cet ordre : `docs/equipe-ia/CONTEXTE-COURT.md`, puis ce texte, puis les 5 captures ci-dessous (et `maquette-B.png` seulement si Gemini veut comparer).

## Demande (remplie par Claude Code pour Nathan)

- **Contexte fonctionnel** : Nomad'Om Designer, un seul fichier HTML hors ligne pour concevoir et fabriquer des dômes géodésiques (géométrie, toile Cover+, aménagement intérieur, porte, sas, plancher sur pilotis). Utilisateur principal : Nathan, artisan, à l'atelier et sur chantier, sur un ordinateur portable. Usage secondaire : montrer le projet à un client. Ce sont des **maquettes** (images), pas encore codées. Les chiffres et les rendus 3D sont réels, tirés de l'application (dôme de référence 3V Ø 5 m avec un sas de 2,50 m et un plancher sur 29 pilotis).
- **Objectif de la revue** : avant de coder, vérifier que la nouvelle interface est claire, cohérente et agréable, dans ses deux modes, et qu'on passe facilement de l'un à l'autre.
  - **Mode Atelier** (style « Atelier bois ») : bandeau de navigation en noyer à gauche, onglets présentés comme des outils ; fond contreplaqué clair ; actions principales en vert forêt ; 3D en grand avec un mètre pliant jaune gradué (échelle réelle) ; réglages à droite en sections dépliables ; chiffres clés en bandeau sous la vue. Police Barlow (embarquée dans le fichier).
  - **Mode Présentation** (style « Vitrine client ») : 3D plein écran, une phrase, trois chiffres, options en pastilles, réglages techniques masqués.
  - Bouton de bascule : en bas du bandeau noyer (« Atelier / Présentation ») et en haut à droite en mode Présentation.
- **Captures jointes** :
  1. `maquette-A1-base.png` — Atelier, onglet Base : dôme, porte et sas d'entrée, plancher sur pilotis.
  2. `maquette-A2-cover.png` — Atelier, onglet Cover+ : patrons de toile par étages, réglages de découpe et de coutures, toile du sas.
  3. `maquette-A3-design.png` — Atelier, onglet Design : plan vu du dessus et rendu 3D, bibliothèque d'éléments, Kumiko.
  4. `maquette-C1-dome.png` — Présentation, « Votre dôme ».
  5. `maquette-C2-amenagement.png` — Présentation, « Aménagement ».
  - Pour mémoire : `maquette-B.png` (style « Pro technique », écarté par Nathan).
- **À ne pas modifier** :
  - les chiffres, cotes et longueurs (ils viennent des calculs) ;
  - les statuts 🟢 vérifié · 🟡 calculé · 🟠 non vérifié en atelier · 🔴 refusé, et leur visibilité ;
  - les avertissements d'étanchéité (ex. « Gabarits alignés sur les axes » déconseillé, ADR-0002) ;
  - le principe « une option déconseillée reste visible, avec avertissement, sans document de fabrication » ;
  - le fonctionnement hors ligne en un seul fichier (pas de police ni d'image chargées depuis Internet).
- **Questions précises** :
  1. Le mode Atelier se comprend-il sans explication ? La hiérarchie (vue 3D / réglages à droite / chiffres en bas) est-elle la bonne pour un artisan qui règle puis vérifie ?
  2. Le mètre pliant gradué sur la 3D : utile et lisible, ou gadget ? Doit-il suivre le zoom ?
  3. Les réglages en sections dépliables à droite : bon choix quand il y a beaucoup de paramètres (Cover+) ? Quelles sections ouvrir par défaut ?
  4. Les statuts 🟢🟡🟠🔴 et les avertissements restent-ils assez visibles dans le nouveau style (bas du bandeau noyer, encadrés) ?
  5. Le passage Atelier ↔ Présentation est-il assez évident ? Le bouton est-il au bon endroit dans les deux modes ?
  6. Mode Présentation : lisibilité du texte posé sur la 3D (dégradé), taille des chiffres, pastilles d'options. Que manque-t-il pour convaincre un client ?
  7. Contrastes et lisibilité en plein jour (atelier, extérieur) : vert forêt, gris des libellés, jaune du mètre.
  8. Cohérence entre les trois onglets Atelier (Base, Cover+, Design) : mêmes repères, même place pour les mêmes choses ?

## Observations (remplies par Gemini)
Catégories : Ergonomie · Lisibilité · Hiérarchie visuelle · Cohérence graphique · Parcours utilisateur · Rendu 3D · Interactions · Défaut visuel · Amélioration.

| # | Catégorie | Description | Localisation (écran, zone) | Gravité (bloquant / important / mineur) | Impact utilisateur | Correction proposée | Priorité recommandée | Capture annotée |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | |

## Synthèse (Gemini)
- Défauts bloquants :
- Défauts importants :
- Améliorations facultatives :
- Points satisfaisants :
- Recommandation globale :

## Suite (Nathan)
Observations retenues (numéros) → corrections des maquettes par Claude Code, puis codage de l'interface.

Rappel pour Gemini : une proposition qui gêne la lecture des cotes, des avertissements ou des statuts de confiance est contraire aux priorités du projet (ADR-0002 : fabrication et étanchéité avant présentation).
