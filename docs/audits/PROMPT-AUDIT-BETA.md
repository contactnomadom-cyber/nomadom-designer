# MISSION — AUDIT ARCHITECTURAL ET PLAN D'ÉVOLUTION DE NOMAD'OM DESIGNER BETA

## 0. TON RÔLE

Tu es un expert senior dans les domaines suivants :

- géométrie des dômes géodésiques ;
- calcul numérique et géométrie 3D ;
- polyèdres et subdivisions géodésiques ;
- patrons textiles développables ;
- couture industrielle et calepinage ;
- optimisation de découpe ;
- JavaScript / Node.js ;
- architecture logicielle ;
- applications web autonomes ;
- visualisation 3D ;
- conception de logiciels métier pour la fabrication.

Tu travailles sur un logiciel réel destiné à un fabricant professionnel de dômes géodésiques.

Ton rôle n'est PAS de simplement améliorer l'interface.

Ta mission est de déterminer si les fondations techniques actuelles peuvent supporter l'évolution vers un véritable logiciel métier de conception et fabrication de dômes.

---

# 1. CONTEXTE DU PROJET

Le logiciel s'appelle actuellement :

**Nomad'Om Designer Beta** (version bêta 0.9 du 30/10/2026)

Il remplace le prototype **Cover+**. Le nom « Cover+ » reste celui de son module toile (onglet Cover+).

Il fait partie d'un projet plus large appelé :

**Nomad'Om Geodesic Dome Designer**

Il est développé pour Nomad'Om, fabricant belge de dômes géodésiques en bois et de leurs enveloppes textiles.

Le logiciel doit à terme permettre de passer de :

> « Je veux un dôme de 8 m, 3V, telle coupe, avec deux portes »

à :

> géométrie  
> → structure  
> → longueurs des montants  
> → nœuds  
> → surface  
> → panneaux textiles  
> → marges  
> → coutures  
> → patrons  
> → calepinage sur rouleau  
> → métrage  
> → optimisation  
> → fiches atelier  
> → aménagement intérieur  
> → devis  
> → dossier de fabrication.

L'objectif final n'est donc pas seulement de calculer un dôme.

C'est de construire progressivement un **logiciel métier complet pour la conception et la fabrication de dômes géodésiques**.

---

# 2. FICHIERS FOURNIS

Tu disposes normalement des fichiers suivants :

