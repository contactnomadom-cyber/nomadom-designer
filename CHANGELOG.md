# Journal des versions — Nomad'Om Designer

## Outillage (30/10/2026, sans changement de l'application)
- `CLAUDE.md` : procédure d'économie de tokens pour toutes les sessions, avec l'exception « LECTURE APPROFONDIE AUTORISÉE » accordée par Nathan.
- `scripts/code-map.mjs` (carte du code) et `test-all.mjs --only` (tests ciblés).
- Gouvernance multi-IA (mission NOMAD-2026-001) : ADR-0003 (Nathan décide ; Claude Code développe et intègre ; ChatGPT et Gemini conseillent ; dépôt public volontaire ; formulation de la référence 3V en vérification) et `docs/equipe-ia/` (rôles, circuit, fiche de mission, fiche de revue, contexte court). Section « Équipe IA » dans `CLAUDE.md`. Application inchangée (HTML assemblé identique).

Format : ce qui change pour l'utilisateur, puis les contrôles. Détail des tests de la série 0.9 : `docs/validation/historique-tests-beta-0.9.md`.

## 0.9.15 — 01/11/2026 (NOMAD-2026-002 et 003 : Kumiko dans le Design, aperçu)
- Onglet Design : nouvelle barre **Kumiko**. On choisit un motif (asa-no-ha ou mitsukude), une densité (1 à 6) et le centre du motif, puis « Poser des panneaux » : un clic sur un triangle du rendu 3D pose un panneau, un second clic le retire.
- Les lattes apparaissent dans le rendu 3D (côté intérieur, sous les montants). Un tableau liste les panneaux (triangle, motif, cadre, lattes, tsukeko, longueurs, biseaux) et montre le plan du panneau choisi, vu de l'intérieur.
- **Aperçu 🟠** : cotes d'axe à axe, lattes sans épaisseur, panneau pris nœud à nœud. Aucune liste de débit tant que les sections réelles des lattes et des montants ne sont pas fournies.
- Les panneaux sont repérés par leurs trois nœuds : ils suivent un changement de diamètre ; si la géométrie change (fréquence, coupe), ils sont gardés et signalés « absent de ce dôme ». Ils sont sauvegardés, exportés et réimportés avec l'aménagement (contrôlés comme le reste, M1).
- Moteur Kumiko (NOMAD-2026-002) repris du projet Claude, logique inchangée.
- Revue visuelle Gemini reportée par Nathan à une étape plus avancée du projet (01/11/2026).
- Contrôles : nouvelles suites `kumiko` (moteur, 25), `kumiko_layout` (pose, 19), `design` étendue (57) et `t_kumiko` (navigateur, 19). 25 suites au total.

## 0.9.14 — 01/11/2026 (M1 : données sûres dans l'aménagement Design)
- Import d'un aménagement (.json) : un fichier mal formé, d'une autre version, avec des valeurs impossibles ou de plus de 50 Mo est **refusé en entier**, avec la raison (« Import refusé — … »). L'aménagement en cours et la sauvegarde du navigateur ne changent pas.
- Un fichier incomplet est complété avec les dimensions de la bibliothèque (comme avant).
- Les noms d'éléments et de modèles 3D sont toujours affichés comme du texte (liste, propriétés, annulation, plans imprimés) : un fichier ne peut plus injecter de code dans la page.
- Modèle 3D (.glb) : un fichier de plus de 15 Mo, sans signature glTF ou tronqué est refusé (« Import impossible — … ») sans toucher l'élément. Les vrais .glb s'importent comme avant.
- Sauvegarde du navigateur illisible : gardée de côté (clé `coverplus-design-v1.mis-de-cote-…`) au lieu d'être écrasée, avec un avertissement dans le Design.
- Contrôles : nouvelles suites `design` (Node, 51 contrôles) et `t_design_import` (navigateur, 43 contrôles ; 20 échouaient sur la 0.9.13). 22 suites au total.

