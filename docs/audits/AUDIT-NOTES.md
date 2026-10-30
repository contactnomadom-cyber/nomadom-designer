# Audit Cover+ — notes provisoires (en pause)

Audit mis en pause le 30/10/2026 à la demande de Nathan : à reprendre quand la dernière mise à jour (Kumiko, ouvertures/sas) sera en place.
Document d'audit (squelette, section Méthode remplie) : https://claude.ai/artifact/Ste17EDkj9KR1Z3AnZXAtS

## Version testée
Artifact « ACIDOME — Cover+ (prototype) » mis à jour le 29/10/2026 (1 164 941 octets), quasi identique au acidome-cover-plus.html du projet.
14 scripts : threekit (Three.js), dome-engine, etages, toile, export, nesting, optim, info, peel, design, design3d, design3d-three, app (UI Cover+), designui.

## Tests à relancer (scripts : claude/audit/t_cover.py et t_design.py)
Chromium sans écran, `--use-gl=swiftshader`. Récupérer l'appli : Artifact read, path index.html.

## Constats provisoires (version du 29/10)
Valide :
- 3V 5/9 Ø5 : 61 sommets, 165 arêtes, 105 faces, 30×A 824.27, 35×B 955.73, 80×C 1053.72, 20×D 1102.64 mm (= Domerama).
- 2V 1/2 Ø5,30 : 26 sommets, 65 arêtes, 40 faces, 30×A 1448.31, 35×B 1637.79 mm.
- Aucun message d'erreur dans la console, sur tous les modes Cover+ et Design.
- Étages 3V : 18 morceaux / 10 gabarits ; rouleau 50,31 m (−18 % vs bout à bout), utilisation 65 %.
- Étages 2V : 30 morceaux ; rouleau 33,07 m, utilisation 78 %.
- Stratégies : gabarits 21 morceaux / 5 gabarits ; « moins de toile » 39 morceaux (calcul ~3,4 s) ; triangle par triangle 105.
- GoodKarma (120 mm) : agrandissement +4,3 à +5,3 % selon la classe.
- Design : surfaces 3V Ø5 = Ø sol 4,91 m, hauteur 2,97 m, sol 18,4 m², debout 13,4 m², assis 18,1 m², volume 39,4 m³.
- Design : rendu Three.js OK (réaliste / maquette, coupe / verre / structure), export .json, impression 1:50 par niveau, sauvegarde après rechargement.

En cours (pas des défauts) :
- Boutons « Marge », « Couture », « Export SVG/DXF/CSV », « Symétrie » encore grisés, alors que marges et fiches CSV par morceau existent déjà ailleurs.
- design.js : clipRing() est un bouchon (profondeur ignorée pour la mezzanine en secteur).

Défauts repérés (à revérifier sur la nouvelle version) :
- Design : aucun contrôle de chevauchement entre meubles (lit, canapé, poêle, douche, escalier empilés au centre = tous ✓) ; distance de sécurité du poêle dessinée mais pas contrôlée.
- Design : chaque nouvelle ouverture arrive sur le côté 1 ; plusieurs ouvertures se superposent sans alerte.
- Design : l'escalier n'est pas contrôlé par rapport au bord de la mezzanine (arrivée).
- Design : mezzanine par défaut à 2,20 m inutilisable sur 3V 5/9 Ø5 (0 m² assis) — un avertissement s'affiche, mais la valeur par défaut est mal choisie pour les dômes de référence.
- Design : noms d'éléments insérés sans échappement HTML (un .json importé peut injecter du code).
- Ouverture du Design : 6,9 s en rendu logiciel (à mesurer sur un vrai PC).
- « Ø5,00 m » = diamètre de la sphère ; le sol fait 4,91 m en 3V 5/9 : à afficher clairement pour les clients.
