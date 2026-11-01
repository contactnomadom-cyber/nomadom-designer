# Nomad'Om Designer — Document fondateur V1

> **Statut : PROPOSITION V1, à valider par Nathan.** Ce document rassemble la vision et les principes. Il ne remplace ni `CLAUDE.md` ni les ADR ; en cas de contradiction, ce sont eux qui font foi jusqu'à décision de Nathan.
> Sources : dossier « NomadOm_Dossier_Preparation_Claude_Code_V1-3 », ADR-0001 à 0003, audit du 01/11/2026 (`AUDIT-2026-11-01.md`). Mission NOMAD-2026-004.

---

## 1. Vision

Nomad'Om Designer doit devenir l'outil professionnel de **conception constructive et de préparation à la fabrication** des structures Nomad'Om : partir d'une demande client et aller, sans repartir de zéro, jusqu'à la géométrie, la structure, l'enveloppe, l'aménagement, les documents d'atelier et le devis.

Image : aujourd'hui l'outil est un excellent **gabarit de traçage**, juste au dixième de millimètre. Demain, il doit être le **dossier de chantier complet**. Chaque page de ce dossier dit d'où viennent ses chiffres et jusqu'où on peut s'y fier.

Trois règles pour y arriver :
1. **Justesse avant fonctionnalités** : mieux vaut refuser un calcul que produire un patron faux.
2. **Étanchéité avant tout** : ordre de priorité d'ADR-0002 pour chaque choix.
3. **Pas de réécriture brutale** : on garde ce qui marche et on avance par étapes vérifiables.

---

## 2. Périmètre

### 2.1 Existant à préserver (0.9.13)

| Domaine | Ce qui existe | Niveau de confiance |
|---|---|---|
| Géométrie des dômes | Icosaèdre classe I, 1V–8V, Chords / Arcs / Kruschke (Mexican dans le moteur), Pentad / Triad / Cross, coupes, base alignée | 🟢 sur les références indépendantes, 🟡 ailleurs |
| Ouvertures | Contour sur les montants, faces et montants retirés, seuil de porte | calcul géométrique ; aucune vérification structurelle |
| Toile Cover+ | Étages, morceaux, gabarits, marges A/B, ourlet, rangée du bas, laize, GoodKarma, 5 stratégies, pelure d'orange, rouleau | 🟠 : jamais vérifié sur une toile cousue |
| Documents d'atelier | Fiches de traçage imprimables (PDF), CSV par morceau, plan de coupe | 🟠, bloqués si 🔴 |
| Aménagement Habitat | Surfaces, hauteurs, mezzanine, 19 éléments, plans 1:50, 3D | encombrements seulement |
| Quadrisphère | Géométrie, débit avec ou sans connecteur, masse des tubes | calcul, sans test chiffré automatique |
| Rendu | Canvas 2D, Three.js r169 embarqué, secours WebGL2 | présentation seulement |
| Chaîne de production | Dépôt Git, assemblage, 20 suites de tests sur l'artefact, feu vert de publication | vérifié à chaque version |

### 2.2 À venir (déjà décidé ou noté par Nathan)

Kit d'essai (mini-dôme 2V Ø 3,00 m), vue éclatée, comparateur de variantes, Kumiko dans Design, Nomad Vision (mode client et mode expert, code PIN), devis et documents publics (découpe « axes » seulement), gamme Décoration, lot ouvertures complet (porte, sas, châssis, coupole), couvertures solides.

### 2.3 Hors périmètre tant que Nathan n'a pas décidé

Plateforme web en ligne, configurateur public, calcul réglementaire certifié, familles zome ou ossature.

---

## 3. Principes d'architecture

