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

## 3. Marge de coupe = largeur de l'équerre (30 mm) — 💡 (30/10/2026)

**Constat** : en atelier, Nathan trace la marge avec son équerre de **3 cm** de large, parallèle à la ligne de couture ; il utilise peu les points de coupe C. L'appli calcule par défaut avec 20 mm (couture simple) : contrôle de laize et placement sur le rouleau faits avec une marge plus petite que la réalité.

**Décidé** : à voir plus tard ; idée retenue = une marge **réglée automatiquement comme point de repère** (largeur de l'équerre), **modifiable** selon la laize disponible et la largeur des rouleaux.

**Questions ouvertes ❓**
1. 30 mm partout (A et B), ou seulement côté B / seulement là où il trace à l'équerre ?
2. Si un morceau ne tient plus dans la laize à 30 mm : réduire la marge sur ce morceau (comme déjà fait pour la rangée du bas) ou changer la découpe ?

---

## Fait
- ✅ 0.9.12 — Pelure « 5 fentes — suivant les gabarits (zigzag) » ; découpe « axes » gardée avec avertissement et sans document de fabrication ; ADR-0002 étanchéité avant tout.
