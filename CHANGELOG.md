# Journal des versions — Nomad'Om Designer

## Outillage (30/10/2026, sans changement de l'application)
- `CLAUDE.md` : procédure d'économie de tokens pour toutes les sessions, avec l'exception « LECTURE APPROFONDIE AUTORISÉE » accordée par Nathan.
- `scripts/code-map.mjs` (carte du code) et `test-all.mjs --only` (tests ciblés).

Format : ce qui change pour l'utilisateur, puis les contrôles. Détail des tests de la série 0.9 : `docs/validation/historique-tests-beta-0.9.md`.

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
