# Journal des versions — Nomad'Om Designer

## Outillage (30/10/2026, sans changement de l'application)
- `CLAUDE.md` : procédure d'économie de tokens pour toutes les sessions, avec l'exception « LECTURE APPROFONDIE AUTORISÉE » accordée par Nathan.
- `scripts/code-map.mjs` (carte du code) et `test-all.mjs --only` (tests ciblés).
- Gouvernance multi-IA (mission NOMAD-2026-001) : ADR-0003 (Nathan décide ; Claude Code développe et intègre ; ChatGPT et Gemini conseillent ; dépôt public volontaire ; formulation de la référence 3V en vérification) et `docs/equipe-ia/` (rôles, circuit, fiche de mission, fiche de revue, contexte court). Section « Équipe IA » dans `CLAUDE.md`. Application inchangée (HTML assemblé identique).

Format : ce qui change pour l'utilisateur, puis les contrôles. Détail des tests de la série 0.9 : `docs/validation/historique-tests-beta-0.9.md`.

## 0.9.24 — 06/11/2026 (Cover+ : mode tuilage)
- **Bouton 💧 Tuilage** (Cover+, gardé d'une visite à l'autre) : sur le **dôme 3D**, une flèche « l'eau descend » par face et, en découpe par morceaux, un liseré **bleu DESSUS** (ce bord recouvre le voisin) / **orange DESSOUS** (ce bord passe sous le voisin) le long de chaque couture ; légende en bas à gauche.
- **Patrons 2D** (morceau seul, vue aplatie par rangées, pelure d'orange) : bords colorés avec le mot DESSUS / DESSOUS / OURLET et une flèche d'eau par triangle, calculée sur la pente réelle de la face. Pelure : une fente qui traverse un morceau (« à casser ») reçoit DESSUS du côté qui commence après la coupe, DESSOUS de l'autre.
- **Fiches de traçage imprimées** : toujours les mots et couleurs DESSUS / DESSOUS sur les bords, une flèche d'eau par triangle, légende, et « DESSUS — A (recouvrant) » / « DESSOUS — B (recouvert) » dans le tableau des marges.
- Le dôme 3D affiche les couleurs des morceaux dès la fin du calcul de la découpe (avant : seulement après avoir bougé la vue).
- Contrôles : nouvelle suite `tuilage` (59 contrôles : sur les deux références, toutes découpes et les 6 types d'ouverture de la pelure, DESSUS en bas du morceau du haut à chaque couture d'étage, un DESSUS face à un DESSOUS à chaque couture, eau jamais vers le haut) et test navigateur `t_tuilage`.

## 0.9.23 — 06/11/2026 (Quadrisphère : ambiances et rendu photo ; Kumiko de nouveau visible)
- **Quadrisphère** : menu **Ambiance** (plein jour, matin, coucher de soleil, ciel couvert, nuit avec lampe), partagé avec l'onglet Design ; « plein jour » garde la lumière d'origine. Bouton **📷 Rendu photo** (lancer de rayons, progression, ⬇ PNG ; bouger la vue revient à la 3D).
- **Design** : les barres **Site et soleil** et **Aération** sont repliables, fermées par défaut, avec un résumé sur une ligne ; la barre **Kumiko**, poussée hors de l'écran depuis la 0.9.21, est de nouveau visible sans défiler.
- Contrôles : nouvelle suite `t_quadri_rendu` ; `t_soleil` et `t_aeration` ouvrent la barre repliée.

## 0.9.22 — 05/11/2026 (raccord toile du sas / toile du dôme)
- Fiche porte, sas : nouveau choix **« Toile au dôme »** — **rabat glissé dessous** (défaut, comme avant), **rabat cousu** (non démontable, couture double), **bande auto-agrippante** (crochets sur le rabat, velours sous la toile du dôme), **jonc dans un rail** vissé sur les montants (fourreau de 30 mm au lieu du rabat de 100 mm). Dans tous les cas la toile du dôme reste par-dessus, comme les tuiles.
- Cover+, toile du sas : le raccord choisi, s'il est démontable, le matériel à prévoir (sangles, mètres de couture, de bande, de jonc et de rail) et ses remarques d'étanchéité.
- **Coins hauts du raccord** (là où deux rabats se croisent) : nombre de coins et trois solutions à essayer en atelier — pièce de renfort en chapeau, soufflet, coin en onglet + bande d'étanchéité — chacune avec son analogie, ses avantages et ses limites. 🟠 non vérifié en atelier.
- Contrôles : `sas_toile` +9 vérifications, `t_door` vérifie le choix et son effet dans Cover+. 43 suites ; dômes de référence inchangés.
## 0.9.21 — 05/11/2026 (site et soleil, aération, vue, débits, solidité, ossature de mezzanine)
- **Site et soleil** (Design, 🟡 calculé) : lieu par ville (39 villes, hors ligne), nord sur le plan (flèche tournée à l'écran et à l'impression), soleil réel par date et heure belge, arcs du 21 décembre et du 21 juin, carte des faces (bilan fenêtres hiver − été, soleil d'hiver, soleil d'été) et lecture « meilleurs côtés ».
- **Vue principale** : direction et largeur du paysage, secteur sur le plan, carte « vue », lecture croisée vue + soleil.
- **Aération** (🟡) : coupole zénitale, porte et fenêtres reconnues, case « ouvrable » et part ouvrante (%), renouvellements d'air par effet cheminée (été, mi-saison), surface d'entrées basses pour un objectif, alerte d'équilibre, rappel pluie, flèches d'air en 3D.
- **Plancher** (Base) : sections au choix (provisoires, CLS, KVH) et cadres en onglet ou en about ; **solidité** des solives et poutres (flexion, cisaillement, flèche, Eurocode 5 simplifié) avec section conseillée ; **liste de débits** (pièces repérées, onglets, barres à commander, plan de coupe, panneaux), masquée si une pièce est 🔴 (ADR-0002). Le plancher plein avec les sections d'origine est désormais 🔴 (solive sur 3,9 m).
- **Ossature de la mezzanine** (Design) : solives, poutres de rive, poteaux (flambement), entraxe, épaisseur conseillée, appui côté paroi indépendant (par défaut) ou sur les montants (🟠), liste de débits, ossature dessinée dans la 3D.
- 🟠 Longueurs de barres et formats de panneaux à confirmer chez Bourguignon Bois ; CLS supposé C16, KVH C24.
- Contrôles : nouvelles suites `sun`, `vent`, `lumber`, `mezz_frame`, `t_soleil`, `t_aeration`, `t_debits`, `t_mezz_frame` ; dômes de référence inchangés.

## 0.9.20 — 05/11/2026 (poteaux de porte sur pilotis)
- Porte d'aplomb + plancher sur pilotis : les **poteaux d'angle de l'avant-corps** tombaient juste hors du plancher, dans le vide ventilé. Chacun reçoit maintenant **son propre pilotis** (mêmes blocs, même calage selon la pente), visible sur le plan et en 3D.
- La charge de l'avant-corps (bois, toile du toit et des parois, neige) est reportée en entier sur ces pilotis — côté sûr, les appuis sur le dôme en reprennent en réalité une part 🟠. Elle s'affiche dans « Charges et portance » ; les pilotis sont comptés à part (« + 2 sous les poteaux de porte »).
- Porte reculée vers l'intérieur : les poteaux posent sur le plancher, pas de pilotis en plus. Porte-à-faux : pas de poteau, pas de pilotis. Sas : inchangé (ses pilotis existaient déjà).
- Contrôles : nouvelle suite `porte_pilotis` (11 vérifications) ; `t_door` vérifie les 2 pilotis et leurs blocs dans la 3D. 35 suites ; dômes de référence inchangés.

## 0.9.19 — 05/11/2026 (ambiances du rendu)
- Onglet Design, style Réaliste : menu **Ambiance** — **Plein jour**, **Matin** (soleil bas et doré), **Coucher de soleil** (lumière orangée, lampe intérieure allumée), **Ciel couvert** (lumière douce, sans ombre dure), **Nuit** (lampe chaude au centre, le dôme brille comme une lanterne). Tout est calculé : marche sans internet. Menu masqué en style Maquette.
- **Le rendu photo suit l'ambiance choisie** ; le PNG porte son nom (ex. `rendu-dome-nuit.png`).
- Les triangles mal orientés sont corrigés à la source : le dessus du plancher et la pelouse reçoivent bien le soleil (ombres des montants au sol).
- Réunit deux travaux menés en parallèle (branches `feature/ambiances-rendu` et `feature/ambiances-photo`).
- Contrôles : nouvelle suite `t_ambiance` ; `t_photo` vérifie le menu des 5 ambiances et fait le rendu au coucher de soleil. 34 suites ; dômes de référence inchangés.

## 0.9.18 — 04/11/2026 (rendu photo du Design)
- Onglet Design : bouton **« 📷 Rendu photo »**. L'image réaliste (ombres douces, reflets, lumière du ciel) se calcule progressivement, avec la progression en % ; bouton **« ⬇ PNG »** pour l'enregistrer (devis, site, présentation client). Bouger la vue revient à la 3D habituelle. Fonctionne hors ligne. La coupe « voir dedans » n'est pas encore rendue en photo (toile entière, avec un avertissement).
- Moteur 3D : three.js reste en 0.169 ; ajout de three-gpu-pathtracer 0.0.23 dans `vendor/three/` (+ ≈ 180 Ko), recette de régénération dans `vendor/three/README.md`.
- Contrôles : nouvelle suite navigateur `t_photo` (rendu terminé, image pas noire, retour à la 3D intacte). 33 suites au total ; dômes de référence inchangés.
- Outillage : `test-all.mjs --parallel=1` (ou `TEST_PARALLEL=1`) lance les tests navigateur un par un, pour les petites machines (2 processeurs) où trois navigateurs en parallèle font dépasser les délais. Par défaut : 3, comme avant.

## 0.9.17 — 04/11/2026 (NOMAD-2026-006, 007 et 008 Lot 1 : plancher, sas, cadres réglables)
- **Plancher et soubassement** (aperçu 🟠, NOMAD-2026-006) : plancher sur pilotis en blocs (pentagone + triangle, étoile, plein), poutres, solives, charges ; visible dans la 3D de Base et du Design.
- **Sas d'entrée** (aperçu 🟠, NOMAD-2026-007) : l'ouverture prolongée en prisme droit avec une deuxième porte ; **toile du sas** (patrons, rabat sous le dôme, recouvrements) ; charges du sas comptées dans la portance ; sas affiché dans la 3D de Cover+.
- Porte, sas et plancher visibles dans tous les onglets : plan du Design, récapitulatif Informations, signalement dans Cover+.
- **Cadres réglables** (NOMAD-2026-008, Lot 1) : dans Base, Cover+, Design et Quadrisphère, la vue reste fixe à l'écran pendant que les réglages défilent à droite. Cover+ : dôme 3D en haut, patron 2D en bas ; Design : plan en haut, rendu 3D en bas. Poignée pour régler la largeur (double-clic = taille par défaut), boutons pour replier un cadre ; taille et repli mémorisés par onglet sur cet ordinateur. Aucun réglage, texte ni chiffre retiré.
- Contrôles : nouvelles suites `floor`, `sas-toile`, `t_floor` et `t_ui_levels` (navigateur : cadres des quatre onglets, mémoire, mêmes chiffres). 32 suites au total, toutes vertes ; dômes de référence inchangés.

## 0.9.16 — 03/11/2026 (NOMAD-2026-005 : porte d'aplomb, structure 3D, assemblages)
- Onglet Base : sous chaque ouverture qui touche le sol, **« Ajouter une porte d'aplomb »**. Largeur, hauteur, décalage et recul vers l'intérieur (réglé porte par porte). L'outil dit si la porte passe (🟡) ou non (🔴, avec la hauteur et la largeur maxi), donne l'huisserie, les potelets, la surface à fermer et l'ébrasement.
- **Structure de la porte en 3D** (aperçu 🟠, section provisoire 45 × 70 mm) : huisserie, chevêtre posé sur le linteau et ses appuis, potelets, rampants, chevrons jusqu'au cadre du dôme, toit de l'avant-corps.
- **Choix constructifs** : tenue de l'avant-corps (poteaux d'angle et lisses basses · parois latérales · porte-à-faux ⛔ déconseillé, sans document de fabrication) ; accroche au dôme des appuis et des chevrons (sur le montant ou sur un nœud seulement, avec contrefiches).
- **Aucune pièce volante** : chaque raccord est classé (sol, nœud, montant du dôme, angle, T, biais, posé sur) et l'outil vérifie que chaque pièce rejoint le sol ou le dôme par une chaîne de raccords.
- **Bibliothèque d'assemblages** didactique (14 fiches 🟠 : schéma, analogie, quand, limites, outillage, étapes) : tenon-mortaise, mi-bois, embrèvement, entaille, sabot, équerre, vis structurelle, boulon, platine sur nœud, moisage, cale biaise, pied de poteau, platine sur plancher, lisse ancrée. Un assemblage au choix par type de raccord ; les moises se dessinent en 3D.
- Efforts et sections réelles pas encore calculés (étapes suivantes).
- Contrôles : nouvelles suites `door` (43), `joinery` (56) et `t_door` (navigateur, 21). 28 suites au total.

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
