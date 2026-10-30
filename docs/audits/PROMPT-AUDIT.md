# Prompt — Audit complet de Cover+ et plan pour une géométrie complète

> À coller au début d'une conversation avec une IA qui n'a jamais vu le projet.
> Joindre les fichiers listés à la section 10.
> Rédigé le 30/10/2026 à partir de la version publiée le 29/10/2026.

---

## 0. Ton rôle et ta mission

Tu es un expert à la fois en géométrie des dômes géodésiques, en calcul numérique de précision, en patrons textiles (développés 2D, coutures, calepinage) et en applications web JavaScript autonomes.

**Ta mission a deux parties :**

1. **Auditer** l'application Cover+ telle qu'elle est : ce qui marche (avec des preuves), ce qui est en cours, ce qui est faux ou fragile.
2. **Proposer un plan** pour la rendre complète en géométrie : fréquences 1V à 6V, méthodes Chords, Arcs et Kruschke, plusieurs polyèdres de départ, toutes les coupes. Le plan doit dire ce que chaque module devra changer pour suivre.

**Tu ne modifies pas le code.** Tu lis, tu testes, tu mesures, tu rédiges. Toute correction viendra plus tard, une étape à la fois, après accord.

Image pour fixer l'esprit : ce n'est pas un contrôle technique (« la voiture roule-t-elle ? ») mais une **expertise avant agrandissement d'une maison**. On vérifie l'état des pièces, mais surtout si les **fondations** (le moteur géométrique) peuvent porter les étages qu'on veut ajouter, et quels murs (les modules) supposent en silence la forme actuelle.

---

## 1. Le contexte métier

L'utilisateur s'appelle Nathan. Il fabrique des dômes géodésiques en bois et leurs toiles en tissu acrylique (marque Nomad'Om, nomadom.be). Les toiles sont découpées dans des rouleaux (laize habituelle 1500 mm) puis cousues.

Cover+ sert à passer d'un dôme (fréquence, coupe, diamètre) à **des patrons de toile prêts à couper** : morceaux, marges de couture, gabarits, placement sur le rouleau, métrage, fiches de traçage. L'objectif à terme : partir d'une demande client (« dôme de 8 m, 3V, 5/8, deux portes, une mezzanine ») et obtenir géométrie, liste de débit bois, patrons, calepinage et devis.

Cover+ descend de **ACIDOME CALC** (version locale 221027), un calculateur de dômes en ligne, russe à l'origine. Son moteur géométrique a été **réécrit** pour Cover+, en reprenant fidèlement la logique d'Acidome. Le fichier source d'Acidome est fourni : c'est la référence pour toutes les méthodes non encore portées.

---

## 2. L'application en détail

### 2.1 Forme et architecture

- **Un seul fichier HTML autonome** (`acidome-cover-plus.html`, environ 1,16 Mo), sans serveur ni internet. Il s'ouvre dans un navigateur.
- Il contient 14 scripts. La règle du projet : **la logique pure vit dans des modules testables sous Node** (sans interface), l'interface ne fait qu'afficher.

| Module | Taille | Rôle |
|---|---|---|
| `dome-engine.js` | 17 ko | Moteur géométrique : icosaèdre, subdivision, correction Kruschke, coupe par fraction, voisinages, classes d'arêtes |
| `etages.js` | 26 ko | Découpe de la toile « par étages » (anneaux de triangles), gabarits, fiche patron, contrôle « sans vague » |
| `toile.js` | 15 ko | Mode sans connecteur (GoodKarma) : toile posée sur les montants, patron agrandi ; marges et contours de coupe |
| `nesting.js` | 9 ko | Placement des morceaux sur le rouleau |
| `optim.js` | 7 ko | Découpe « moins de toile » : compromis métrage / nombre de coutures |
| `export.js` | 24 ko | Fiches de traçage imprimables (A4, une page par morceau) |
| `peel.js` | 15 ko | Vue aplatie « pelure d'orange » |
| `info.js` | 24 ko | Textes de l'onglet Informations, aide derrière chaque « ? » |
| `design.js` | 20 ko | Onglet Design, logique : coupes horizontales, hauteur sous plafond, mezzanine, meubles, contrôles |
| `design3d.js` | 42 ko | Petit moteur 3D WebGL2 maison + lecture de modèles .glb (moteur de secours) |
| `design3d-three.js` | 14 ko | Rendu de l'onglet Design avec Three.js (matériaux, ombres, ciel) |
| `designui.js` | 57 ko | Interface de l'onglet Design |
| app (sans nom) | 140 ko | Interface de l'onglet Cover+ et de l'onglet Informations |
| `threekit` | 733 ko | Three.js r169 empaqueté dans le fichier |

### 2.2 Onglets

Barre d'onglets : Base, Framework, Scheme, **Cover+**, **Design**, **Informations**, Tent. Base, Framework, Scheme et Tent sont **désactivés** (repris du nom des onglets d'Acidome, non développés).

