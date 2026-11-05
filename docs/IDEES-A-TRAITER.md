# Idées à traiter — base de travail des prochaines versions

Carnet d'idées de Nathan, à reprendre version après version. **Toute nouvelle idée de Nathan s'ajoute ici** (même pas encore mûre), avec la date, ce qui est décidé, et les questions encore ouvertes. Une idée réalisée passe en bas (« Fait »), avec la version.

Règle de tri : **étanchéité avant tout** (ADR-0002) — faisabilité technique → performance → écoulement des eaux → étanchéité, puis présentation, esthétique, économie.

Statuts : 💡 idée · ❓ questions ouvertes · ⏸ en suspens · 🛠 en cours · ✅ fait

---

## 1. Pivoter / retourner un gabarit sur une chute de toile — ⏸ en suspens (30/10/2026)

**Besoin** : dans la fiche d'un morceau, pouvoir le retourner (symétrie) ou le faire pivoter autour d'un point, pour le placer sur une chute de travers, et obtenir la **fiche de traçage selon l'angle réel de pose** sur la toile.

**Points de vigilance (ADR-0002)**
- **Miroir** : la toile a un endroit. Tracé en miroir sur l'endroit, le morceau devient « l'autre main » et ne se pose plus. Juste seulement s'il est tracé **sur l'envers** (comme le gabarit retourné ⇋ actuel).
- **Rotation / droit-fil** : une toile tissée se déforme en biais (un torchon tiré en diagonale). Un morceau posé de travers peut gondoler, tirer sur les coutures et former des plis où l'eau stagne → seuils d'avertissement et de blocage à prévoir.

**Questions ouvertes ❓**
1. Le miroir se trace-t-il sur l'**envers** de la toile ?
2. Tolérance d'angle par rapport au droit-fil pour la toile acrylique (Dickson Orchestra) : seuil d'avertissement ? seuil de blocage (sans fiche de traçage) ?
3. Repère sur la chute : lisière restante, bord coupé droit, ou ligne tracée au cordeau ?
4. Pivot : angle tapé en degrés ou poignée à tourner ? Centré sur un point P choisi ou sur le centre du morceau ?

---

## 2. Mode client / mode expert, devis et documents publics — 💡 (30/10/2026)

**Besoin** : les plans montrés à l'extérieur (devis, tout document public) **diffèrent** des plans internes de l'atelier Nomadome Design, pour éviter le **rétro-engineering** par la concurrence. Image : la photo du plat sur la carte du restaurant, la recette reste en cuisine.

**Décidé (Nathan, 30/10/2026)**
- Deux modes : **client** (présentation) et **expert** (atelier), comme prévu pour Nomad Vision (déverrouillage par code PIN court).
- Sur le **devis** apparaît la vue de la découpe « ⛔ Gabarits alignés sur les axes » (pelure en 5 quartiers droits) — **jamais** la découpe réelle de fabrication (« Moins de gabarits », coutures décalées).
- Nathan fournira un **devis type déjà envoyé** : le futur devis de l'appli se calera sur son design.

