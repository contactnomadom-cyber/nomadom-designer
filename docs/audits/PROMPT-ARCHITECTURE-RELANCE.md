# RELANCE — COMPLÉTER LA REVUE D'ARCHITECTURE DE NOMAD'OM DESIGNER

> À coller dans la même conversation que ton rapport « Analyse technique et roadmap d'évolution ».
> Joindre de nouveau `nomadom-designer-beta.html` (bêta 0.9.11) si tu ne l'as plus.
> Rédigé le 30/10/2026.

---

## 1. Merci, et ce qu'on retient de ton rapport

On retient :
- le diagnostic : le fichier HTML unique peut rester ; le risque est la façon de le produire ;
- l'ordre : sécuriser (versions, assemblage automatique, tests) avant de restructurer, et restructurer avant d'ajouter des produits ;
- les objets métier, en particulier la séparation entre le patron théorique d'une pièce et sa disposition sur le rouleau ;
- le principe : aucune réécriture globale, des étapes testables.

**Décision de Nathan : on commence par Git et l'assemblage automatique du HTML.** Cette partie est donc tranchée. N'y reviens que si tu vois un risque précis.

---

## 2. Ce que ton rapport n'a pas vu : c'est déjà en place

Merci d'en tenir compte et de ne pas le reproposer comme à créer. Vérifie-le dans le fichier si tu le souhaites.

| Ton rapport propose | Déjà en place (0.9.11) | Où regarder |
|---|---|---|
| Créer des jeux de référence pour les deux dômes | Batterie existante : 2 dômes de référence, 867 combinaisons du moteur (topologie, Euler, base plate), 780 découpes de toile 1V–6V (planéité, coutures A/B, ourlet, rouleau), Arcs comparé à Antiprism, 9 tests navigateur (Playwright) | dossier `tests/` du projet (scripts fournis sur demande) |
| Invalider les calculs après chaque modification | Clé de découpe = identité complète du dôme + numéro de génération (`domeGen`, incrémenté à chaque recalcul) + réglages de toile | `cutKey()`, `domeGen`, `regenerate()` |
| Objet de paramètres textiles | `FABRIC` : objet figé (laize, lisière, largeur utile, tolérance, marges, rangée du bas), recalculé à un seul endroit | `readFabricParams()` |
| Clarifier blocage des exports et statuts | Statut 🟢🟡🟠🔴 géométrie + toile, affiché dans l'en-tête, l'onglet Base et les fiches ; 🔴, laize trop étroite ou morceau avec vague → patrons et exports refusés avec la raison | `geometryStatus()`, `fabricationStatus()`, `fabricationGate()`, `laizeFailures()` |
| Moteur protégé contre les géométries impossibles | Garde-fou : l'alignement de base qui retournerait des triangles est refusé (`ALIGN_FLIP`) | `dome-engine`, `generateDome()` |

Ce qui manque vraiment, et qu'on va faire : **lancer toute cette batterie en une seule commande sur le HTML assemblé**, et empêcher une publication si un test échoue.

---

## 3. Les questions restées sans réponse

Réponds à **chacune**, de façon concrète, avec des exemples tirés du fichier (nom de module, nom de fonction ; les numéros de ligne seuls ne suffisent pas). Pour chaque réponse, indique ton niveau de preuve ([CODE], [TESTÉ], [RECOMMANDATION], [À CONFIRMER]), comme dans ton rapport.

### Q1. Convention de noms
Aujourd'hui, les noms mélangent :
- français et anglais : `etages`, `toile`, `ouvertures` / `peel`, `optim`, `nesting`, `designui`, `quadri-geom` ;
- des noms de produit et des noms de fonction : « Cover+ » = module toile, « Base » = géométrie, « Design » = aménagement ;
- des préfixes d'interface : `paramX`, `btnX`, `tabX`, `statX`, `dsX` ;
- un japonais métier : `kumiko`, `waku`, `jigumi`, `tsukeko`.

Livre :
1. **Une convention écrite** : langue du code, langue de l'interface, forme des noms de fichiers, de modules, de fonctions, de constantes, d'identifiants HTML, de clés de sauvegarde.
2. **Une table « nom actuel → nom proposé »** pour les 17 modules, les 5 onglets et les objets globaux (`DomeEngine`, `Toile`, `CoverApp`, `CoverDesign`, `THREEKIT`, `QuadriGeom`…).
3. **Un avis sur « Cover+ »** : garder ce nom pour le module toile, le renommer, ou le réserver à une marque ? Avec le pour et le contre.
4. **Ce qu'il ne faut PAS renommer**, parce que le coût dépasse le gain (exemple possible : les termes métier que Nathan utilise en atelier).

Rappel : Nathan est francophone, artisan, pas développeur. Le code est écrit et relu par des IA.

### Q2. Arborescence cible
Livre :
1. **L'arbre complet du dépôt Git** (dossiers et fichiers), par exemple `src/`, `build/`, `tests/`, `docs/`, `vendor/`… Pour chaque dossier, une ligne : ce qu'il contient, qui a le droit d'y toucher.
2. **La correspondance** : chaque module actuel (les 17 scripts) → son emplacement cible.
3. **Le découpage du script principal** (2 588 lignes) : la liste des futurs fichiers, avec, pour chacun, les fonctions actuelles qui y vont (noms de fonctions) et l'ordre d'extraction, du plus sûr au plus risqué.
4. **Ce qui va dans le HTML final et ce qui n'y va pas** (tests, documents, sources d'Acidome, données de référence).
5. Où rangent-on les **données de référence** (dômes de référence, valeurs Domerama, valeurs Antiprism figées) et les **documents** (validation, audits, feuilles de route) ?

