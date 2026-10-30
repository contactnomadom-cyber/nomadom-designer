# MISSION — REVUE D'ARCHITECTURE DE NOMAD'OM DESIGNER (bêta 0.9.11)

> Brief pour une IA externe qui ne connaît rien du projet.
> Fichier joint obligatoire : `nomadom-designer-beta.html` (l'application complète, version bêta 0.9.11 du 30/10/2026).
> Rédigé le 30/10/2026.

---

## 0. Ton rôle

Tu es architecte logiciel senior. Tu connais aussi :
- les applications web autonomes, hors ligne, en un seul fichier ;
- JavaScript (navigateur et Node), la 3D web (Three.js, WebGL) ;
- la géométrie 3D et les logiciels métier de fabrication (CAO, patronage, découpe).

On ne te demande **pas** d'écrire du code ni de corriger des bugs.
On te demande un **deuxième avis** sur trois choses :
1. **l'architecture générale** : découpage en modules, flux de données, dépendances, forme du livrable ;
2. **la nomenclature** : noms des modules, des fichiers, des variables, des notions métier ;
3. **le mode opératoire** : la façon dont l'application est développée, testée, assemblée et publiée.

La question de fond : **sommes-nous sur la bonne voie** pour que cette application grandisse encore sans devenir fragile ?

Règles :
- Ne modifie aucun fichier. Phase d'analyse uniquement.
- Pour chaque affirmation, dis comment tu l'as établie : **lu dans le code** (fichier + ligne ou nom de fonction), **testé**, ou **supposé**.
- Ne tranche pas seul un choix de conception : propose des options, avec ta recommandation.

---

## 1. Le projet en une page

### L'entreprise
**Nomad'Om** est une petite entreprise belge (un artisan, Nathan) qui fabrique des **dômes géodésiques en bois** et leurs **enveloppes en toile acrylique**. Il vend :
- des dômes complets (structure + toile) ;
- des toiles seules, cousues en atelier ;
- bientôt une gamme **Événementiel** (pavillon « Quadrisphère ») et une gamme **Décoration** (tabourets en solides de Platon, etc.).

### L'utilisateur
Une seule personne aujourd'hui : Nathan.
- Il utilise l'application **en local** : il télécharge le fichier HTML et l'ouvre dans son navigateur, sans serveur ni internet.
- Plus tard, il veut s'en servir **sur tablette, devant ses clients**, y compris hors ligne (salons).
- Il n'est pas développeur. Toute l'application est écrite par des assistants IA (Claude), au fil de sessions de travail successives.

### La vision
Passer d'une demande client :

> « Je veux un dôme de 5 m, 3V, avec une porte »

à tout le dossier :

> géométrie → structure (longueurs de montants, nœuds) → surface de toile → découpe en morceaux → marges et coutures → patrons exacts → placement sur le rouleau → métrage → fiches d'atelier → aménagement intérieur → devis.

Image : aujourd'hui l'application est un **atelier** (on fabrique). Demain elle aura aussi un **showroom** (on présente au client) : c'est le projet « Nomad Vision » (section 9).

### La règle n° 1 : justesse avant fonctionnalités
Une erreur coûte cher : des dizaines de mètres de toile coupés pour rien, des montants mal débités, un dôme qui ne ferme pas.
L'application préfère donc **refuser** un calcul plutôt que produire un joli patron faux.

Chaque résultat porte un statut de confiance :

| Statut | Sens |
|---|---|
| 🟢 vérifié | confirmé par une source indépendante (Domerama, Antiprism…) |
| 🟡 calculé | calcul cohérent, mais sans référence indépendante |
| 🟠 non vérifié en atelier | géométrie sûre, mais les patrons de toile n'ont jamais été cousus |
| 🔴 refusé | pas de patron ni d'export |

### Deux dômes de référence, à ne jamais casser
- **3V Kruschke 7/12 (= « 5/9 » chez Domerama), Ø 5 m** : 61 nœuds, 165 montants, 105 faces ; 30 × A 824,27 mm, 35 × B 955,73 mm, 80 × C 1 053,72 mm, 20 × D 1 102,64 mm. Découpe toile : 18 morceaux, 10 gabarits.
- **2V Chords 1/2, Ø 5,30 m** : 26 nœuds, 65 montants, 40 faces ; 30 × A 1 448,31 mm, 35 × B 1 637,79 mm.

---

## 2. Glossaire métier (indispensable pour juger la nomenclature)

| Terme | Sens |
|---|---|
| Dôme géodésique | Sphère découpée en triangles, obtenue en subdivisant un polyèdre (ici l'icosaèdre). |
| Fréquence (1V…8V) | Nombre de subdivisions de chaque arête du polyèdre. Plus V est grand, plus il y a de petits triangles. |
| Classe I | Façon de subdiviser (la seule gérée). |
| Méthode | Façon de placer les points : **Chords** (cordes égales), **Arcs** (arcs égaux), **Kruschke** (Chords corrigé pour que la base soit plate, 3V et 4V), **Mexican** (retirée des menus). |
| Symétrie | Ce qui est au sommet : **Pentad** (un nœud à 5 branches), **Triad** (une face), **Cross** (une arête). |
| Coupe / découpage | La part de sphère gardée. Acidome l'écrit en p / 4V (ex. 7/12). Domerama nomme le même dôme autrement (7/12 Kruschke = « 3V 5/9 »). L'appli affiche les deux. |
| Base alignée / plate | Les nœuds du bord sont ramenés dans un même plan horizontal. |
| Montant (strut) | Barre de la structure entre deux nœuds. Les montants de même longueur forment une classe (A, B, C…). |
| Structure avec connecteur / GoodKarma | Avec connecteur : la toile passe au niveau des nœuds. GoodKarma (sans connecteur) : la toile repose sur la face extérieure des montants, donc le patron est agrandi. |
| Laize | Largeur du rouleau de toile (1 500 mm). **Lisière** : bord inutilisable. **Largeur utile** = laize − 2 × lisière. |
| Marge A / marge B | Surplus de couture de chaque côté d'une couture (A recouvre B, pour que l'eau ruisselle). **Ourlet** : bord bas du dôme. |
| Étage | Rangée de triangles entre deux anneaux de nœuds. La toile est découpée étage par étage. |
| Morceau / gabarit | Un morceau = une pièce de toile à couper. Un gabarit = une forme tracée une fois et réutilisée pour tous les morceaux identiques. |
| Sans vague | Le morceau se pose à plat sans déformation : longueurs conservées et aucun nœud intérieur (critère calculé). |
| Fiche patron / fiche de traçage | Fiche d'un morceau avec toutes les cotes, imprimable pour tracer à la main en atelier. |
| Plan de coupe / rouleau | Placement des morceaux sur le rouleau (nesting) pour minimiser le métrage. |
| Stratégies de découpe | Moins de morceaux / moins de gabarits / moins de toile (optimisation) / triangle par triangle. |
| Acidome (ACIDOME CALC 221027) | Ancien logiciel de calcul de dômes dont le moteur a été porté. Le portage est identique à Acidome sur 571 combinaisons. |

---

## 3. Forme technique actuelle

- **Un seul fichier HTML autonome** : `nomadom-designer-beta.html`, environ 1,26 Mo. Aucun serveur, aucune dépendance en ligne, aucune étape de compilation.
- Il contient **17 balises `<script>`** : 16 portent un identifiant (`<script id="dome-engine-src">`…), le script principal n'en a pas.
- La bibliothèque 3D **Three.js r169** est empaquetée dans le fichier (environ 730 ko).
- Les modules de calcul suivent un même motif : une fonction immédiate qui pose un objet global (`DomeEngine`, `Toile`…) **et** l'exporte avec `module.exports`. On peut donc les tester sous Node sans navigateur.
- Les modules d'interface communiquent par des objets globaux : `window.CoverApp`, `window.CoverDesign`, `window.THREEKIT`, `QuadriGeom`.
- Seule sauvegarde : l'aménagement de l'onglet Design, dans le navigateur (`localStorage`, clé `coverplus-design-v1`), plus un export/import `.json`.

---

## 4. Arborescence réelle (modules dans le fichier HTML)

| Module (id du script) | Lignes | Rôle | Utilise | Couche |
|---|---|---|---|---|
| `threekit` | 3 998 (733 ko) | Three.js r169 empaqueté | — | Tiers |
| `dome-engine` | 601 | Géométrie : icosaèdre, subdivision (Chords, Arcs, Mexican, Kruschke), symétries, coupes, alignement de base (avec garde-fou anti-triangles retournés), classes de montants, voisinages | — | Géométrie |
| `etages` | 517 | Découpe de la toile en étages, morceaux, fiche patron, contrôle « sans vague », gabarits | dôme | Textile |
| `toile` | 301 | Marges A/B, ourlet, rangée du bas, contour de coupe, GoodKarma (`offsetDome`), `planFabric` (découpe dans la laize), regroupement en gabarits | etages | Textile / Fabrication |
| `nesting` | 192 | Placement des morceaux sur le rouleau | — | Fabrication |
| `optim` | 143 | Stratégie « moins de toile » (recherche asynchrone) | Toile, Nesting | Fabrication |
| `export` | 320 | Fiches de traçage imprimables (A4) | Toile | Présentation |
| `peel` | 272 | Vue aplatie en « pelure d'orange » | — | Présentation |
| `info` | 137 | Onglet Informations : aide de chaque réglage, table des noms de coupe | Toile, Design, Ouvertures | Présentation |
| `ouvertures` | 254 | Portes et fenêtres tracées sur la structure (montants sélectionnés) : faces retirées, cadre, ourlet | DomeEngine, Design | Géométrie / Structure |
| `design` | 301 | Aménagement : sol, coupes horizontales, hauteurs, mezzanine, meubles, contrôles | — | Design |
| `design3d` | 514 | Moteur 3D WebGL2 maison (secours) et lecture des modèles `.glb` | — | Présentation |
| `design3d-three` | 208 | Rendu 3D de l'aménagement avec Three.js | THREEKIT, Design | Présentation |
| `designui` | 664 | Interface de l'onglet Design | Design, Design3D, Ouvertures, CoverApp | Interface |
| `quadri-geom` | 108 | Pavillon Quadrisphère : géométrie (octaèdre, 4 pieds, 4 arches), débit des barres | — | Produit 2 |
| `quadri-ui` | 287 | Onglet Quadrisphère : réglages, chiffres, rendu Three.js | QuadriGeom, THREEKIT, Design | Produit 2 |
| *(script principal)* `app` | 2 588 | Interface des onglets Base, Cover+, Informations ; vue 3D du dôme ; modes 2D ; statut de confiance ; clé de découpe ; orchestration de tous les modules | presque tout | Interface + orchestration |

Le script principal contient environ 108 fonctions et reste le point faible de taille. Il est passé de 2 899 à 2 588 lignes en 0.9.11 (retrait de trois anciens modes), mais il mélange encore : rendu 3D maison, développements 2D, fiches, statut, onglet Base, orchestration.

### Hors de l'application (dans le dossier du projet)
- `kumiko/` : moteur de panneaux décoratifs en lattes de bois (« kumiko », motifs japonais) posés dans les triangles, avec ses tests et des **scripts de patch** pour l'intégrer. **Pas encore intégré** à l'application publiée.
- `ouvertures/` : moteur des ouvertures, tests, patchs (déjà intégrés).
- `tests/` : batterie de non-régression (section 7).
- `source/ACIDOME_CALC_221027.html` : le logiciel d'origine, gardé comme référence.
- Documents : `VALIDATION*.md` (preuves de justesse), `ETAGES.md` (découpe en étages), `BESOINS.md`, `ROADMAP-NOMAD-VISION.md`, `PLAN-OUTILS.md`, prompts d'audit.
- Des copies isolées de certains modules (`dome-engine.js`, `toile.js`, `etages.js`…) qui doublent ceux du HTML et peuvent ne pas être à jour.

---

## 5. Flux de données

```text
Onglet Base (réglages)
  └─ DomeEngine.generateDome(params) ─► domeNominal (structure nœud à nœud)
        ├─ GoodKarma ? Toile.offsetDome(h) ─► domeCloth (surface de la toile)
        └─ Ouvertures.applyToDome(...)    ─► dome (toile, faces ouvertes retirées)
                                             domeStruct (structure avec cadres)
dome ──► Cover+ : makeEtages(dome) ─► Toile.planFabric(laize, marges) ou Optim (moins de toile)
                     ─► morceaux + fiches patron ─► Nesting (rouleau) ─► Export (fiches A4, CSV)
domeStruct ──► Design : Design.domeModel(...) ─► plans, 3D, contrôles de place
QuadriGeom ──► onglet Quadrisphère (indépendant du dôme)
Statut 🟢🟡🟠🔴 ◄── paramètres du dôme + contrôles des morceaux (affiché partout, bloque si 🔴)
```

Points structurants déjà en place :
- **Clé de découpe** : chaque résultat mis en cache porte l'identité complète du dôme (paramètres + numéro de génération) et les réglages de toile. Ajoutée après un défaut grave : la stratégie « moins de toile » réaffichait les patrons d'un autre dôme.
- **FabricSpec** : les réglages de toile (laize, lisière, largeur utile, tolérance, marges, rangée du bas) sont regroupés dans un objet figé `FABRIC`, recalculé à un seul endroit (`readFabricParams()`).
- **Garde-fous** : laize trop étroite, morceaux avec vague, géométrie 🔴, Triad/Cross/sphère entière → plan de coupe et exports refusés, avec la raison affichée.

Ce qui manque encore, selon l'audit : un vrai **objet dôme d'identité unique** (`DomeGeometry`) qui circule d'une étape à l'autre avec son statut et ses sources ; aujourd'hui, le script principal tient l'état dans des variables globales (`dome`, `domeNominal`, `domeStruct`, `etagesCache`, `sheetCache`, `nestCache`…).

---

## 6. Ce que l'application fait aujourd'hui (0.9.11)

### Onglets
- **Base** : polyèdre (icosaèdre seulement), fréquence 1V–8V, classe I, méthode, symétrie, coupe (avec nom Domerama), aligner la base, diamètre, structure (connecteur ou GoodKarma). Ouvertures tracées sur la structure. Vue 3D, chiffres clés, liste des montants par classe, types de triangles, **statut de confiance avec ses raisons**.
- **Cover+** (module toile) : laize, lisière, tolérance ; stratégie de découpe ; marges A/B, ourlet, **marges propres à la rangée du bas** ; vue 3D sélectionnable ; modes Triangle, Créer panneau, Développer (manuels), Étages, Plan de coupe (rouleau), Vue aplatie (cotes, pelure d'orange) ; fiche patron par morceau ; fiches de traçage imprimables ; CSV ; image plaquée sur le dôme.
- **Design** : aménagement intérieur (plans par niveau, 19 meubles, mezzanine, ouvertures), surfaces et volume, rendu 3D, import `.glb`, export/import `.json`, impression des plans à l'échelle.
- **Quadrisphère** : pavillon événementiel (tailles, bois ou acier, avec ou sans connecteur), débit des barres, rendu 3D.
- **Informations** : comparatif des 4 stratégies de découpe, aide de chaque réglage, table des noms de coupe.

### Justesse (vérifiée)
- Moteur identique à Acidome sur 571 combinaisons.
- 🟢 contre sources indépendantes :
  - Chords 1V–6V (facteurs de corde Domerama) ;
  - Kruschke 3V 7/12 et 5/12 (Domerama « 3V 5/9 » et « 3V 4/9 ») ;
  - Arcs 3V (Antiprism).
- 🟡 : Chords 7V–8V, Arcs 4V–6V (mêmes comptages qu'Antiprism, longueurs à 0,03 % près), Kruschke 4V, Triad/Cross, base alignée qui déplace des nœuds.
- 🟠 pour toute la toile : aucune toile n'a encore été cousue avec ces patrons (une validation en atelier est en cours).

---

## 7. Ce qu'elle ne fait pas encore (ou refuse volontairement)

| Sujet | État |
|---|---|
| Toile en Triad, Cross, sphère entière | 🔴 refusée (découpe par étages pas encore juste) — reporté |
| Exports dans la version publiée en ligne | non (l'appli est utilisée en local, où ils marchent) — reporté |
| Exports SVG / DXF, PDF 1:1 | non — reporté |
| Prix d'une couture / devis | non — reporté après mesures en atelier |
| Contrôles de place du Design (chevauchements, poêle, escalier) | incomplets — reporté |
| Solides de Platon, octaèdre, classes II et III | non — reporté (gamme Décoration) |
| Kumiko | moteur et tests prêts, pas intégré |
| Nomad Vision (showroom tablette, mode client / mode expert) | pas commencé — feuille de route écrite |
| Structure bois détaillée (débit, angles de coupe) | partielle (longueurs et classes de montants) |

---

## 8. Mode opératoire actuel (à juger aussi)

1. **Développement par sessions d'IA**. Chaque session lit le fichier HTML, extrait les modules dans un dossier `src/`, les modifie, puis les **réinjecte** dans le HTML par remplacement du contenu des balises `<script>` (petits scripts Python). D'autres sessions appliquent leurs changements par **scripts de patch** : remplacement de chaînes de texte qui doivent être uniques dans le fichier.
2. **Pas de dépôt git**, pas de script d'assemblage officiel. La « source de vérité » est le fichier HTML publié. Des copies de modules et du HTML sont rangées dans le dossier du projet.
3. **Publication** : le HTML est publié comme page privée sur claude.ai. Un contrôle de version refuse une publication qui n'est pas construite sur la dernière version en ligne.
   - Incident du 30/10 : deux sessions ont travaillé en parallèle. L'une a publié une 0.9.6 (ouvertures, Quadrisphère) pendant que l'autre préparait une 0.9.4. Une fusion à trois voies, bloc par bloc, a tout récupéré sans conflit.
   - Règle adoptée depuis : une seule session publie l'application.
4. **Versions** : numéro dans le pied de page et le badge (« bêta 0.9.11 du 30/10/2026 »). Pas de journal des changements dans l'appli ; l'historique est dans `tests/README.md` et le rapport d'audit.
5. **Tests** (dans `tests/`) :
   - Sous Node :
     - `engine.test.js` : 2 références, 867 combinaisons, topologie, Euler, base plate ;
     - `textile.test.js` : 780 découpes 1V–6V, planéité, coutures A/B, ourlet, rouleau ;
     - `arcs.test.js` : contre les valeurs Antiprism, figées dans un JSON ;
     - `compare-strategies.js`.
   - Dans un navigateur sans écran (Playwright + Chromium) :
     - `t_beta.py` (interface) ;
     - un test par étape du plan (`t_laize`, `t_bottom`, `t_kruschke_align`, `t_status`, `t_names`, `t_cleanup`, `t_stale_optim`).
   - Les tests sont lancés à la main par la session d'IA avant chaque publication. Pas d'intégration continue.
6. **Méthode** : une étape testable à la fois. Les deux dômes de référence sont relancés à chaque étape. Les décisions de Nathan sont notées dans le rapport d'audit.

---

## 9. Où va le produit (contraintes pour l'architecture future)

- **Plusieurs produits** dans la même application : dômes (Habitat), Quadrisphère (Événementiel), solides de Platon et tabourets (Décoration), puis chaise-dôme, love seat, « Dodôme », lounge. Certains produits n'ont pas de faces triangulaires (pentagones du dodécaèdre, carrés du cube).
- **Nomad Vision** : un onglet « showroom » pour présenter les produits sur tablette (gestes tactiles, paysage, hors ligne), avec un mode expert discret pour l'atelier. Image : une concession automobile, le showroom devant, l'atelier derrière.
- **Devis** générés depuis les calculs (métrage, coutures, temps, prix).
- **Fichier unique hors ligne** : à conserver pour la tablette et les salons, sauf contre-argument fort.

---

## 10. Les questions auxquelles on attend ta réponse

1. **Forme du livrable** : un HTML unique sans compilation, est-ce tenable à 1,3 Mo et 17 scripts, et au-delà ? Faut-il des sources séparées, assemblées par un script reproductible, en gardant un HTML unique comme produit final ?
2. **Le script principal** (2 588 lignes) : comment le découper, dans quel ordre, sans casser l'existant ? Quelles frontières ?
3. **État et identité** : faut-il un objet `DomeGeometry` (identité, paramètres, statut, sources), un `FabricSpec` et un `Panel` qui circulent entre modules, à la place des globales ? Comment migrer pas à pas ?
4. **Couches** : la séparation géométrie → textile → fabrication → design → présentation est-elle respectée ? Où est-elle violée (exemples précis) ?
5. **Multi-produits** : quelle structure pour accueillir Quadrisphère, Décoration, Kumiko et Nomad Vision sans que chaque produit réinvente sa 3D, ses fiches et son statut ? (modules « produit » branchables, contrat commun ?)
6. **Nomenclature** : les noms mélangent français et anglais (`etages`, `toile`, `peel`, `optim`, `nesting`, `designui`, `quadri-geom`, `Cover+`, `ouvertures`, `kumiko`), les identifiants HTML (`paramX`, `btnX`, `tabX`) et les noms de notions (« Cover+ » = module toile, « Base » = géométrie). Propose une convention claire et un glossaire de référence. Le nom « Cover+ » doit-il rester ?
7. **Deux moteurs 3D** (Three.js + moteur WebGL2 maison de secours) et un rendu 3D maison dans le script principal : faut-il unifier ?
8. **Mode opératoire** : développement par patchs de texte et réinjection, sans git ni build. Quels risques ? Quel processus minimal recommandes-tu pour un non-développeur qui travaille avec des IA en sessions successives (plusieurs en parallèle parfois) ?
9. **Tests** : la batterie est-elle bien organisée ? Que manque-t-il (intégration continue, tests de non-régression visuelle, données de référence) ?
10. **Données** : sauvegarde navigateur et `.json` de l'aménagement, versions des formats, sécurité des fichiers importés (`.json`, `.glb`).
11. **Garde-fous de justesse** : le système de statut 🟢🟡🟠🔴 est-il au bon endroit ? Doit-il vivre dans le moteur plutôt que dans l'interface ?

---

## 11. Livrables attendus

1. **Verdict** en 10 lignes maximum : sur la bonne voie, oui, non ou en partie ? Trois forces, trois risques.
2. **Avis sur l'architecture** (questions 1 à 5, 7), avec des exemples tirés du code (fichier, fonction).
3. **Nomenclature proposée** : convention de nommage, table « nom actuel → nom proposé », glossaire métier de référence.
4. **Arborescence cible** : un arbre de dossiers et fichiers des sources, et ce qui est assemblé dans le HTML final, avec la correspondance module actuel → emplacement cible.
5. **Mode opératoire recommandé** : le processus de travail, d'assemblage, de test et de publication, réaliste pour un artisan seul avec des IA.
6. **Plan de migration** en étapes testables, du plus sûr au plus risqué. Pour chaque étape : objectif, ce qui bouge, critère de réussite, risque. Les deux dômes de référence et la batterie de tests doivent rester verts à chaque étape.
7. **Ce qu'il ne faut surtout pas changer** (ce qui marche bien et doit être protégé).
8. **Questions pour Nathan** : chaque choix à trancher, avec les options et ta recommandation.

---

## 12. Style

- Français, phrases courtes, mots simples. Nathan est artisan, pas développeur.
- Une **analogie** pour chaque notion nouvelle (exemple : « la clé de découpe, c'est le numéro de commande sur un dossier d'atelier »).
- Des chiffres plutôt que des adjectifs.
- **Avant de commencer**, pose tes questions de clarification s'il manque quelque chose d'important.

---

## 13. Pour démarrer

1. Confirme que tu as reçu `nomadom-designer-beta.html` et que tu peux lire ses balises `<script>`. Dis si tu peux exécuter du code (Node, navigateur) ou seulement lire.
2. Résume en 10 lignes ce que fait l'application, pour montrer que tu l'as comprise.
3. Pose tes questions.
4. Attends la réponse, puis rends les livrables de la section 11.