- `nomadom-designer-beta.html` (l'application complète)
- `dome-engine.js`
- `etages.js`
- `toile.js`
- `nesting.js`
- `optim.js`
- `export.js`
- `peel.js`
- `info.js`
- `design.js`
- `design3d.js`
- `design3d-three.js`
- `designui.js`
- `ACIDOME_CALC_221027.html`
- `VALIDATION.md`
- `VALIDATION-2V.md`
- `VALIDATION-BASE.md` (moteur élargi, 571 combinaisons comparées à Acidome)
- `ETAGES.md`
- `PROMPT-EVOLUTION.md`
- `AUDIT-NOTES.md`
- `t_beta.py`, `t_cover.py`, `t_design.py` (scripts de test)

Si un fichier manque :

1. indique-le immédiatement ;
2. explique exactement ce que cela t'empêche de vérifier ;
3. ne suppose pas son contenu.

---

# 3. RÈGLE ABSOLUE : NE MODIFIE PAS LE CODE AU DÉBUT

Phase 1 :

**AUDIT UNIQUEMENT.**

Ne modifie aucun fichier.

Ne réécris aucune fonction.

Ne propose pas immédiatement du code de remplacement.

Tu dois d'abord :

1. comprendre l'architecture ;
2. exécuter les tests possibles ;
3. vérifier les hypothèses ;
4. identifier les dépendances ;
5. identifier les hypothèses cachées ;
6. déterminer les limites de généralisation ;
7. proposer une architecture cible ;
8. proposer un plan d'évolution.

Toute modification du code devra être réalisée dans une phase ultérieure, après validation du plan.

---

# 4. PHILOSOPHIE FONDAMENTALE DU PROJET

La règle numéro 1 est :

## JUSTESSE AVANT FONCTIONNALITÉS.

Un résultat faux peut provoquer :

- une erreur de débit bois ;
- une erreur de patron ;
- une perte de plusieurs dizaines de mètres de tissu ;
- une mauvaise couture ;
- un mauvais montage du dôme ;
- une erreur de devis.

Il vaut donc mieux afficher :

> « Géométrie non validée — résultat refusé »

que produire un joli patron faux.

---

# 5. RÈGLE DE VALIDATION

Chaque résultat géométrique doit appartenir à l'une de ces catégories :

### 🟢 GÉOMÉTRIE VALIDÉE

La géométrie a été comparée à une ou plusieurs références indépendantes.

### 🟡 GÉOMÉTRIE CALCULÉE

La géométrie est mathématiquement calculée mais aucune référence indépendante suffisante n'a encore été trouvée.

Elle peut être utilisée pour la recherche mais PAS comme résultat de fabrication certifié.

### 🟠 FABRICATION NON VALIDÉE

La géométrie est validée mais les développements textiles / patrons / coutures ne sont pas encore validés pour cette géométrie.

### 🔴 NON SUPPORTÉ

Le logiciel ne possède pas de méthode validée pour ce cas.

Dans ce cas :

**le logiciel doit refuser clairement le calcul de fabrication.**

Il ne doit jamais inventer une valeur.

---

# 6. ARCHITECTURE CIBLE

Je veux que tu évalues la possibilité de transformer l'architecture actuelle en une architecture centrée sur un objet géométrique indépendant.

Conceptuellement :

```text
DomeGeometry
│
├── vertices
├── edges
├── faces
├── boundary
├── frequency
├── class
├── polyhedron
├── subdivisionMethod
├── correctionMethod
├── symmetry
├── orientation
├── cut
├── base
└── validationStatus
        │
        ├───────────────┐
        ↓               ↓
FabricGeometry       DesignGeometry
        ↓               ↓
Panels              Interior
        ↓
Sewing
        ↓
Nesting
        ↓
Manufacturing
        ↓
Reports / Exports
```

Ce schéma est une architecture cible, pas une obligation d'implémentation.

Tu dois déterminer si elle est pertinente, comment l'améliorer et comment migrer progressivement depuis l'architecture actuelle.

---

# 7. SÉPARATION FONDAMENTALE

Je veux que tu vérifies que les responsabilités suivantes peuvent être séparées :

## A. Géométrie

Responsable uniquement de :

- polyèdre ;
- subdivision ;
- vertices ;
- edges ;
- faces ;
- topologie ;
- orientation ;
- coupe ;
- base ;
- symétrie ;
- longueurs.

## B. Géométrie textile

Responsable de :

- regroupement des faces ;
- panneaux ;
- développement ;
- marges ;
- coutures ;
- formes de panneaux.

## C. Fabrication

Responsable de :

- tissu ;
- laize ;
- lisières ;
- marges ;
- tolérances ;
- nesting ;
- métrage ;
- pertes ;
- ordre de fabrication.

## D. Design

Responsable de :

- sol ;
- hauteur ;
- mezzanine ;
- portes ;
- fenêtres ;
- mobilier ;
- volumes habitables ;
- plans.

## E. Présentation

Responsable de :

- UI ;
- 3D ;
- exports ;
- impression ;
- rapport.

Un module ne doit pas recalculer ou supposer silencieusement ce qu'un autre module devrait lui fournir.

---

# 8. ANALOGIE IMPORTANTE

Considère le moteur géométrique comme les fondations d'une maison.

Les autres modules sont :

- charpente ;
- toiture ;
- plomberie ;
- électricité ;
- décoration.

Si chaque pièce a secrètement supposé que la maison est toujours une maison de 100 m² avec deux étages, l'ajout d'un troisième étage provoquera des erreurs partout.

Je veux donc que tu recherches précisément :

> Quelles parties de l'application supposent actuellement que le dôme est un 2V ou 3V, Icosaèdre, Pentad, base plate ou autre configuration particulière ?

---

# 9. GÉOMÉTRIE CIBLE

Une grande partie de cette cible est déjà calculée (voir section 18.3). Ton travail est d'établir ce qui est réellement **validé**, au sens de la section 5.

À terme Nomad'Om Designer doit pouvoir gérer :

## Fréquences

- 1V
- 2V
- 3V
- 4V
- 5V
- 6V

## Méthodes

- Chords
- Arcs
- Kruschke lorsque la correction est réellement validée
- éventuellement Mexican si tu juges son intérêt réel suffisant

## Polyèdres

Au minimum :

- Icosaèdre
- Octaèdre

Et éventuellement d'autres polyèdres si des références indépendantes sérieuses existent.

## Classe

Pour l'instant :

- Classe I

Classes II et III :

- hors périmètre immédiat.

## Symétries

À terme :

- Pentad
- Cross
- Triad

## Coupes

Toutes les fractions réellement disponibles et validées.

Le logiciel doit également pouvoir gérer :

- base plate ;
- coupe à hauteur libre ;
- orientation libre lorsque la géométrie le permet.

---

# 10. NE PAS CONFONDRE LES NOMS DE COUPES

Attention aux différences de terminologie entre :

- Acidome ;
- Domerama ;
- autres calculateurs.

Exemple connu :

le `7/12` d'Acidome peut correspondre à la géométrie appelée `5/9` chez Domerama dans certains cas.

Tu dois établir une table :

| Source | Nom | Géométrie réelle | Correspondance |
|---|---|---|---|

Ne jamais considérer deux noms comme identiques simplement parce qu'ils semblent similaires.

---

# 11. TESTS GÉOMÉTRIQUES OBLIGATOIRES

Les cas suivants doivent rester des tests de non-régression absolus :

## 3V Kruschke 5/9 — diamètre 5 m

Référence :

- 61 nœuds
- 165 montants
- 105 faces
- bord de 15 arêtes

Longueurs :

- 30 × A = 824,27 mm
- 35 × B = 955,73 mm
- 80 × C = 1053,72 mm
- 20 × D = 1102,64 mm

Rayons unitaires :

- A = 0.329706463356374
- B = 0.382290185640323
- C = 0.421488791193215
- D = 0.441056358833072

## 2V Chords 1/2 — diamètre 5,30 m

- 26 nœuds
- 65 montants
- 40 faces

Longueurs :

- 30 × A = 1448,31 mm
- 35 × B = 1637,79 mm

Rayons unitaires :

- A = 0.54653
- B = 0.61803

Ces tests doivent être conservés définitivement.

---

# 12. TOPOLOGIE À VÉRIFIER

Pour chaque géométrie :

- formule d'Euler ;
- nombre de vertices ;
- nombre d'arêtes ;
- nombre de faces ;
- chaque arête partagée correctement ;
- absence d'arêtes fantômes ;
- absence de faces dégénérées ;
- fermeture du maillage ;
- frontière correcte ;
- base correcte.

Vérifier notamment :

```text
V - E + F
```

et expliquer les éventuelles exceptions liées à la coupe.

---

# 13. BASE PLATE

Une attention particulière doit être portée à la notion de :

> « base plate ».

Ne jamais confondre :

- diamètre de la sphère ;
- diamètre géométrique ;
- diamètre de la base ;
- diamètre intérieur ;
- diamètre extérieur ;
- hauteur totale.

Dans l'interface, les noms doivent être explicites.

Par exemple :

```text
Diamètre géométrique : 5 000 mm
Diamètre au sol :     4 910 mm
Hauteur :             2 970 mm
```

et non :

```text
Ø : 5,00 m
```

sans précision.

---

# 14. MODULES TEXTILES

C'est une partie stratégique du logiciel.

Le résultat final doit pouvoir passer de :

```text
DomeGeometry
```

à :

```text
FabricGeometry
```

puis :

```text
Panel[]
```

Chaque panneau devrait pouvoir contenir conceptuellement :

- identifiant ;
- faces associées ;
- sommets ;
- arêtes ;
- classes d'arêtes ;
- longueur des arêtes ;
- angles ;
- voisins ;
- marges ;
- couture A ;
- couture B ;
- ourlet ;
- orientation ;
- repères ;
- coordonnées ;
- surface ;
- statut de validation.

---

# 15. DÉVELOPPEMENT EXACT

Le logiciel doit distinguer :

### Développement exact

Le panneau est réellement développable sans déformation.

### Développement approximatif

Le panneau implique une approximation ou une déformation.

### Non développable

Le logiciel ne doit pas prétendre fournir un patron exact.

Le terme « sans vague » doit être défini mathématiquement et ne pas être simplement un nom d'interface.

---

# 16. NESTING

Le module de calepinage doit être évalué pour :

- 105 faces ;
- ~400 faces ;
- fréquences supérieures ;
- différentes largeurs de rouleau.

Tester :

- temps de calcul ;
- consommation mémoire ;
- chevauchements ;
- rotations ;
- symétries autorisées ;
- pertes ;
- métrage.

Comparer réellement :

### moins de morceaux

contre

### moins de gabarits

contre

### moins de toile

contre

### triangle par triangle.

Ne pas supposer qu'une stratégie est meilleure sans mesure.

---

# 17. OPTIMISATION

Le module `optim.js` (stratégie « moins de toile ») cherche un compromis entre le métrage et le nombre de coutures.

Score minimisé = longueur de rouleau (m) + poids × nombre d'arêtes cousues. Le poids est la longueur de toile qu'on accepte de payer pour éviter une couture (10 cm par défaut).

Tu dois vérifier :

- que le score correspond bien à l'objectif métier (le coût d'une couture se mesure en temps d'atelier, pas seulement en toile) ;
- que la recherche trouve réellement mieux que « moins de morceaux » sur le métrage réel du rouleau, pas seulement sur la longueur « bout à bout » ;
- son temps de calcul : environ 3,4 s en 3V dans un navigateur sans carte graphique ; mesure-le en 4V, 5V et 6V ;
- qu'il ne bloque pas l'interface pendant le calcul ;
- qu'il donne le même résultat à chaque lancement (déterminisme).

Livre un tableau comparatif des quatre stratégies, pour au moins 3V 5/9 Ø 5 m, 2V 1/2 Ø 5,30 m, 4V et 6V, avec : morceaux, gabarits, arêtes cousues, toile coupée (m²), rouleau (m), utilisation (%), temps de calcul.

---

# 18. ÉTAT ACTUEL DE L'APPLICATION (30/10/2026)

Ce qui suit décrit la version **Nomad'Om Designer Beta 0.9**. Vérifie chaque point, ne le tiens pas pour acquis.

## 18.1 Forme

Un seul fichier HTML autonome (`nomadom-designer-beta.html`, environ 1,19 Mo), sans serveur ni internet. Il contient 14 scripts :

| Module | Rôle |
|---|---|
| `dome-engine.js` | Géométrie : polyèdre, subdivision, corrections, coupe, symétries, voisinages, classes d'arêtes |
| `etages.js` | Découpe de la toile par étages (anneaux de triangles), gabarits, fiche patron, contrôle de planéité |
| `toile.js` | Mode sans connecteur (GoodKarma), marges A/B, ourlet, contours de coupe |
| `nesting.js` | Placement sur le rouleau |
| `optim.js` | Stratégie « moins de toile » |
| `export.js` | Fiches de traçage imprimables (A4) |
| `peel.js` | Vue aplatie en « pelure d'orange » (fentes 1, 5, 5 décalées, 10, spirale) |
| `info.js` | Onglet Informations et aide derrière chaque « ? » |
| `design.js` | Aménagement : coupes horizontales, hauteur sous plafond, mezzanine, meubles, contrôles |
| `design3d.js` | Moteur 3D WebGL2 maison (secours) et lecture des modèles .glb |
| `design3d-three.js` | Rendu 3D de l'aménagement avec Three.js |
| `designui.js` | Interface de l'onglet Design |
| script principal | Interface des onglets Base, Cover+ et Informations |
| `threekit` | Three.js r169 empaqueté dans le fichier (environ 730 ko) |

## 18.2 Onglets

- **Base** : polyèdre (icosaèdre seulement), fréquence, classe (I seulement), méthode, symétrie (Pentad, Triad, Cross), découpage, base plate, diamètre, structure (avec connecteur ou GoodKarma, hauteur d'appui). Affiche la topologie, la liste des montants par classe (nombre, longueur, facteur de corde, total) et les types de triangles.
- **Cover+** (module toile) : laize, lisière, tolérance ; stratégie de découpe (moins de morceaux, moins de gabarits, moins de toile, triangle par triangle) ; rangée du bas en anneau ou en 5 morceaux ; coutures (simple, rabattue, recouvrement, personnalisé ; marges A et B ; ourlet). Vue 3D sélectionnable. Modes 2D : Triangle, Développer (groupe manuel), Étages, Plan de coupe (rouleau), Dôme complet, Fleur, Bandes/Gores, Vue aplatie. Fiche patron par morceau, export CSV, fiche de traçage imprimable. Image plaquée sur le dôme.
- **Design** (aménagement) : plan 2D par niveau, 19 éléments de mobilier, ouvertures au rez (porte, fenêtre, baie), mezzanine (3 formes), contrôles de place, surfaces et volume, rendu 3D Three.js, import .glb, export/import .json, impression des plans à l'échelle.
- **Informations** : comparatif des stratégies, explications de chaque réglage.

## 18.3 Géométrie déjà portée

D'après `VALIDATION-BASE.md` (à vérifier) :

- icosaèdre, classe I, fréquences **1V à 8V** ;
- méthodes **Chords**, **Arcs** (dès 3V), **Mexican** (dès 3V), **Kruschke** (3V et 4V ; en 2V, Kruschke revient à Chords) ;
- symétries **Pentad, Triad, Cross** ;
- toutes les fractions d'Acidome, plus la sphère entière ; base plate avec ou sans alignement lorsque c'est permis ;
- **571 combinaisons identiques** à Acidome, comparées par un script qui pilote l'Acidome d'origine dans un navigateur.
- Particularité reproduite volontairement : la méthode Mexican d'Acidome ne ramène pas les points sur la sphère (écart possible jusqu'à 0,18 mm si on les y ramène).

Pas encore porté : octaèdre, fullerènes, classes II et III.

## 18.4 Point de méthode essentiel

**L'accord avec Acidome prouve la fidélité du portage, pas la justesse géométrique.**

Image : recopier fidèlement un plan ne prouve pas que le plan est juste. Si Acidome se trompe, Nathan reproduit l'erreur à l'identique.

Selon ta grille de la section 5, une combinaison qui n'est confirmée **que** par Acidome est donc 🟡 « géométrie calculée ». Elle ne devient 🟢 « géométrie validée » qu'avec une référence indépendante (Domerama ou autre calculateur publié, ouvrage, calcul analytique). Seuls deux cas sont 🟢 aujourd'hui : 3V Kruschke 5/9 Ø 5 m et 2V Chords 1/2 Ø 5,30 m.

Pour chaque combinaison, indique son statut (🟢 🟡 🟠 🔴) et ce qui manque pour la faire monter d'un cran. Vérifie aussi si l'interface affiche ce statut à l'utilisateur. Aujourd'hui, elle ne semble pas faire de différence.

## 18.5 Hypothèses cachées déjà repérées

- `etages.js` : la rangée du bas « en 5 morceaux identiques » exige un nombre de triangles divisible par 5 ; les étages sont définis par la distance en arêtes depuis le sommet du dôme (sens douteux en Triad et Cross, ou si la base n'est pas plate).
- `peel.js` : les fentes réparties exigent un multiple de 5 ; d'après `VALIDATION-BASE.md`, la pelure se replie sur la vue en rangées en Triad, en Cross au-delà de l'hémisphère, et en Pentad 5V–6V avec la stratégie « morceaux ».
- Interface : libellés en dur (« 5 morceaux », « Pentad »).
- Design : coupes horizontales et hauteur sous plafond calculées depuis le point le plus bas ; à vérifier sur une base non plate.

## 18.6 Constats du pré-audit (version du 29/10, à reconfirmer)

| Constat | Type |
|---|---|
| 3V 5/9 Ø 5 m : Étages = 18 morceaux, 10 gabarits ; rouleau 50,31 m ; utilisation 65 % | Mesure |
| 2V 1/2 Ø 5,30 m : Étages = 30 morceaux ; rouleau 33,07 m ; utilisation 78 % | Mesure |
| « Moins de toile » 3V : 39 morceaux, environ 3,4 s ; métrage du rouleau non comparé | À compléter |
| GoodKarma 120 mm : patron agrandi de +4,3 à +5,3 % selon la classe | Mesure |
| Design 3V Ø 5 m : Ø au sol 4,91 m, hauteur 2,97 m, sol 18,4 m², debout 13,4 m², assis 18,1 m², volume 39,4 m³ | À recalculer |
| Design : aucun contrôle de chevauchement entre éléments (cinq meubles empilés au même endroit sont tous marqués « ✓ ») ; distance de sécurité du poêle dessinée mais pas contrôlée | Défaut probable |
| Design : chaque nouvelle ouverture arrive sur le côté 1 ; plusieurs ouvertures se superposent sans alerte | Défaut probable |
| Design : l'arrivée de l'escalier sur la mezzanine n'est pas contrôlée | Défaut probable |
| Design : mezzanine par défaut à 2,20 m, inutilisable dans le dôme de référence (0 m² assis) ; un avertissement s'affiche | Réglage par défaut |
| `design.js` : `clipRing()` est un bouchon (profondeur d'une mezzanine en secteur ignorée) | Inachevé |
| Design : noms d'éléments insérés dans la page sans échappement HTML (un .json importé peut injecter du code) | Sécurité |
| Ouverture de l'onglet Design : 6,9 s en rendu logiciel | Performance |
| Boutons « Marge », « Couture », « Symétrie », « Export SVG / DXF / CSV » encore grisés, alors que marges et CSV par morceau existent ailleurs | Incohérence |
| Les téléchargements (CSV, .json, plans) passent par des liens directs ; dans la page publiée sur claude.ai, ces liens ne fonctionnent pas (ils ne marchent qu'en ouvrant le fichier HTML en local) | Défaut d'usage |
| « Ø 5,00 m » désigne la sphère ; le sol d'un 3V 5/9 fait 4,91 m (voir section 13) | Clarté |

---

# 19. DESIGN (AMÉNAGEMENT)

Vérifie :

- les surfaces et le volume par un calcul indépendant (aire d'un polygone régulier, volume par tranches ou analytique) ;
- les contrôles de place : paroi, hauteur, chevauchement, dégagements de sécurité, arrivée de l'escalier, ouvertures superposées ;
- les ouvertures : position, largeur maximale par rapport au côté, estimation de la saillie du sas ;
- la mezzanine : les trois formes, secteur de plus de 180°, plancher trop haut ;
- la séparation entre `design.js` (logique pure) et `designui.js` (interface) ;
- l'utilité réelle de deux moteurs 3D (Three.js et le moteur maison) : faut-il garder les deux ?

---

# 20. QUALITÉ TECHNIQUE

Évalue :

- la structure et les couplages (qui appelle qui, qui recalcule ce qu'un autre a déjà calculé) ;
- les fonctions trop longues, les duplications, les variables globales ;
- la gestion des erreurs et des entrées invalides ;
- la sauvegarde dans le navigateur (clés, versions, migration des données) ;
- la sécurité des fichiers importés (.json, .glb) ;
- les performances : temps d'ouverture, de calcul, de rendu, mémoire ;
- la taille du fichier et le coût de Three.js ;
- la façon de construire le fichier HTML à partir des modules (reproductible ? scriptée ?).

---

# 21. MÉTHODE DE TEST

- Logique pure : sous **Node**, en chargeant les modules (ils exportent leurs fonctions avec `module.exports`).
- Interface : dans un **navigateur sans écran** (par exemple Playwright avec Chromium, option `--use-gl=swiftshader` pour avoir WebGL2), en cliquant comme un utilisateur et en relevant textes affichés, erreurs de la console et captures.
- Scripts existants à reprendre : `t_beta.py` (non-régression : 20 contrôles, tous réussis sur la Beta 0.9), `t_cover.py`, `t_design.py`.
- Chaque affirmation du rapport dit **comment** elle a été vérifiée (test, calcul, lecture du code) ou porte la mention **« non vérifié »**.
- Si tu ne peux pas exécuter de code, dis-le dès le début, et marque chaque point « lu dans le code ».

---

# 22. LIVRABLES

1. **Résumé** en 10 lignes maximum : verdict sur les fondations, trois forces, trois risques.
2. **Audit**, avec une gravité par constat :
   - **Bloquant** : résultat faux qui peut finir dans une toile coupée ou un montant débité ;
   - **Majeur** : fonction cassée ou trompeuse ;
   - **Mineur** : gêne, inachevé ;
   - **Info** : remarque.
3. **Tableau module × hypothèse cachée** : risque et ligne de code concernée.
4. **Tableau des combinaisons géométriques** : fréquence × méthode × polyèdre × symétrie × coupe, avec le statut 🟢 🟡 🟠 🔴, la source et ce qui manque.
5. **Table de correspondance des noms de coupe** (section 10).
6. **Tableau comparatif des stratégies de découpe** (section 17).
7. **Avis sur l'architecture cible** (section 6) : pertinence, améliorations, chemin de migration progressif sans casser l'existant.
8. **Plan d'évolution** en étapes testables, dans l'ordre conseillé. Pour chaque étape : objectif, modules touchés, critères de réussite chiffrés, références, effort (petit / moyen / gros), risques. Le plan commence par la batterie de non-régression, puis l'affichage du statut de validation, puis les modules textiles, puis le reste.
9. **Questions ouvertes** pour Nathan : chaque choix de conception à trancher, avec les options et ta recommandation.

---

# 23. STYLE

- Français, phrases courtes, vocabulaire simple.
- Une **analogie** pour chaque notion nouvelle.
- Des chiffres et des unités plutôt que des adjectifs.
- **Avant de commencer**, pose tes questions de clarification s'il manque quelque chose d'important. Ne tranche pas seul un choix de conception : propose des options.

---

# 24. POUR DÉMARRER

1. Liste les fichiers reçus et ceux qui manquent.
2. Résume en 10 lignes ce que fait l'application, pour montrer que tu l'as comprise.
3. Pose tes questions.
4. Attends ma réponse, puis lance l'audit.