1. **Préserver l'existant fonctionnel.** Aucune refonte globale sans justification et sans validation.
2. **Un seul HTML hors ligne** reste le livrable de référence, tant qu'une décision explicite ne change pas ce principe.
3. **Séparer le métier, l'interface et le rendu.** L'interface affiche, les modules calculent (acquis de A10).
4. **Un moteur par famille de produits** (dôme, Quadrisphère, Kumiko…). Les services ne deviennent communs que si au moins deux produits partagent vraiment la même règle.
5. **Séparer cinq choses** qu'on confond facilement (§ 4).
6. **Tout résultat est traçable** : domaine, hypothèses, entrées, version et niveau de confiance.
7. **Une belle vue n'est pas une preuve.** La 3D montre ; elle ne valide rien.
8. **Les références sont immuables et auditables.** Une référence ne change qu'avec une preuve et l'accord de Nathan.
9. **Public par défaut** : le dépôt est public, donc aucun secret ni donnée client. Les documents remis aux clients ne montrent jamais la découpe réelle de l'atelier.

---

## 4. Distinctions métier essentielles

Image : pour une maison, le plan de l'architecte, la liste des matériaux, la note de calcul de l'ingénieur, le contrôle du bureau de contrôle et les plans d'atelier du charpentier sont cinq documents différents. Avoir l'un ne donne pas les autres.

| Domaine | Répond à | Dans Nomad'Om Designer aujourd'hui |
|---|---|---|
| **Géométrie constructive** | Formes, nœuds, longueurs, angles, surfaces, topologie | ✅ moteur de dôme, Quadrisphère, ouvertures, toile développée |
| **Pièces et assemblages** | Composants, matière, sections, liaisons, quincaillerie, nomenclature, ordre de montage | ⚠️ partiel : morceaux de toile et gabarits ; débit Quadrisphère ; rien pour les montants bois du dôme ni la visserie |
| **Calcul mécanique** | Charges (neige, vent), efforts, stabilité, résistance, déformations | ❌ absent |
| **Validation** | Contrôle documenté : critère, hypothèse, preuve, limite, statut | ⚠️ statuts 🟢🟡🟠🔴 sur géométrie et toile, règles écrites en dur, sans preuve enregistrée |
| **Fabrication** | Tolérances, opérations, découpes, repérage, instructions atelier | ✅ toile (fiches de traçage, rouleau) ; ❌ bois |

**Une géométrie correcte ne veut pas dire** une structure qui tient, une toile étanche, un ouvrage durable ni un produit fabricable. Chaque domaine aura son propre statut.

---

## 5. Modèle métier : l'existant face à la cible

La cible reprend les objets proposés par l'audit Q1–Q8 et le dossier V1-3. Chacun est confronté à ce qui existe. Règle : **d'abord une enveloppe autour de l'existant, à résultats identiques, ensuite seulement une migration.**

| Objet cible | Rôle | Existe aujourd'hui sous la forme | Écart |
|---|---|---|---|
| **Project** | Identité, produit, paramètres, version de format, provenance | Rien pour Base et Cover+ ; état Design seul (`coverplus-design-v1`, `version: 1`) | ❌ tout est à créer ; c'est la base de la sauvegarde, du devis et du comparateur |
| **DomeGeometry** | Géométrie et métriques d'un dôme, empreinte des entrées | `DomeEngine.generateDome()` ; `ds.nominal`, `ds.cloth`, `ds.struct`, `ds.dome` ; `DomeState.key()` | ✅ contenu présent ; ⚠️ pas de contrat écrit ni d'identifiant stable |
| **FabricSpec** | Laize, lisière, marges, ourlet, rangée du bas (figé) | `DomeState.fabricFromInputs()` → `ds.fabric` (figé) | ✅ quasiment acquis |
| **FabricPiece** | Patron théorique d'un morceau, traçable jusqu'aux faces | Fiche `pieceSheet()` + `applyAllowances()` (points, bords, plis, triangles, contour de coupe, `check.flat`) | ⚠️ existe sans contrat ; identifiant = nom d'affichage |
| **NestingPlacement** | Position d'un morceau sur le rouleau | `Nesting.nest().placed` | ✅ séparé du patron (à garder ainsi) |
| **FabricationResult** | Morceaux + rouleau + contrôles + statut + empreinte | `ensureEtages()` et caches de `app.js` | ⚠️ dispersé dans l'interface |
| **ValidationStatus** | Niveau, domaine, raisons, contrôles, preuves, version des règles | `Status.geometry()`, `Status.fabrication()` → `{ level, reasons }` | ⚠️ niveau et raisons seulement |
| **Reference / Evidence** | Référence externe ou preuve d'atelier, avec provenance | `data/references/antiprism/…json` ; le reste en dur dans `status.js` et dans les tests | ❌ à créer (Domerama, essais d'atelier) |
| **Component / Assembly** | Pièce physique (montant, connecteur, panneau), assemblage, nomenclature | Débit Quadrisphère seulement | ❌ à concevoir avec Nathan (bois, connecteurs, quincaillerie) |
| **StructuralCase** | Hypothèses de charges et résultats mécaniques | — | ❌ hors périmètre tant qu'on n'a pas de méthode validée |