## 0.9.13 — 30/10/2026 (A10 : architecture restructurée)
- Aucun changement visible, sauf une correction : quand la case Ø est vide, l'en-tête, les fiches de traçage imprimées et le tableau des triangles de base affichaient « ØNaN m » ; ils affichent maintenant le Ø réellement calculé (5,00 m).
- Objet dôme unique (`src/core/dome-state.js`) : dômes calculés, toile, découpe et ouvertures au même endroit ; plus de réglages en double.
- Calculs sortis de l'interface vers des modules testés sous Node : `src/geometry/unfold.js` (triangles de base, dépliage), `src/core/status.js` (statuts 🟢🟡🟠🔴, barrière avant patrons et exports), `src/fabrication/plan-rules.js` (laize, ourlets de la rangée du bas, comparatif, CSV). Affichage de la vue aplatie et du plan de coupe rangé dans `src/rendering/view2d.js`. `app.js` : 2 601 → 1 946 lignes.
- Équivalence prouvée avec la 0.9.12 : 377 cas (dépliage), 12 973 cas sur 2 162 dômes (statuts), 763 cas (fabrication, CSV caractère pour caractère), 16 vues 2D identiques au pixel.
- Contrôles : nouvelles suites `state`, `unfold`, `status`, `plan` (Node) et `t_openings`, `t_diameter` (navigateur) ; 20 suites au total.

## 0.9.12 — 30/10/2026 (étanchéité avant tout)
- Vue aplatie : nouveau type d'ouverture « 5 fentes — suivant les gabarits (zigzag) ». Les fentes tombent sur les jonctions entre gabarits : aucun morceau cassé (3V Ø5 m « Moins de gabarits » : 0 au lieu de 11 à 20), 5 pétales identiques.
- Vue aplatie : charnières choisies sans chevauchement, la même pour les 5 pétales (48 pelures améliorées, aucune dégradée).
- Découpe « ⛔ Gabarits alignés sur les axes — DÉCONSEILLÉ » : coutures montantes alignées du sommet au sol. Visible pour comparer, avec avertissement, sans fiche de traçage ni CSV.
- ADR-0002 : étanchéité avant tout (faisabilité → performance → écoulement des eaux → étanchéité), pour la toile et les futures couvertures solides.
- Contrôles : nouvelles suites `peel` (Node) et `t_axes_block` (navigateur).

## 0.9.11 — 30/10/2026 (première version du dépôt Git)
- Retirés : « Dôme complet (auto) », « Fleur », « Bandes/Gores » et les boutons inactifs (Symétrie, Marge, Couture, Export SVG/PDF/DXF/CSV). Gardés : Triangle, Créer panneau, Développer, Étages, Plan de coupe, Vue aplatie.
- Réglages de toile regroupés dans un seul objet figé (`FABRIC`), repris par la clé de découpe.
- Dépôt : le HTML est désormais assemblé depuis `src/` (identique octet pour octet à la 0.9.11 publiée) et contrôlé par `scripts/test-all.mjs`.

## 0.9.10 — 30/10/2026
- Arcs 3V identique à Antiprism → 🟢 ; Arcs 4V–6V → 🟡 (longueurs à 0,03 % près).
- Kruschke 3V 5/12 = Domerama « 3V 4/9 » (30/30/50/10) → 🟢.

## 0.9.9 — 30/10/2026
- Double nom de coupe (Acidome / Domerama) dans le menu, l'en-tête et l'aide.
- Mexican retirée des menus.
- Toile 🔴 (patrons bloqués) en Triad, Cross et sphère entière, en attendant l'étape 9.

## 0.9.8 — 30/10/2026
- Statut de confiance 🟢🟡🟠🔴 affiché (en-tête, onglet Base, fiches) ; 🔴 bloque patrons et exports.

## 0.9.7 — 30/10/2026
- « Aligner la base » disponible en Kruschke ; alignement refusé s'il retourne des triangles (18 combinaisons sur 360, aucune en Pentad).
- Fusion avec la 0.9.6 d'une autre session (ouvertures, onglet Quadrisphère).

## 0.9.6 — 30/10/2026 (autre session)
- Ouvertures tracées sur la structure ; onglet Quadrisphère.

## 0.9.3 — 30/10/2026
- Marges propres à la rangée du bas (marge A, marge B, ourlet) ; le refus propose l'ourlet maximal.

## 0.9.2 — 30/10/2026
- Laize trop étroite : plan de coupe, fiches et exports refusés, avec la laize minimale.

## 0.9.1 — 30/10/2026
- Clé de dôme unique : « moins de toile » ne réaffiche plus les patrons d'un autre dôme (défaut bloquant de l'audit).

## 0.9 — 30/10/2026
- Le prototype Cover+ devient « Nomad'Om Designer Beta ».
