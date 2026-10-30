# Batterie de non-régression — Nomad'Om Designer

Étape 1 du plan d'évolution (audit du 30/10/2026). Aucun test ne modifie l'application.

## Préparer

1. Mettre `nomadom-designer-beta.html` (ou la version à tester) dans un dossier.
2. En extraire les modules (un fichier `.js` par `<script id="…-src">`) dans `src/`.
3. Node 18+ ; pour les tests navigateur : Python 3, Playwright et Chromium.

## Lancer

| Commande | Ce qu'elle vérifie | Durée |
| --- | --- | --- |
| `node tests/engine.test.js src` | 2 dômes de référence Domerama + 861 combinaisons (1V–8V, Chords/Arcs/Mexican/Kruschke, Pentad/Triad/Cross, toutes coupes, base alignée) | ~20 s |
| `node tests/arcs.test.js src` | Arcs contre Antiprism (valeurs figées dans `ref-antiprism-arcs.json`) : 3V identique, 4V–6V mêmes comptages et écart < 3e-4 × rayon | < 1 s |
| `node tests/textile.test.js src --v=1,2,3` | Découpe par étages : faces couvertes une fois, morceaux sans vague, paires A/B, ourlet, rouleau sans chevauchement | ~2 min |
| `node tests/textile.test.js src --v=4` puis `--v=5`, `--v=6` | Même chose, fréquences hautes (lancer séparément) | 10 à 60 min chacun |
| `node tests/compare-strategies.js src compare.json` | Comparatif des 4 stratégies (2V, 3V, 4V, 6V) | ~2 min |
| `python3 t_beta.py app.html sortie/` | Interface : références, 4 modes (Triangle, Étages, Plan de coupe, Vue aplatie), onglet Design | ~1 min |
| `python3 tests/t_laize.py app.html` | Laize trop étroite (600 mm) : plan de coupe, vue aplatie et tous les exports refusés, pour les 4 stratégies ; retour à 1500 mm = tout revient | ~2 min |
| `python3 tests/t_bottom.py app.html` | Marges propres à la rangée du bas : 2V Ø5,30 m refusé à laize 1500, accepté avec 15/15 et ourlet 30, référence 3V inchangée | ~1 min |
| `python3 tests/t_kruschke_align.py app.html` | « Aligner la base » en Kruschke : référence 3V 7/12 inchangée, 3V 3/4 rendu plat, Cross 7/12 refusé avec message | ~1 min |
| `python3 tests/t_status.py app.html` | Statut 🟢🟡🟠🔴 : référence 🟢/🟠, alignement qui déplace = 🟡, Arcs 🟡, 1V Triad 3/4 🔴 bloqué, retour à la référence | ~2 min |
| `python3 tests/t_names.py app.html` | Noms Domerama dans le menu et l'en-tête, Mexican absente, toile 🔴 en Triad/Cross/sphère entière, aide « Noms de coupe » | ~2 min |
| `python3 tests/t_cleanup.py app.html` | Anciens modes et boutons inactifs absents ; Triangle, Créer panneau, Développer, Étages, Plan de coupe, Vue aplatie présents et fonctionnels | ~1 min |
| `python3 tests/t_stale_optim.py app.html` | « Moins de toile » se recalcule quand la coupe ou la méthode change | ~1 min |

Code de sortie 0 = tout passe. Les anomalies connues sont listées dans `engine.test.js` (`KNOWN`) et affichées « (connu) » sans faire échouer la batterie.

## Résultats sur la Beta 0.9 (30/10/2026)