### Q3. Les moteurs 3D
Il y a aujourd'hui **trois rendus 3D** :
- Three.js r169, empaqueté (environ 730 ko), utilisé par `design3d-three` (Design) et `quadri-ui` (Quadrisphère) ;
- un moteur WebGL2 maison, `design3d` (514 lignes), gardé en secours si WebGL2 manque ;
- un rendu 3D maison dans le script principal : vue du dôme des onglets Base et Cover+, avec sélection de faces au clic et image plaquée.

Livre :
1. Faut-il **unifier** sur Three.js ? Ce qu'on gagne, ce qu'on risque (taille, performances sur tablette, hors ligne, sélection de faces).
2. Le moteur de secours est-il encore **utile** ? Dans quels cas réels (navigateurs, tablettes) ?
3. Un **plan de migration** par étapes, si tu recommandes d'unifier, avec un critère de réussite par étape.

### Q4. Où doit vivre le statut de confiance 🟢🟡🟠🔴
Aujourd'hui il est calculé dans l'interface (`geometryStatus()`, `fabricationStatus()` dans le script principal), à partir des paramètres du dôme et des contrôles des morceaux.

Livre :
1. Où le placer (moteur, objet `DomeGeometry`, module « validation » à part, autre) et pourquoi.
2. La forme de l'objet statut : niveau, raisons, sources, date de vérification ?
3. Comment représenter les **références** (Domerama, Antiprism, toile validée en atelier) pour qu'une nouvelle validation, par exemple une toile cousue qui tombe juste, fasse monter un dôme de 🟠 à 🟢 sans toucher au code.

### Q5. Plusieurs produits dans une même application
Produits prévus :
- dômes (Habitat) ;
- Quadrisphère (Événementiel, déjà là) ;
- solides de Platon et tabourets (Décoration, avec des faces pentagonales ou carrées) ;
- panneaux Kumiko ;
- chaise-dôme, love seat, « Dodôme » ;
- le showroom Nomad Vision sur tablette.

Livre :
1. **Le contenu exact du « noyau commun »** : liste des services partagés (3D, statut, fiches, export, projet, unités…).
2. **Le contrat d'un module produit** : ce qu'il doit fournir (paramètres, géométrie, pièces, statut, vue showroom) et ce qu'il reçoit du noyau. Donne-le sous forme d'une interface (liste de fonctions et de champs), sans code d'implémentation.
3. Comment **Nomad Vision** (mode client / mode expert) s'appuie sur ce contrat.
4. Ce qui reste **propre à chaque produit** et ne doit pas être mutualisé trop tôt.

### Q6. Objets métier : définitions précises
Ton rapport cite `DomeGeometry`, `FabricSpec`, `FabricPiece`, `Project`, `FabricationResult`.

Livre, pour chacun :
1. ses champs (nom, unité, obligatoire ou non) ;
2. qui le crée, qui le lit, qui n'a pas le droit de le modifier ;
3. sa correspondance avec l'existant (ex. `FabricPiece` ↔ la fiche patron actuelle `pieceSheet` d'`etages`) ;
4. l'ordre de migration, un objet à la fois, sans casser les deux dômes de référence.

### Q7. Mode opératoire avec Git, pour un artisan et des sessions d'IA
Contraintes réelles :
- Nathan ne tape pas de commandes Git ; ce sont des sessions d'IA qui travaillent dans le dépôt ;
- plusieurs sessions peuvent travailler en même temps (un incident a déjà eu lieu : deux versions publiées en parallèle, rattrapées par une fusion à la main) ;
- le produit final est un HTML unique publié comme page privée, et utilisé en local et bientôt sur tablette hors ligne.

Livre :
1. **Le processus pas à pas** : branche par chantier, assemblage, tests, revue, fusion, numéro de version, publication. Qui fait quoi (Nathan, la session d'IA).
2. **Les règles de collision** entre sessions.
3. **Le journal des changements** : où, sous quelle forme, visible dans l'appli ou non.
4. Ce que **Nathan doit vérifier lui-même** avant d'accepter une version (une liste courte, faisable en 5 minutes).

### Q8. Données et sécurité
1. Format du projet sauvegardé (`localStorage` clé `coverplus-design-v1`, export `.json`) : versionnage et migration des anciens fichiers.
2. Fichiers importés (`.json`, `.glb`) : quels contrôles minimum ? Des noms d'éléments sont insérés dans la page sans échappement (point relevé à l'audit) : comment le traiter ?
3. Préférences locales contre données de projet : la frontière.

---

## 4. Forme du rendu

- Un document par question (Q1 à Q8), ou un document unique avec une section par question.
- **Tableaux et arbres** plutôt que paragraphes.
- **Exemples réels** tirés du fichier, pas de généralités.
- Pour chaque recommandation : **le gain**, **le coût** (petit, moyen, gros) et **le risque**.
- Termine par **une liste de décisions à prendre par Nathan**, avec les options et ta recommandation.
- Français simple, une analogie par notion nouvelle.
- Pas de code d'implémentation (les interfaces et les arbres de dossiers sont bienvenus).

Si une question demande un test que tu ne peux pas exécuter, dis-le et marque la réponse [À CONFIRMER].