### 2.3 Onglet Cover+ — réglages

| Groupe | Réglage | État |
|---|---|---|
| Dôme | Base | Figé sur Icosaèdre |
| | Fréquence | **2V ou 3V seulement** |
| | Classe | Figée sur I |
| | Méthode | Figée : 3V → Kruschke, 2V → Chords (choisie automatiquement) |
| | Découpage (fraction) | Figé : 3V → 5/9, 2V → 1/2 |
| | Diamètre (m) | Libre |
| Structure | Avec connecteur (toile au niveau des nœuds) / Sans connecteur GoodKarma (toile sur les montants, hauteur d'appui en mm, 120 par défaut) | Actif |
| Toile | Laize (1500 mm), lisière inutilisable par bord (10 mm), tolérance de chevauchement (50 mm) | Actif |
| Découpe | Stratégie : moins de morceaux / moins de gabarits / moins de toile / triangle par triangle ; poids d'une couture (cm de toile) ; rangée du bas en un anneau ou en 5 morceaux identiques | Actif |
| Coutures | Type (simple, rabattue, recouvrement/soudure, personnalisé) ; marge côté A recouvrant, côté B recouvert ; ourlet bas | Actif |

### 2.4 Onglet Cover+ — vues et modes

- **Vue 3D** du dôme : rotation, zoom, triangles numérotés, sélection (multi-sélection avec Maj), image plaquée sur le dôme (vue du ciel ou panorama).
- **Développement 2D**, avec 8 modes :
  - **Triangle** : chaque face à plat, types de triangles de base ;
  - **Créer panneau / Développer** : groupe de triangles choisi à la main ;
  - **Étages (par rangée)** : le mode principal. Chaque anneau de triangles devient une bande, coupée en morceaux qui tiennent dans la laize utile ; coupes toujours sur des arêtes montantes, jamais au milieu d'un triangle ; morceaux sans nœud intérieur, donc développables exactement (« sans vague ») ;
  - **Plan de coupe (rouleau)** : placement automatique, rotation 0° ou 180° seulement, jamais retourné, traits de coupe partagés ; métrage et taux d'utilisation ;
  - **Dôme complet (auto)**, **Fleur (par sommet)**, **Bandes/Gores** : modes plus anciens ;
  - **Vue aplatie (cotes)** : tous les morceaux à plat avec leurs cotes (« pelure d'orange »).
- **Fiche patron** d'un morceau (clic sur le morceau) : coordonnées, arêtes classées, angles de pli, voisins, export CSV, fiche de traçage imprimable (méthodes corde et équerre croisées).
- Boutons encore grisés : Symétrie, Marge, Couture, Export SVG, Export PDF, Export DXF, Export CSV (alors que marges, fiches et CSV par morceau existent déjà ailleurs).

### 2.5 Onglet Design — aménagement intérieur

- **Plan d'architecte 2D par niveau** (rez, mezzanine) : style noir et blanc ou couleur ; zones de hauteur sous plafond (assis ≥ 1,00 m, debout ≥ 1,80 m) ; montants vus du dessus ; paroi en poché.
- **Bibliothèque de 19 éléments** : lits, canapé, tables, chaise, poêle à bois, plan de travail, évier, frigo, cuisson, douche, WC sec, lavabo, escalier, échelle de meunier, formes libres. Déplacement à la souris (pas de 5 cm), rotation (pas de 15°), suppression avec annulation.
- **Ouvertures** au rez (porte, fenêtre, baie) posées sur un côté du bord bas, avec un contrôle qui signale si la toile est trop basse et estime la saillie du sas.
- **Mezzanine** : hauteur, épaisseur, forme (demi-cercle, secteur, côtés droits), profondeur, largeur, orientation.
- **Contrôles** : élément qui touche la paroi, élément trop haut à sa place.
- **Chiffres** calculés sur les facettes réelles : Ø au sol, hauteur, surface au sol, surfaces debout et assis, volume, surface de mezzanine.
- **Rendu 3D** : Three.js (styles réaliste ou maquette ; toile en coupe, transparente ou structure seule ; qualité haute ou rapide), avec repli sur le moteur WebGL2 maison puis sur un dessin 2D.
- **Import de modèles 3D .glb** par élément ; export et import de l'aménagement en .json ; sauvegarde automatique dans le navigateur ; impression des plans à l'échelle (1:50 ou 1:100, un plan par niveau).

### 2.6 Onglet Informations

Tableau comparatif des stratégies de découpe (morceaux, gabarits, arêtes cousues, toile coupée, rouleau, utilisation), triangles de base, classes d'arêtes, explication de chaque réglage. Chaque « ? » de l'onglet Cover+ ouvre la bonne explication.

### 2.7 Ce qui a été validé (avant cet audit)

| Cas | Valeurs attendues | Source |
|---|---|---|
| 3V Kruschke 5/9, Ø 5,00 m | 61 nœuds, 165 montants, 105 faces, bord de 15 arêtes. 30×A 824,27 mm, 35×B 955,73 mm, 80×C 1053,72 mm, 20×D 1102,64 mm. Rayon unitaire : A=0.329706463356374, B=0.382290185640323, C=0.421488791193215, D=0.441056358833072 | Domerama, calculateur 3V 5/9 Kruschke |
| 2V Chords 1/2, Ø 5,30 m | 26 nœuds, 65 montants, 40 faces. 30×A 1448,31 mm, 35×B 1637,79 mm. Rayon unitaire : A=0.54653, B=0.61803 | Domerama, calculateur 2V |

Un pré-audit (version du 29/10) a confirmé ces deux cas dans l'interface, sans aucune erreur dans la console du navigateur.

### 2.8 Limites connues du moteur

`generateDome` refuse explicitement tout ce qui n'est pas validé :
- base autre qu'Icosaèdre → erreur ;
- classe autre que I → erreur ;
- correction Kruschke hors 3V → erreur. Le 2V passe par un chemin spécial (Chords pur, sans correction) ;
- l'interface impose 2V → 1/2 et 3V → 5/9.

Plusieurs modules supposent une **symétrie d'ordre 5** (axe Pentad), par exemple :
- `etages.js` : la rangée du bas « en 5 morceaux identiques » exige un nombre de triangles divisible par 5 ;
- `peel.js` : les fentes de la pelure exigent aussi un multiple de 5 ;
- l'interface affiche « Pentad (sommet en haut) » et « 5 morceaux » en dur.

---

## 3. La cible : une géométrie complète

Ce que Nathan veut pouvoir choisir dans Cover+ :

| Paramètre | Cible |
|---|---|
| Fréquence | **1V à 6V** |
| Méthode de subdivision | **Chords** (cordes égales), **Arcs** (arcs égaux), **Kruschke** (correction pour base plate) là où une correction validée existe |
| Polyèdre de départ | **Icosaèdre** et **Octaèdre** (les deux proposés par Acidome), plus d'autres polyèdres si des références indépendantes existent |
| Coupe | **Toutes les fractions** disponibles pour chaque fréquence (1/2, 5/8, 5/9, 3/8, 7/12…), **base plate** quand c'est possible, et un **plan de coupe libre** défini par sa hauteur |
| Classe | Classe I seulement (Classes II et III hors périmètre pour l'instant) |

Ce que fait Acidome, d'après son code source (à vérifier toi-même dans le fichier joint) :
- polyèdres : Icosaèdre, Octaèdre ; options « fullerène » (duals : tétrakis-hexaèdre, pentakis-dodécaèdre) ;
- fréquences de 1 à 18 (1 à 8 pour les fullerènes) ;
- méthodes de Classe I : Chords (`splitFaces`), Arcs (`splitFaces_EA`), Mexican (Arcs puis `splitFaces_EA_updateToMexican`), Kruschke (Chords puis correction) **seulement pour l'icosaèdre en 3V et 4V**. En 4V, le coefficient est déduit de la valeur F=0.22219 du calculateur Domerama 4V 7/12 Kruschke ;
- symétries : Pentad, Cross, Triad ; option « Align the base » (base plate) ; listes de fractions par fréquence (`partialList_ClassI`, `partialList_Octohedron`).

La méthode Mexican est présente dans Acidome mais pas demandée par Nathan : dis s'il vaut la peine de la proposer.

---

## 4. Règles du projet (à respecter dans l'audit et le plan)

1. **Justesse avant tout.** Toute nouvelle géométrie est validée contre des **références indépendantes** avant d'être affichée. Sans référence, l'application **refuse clairement** plutôt que de donner un résultat faux.
2. **Non-régression** : les deux cas de la section 2.7 doivent toujours passer, ainsi que les contrôles des découpes (sans vague, coutures A/B cohérentes, aucun chevauchement sur le rouleau).
3. **Tolérances** : calcul en double précision ; tolérance géométrique 0,01 mm ; arrondi seulement à l'affichage (0,1 mm) et à l'export de fabrication (1 mm).
4. **Une étape testable à la fois**, avec des critères de réussite écrits avant de coder.
5. **Un seul fichier HTML autonome**, logique pure testable sous Node.

---

## 5. Ce que l'audit doit couvrir

### A. Exactitude géométrique
- Recalcule les deux cas de référence **toi-même**, sous Node, directement avec `dome-engine.js`. Compare toutes les valeurs à 1e-9 près au rayon unitaire.
- Vérifie la topologie : formule d'Euler, chaque arête partagée par 2 faces (sauf le bord), base réellement plate (écart de hauteur des nœuds du bord).
- Compare la logique portée à celle d'Acidome (subdivision, correction Kruschke, coupe par fraction, orientation Pentad). Signale tout écart, même s'il ne change pas les deux cas testés.

### B. Fonctions, onglet par onglet
- Pour chaque réglage, mode et bouton des sections 2.3 à 2.6 : marche / partiel / cassé / désactivé, avec la preuve (valeur relevée, capture, message d'erreur).
- Teste les deux dômes de référence dans tous les modes, et chaque stratégie de découpe avec son métrage sur le rouleau. Dis si « moins de toile » donne vraiment un rouleau plus court que « moins de morceaux ».
- Vérifie qu'une fiche de traçage imprimée reproduit exactement le morceau (rejeu des cotes).
- Onglet Design : vérifie les chiffres (surface, volume) par un calcul indépendant ; teste les cas limites (mezzanine trop haute, secteur de plus de 180°, élément hors du dôme, import .json et .glb). Voir aussi la section 6.

### C. Capacité d'extension (le cœur de l'audit)
Pour **chaque module**, réponds à ces questions :
- Que suppose-t-il en silence ? (fréquence 2V ou 3V, coupe 5/9 ou 1/2, symétrie d'ordre 5, icosaèdre, nombre d'étages, base plate, longueurs proches les unes des autres…)
- Que se passe-t-il si on lui donne un 4V 5/8, un 6V 1/2, un 1V, un octaèdre ? Fais l'essai : force ces géométries dans les modules (en appelant les fonctions sous Node avec un maillage produit par une version de test du moteur, sans modifier les fichiers livrés) et note ce qui casse.
- Quelle quantité de travail faut-il pour le rendre général ?

Livre un **tableau module × hypothèse** avec, pour chaque case, le risque et la ligne de code concernée.

Points à examiner en particulier :
- `etages.js` : définition des étages par distance au sommet ; comportement quand la base n'est pas plate ou quand le dôme n'a pas de sommet unique (orientations Triad ou Cross) ;
- l'optimisation et le placement sur le rouleau : temps de calcul quand le nombre de faces passe de 105 (3V) à environ 400 (6V) ;
- le mode GoodKarma : décalage des faces quand les arêtes sont nombreuses et courtes ;
- l'onglet Design : coupes horizontales et hauteur sous plafond sur un dôme dont la base n'est pas plate.

### D. Références de validation
- Pour chaque combinaison de la cible (section 3), trouve des **valeurs de référence publiées et indépendantes** : Domerama, Acidome en ligne, Simply Differently, Desert Domes, ouvrages de référence. Pour chacune : coefficients de corde, nombre de montants par classe, nombre de nœuds et de faces.
- Donne la source exacte (adresse) de chaque valeur. Signale les combinaisons **sans référence** : elles devront rester refusées.
- Attention aux pièges de vocabulaire. Acidome nomme les fractions autrement que Domerama : le 7/12 d'Acidome donne la même géométrie à 105 faces que le 5/9 de Domerama. Vérifie aussi si le « 5/8 » 3V cité par certains sites est le même dôme que le 5/9 Kruschke ou un dôme différent (question non tranchée). Établis une table de correspondance des noms de coupe.

### E. Qualité technique
- Structure du code, couplages entre modules, fonctions trop longues, duplications (par exemple deux moteurs 3D pour l'onglet Design).
- Tests : lesquels existent, lesquels manquent. Propose une **batterie de non-régression** exécutable sous Node et dans un navigateur sans écran.
- Robustesse : entrées invalides, sauvegarde dans le navigateur, fichiers importés (injection de code par un nom d'élément ?), performances (temps d'ouverture, temps de calcul).
- Taille du fichier et dépendance à Three.js.

### F. Usage à l'atelier
- Les chiffres affichés sont-ils ceux dont un couturier a besoin, avec les bonnes unités et le bon arrondi ?
- Ce qui peut induire en erreur (par exemple : « Ø 5,00 m » est le diamètre de la sphère, alors que le sol d'un 3V 5/9 ne fait que 4,91 m).

---

## 6. Constats d'un pré-audit (à confirmer ou infirmer)

Un premier passage, interrompu, sur la version du 29/10 a relevé ceci. Ce sont des **hypothèses** : vérifie chacune.

| Constat | Type |
|---|---|
| 3V 5/9 Ø5 : Étages = 18 morceaux, 10 gabarits ; rouleau 50,31 m (−18 % par rapport aux morceaux mis bout à bout), utilisation 65 % | Mesure |
| 2V 1/2 Ø5,30 : Étages = 30 morceaux ; rouleau 33,07 m, utilisation 78 % | Mesure |
| Stratégie « moins de toile » en 3V : 39 morceaux, environ 3,4 s de calcul ; son métrage sur le rouleau n'a pas été comparé | À compléter |
| GoodKarma 120 mm : patron agrandi de +4,3 à +5,3 % selon la classe d'arête | Mesure |
| Design 3V Ø5 : Ø au sol 4,91 m, hauteur 2,97 m, sol 18,4 m², debout 13,4 m², assis 18,1 m², volume 39,4 m³ | À recalculer |
| Design : aucun contrôle de chevauchement entre éléments (cinq meubles empilés au centre sont tous marqués « ✓ ») ; distance de sécurité du poêle dessinée mais non contrôlée | Défaut probable |
| Design : chaque nouvelle ouverture arrive sur le côté 1 ; plusieurs ouvertures se superposent sans alerte | Défaut probable |
| Design : l'arrivée de l'escalier sur la mezzanine n'est pas contrôlée | Défaut probable |
| Design : mezzanine par défaut à 2,20 m, inutilisable dans le dôme de référence (0 m² assis) ; un avertissement s'affiche | Réglage par défaut à revoir |
| Design : `clipRing()` est un bouchon (la profondeur d'une mezzanine en secteur est ignorée) | Inachevé |
| Design : noms d'éléments insérés dans la page sans échappement HTML | Robustesse |
| Design : ouverture de l'onglet en 6,9 s en rendu logiciel (à mesurer sur un vrai ordinateur) | Performance |
| Vue aplatie : un seul type de fente proposé dans l'interface, alors que `peel.js` en connaît cinq | Inachevé |

---

## 7. Méthode de test attendue

- Logique pure : sous **Node**, en chargeant directement les modules (ils exportent leurs fonctions avec `module.exports`).
- Interface : dans un **navigateur sans écran** (par exemple Playwright avec Chromium, option `--use-gl=swiftshader` pour avoir WebGL2), en cliquant comme un utilisateur et en relevant les textes affichés, les erreurs de la console et des captures.
- Chaque affirmation du rapport doit dire **comment elle a été vérifiée** (test, calcul, lecture de code) ou porter la mention **« non vérifié »**.
- Si tu n'as pas d'outil pour exécuter du code, dis-le dès le début, et marque chaque point comme « lu dans le code » plutôt que « testé ».

---

## 8. Ce que tu livres

1. **Résumé** en 10 lignes maximum : verdict, trois forces, trois risques.
2. **Audit**, sections A à F, avec une gravité par constat :
   - **Bloquant** : résultat faux qui peut finir dans une toile coupée ;
   - **Majeur** : fonction cassée ou trompeuse ;
   - **Mineur** : gêne, inachevé ;
   - **Info** : remarque.
3. **Tableau module × hypothèse** (section 5C).
4. **Tableau des références** par combinaison cible : valeurs, sources, et « sans référence » quand c'est le cas (section 5D).
5. **Tableau d'état** : chaque fonction de la section 2 et de la cible, classée en fait / partiel / à faire.
6. **Plan d'évolution** vers la géométrie complète, en étapes testables, dans l'ordre conseillé. Pour chaque étape : objectif, modules touchés, critères de réussite chiffrés, références utilisées, effort estimé (petit / moyen / gros), risques. Le plan commence par ce qui protège l'existant (batterie de non-régression), puis le moteur, puis l'adaptation des modules textiles, puis l'interface.
7. **Questions ouvertes** pour Nathan : les choix de conception qu'il doit trancher, chacun avec les options possibles et ta recommandation.

---

## 9. Ton style

- Français, phrases courtes, vocabulaire simple.
- Une **analogie** pour chaque notion nouvelle ou technique (par exemple Chords contre Arcs : sur un ballon, Chords coupe en parts égales la règle tendue entre deux sommets ; Arcs coupe en parts égales la ficelle posée sur le ballon).
- Des chiffres et des unités plutôt que des adjectifs.
- **Avant de commencer**, pose tes questions de clarification s'il manque quelque chose d'important. Ne tranche pas seul un choix de conception : propose des options.

---

## 10. Fichiers joints

| Fichier | Contenu |
|---|---|
| `acidome-cover-plus.html` | L'application complète, telle qu'utilisée |
| `dome-engine.js`, `etages.js`, `toile.js`, `nesting.js`, `optim.js`, `export.js`, `peel.js`, `info.js`, `design.js`, `design3d.js`, `design3d-three.js`, `designui.js` | Les modules, séparés, pour les tests sous Node |
| `ACIDOME_CALC_221027.html` | Le logiciel d'origine : référence pour Arcs, Mexican, Kruschke 4V, Octaèdre, symétries, listes de fractions et base plate |
| `VALIDATION.md`, `VALIDATION-2V.md` | Les validations déjà faites (3V et 2V) |
| `ETAGES.md` | Historique des décisions et des résultats sur la découpe par étages |
| `PROMPT-EVOLUTION.md` | La vision d'ensemble (« Nomad'Om Geodesic Dome Designer ») et les lots prévus |
| `AUDIT-NOTES.md` | Les notes du pré-audit (section 6) |

Si un fichier manque, dis-le avant de commencer et indique ce qu'il t'empêche de vérifier.