---

## 6. Validation : principe directeur

1. **Un statut par domaine** : géométrie, toile, ouvertures, structure, étanchéité, aménagement. Un domaine sans contrôle affiche « non évalué », **jamais vert par défaut**.
2. **Le vert exige une preuve enregistrée** : référence indépendante (Domerama, Antiprism) ou essai d'atelier daté, avec la configuration exacte et les tolérances.
3. **Le 🔴 bloque toujours** les documents de fabrication (règle actuelle conservée).
4. **Une option déconseillée reste visible**, avec avertissement et sans document de fabrication (ADR-0002).
5. **La première preuve d'atelier attendue** est la toile cousue par Nathan avec les patrons de l'appli. Il faut décider à quoi elle s'appliquera : un morceau, un type de gabarit, ou le dôme entier (D6).

---

## 7. Architecture cible, confrontée au code

L'architecture du dossier V1-3 est une **hypothèse** ; voici où elle en est réellement.

| Moteur proposé | Existant (0.9.13) | Prochaine marche raisonnable |
|---|---|---|
| Project Core | `dome-state.js` (état courant, pas de projet) | Format `Project` v2 + migration de `coverplus-design-v1` |
| Geometry Engine | `dome-engine.js`, `quadri-geom.js`, `ouvertures.js`, `unfold.js` | Contrat `DomeGeometry` ; export Node de `quadri-geom` + test chiffré |
| Structural Engine | — | Aucune marche avant une décision sur la méthode et les responsabilités (D7) |
| Envelope Engine | `textile/*` (toile) | Garder ; ajouter les contrôles d'étanchéité comptés (ADR-0002) au statut |
| Opening / Joinery Engine | `ouvertures.js` (tracé seulement) | Lot ouvertures déjà décrit par Nathan ; renforts → à relier à Structural |
| Assembly Engine | — (débit Quadrisphère) | Liste de débit des montants du dôme (bois, angles de coupe) |
| Habitat / Equipment Engine | `design.js`, `designui.js` | Contrôles de chevauchement et de dégagement ; puis Kumiko (fiches 002 et 003) |
| Validation Engine | `status.js`, `Status.gate` | Statut enrichi (domaine, preuves, version) + références en données |
| Manufacturing Engine | `export.js`, `plan-rules.js`, `nesting.js`, `optim.js` | Garder ; plus tard débit bois |
| Business Engine | — | Après la mesure du temps de couture par Nathan |
| Visualization | `app.js` (Canvas 2D), `design3d-three.js`, `design3d.js`, `view2d.js`, `quadri-ui.js` | Mesurer sur la tablette avant d'unifier |

---

## 8. Feuille de route et gouvernance

- Feuille de route de migration : `ROADMAP-MIGRATION.md`.
- Gouvernance : ADR-0003 en vigueur ; évolution proposée dans `PROPOSITION-GOUVERNANCE-MODULAIRE.md` (non adoptée).
- Décisions en attente : `DECISIONS-A-PRENDRE.md`.
