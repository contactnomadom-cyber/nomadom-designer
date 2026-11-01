# Feuille de route de migration progressive

> **Statut : PROPOSITION, à valider par Nathan.** Elle ne change pas l'ordre déjà décidé (après A10 : kit d'essai → vue éclatée → comparateur ; Kumiko en fiches 002 et 003). Elle propose d'y **intercaler** de petites étapes de socle (M1, M2…), chacune testable seule. Mission NOMAD-2026-004, 01/11/2026.

Image : on ne refait pas la charpente pendant qu'on coud la toile. On renforce une poutre à la fois, et on vérifie à chaque fois que les deux dômes de référence n'ont pas bougé d'un millimètre.

## Règles communes à toutes les étapes

- Une fiche de mission validée par Nathan par étape (ADR-0003).
- Résultats identiques sur les deux dômes de référence (3V Kruschke Ø 5 m ; 2V Chords 1/2 Ø 5,30 m), contrôle complet vert, `release.mjs` vert.
- Une étape qui change un résultat doit expliquer pourquoi l'ancien était faux, avec l'accord de Nathan.
- Ordre de jugement : faisabilité → performance → écoulement des eaux → étanchéité → le reste (ADR-0002).

## Séquence proposée

| # | Étape | Type | Dépend de | Effort |
|---|---|---|---|---|
| 1 | **Kit d'essai** (mini-dôme 2V Ø 3,00 m, recette figée) | produit (déjà décidé) | — | petit |
| 2 | **M1 — Données sûres dans Design** | socle | — | petit |
| 3 | **M2 — Tests chiffrés manquants** | socle | — | petit à moyen |
| 4 | **Vue éclatée statique** | produit (déjà décidé) | — | petit à moyen |
| 5 | **Comparateur de variantes** | produit (déjà décidé) | — | petit à moyen |
| 6 | **Kumiko : moteur (002), puis interface Design (003)** | produit (déjà décidé) | M2 conseillé | moyen |
| 7 | **M3 — Références et preuves en données** | socle | 1re toile cousue par Nathan | moyen |
| 8 | **M4 — Statut par domaine, avec preuves** | socle | M3 | moyen |
| 9 | **M5 — Projet sauvegardable (Project v2)** | socle | — | moyen |
| 10 | **M6 — Contrats Fabrication (FabricPiece, FabricationResult)** | socle | M5 conseillé | moyen |
| 11 | **M7 — Débit bois du dôme (Assembly v1)** | produit | décision D7 bis | moyen |
| 12 | **M8 — Mesures sur la tablette, puis décision rendu 3D** | mesure | tablette disponible | petit |
| 13 | **M9 — Étude préalable du calcul de structure** | étude | décision D7 | petit (étude), gros (réalisation) |
| … | Nomad Vision, devis, documents publics | produit | M5, M4 | gros |

Pourquoi cet ordre : 1, 4, 5 et 6 sont déjà décidés par Nathan. M1 et M2 sont petits et réduisent des risques réels dès maintenant. M3 et M4 n'ont de sens qu'une fois la première preuve d'atelier disponible. M5 est le prérequis du devis et de Nomad Vision.

---

## Détail des étapes de socle

### M1 — Données sûres dans l'aménagement Design
- **Objectif** : un fichier d'aménagement importé ne peut ni casser l'appli ni injecter du code ; un GLB trop gros est refusé.
- **Constat** : import JSON sans contrôle ; noms d'éléments insérés dans le HTML ; GLB sans limite (`AUDIT-2026-11-01.md` § 4.6).
- **Travail** : valider le JSON importé (types, bornes, taille) avant de l'appliquer ; afficher les textes en `textContent` ou échappés ; limiter la taille des GLB ; ne rien modifier si l'import échoue.
- **Risque** : casser l'import d'un aménagement existant → tester avec un export réel de la 0.9.13.
- **Critères** : un nom balisé s'affiche en texte ; un JSON invalide est refusé avec un message et l'aménagement en cours reste intact ; un export 0.9.13 se réimporte à l'identique.
- **Tests** : nouveau `t_design_import` (navigateur) ; `t_beta`, `t_smoke_quadri`.