- Moteur : 2/2 références OK ; 857/861 combinaisons OK ; 4 anomalies connues (1V Triad/Cross 3/4 = sphère entière).
- Toile : 1V–6V, 780 découpes, aucune erreur sur les coupes de dôme ; 36 erreurs, toutes en sphère entière (1/1), dès 4V.
- `t_stale_optim.py` : échouait sur la 0.9 (défaut bloquant n° 1 de l'audit).

## Bêta 0.9.1 (30/10/2026) — étape 2 : clé de dôme unique

- La clé de découpe reprend toute l'identité du dôme (fréquence, méthode, symétrie, coupe, base alignée, diamètre, structure) et un numéro de génération qui change à chaque recalcul.
- `t_stale_optim.py` : **OK** (29 morceaux en 5/12 après 7/12 ; 40 morceaux en Chords 7/12).
- `t_beta.py` : 20/20 OK. Moteur : 2/2 références, 861 combinaisons, 0 échec (4 connus). Modules toile inchangés.

## Bêta 0.9.2 (30/10/2026) — étape 3 : laize trop étroite = refus

- Si un seul morceau dépasse la largeur utile (laize − 2 × lisière), Étages, Plan de coupe, Vue aplatie et fiche de morceau affichent « Plan de coupe refusé » avec la liste des morceaux, le dépassement et la laize minimale ; impression PDF, fiches et CSV sont bloqués.
- `t_laize.py` : OK (16/16). `t_stale_optim.py` : OK. `t_beta.py` : 20/20.
- Conséquence à laize 1500 mm : 2V Ø5,30 m (dôme de référence) est refusé — 5 morceaux du bas, laize minimale 1528 mm ; 3V Kruschke 7/12 refusé dès Ø8 m.

## Bêta 0.9.3 (30/10/2026) — rangée du bas : marges propres

- Nouvelle ligne « Rangée du bas » dans Cover+ : case « Marges propres » + marge A, marge B, ourlet. Elles s'appliquent à tous les bords des morceaux qui portent l'ourlet (toile.js, `applyAllowances`, `values.bottom`).
- Quand seuls des morceaux du bas dépassent, l'écran de refus propose l'ourlet maximal : 2V Ø5,30 m à laize 1500 → 21 mm (marges 20/20), 31 mm (15/15), 41 mm (10/10).
- Tests : `t_bottom.py` 9/9, `t_laize.py` OK, `t_stale_optim.py` OK, `t_beta.py` 20/20, moteur 861/0 échec, toile 1V–3V rapide 204/0.

## Bêta 0.9.7 (30/10/2026, fusionnée sur la 0.9.6 des autres sessions : ouvertures, Quadrisphère) — étape 4 : Kruschke + « Aligner la base »

- « Aligner la base » est disponible en Kruschke (sauf hémisphère et sphère entière). Coupes déjà plates : aucun nœud ne bouge (3V 5/12, 7/12) ou 0,011 mm (4V 3/8, 5/8). Autres coupes : base rendue plate (🟡 calculé).
- Nouveau garde-fou moteur : si l'alignement retourne des triangles, il est refusé (`ALIGN_FLIP`) ; l'app décoche la case, calcule sans alignement et l'explique. 18 combinaisons concernées sur 360, aucune en Pentad (3V Cross 7/12 toutes méthodes, 5V Cross 11/20, 7V/8V Triad/Cross).
- Libellé « Kruschke (base plate) » → « Kruschke » ; aide mise à jour.
- Tests : moteur 2/2 références, 867 combinaisons, 0 échec (18 alignements refusés, attendus) ; `t_kruschke_align.py` 9/9 ; `t_bottom.py`, `t_laize.py`, `t_stale_optim.py` OK ; `t_beta.py` 20/20 ; toile 1V–4V rapide : seuls les cas connus de sphère entière en 4V.

## Bêta 0.9.8 (30/10/2026) — étape 5 : statut de confiance affiché

- En-tête : deux badges, géométrie et toile. Onglet Base : encadré « Statut de ce dôme » avec les raisons. Fiches de traçage : statut sur chaque page.
- Géométrie : 🟢 Chords Pentad 1V–6V (facteurs Domerama) et Kruschke 3V 7/12 Pentad (référence 3V 5/9) ; 🟡 Chords 7V–8V, Kruschke hors référence, Arcs, Mexican, Triad/Cross, base alignée qui déplace des nœuds ; 🔴 1V Triad/Cross 3/4.
- Toile : 🟠 par défaut (aucune toile cousue avec ces patrons) ; 🔴 si géométrie 🔴 ou morceaux avec vague (sphère entière 4V+) → patrons et exports bloqués, comme la laize trop étroite.
- Moteur : `params.alignMoved` = nœuds réellement déplacés par l'alignement (0 = base déjà plate, le dôme garde son statut).
- Tests : `t_status.py` 11/11 ; tous les autres OK ; `t_beta.py` 20/20 ; moteur 867/0. Lancer les tests navigateur au plus 3 à la fois (au-delà, la page ne charge pas à temps).

## Bêta 0.9.9 (30/10/2026) — étape 7, première moitié de l'étape 8, décision sur l'étape 9

- Étape 7 : double nom de coupe dans le menu « Découpage » et l'en-tête (ex. « 7/12 · Domerama 3V 5/9 Kruschke ») ; table de correspondance 1V–6V dans Informations → « Noms de coupe ». 3V 4/9 et 4V Kruschke marqués « à confirmer ».
- Étape 8 : Mexican retirée des menus (le moteur la garde, les tests moteur la couvrent toujours). Recherche de références Arcs / Kruschke 4V : à faire.
- Décision de Nathan : étape 9 reportée ; en attendant, toile 🔴 (patrons et exports bloqués) en Triad, Cross et sphère entière.
- Étapes reportées à un audit ultérieur : 6 (exports en ligne — l'appli est utilisée en local), 9, 10, 12, 13, 14.
- Tests : `t_names.py` 14/14 ; `t_status`, `t_bottom`, `t_laize`, `t_stale_optim`, `t_kruschke_align` OK ; `t_beta.py` 20/20 ; Quadrisphère OK.

## Bêta 0.9.10 (30/10/2026) — étape 8 terminée : références indépendantes

- Arcs comparé à Antiprism (logiciel libre indépendant, `geodesic -M s`, compilé depuis GitHub) : 3V identique (écart 3e-13) → 🟢 ; 4V–6V mêmes comptages mais longueurs à 0,03 % du rayon près (≤ 0,7 mm sur Ø 5 m), les nœuds intérieurs étant définis autrement → 🟡 avec la raison.
- Kruschke 3V 5/12 confirmé par la page Domerama « 3V 4/9 (3/8) Kruschke » : 30 A, 30 B, 50 C, 10 D, mêmes angles → 🟢, nom « 3V 4/9 » confirmé.
- Kruschke 4V : aucune référence lisible (pages Domerama dédiées inaccessibles ; la page « 4V timber » utilise la méthode 1 en 5/12 et 7/12) → reste 🟡.

## Bêta 0.9.11 (30/10/2026) — étape 11 : anciens modes retirés, FabricSpec

- Retirés : « Dôme complet (auto) », « Fleur », « Bandes/Gores » (≈ 300 lignes) et les boutons inactifs (Symétrie, Marge, Couture, Export SVG/PDF/DXF/CSV). Gardés : Triangle, Créer panneau, Développer (modes manuels), Étages, Plan de coupe, Vue aplatie.
- FabricSpec : un seul objet figé `FABRIC` (laize, lisière, largeur utile, tolérance, marges, rangée du bas), recalculé par `readFabricParams()` ; la clé de découpe le reprend en entier.
- Script d'interface : 2 899 → 2 588 lignes (l'objectif « < 2 000 » de l'audit visait la Beta 0.9 ; depuis, les ouvertures et la Quadrisphère ont ajouté du code).
- Tests : `t_cleanup.py` 21/21 ; `t_beta.py` 14/14 (les 6 contrôles des modes retirés supprimés) ; tous les autres OK ; moteur 867/0.