**Questions ouvertes ❓**
1. Infos publiques : uniquement l'image, sans cotes ni nœuds ? Ou aussi des chiffres généraux (diamètre, hauteur, surface de toile en m²) ?
2. En mode client, masquer tout ce qui est fabrication (vraie découpe, cotes, fiches de traçage, CSV, plan de coupe) et ne le déverrouiller qu'avec le code PIN ?
3. D'abord une simple **image exportable** à coller dans les devis, ou directement l'export de devis complet ?
4. Mention sous l'image, proposée : « vue d'illustration, découpe réelle différente » (un devis engage : éviter qu'un client conteste une toile différente du plan). À valider.

**En attente** : devis type de Nathan.

---

## 3. Panneaux Kumiko dans l'aménagement Design — ✅ aperçu fait en 0.9.15 · 💡 liste de débit à venir (30/10/2026, mis à jour le 01/11/2026)

**Besoin** : intégrer les panneaux décoratifs Kumiko (lattes de bois assemblées en motifs japonais, posées dans les triangles) comme **option de l'aménagement Design** (`src/products/habitat/`), pas comme produit séparé. Vocabulaire conservé : kumiko, waku (cadre), jigumi (grille), tsukeko (pièces du motif).

**Décidé (Nathan, 30/10/2026)**
- Kumiko est une option de Design.
- Point de départ : le moteur et les tests Kumiko du projet Claude « Acidome Cover+ » — ils fonctionnaient ; voir s'ils peuvent être améliorés avant intégration.
- Mission pilote de la gouvernance multi-IA (ADR-0003), découpée en deux fiches : NOMAD-2026-002 (moteur seul, niveau Technique) puis NOMAD-2026-003 (interface Design, niveau Visuel avec revue Gemini).

**Décidé (Nathan, 01/11/2026)**
- Panneaux posés **triangle par triangle** sur le dôme (fenêtres, motifs choisis).
- Première version (NOMAD-2026-003) : **aperçu seulement** — motif visible sur le dôme et plan de chaque panneau, cotes indicatives (🟠). La liste de débit viendra avec les sections réelles des lattes.
- Moteur NOMAD-2026-002 fusionné dans `main`, interface NOMAD-2026-003 publiée en 0.9.15.
- Revue visuelle Gemini **reportée** à une étape plus avancée du projet ; dossier de revue prêt (captures + questions).

**Bilan du moteur (NOMAD-2026-002, 01/11/2026)**
- Juste pour ce qu'il fait : motif défini une fois en barycentriques, projeté sur le triangle réel ; biseaux recalculés sur le vrai triangle (sur la référence 3V Ø 5 m, ils vont de 25° à 35°, pas 30° partout). 25 tests sur 25.
- **Cotes d'axe à axe** : lattes, cadre (waku) et montants sont traités comme des traits sans épaisseur. Les longueurs de coupe réelles seront plus courtes (de l'ordre de la largeur de latte divisée par le sinus de l'angle de rencontre). → À corriger avant toute liste de débit.
- Le panneau prend le triangle **nœud à nœud** ; le vrai cadre se loge entre les montants (triangle réduit de la demi-section du montant). → Idem.
- Unités en mm (le reste de l'appli est en mètres, ADR-0001 § 7) : conversion faite à l'entrée et à la sortie du moteur, sans le modifier.
- Motifs validés : mitsukude (grille seule), asa-no-ha. À définir avec Nathan avant usage : goma, rindō, kikkō.
- Exemple, référence 3V Ø 5 m, asa-no-ha densité 2 : 12 tsukeko par panneau, de 224 à 314 mm selon le triangle (T1, T2, T3).

**Questions ouvertes ❓**
1. Sections réelles : largeur et épaisseur des lattes, section des montants (pour passer de l'aperçu à la liste de débit).
2. Définition des motifs goma, rindō, kikkō.

## 4. Ouvertures « intelligentes » : porte d'aplomb, sas, tunnel géodésique, efforts, menuiserie — 🛠 étape 1 en cours (01/11/2026)
Outil **didactique** : chaque calcul explique ce qu'il fait (retour de connaissances).

**Décidé (Nathan, 01–02/11/2026)**
- « Ajouter une porte » : porte posée **d'aplomb** (verticale), alignée sur la structure ; calcul de la structure **à l'aplomb du haut de la porte** (linteau → montants du dôme) pour créer sas, raccord ou fermeture.
- Deux options par porte : **sas vers l'intérieur** du dôme, ou **avant-corps vers l'extérieur** ; l'extérieur peut aller jusqu'à un **sas vestiaire** (ex. 2,50 m).
- **Tunnel géodésique** : on « tire » la forme de l'ouverture choisie (ex. pentagone) comme le pousser-tirer de SketchUp → prisme droit, longueur réglable, dehors ou dedans.
- **Efforts** calculés, affichés 🟠 indicatifs (pas une note d'ingénieur).
- **Bibliothèque de menuiserie** didactique.
- Le **kit d'essai** n'est pas à faire.

**Plan** : 1) porte d'aplomb + cadre jusqu'aux montants (NOMAD-2026-005) · 2) tirer l'ouverture en tunnel · 3) montants, toile et raccords du tunnel · 4) efforts indicatifs et bibliothèque de menuiserie.

**Étape 1 — premiers résultats (moteur `src/geometry/door.js`, 26 tests)**
- Sur la référence 3V Ø 5 m, une porte 0,90 × 2,00 m demande une ouverture de 9 triangles (seuil d'un seul montant B, 956 mm). Hauteur maxi pour 0,90 de large : 2,37 m.
- Au-dessus du linteau, le cadre du dôme est **en retrait d'environ 0,90 m** derrière le plan de la porte (la paroi penche) : la fermeture n'est donc pas un simple tympan plat, c'est un petit « toit » de 0,9 m de profondeur — ou bien on recule la porte (sas intérieur).

**Structure 3D de la porte (demande du 02/11/2026)** — modélisée dans la 3D de l'onglet Base, aperçu 🟠, section 45 × 70 mm en attendant les vraies : huisserie, chevêtre posé sur le linteau avec ses 2 appuis jusqu'au dôme, potelets, rampants (bord haut dans le plan de porte), chevrons horizontaux jusqu'aux montants du dôme, toit de l'avant-corps. Chaque chevron et appui finit sur un montant du cadre (vérifié par test). Longueurs d'axe, sans les coupes d'assemblage.

**Choix constructifs, raccords, bibliothèque (demande du 02–03/11/2026)**
- Tenue de l'avant-corps au choix : poteaux d'angle + lisses basses (défaut) · parois latérales fermées · porte-à-faux (⛔ déconseillé, avertissement, pas de document de fabrication).
- Accroche au dôme au choix, pièce par pièce : appuis et chevrons « sur le montant » (n'importe où) ou « sur un nœud seulement » (contrefiches).
- **Aucune pièce volante** : chaque bout de pièce est classé (sol, nœud du dôme, montant du dôme, autre pièce : angle, T, oblique, posé sur) ; le logiciel vérifie que chaque pièce rejoint le sol ou le dôme par une chaîne de raccords (testé sur 72 combinaisons : 2 diamètres × 3 reculs × 3 tenues × 2 × 2 accroches).
- Bibliothèque `src/fabrication/joinery.js` : 14 fiches didactiques 🟠 (analogie, quand, limites, outillage, étapes, schéma) — bois-bois (tenon-mortaise, mi-bois, embrèvement, entaille), quincaillerie (sabot, équerre, vis structurelle, boulon), dôme (platine sur nœud, moisage, cale biaise), sol (pied de poteau, platine sur plancher, lisse ancrée). Un assemblage choisi par famille de raccord ; les moises se dessinent en 3D.
- Questions : sections réelles ; type de connecteur des nœuds (pour la platine) ; ancrage au sol réel (dalle, plots, terrasse).

**Questions ouvertes ❓**
1. ✅ Position du plan de porte : réglée porte par porte (curseur de recul) — décision du 02/11/2026.
2. ✅ « Ajouter une porte » dans l'onglet Base, sous chaque ouverture fermée par le sol — décision du 02/11/2026.
3. Sections des bois de l'huisserie (dormant, linteau, potelets).

---

## 6. Sas d'entrée : l'ouverture prolongée en tunnel — 🛠 aperçu fait (NOMAD-2026-007, 03/11/2026)
Demande de Nathan : l'option sas d'entrée, avec une deuxième porte ; le sas doit pouvoir être un prolongement de l'ouverture faite dans la structure du dôme (étape 2 du plan « ouvertures intelligentes »).

**Fait (aperçu 🟠)** — dans la fiche porte (onglet Base), choix « Sas : aucun · vers l'extérieur · vers l'intérieur »
- Prisme droit : la forme de l'ouverture (ramenée sur le plan de la porte) est prolongée à l'horizontale, perpendiculaire à la porte, sur une longueur réglable (2,50 m par défaut, 0,60 à 6 m).
- Une panne part de chaque nœud du contour de l'ouverture (raccord au nœud du dôme) jusqu'au bout du sas ; cadres de la même forme tous les 1,20 m (réglable) ; huisserie, chevêtre et potelets pour chaque porte ; porte 2 réglable (largeur, hauteur, décalage) et vérifiée dans la section.
- Quantités : section, volume, couverture (toit + parois), plancher du sas, pignon et cloison. Toujours « aucune pièce volante » (raccords contrôlés).
- Toit et parois dessinés en toile ; avec un plancher sur pilotis, des pilotis sous chaque cadre du sas extérieur.

**Toile, charges, Cover+ (demande du 03/11/2026 : « les 3 ») — fait (aperçu 🟠)**
- Toile du sas (`src/textile/sas-toile.js`) : chaque face plate du tunnel déroulée en trapèze ; surplus (coutures A/B, ourlet de pied, couture avec le pignon ou ourlet sur l'huisserie) ; **rabat de 100 mm sous la toile du dôme** le long de chaque montant du cadre ; recouvrements dans le sens de l'eau (la pièce du haut par-dessus) et bande de faîtage ; pignon autour de la porte 2 (en lés si plus large que la laize) ; consommation de rouleau. Sas intérieur : toile seulement entre la porte 1 et les montants.
- Charges du sas (bois, toile, plancher, occupation, neige) : dans la fiche porte ; avec un plancher, réparties sur les pilotis du sas et comptées dans la portance.
- Cover+ : patrons du sas sous les ouvertures, sas dessiné dans la 3D. Pas encore : placement sur le rouleau avec le dôme (nesting) ni fiches de traçage / export.

**Présence dans les onglets (vérifiée le 03/11/2026, tests navigateur)**
- Base : réglages, calculs, 3D. Design : 3D et plan (sol du sas, pannes, portes P1 / P1·2, pilotis en pointillé). Informations : récapitulatif (pièces, sas, plancher, charges). Cover+ : patrons de la toile du sas et sas en 3D. Quadrisphère : sans objet.

**Questions ouvertes ❓**
1. Forme : avec une ouverture étroite au sol (9 triangles, seuil de 956 mm), le sas s'évase vers le haut — garder cette forme exacte, ou proposer aussi un sas rectangulaire calé sur l'ouverture ?
2. Toile du sas et raccord étanche avec la toile du dôme (étape 3).
3. Charges du sas (neige, vent) et pilotis comptés dans la portance.

---

## 5. Plancher et soubassement du dôme — 🛠 aperçu fait (NOMAD-2026-006, 03/11/2026)
Demande de Nathan : l'option plancher, avec des choix combinables.

**Décidé (Nathan, 03/11/2026)**
- Soubassement **pilotis** : 15 pilotis sous les nœuds de base (rangée extérieure) + **calcul de charge et de portance**.
- Soubassement **pentagone + triangle central** : un sommet du pentagone tous les 3 nœuds de base ; 2ᵉ rangée de pilotis au milieu de chaque côté du pentagone et sous les 3 pointes du triangle ; le petit triangle (cercle de Ø 1 à 1,5 m) reprend les charges de tout le « camembert ».
- Plancher **plein** ; plancher **en étoile** (triangles qui suivent la géodésie, 2 modèles, pièce centrale pleine de Ø 0,80 à 1 m).
- Plancher **en diaphragme** : plus tard.
- Toutes les combinaisons soubassement × plancher.
- Fondations, procédé de Nathan : décaisser 15 à 30 cm jusqu'au sol rocheux, géotextile, gravier de nivellement, bloc béton 39 × 29 × 19 couché, puis blocs 39 × 19 × 19 selon le terrain ; **toujours au moins 30 cm de vide ventilé**.

**Fait dans l'aperçu** (`src/products/habitat/floor.js`, fiche dans l'onglet Base, dessin 3D)
- Plan vu de dessus, quantités, empilement de blocs par pilotis selon la pente (blocs entiers au point le plus haut, calage ailleurs), charges par zone d'influence (dôme, neige, plancher, occupation, blocs) et pression sous le bloc de 39 × 29 comparée à un sol choisi (roche, grave, argile) — 🟠 ordres de grandeur.
- Plancher plein : les solives parallèles ont une portée libre de 3,9 à 4,7 m sur le dôme de référence → signalé ; il faudra une poutre de reprise.

**Questions ouvertes ❓**
1. Sections réelles : poutres (ceinture, pentagone, triangle), solives, panneaux ; aujourd'hui 75 × 195 et 45 × 145 provisoires.
2. Plancher plein : quelle poutre de reprise (sous quel axe, sur quels pilotis) ?
3. Charges à retenir : neige du site, poids réel du dôme (section des montants, toile), occupation.
4. Porte + plancher sur pilotis : les poteaux de l'avant-corps doivent descendre sur leurs propres pilotis (pas encore relié).
5. Plancher en diaphragme.

---

## 7. Refonte de l'interface : mode Atelier + mode Présentation — ❓ maquettes à valider (03/11/2026)
Demande de Nathan : « une version orientée UI, une belle interface », sur toute l'application, avant de valider la 0.9.17.

**Décidé (03/11/2026)** : deux modes, avec un bouton pour passer de l'un à l'autre.
- **A — Atelier bois** (pour travailler) : bandeau de navigation en noyer à gauche (onglets = outils), fond contreplaqué clair, actions en vert forêt ; 3D en grand au centre avec un **mètre pliant** gradué (échelle réelle) ; réglages à droite en sections dépliables ; chiffres clés en bandeau sous la vue. Police Barlow (embarquée, hors ligne).
- **C — Vitrine client** (pour montrer) : 3D plein écran, une phrase et trois chiffres parlants, options en pastilles, « Préparer le devis » ; les réglages techniques sont masqués.
- B (Pro technique) écarté.
- Maquettes : `docs/maquettes/ui-2026-11/` (A1 Base, A2 Cover+, A3 Design, C1 Votre dôme, C2 Aménagement, B pour mémoire).

**Mise à jour (04/11/2026)** : trois niveaux d'interface — **Développeur** (l'actuelle, la plus simple et détaillée ; seul changement : faire défiler les options en gardant le dôme visible, cadres de la vue et des options réglables), **Atelier = maquette B**, **Client = maquette C**. Brouillon de mission : `docs/maquettes/ui-2026-11/NOMAD-2026-008-fiche.md`.

**Questions ouvertes ❓**
1. Validation des maquettes A et C (écrans Base, Cover+, Design ; Quadrisphère et Informations suivront le même modèle).
2. Mode Présentation : quels onglets montrer au client (Votre dôme, Toile, Aménagement, Pavillon) et le bouton « Préparer le devis » (le devis n'existe pas encore : idée n° 2).
3. ✅ Revue visuelle Gemini avant de coder (décision du 03/11/2026) — paquet : `docs/maquettes/ui-2026-11/REVUE-GEMINI.md`.

---

## 8. Rendus plus beaux : ambiances, aménagement approfondi, ouvertures optimisées — 🛠 étapes 1 à 3 en cours (04/11/2026)

**Besoin** : des rendus 3D plus esthétiques avec des **choix d'ambiance**, un aménagement intérieur plus poussé (ossature CLS + mobilier, liste de débits et angles « façon SketchUp »), des ouvertures pensées avec le soleil. Réutiliser des briques existantes plutôt que tout développer.

**Décidé**
- Étape 1 (branche `feature/ambiances-rendu`) : menu « Ambiance » du rendu réaliste — plein jour, matin, coucher de soleil, ciel couvert, nuit (lampe intérieure). Tout calculé avec le ciel Three.js déjà intégré : **aucun fichier d'image**, reste hors ligne (les ciels HDRI Poly Haven auraient ajouté ≈ 1,5 Mo chacun).
- Matériaux de l'aménagement : CLS sapin blanc raboté (38 × 63 à 38 × 235), OSB, multiplex, Agepan ; fournisseur de référence Bourguignon Bois (longueurs CLS 2,10 à 5,40 m suivant stock).
- Briques repérées (licences à vérifier) : SunCalc (soleil → ouvertures), three-bvh-csg (découpes 3D), pmndrs postprocessing, three-gpu-pathtracer (images finales), OpenCutList et DomeCalc (débits), Blueprint3D (inspiration).

- Étape 2 (branche `feature/soleil-ouvertures`, 04/11/2026) : barre « Site et soleil » — lieu par ville (liste intégrée, hors ligne), nord sur le plan (flèche tournée à l'écran et à l'impression, gardé dans l'aménagement), soleil réel par date et heure belge, arcs du 21 décembre et du 21 juin, carte des faces (bilan fenêtres hiver − été, soleil d'hiver, soleil d'été) et lecture « meilleurs côtés ». Statut 🟡 calculé : rayonnement direct par ciel clair, sans ombre du terrain ni des arbres.
- Critères de Nathan pour les ouvertures (04/11/2026) : lumière en hiver, pas de surchauffe l'été, ventilation, vue — les quatre comptent.
- Étape 3 (branche `feature/aeration`, 04/11/2026) : barre « Aération » — coupole zénitale = pentagone du sommet (reconnue dès 60 % de la hauteur), porte = ouverture fermée par le sol, fenêtre sinon ; case « ouvrable » par ouverture (porte et coupole cochées, fenêtres fixes par défaut), gardée dans l'aménagement ; renouvellements d'air par effet cheminée (été ΔT 3 °C, mi-saison ΔT 10 °C), dimensionnement des entrées basses pour un objectif (5/h par défaut), alerte d'équilibre, rappel pluie quand la coupole est ouvrable (avertir seulement, choix de Nathan), flèches d'air en 3D. Statut 🟡 calculé : sans vent. Part ouvrante par ouverture (5 à 100 %, 100 % par défaut) pour une coupole à charnière ou une fenêtre à soufflet, gardée dans l'aménagement (05/11/2026).

**Questions ouvertes ❓**
1. Mémoriser l'ambiance choisie avec l'aménagement ?
2. Vue : repère du paysage sur le plan ? Part ouvrante typique de la coupole Nomad'Om (charnière ou soulevée sur le tour) pour la proposer par défaut ?
3. Ajouter les ombres du terrain (arbres, bâtiments) ? Une ville absente de la liste : coordonnées GPS en option ?
4. Formats exacts des panneaux chez Bourguignon Bois (OSB, multiplex, Agepan).

---

## Fait
- ✅ 0.9.16 — Porte d'aplomb (NOMAD-2026-005, étape 1) : calcul, structure 3D, choix constructifs, raccords sans pièce volante, bibliothèque de 14 assemblages (aperçu 🟠).
- ✅ 0.9.15 — Kumiko dans le Design, aperçu (NOMAD-2026-002 moteur, NOMAD-2026-003 interface) : pose triangle par triangle dans la 3D, tableau et plan du panneau, statut 🟠.
- ✅ 0.9.14 — M1 : données sûres dans l'aménagement Design (imports .json et .glb contrôlés, texte échappé, sauvegarde illisible mise de côté).
- ✅ 0.9.13 — A10 : architecture restructurée (objet dôme unique, calculs dans des modules testés, interface < 2 000 lignes) ; Ø affiché = Ø calculé.
- ✅ 0.9.12 — Pelure « 5 fentes — suivant les gabarits (zigzag) » ; découpe « axes » gardée avec avertissement et sans document de fabrication ; ADR-0002 étanchéité avant tout.