### M2 — Tests chiffrés manquants
- **Objectif** : chaque moteur a au moins un cas de référence chiffré testé sous Node.
- **Travail** : ajouter l'export Node à `quadri-geom.js` (sans changer le calcul) et tester le cas de son en-tête (25 nœuds, 56 barres, 7 et 14 types) ; tester `design.js` sur la référence 3V Ø 5 m (sol, surfaces assise et debout, volume) ; tester `ouvertures.js` (porte fermée par le sol, fenêtre) ; tester le contenu d'une fiche de traçage (`export.js`).
- **Risque** : figer une valeur fausse comme référence → chaque valeur est d'abord montrée à Nathan.
- **Critères** : 4 nouvelles suites dans `test-all.mjs` ; aucun résultat de l'appli modifié (sha256 du HTML inchangé hors `quadri-geom.js`).
- **Tests** : nouvelles suites + contrôle complet.

### M3 — Références et preuves en données
- **Objectif** : enregistrer une référence (Domerama, Antiprism) ou un **essai d'atelier** sans modifier le code des statuts.
- **Travail** : `data/references/domerama/` (valeurs déjà utilisées par les tests), `data/references/workshop/` (format d'une preuve : date, dôme exact, toile, réglages, morceaux concernés, tolérance, résultat, qui), lecture par `status.js` à l'assemblage.
- **Dépend de** : la première toile cousue et mesurée par Nathan, et la décision D6 (à quoi s'applique la preuve).
- **Critères** : statuts identiques avant et après sur les 2 162 dômes déjà comparés (A10) ; une preuve d'atelier fictive en test fait passer le bon périmètre, et lui seul, au 🟢.

### M4 — Statut par domaine, avec preuves
- **Objectif** : séparer géométrie, toile, ouvertures, structure, étanchéité, aménagement ; « non évalué » pour ce qui n'a pas de contrôle.
- **Travail** : enrichir `{ level, reasons }` en `{ domain, level, reasons[] (codes), checks[], evidence[], rulesVersion, inputKey }` ; badges dans l'en-tête et sur les fiches.
- **Risque** : surcharger l'écran → revue visuelle (niveau Visuel).
- **Critères** : la barrière avant fabrication est inchangée ; « structure : non évalué » affiché partout ; `t_status` étendu.

### M5 — Projet sauvegardable (Project v2)
- **Objectif** : un projet complet (géométrie, toile, ouvertures, aménagement) s'enregistre, se rouvre et s'échange entre ordinateur et tablette.
- **Travail** : format JSON versionné (`schemaVersion`, `projectId`, `productId`, `appVersion`, dates, paramètres, aménagement, ressources) ; migration de `coverplus-design-v1` sans effacer l'ancien ; export et import de fichier.
- **Risque** : perte d'aménagements existants → migration en lecture seule d'abord, ancienne clé conservée.
- **Critères** : aller-retour enregistrement → ouverture qui redonne la même clé de dôme et les mêmes morceaux ; ancien aménagement retrouvé.

### M6 — Contrats Fabrication
- **Objectif** : écrire ce qu'est un morceau (`FabricPiece`), son placement (`NestingPlacement`) et le résultat complet (`FabricationResult`), en enveloppe autour de l'existant.
- **Critères** : CSV et fiches identiques caractère pour caractère ; suites `textile`, `plan` inchangées.

### M7 — Débit bois du dôme (Assembly v1)
- **Objectif** : liste de débit des montants (classe, nombre, longueur, angles de coupe) selon le système de connecteur choisi.
- **Dépend de** : décision de Nathan sur les systèmes de connecteur à couvrir et les cotes d'atelier (D7 bis).
- **Critères** : sur la référence 3V Ø 5 m, comptages 30/35/80/20 et longueurs identiques ; angles vérifiés sur un montant réel.

### M8 — Mesures sur la tablette
- **Objectif** : décider du rendu 3D sur des mesures, pas sur une impression.
- **Travail** : temps d'ouverture de chaque onglet, fluidité, mémoire, sur la tablette de Nathan, hors ligne.
- **Critères** : tableau de mesures archivé dans `docs/validation/` ; décision de Nathan écrite (ADR).

### M9 — Étude préalable du calcul de structure
- **Objectif** : savoir **si** et **comment** l'appli doit calculer la tenue (neige, vent), et qui en porte la responsabilité.
- **Travail** : étude seulement — méthodes possibles, données nécessaires (bois, sections, connecteurs), limites, besoin d'un ingénieur.
- **Critères** : document d'options présenté à Nathan ; **aucun chiffre de structure affiché dans l'appli** avant sa décision.

---

## Ce que cette feuille de route ne propose pas

- Réécrire l'application, changer de technologie, ou abandonner le HTML hors ligne.
- Renommer les modules en masse (les renommages se font au fil des chantiers, `docs/glossary.md`).
- Supprimer le secours WebGL2 avant M8.
- Afficher un calcul de structure avant M9 et la décision de Nathan.
