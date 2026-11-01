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

## 3. Panneaux Kumiko dans l'aménagement Design — 🛠 en cours (30/10/2026, mis à jour le 01/11/2026)

**Besoin** : intégrer les panneaux décoratifs Kumiko (lattes de bois assemblées en motifs japonais, posées dans les triangles) comme **option de l'aménagement Design** (`src/products/habitat/`), pas comme produit séparé. Vocabulaire conservé : kumiko, waku (cadre), jigumi (grille), tsukeko (pièces du motif).

**Décidé (Nathan, 30/10/2026)**
- Kumiko est une option de Design.
- Point de départ : le moteur et les tests Kumiko du projet Claude « Acidome Cover+ » — ils fonctionnaient ; voir s'ils peuvent être améliorés avant intégration.
- Mission pilote de la gouvernance multi-IA (ADR-0003), découpée en deux fiches : NOMAD-2026-002 (moteur seul, niveau Technique) puis NOMAD-2026-003 (interface Design, niveau Visuel avec revue Gemini).

**Décidé (Nathan, 01/11/2026)**
- Panneaux posés **triangle par triangle** sur le dôme (fenêtres, motifs choisis).
- Première version (NOMAD-2026-003) : **aperçu seulement** — motif visible sur le dôme et plan de chaque panneau, cotes indicatives (🟠). La liste de débit viendra avec les sections réelles des lattes.
- Moteur NOMAD-2026-002 fusionné dans `main` (hors HTML assemblé tant que l'interface n'est pas faite).

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

---

## Fait
- ✅ 0.9.14 — M1 : données sûres dans l'aménagement Design (imports .json et .glb contrôlés, texte échappé, sauvegarde illisible mise de côté).
- ✅ 0.9.13 — A10 : architecture restructurée (objet dôme unique, calculs dans des modules testés, interface < 2 000 lignes) ; Ø affiché = Ø calculé.
- ✅ 0.9.12 — Pelure « 5 fentes — suivant les gabarits (zigzag) » ; découpe « axes » gardée avec avertissement et sans document de fabrication ; ADR-0002 étanchéité avant tout.
