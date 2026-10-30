**NOMAD'OM DESIGNER**

Revue d'architecture\
complémentaire --- Q1 à Q8

*Bêta 0.9.11 · document de travail · 30 octobre 2026*

  -----------------------------------------------------------------------
  **Décision déjà prise**             **Conséquence pour cette revue**
  ----------------------------------- -----------------------------------
  Commencer par Git et l'assemblage   Cette décision est considérée comme
  automatique du HTML.                tranchée. La revue se concentre sur
                                      les choix d'architecture qui
                                      viennent ensuite et sur la manière
                                      d'éviter les régressions.

  -----------------------------------------------------------------------

**Principe directeur : préserver ce qui fonctionne, rendre les
changements vérifiables, puis élargir le produit.**

# Comment lire ce document

  -----------------------------------------------------------------------
  **Marqueur**                        **Sens**
  ----------------------------------- -----------------------------------
  \[CODE\]                            Élément directement repéré dans le
                                      HTML examiné.

  \[TESTÉ\]                           Vérification réellement exécutée
                                      dans cet environnement.

  \[BRIEF\]                           Information fournie par Nathan,
                                      notamment sur les tests déjà
                                      présents.

  \[RECOMMANDATION\]                  Choix proposé ; ce n'est pas
                                      présenté comme déjà implémenté.

  \[À CONFIRMER\]                     Nécessite les scripts de tests, un
                                      navigateur ou une vérification
                                      complémentaire.
  -----------------------------------------------------------------------

\[TESTÉ\] Le HTML contient 17 blocs JavaScript non vides : 16 blocs
identifiés et le script principal sans identifiant. Une vérification
syntaxique Node.js des 17 blocs avait été exécutée sans erreur. Cela ne
prouve ni l'exactitude des calculs ni le bon fonctionnement des parcours
navigateur.

\[BRIEF\] La batterie existante comprend, selon les informations
fournies : 2 dômes de référence, 867 combinaisons du moteur, 780
découpes textiles, une comparaison Arcs/Antiprism et 9 tests Playwright.
Le dossier tests/ n'étant pas disponible dans les fichiers accessibles
lors de cette revue, ces nombres sont repris comme contexte fourni et
non comme résultats que j'ai relancés.

\[CODE\] Les noms de fonctions et d'objets ci-dessous sont des exemples
relevés dans le fichier. Les noms proposés sont une cible, pas une
description de l'état actuel.

# Q1 --- Convention de noms

## 1.1 Convention écrite proposée

  ------------------------------------------------------------------------
  **Élément**             **Convention cible**    **Exemple**
  ----------------------- ----------------------- ------------------------
  Langue du code          Anglais pour les        fabricationStatus →
                          identifiants techniques fabricationStatus() ou
                          et les API ; français   fabricationStatus en
                          dans les commentaires   transition ; commentaire
                          d'usage atelier quand   français accepté.
                          cela aide Nathan.       

  Interface               Français, vocabulaire   Base, Toile, Design,
                          d'atelier validé par    Quadrisphère,
                          Nathan.                 Informations.

  Fichiers                kebab-case en anglais   fabrication-status.js,
                          pour les nouveaux       dome-geometry.js.
                          fichiers de code.       

  Modules                 Nom de domaine stable,  fabrication,
                          pas de nom de marque ni dome-geometry,
                          de nom d'onglet.        project-store.

  Fonctions               camelCase, verbe +      readFabricParams(),
                          objet si action.        generateDome(),
                                                  validateProject().

  Constantes              UPPER_SNAKE_CASE pour   FABRIC, SEAM_PRESETS.
                          les constantes globales 
                          réellement immuables ;  
                          camelCase pour les      
                          objets de               
                          configuration.          

  Classes / types         PascalCase.             DomeGeometry,
                                                  FabricSpec, FabricPiece.

  IDs HTML                Préfixe de zone         tab-base, view-base,
                          facultatif mais         fabric-width ; ne pas
                          cohérent ; kebab-case   renommer en masse.
                          ou préfixes existants   
                          conservés pendant la    
                          transition.             

  Clés de sauvegarde      Préfixe produit + nom   nomadom.project.v2 ;
                          de domaine + version de migration explicite
                          schéma.                 depuis
                                                  coverplus-design-v1.
  ------------------------------------------------------------------------

\[RECOMMANDATION\] Ne pas faire une traduction mécanique de tous les
identifiants existants. L'important est que les nouveaux fichiers
suivent une convention et que les anciens noms soient renommés seulement
lorsqu'un chantier touche déjà le module. Gain : cohérence. Coût : petit
si appliqué progressivement, gros en renommage global. Risque : casser
des sélecteurs DOM, exports globaux ou tests.

## 1.2 Modules actuels → nom proposé

  ------------------------------------------------------------------------------------------------------------------------
  **Script actuel /    **Rôle observé**        **Nom cible proposé**                                **Décision**
  ID**                                                                                              
  -------------------- ----------------------- ---------------------------------------------------- ----------------------
  threekit-src         Bundle Three.js r169 et vendor/three/three-r169.bundle.js                    Garder version et
                       auxiliaires                                                                  licences explicites.

  dome-engine-src      Moteur géométrique ;    src/core/dome-geometry-engine.js                     Garder DomeEngine
                       export DomeEngine                                                            comme API publique
                                                                                                    temporaire.

  etages-src           Bandes, dépliage,       src/textile/pattern-generation.js                    Le nom « Étages » peut
                       pièces et pieceSheet                                                         rester dans les
                                                                                                    commentaires métier.

  toile-src            Plan textile, contours, src/textile/fabric-planning.js                       API cible
                       marges, groupement                                                           FabricPlanning ; alias
                       gabarits ; global Toile                                                      Toile pendant
                                                                                                    migration.

  export-src           Fiches de traçage       src/fabrication/tracing-export.js                    Éviter « Cover » dans
                       imprimables ; global                                                         le nom technique à
                       CoverExport                                                                  long terme.

  nesting-src          Placement de pièces sur src/fabrication/roll-nesting.js                      Nom déjà assez précis.
                       laize                                                                        

  optim-src            Optimisation du plan    src/fabrication/fabric-optimizer.js                  Distinguer optimiser
                       textile                                                                      des patrons et
                                                                                                    optimiser leur
                                                                                                    placement.

  info-src             Aide intégrée et aide   src/ui/help-content.js                               Le contenu reste
                       liée aux paramètres                                                          français.

  peel-src             Stratégies de           src/textile/development-strategies.js                « Peel » peut rester
                       découpe/développement                                                        dans l'historique, pas
                                                                                                    dans la nouvelle API.

  design-src           Modèle métier et        src/products/habitat/design-model.js                 Produit spécialisé,
                       fonctions d'aménagement                                                      pas noyau commun.

  design3d-src         Moteur WebGL2 maison    src/rendering/design-webgl-fallback.js               Ne pas supprimer avant
                                                                                                    mesure d'usage.

  design3d-three-src   Rendu Design avec       src/rendering/design-three-renderer.js               Candidat au renderer
                       Three.js                                                                     principal.

  ouvertures-src       Analyse et application  src/geometry/openings.js                             À terme, séparer
                       des ouvertures                                                               structure et textile
                                                                                                    si nécessaire.

  script principal     Orchestration           Plusieurs fichiers sous src/app/, src/geometry/,     Découpage progressif,
  sans ID              Base/Toile, rendu,      src/ui/ et src/validation/                           pas de renommage en
                       statuts, commandes                                                           bloc.

  designui-src         Interface               src/products/habitat/design-ui.js                    L'interface et le
                       d'aménagement,                                                               stockage devront être
                       sauvegarde, import GLB                                                       séparés plus tard.

  quadri-geom-src      Géométrie Quadrisphère  src/products/quadrisphere/quadrisphere-geometry.js   Reste produit
                       ; global QuadriGeom                                                          spécifique.

  quadri-ui-src        Interface et rendu      src/products/quadrisphere/quadrisphere-ui.js         API publique à
                       Quadrisphère ; global                                                        stabiliser sous
                       CoverQuadri                                                                  QuadrisphereProduct.
  ------------------------------------------------------------------------------------------------------------------------

## 1.3 Onglets et objets globaux

  -----------------------------------------------------------------------
  **Actuel**              **Nom d'interface / API **Précaution**
                          proposé**               
  ----------------------- ----------------------- -----------------------
  Base / tabBase /        Base / tab-base /       Ne pas modifier les IDs
  viewBase                view-base               en même temps que
                                                  l'extraction des
                                                  fonctions.

  Cover+ / tabCover /     Toile / tab-cover /     Changer le libellé
  viewCover               view-cover              visible d'abord ; IDs
                                                  lors d'un chantier
                                                  dédié.

  Design / tabDesign /    Design / tab-design /   Garder « Design » dans
  viewDesign              view-design             l'interface si c'est le
                                                  vocabulaire adopté.

  Quadrisphère /          Quadrisphère /          Les IDs actuels sont
  tabQuadri / viewQuadri  tab-quadrisphere /      référencés par
                          view-quadrisphere       quadri-ui.

  Informations / tabInfo  Informations / tab-info Libellé français
  / viewInfo              / view-info             conservé.

  DomeEngine              DomeEngine              Nom clair, conserver
                                                  pour compatibilité.

  Toile                   FabricPlanning à terme  Le nom français est
                          ; alias Toile           compréhensible pour
                          temporaire              Nathan ; API anglaise
                                                  pour cohérence
                                                  technique.

  CoverApp                NomadOmApp ou           Éviter de casser les
                          AppContext              modules qui appellent
                                                  CoverApp.dome(),
                                                  label(), showView().

  CoverDesign             HabitatDesignUI ou      Actuellement API
                          HabitatDesign           d'interface : show(),
                                                  domeChanged(), state(),
                                                  \_model().

  THREEKIT                ThreeKit ou             Bundle vendor global ;
                          ThreeRuntime            garder une seule source
                                                  de vérité.

  QuadriGeom              QuadrisphereGeometry    Renommage facile
                                                  seulement si l'API et
                                                  les tests sont mis à
                                                  jour ensemble.

  CoverExport             TracingExport           Nom technique
                                                  indépendant de la
                                                  marque.

  CoverQuadri             QuadrisphereUI          Même logique ; alias
                                                  temporaire si
                                                  nécessaire.
  -----------------------------------------------------------------------

## 1.4 « Cover+ » : avis

  ---------------------------------------------------------------------------
  **Option**        **Pour**          **Contre**        **Avis**
  ----------------- ----------------- ----------------- ---------------------
  Garder comme      Aucun changement  Le nom décrit mal Non recommandé à long
  module technique  immédiat ; terme  le textile et lie terme.
                    déjà connu.       la fonction à une 
                                      marque/onglet.    

  Le renommer «     Très              Langue mixte dans Bon libellé
  Toile »           compréhensible    le code et        d'interface ; moyen
                    pour Nathan et    confusion         comme nom de module.
                    l'atelier.        possible entre UI 
                                      et moteur.        

  Réserver Cover+ à Sépare marque et  Demande une       Recommandé : « Toile
  une marque ou     fonction métier ; petite transition » dans l'UI,
  gamme             facilite d'autres de vocabulaire.   \`fabric-planning\`
                    produits.                           dans le code, Cover+
                                                        uniquement si c'est
                                                        une marque/gamme
                                                        voulue.
  ---------------------------------------------------------------------------

\[RECOMMANDATION\] Ne pas renommer les termes métier d'atelier que
Nathan emploie réellement. Garder « ourlet », « lisière », « laize », «
patron », « gabarit », « base alignée », « Étages » comme termes
documentés. Pour Kumiko, conserver \`kumiko\`, \`waku\`, \`jigumi\`,
\`tsukeko\` dans le vocabulaire métier, avec un glossaire français dans
docs/glossary.md. Gain : moins de perte de sens. Coût : petit. Risque :
faible, à condition de définir chaque terme une seule fois.

# Q2 --- Arborescence cible

## 2.1 Arbre du dépôt

nomadom-designer/\
├── README.md \# démarrage, version publiée, procédure simple\
├── CHANGELOG.md \# changements visibles par version\
├── package.json \# scripts build/test ; versions des outils\
├── package-lock.json \# dépendances figées\
├── .gitignore \# fichiers temporaires, secrets, builds locaux\
├── src/\
│ ├── app/ \# orchestration, état courant, navigation\
│ ├── core/ \# types, unités, géométrie générique, événements\
│ ├── geometry/ \# ouvertures, structure, validation géométrique\
│ ├── textile/ \# toile, patrons, développés, marges, coutures\
│ ├── fabrication/ \# nesting, optimisation, fiches et exports\
│ ├── validation/ \# règles, preuves, statut de confiance\
│ ├── products/\
│ │ ├── habitat/ \# produit dôme + aménagement\
│ │ ├── quadrisphere/ \# géométrie et UI Quadrisphère\
│ │ ├── decoration/ \# futurs solides et tabourets\
│ │ ├── kumiko/ \# futurs panneaux Kumiko\
│ │ └── furniture/ \# chaise-dôme, love seat, Dodôme\
│ ├── rendering/ \# adaptateurs Three.js, fallback, sélection\
│ ├── ui/ \# onglets, composants, aide, fiches\
│ └── storage/ \# sauvegarde, import, migration de schéma\
├── vendor/\
│ └── three/ \# bundle Three.js r169 + licence et version\
├── data/\
│ ├── references/\
│ │ ├── domes/ \# dômes de référence immuables\
│ │ ├── domerama/ \# valeurs de comparaison figées + provenance\
│ │ ├── antiprism/ \# valeurs de comparaison figées + provenance\
│ │ └── workshop/ \# validations atelier documentées\
│ └── schemas/ \# schémas JSON de projet et de référence\
├── tests/\
│ ├── unit/ \# calculs purs, règles isolées\
│ ├── regression/ \# 867 moteurs, 780 découpes et cas de référence\
│ ├── browser/ \# Playwright : parcours réels\
│ ├── fixtures/ \# entrées et résultats attendus\
│ └── README.md \# une commande pour lancer toute la batterie\
├── docs/\
│ ├── architecture/ \# décisions d'architecture (ADR)\
│ ├── audits/ \# rapports d'audit datés\
│ ├── validation/ \# dossiers de preuve / critères d'acceptation\
│ ├── roadmap/ \# feuilles de route\
│ └── glossary.md \# vocabulaire français, Kumiko et unités\
├── scripts/\
│ ├── build.mjs \# assemble sources et vendor en HTML autonome\
│ ├── test-all.mjs \# lance les suites sur le HTML assemblé\
│ └── release.mjs \# refuse la publication si build/tests échouent\
└── dist/\
└── nomadom-designer.html \# artefact généré ; jamais édité à la main

\[RECOMMANDATION\] \`dist/\` est généré automatiquement. Selon le mode
de publication, on peut le versionner pour tracer exactement l'artefact
diffusé, mais il ne faut jamais y corriger du code à la main. Nathan n'a
pas à taper les commandes : la session IA exécute les scripts et lui
remet le fichier final et le rapport.

  -----------------------------------------------------------------------
  **Dossier**                         **Contenu / droit de modification**
  ----------------------------------- -----------------------------------
  src/                                Code source ; une session IA
                                      modifie seulement le périmètre de
                                      son ticket.

  vendor/                             Dépendances tierces figées ;
                                      modification seulement lors d'une
                                      mise à jour explicitement décidée.

  data/references/                    Références validées et immuables ;
                                      modification par PR dédiée avec
                                      provenance et approbation Nathan.

  tests/fixtures/                     Entrées et résultats attendus ;
                                      modification uniquement si la
                                      référence est revalidée et
                                      documentée.

  tests/                              Batterie existante à intégrer ; les
                                      sessions peuvent ajouter des tests,
                                      ne pas effacer une preuve sans
                                      justification.

  docs/                               Décisions, audits, validation,
                                      roadmap ; la session propriétaire
                                      du chantier met à jour les
                                      documents concernés.

  scripts/                            Build/test/release ; changement à
                                      haut risque, revue obligatoire.

  dist/                               HTML assemblé ; généré, pas édité à
                                      la main.
  -----------------------------------------------------------------------

## 2.2 Correspondance des modules

La correspondance module par module est donnée dans Q1. À retenir : les
modules purs (\`DomeEngine\`, \`Toile\`, \`Nesting\`, \`Optim\`,
\`Peel\`, \`Etages\`, \`Ouvertures\`, \`QuadriGeom\`) sont les candidats
les plus simples à déplacer en premier ; les modules UI et le script
principal sont plus risqués car ils dépendent du DOM et de globals.

## 2.3 Découpage du script principal : ordre du plus sûr au plus risqué

  -------------------------------------------------------------------------------------------------------
  **Ordre**         **Futur fichier**                     **Fonctions actuelles à     **Risque**
                                                          déplacer**                  
  ----------------- ------------------------------------- --------------------------- -------------------
  1                 src/validation/status-model.js        geometryStatus(),           Moyen : interfaces
                                                          fabricationStatus(),        et appels de rendu
                                                          nonFlatSheets(),            liés.
                                                          laizeFailures(),            
                                                          statusBadge(),              
                                                          renderStatus()              

  2                 src/fabrication/fabrication-gate.js   fabricationGate(),          Moyen : le blocage
                                                          render2DGeoBlocked(),       doit rester
                                                          render2DLaizeBlocked(),     identique.
                                                          render2DBlocked /           
                                                          render2DGeoBlocked selon    
                                                          nom exact                   

  3                 src/geometry/base-controls.js         baseParams(),               Faible à moyen :
                                                          syncBaseControls(),         dépend des IDs
                                                          domeramaName(),             HTML.
                                                          domeLabel(), partialLabel() 

  4                 src/geometry/dome-orchestrator.js     regenerate(),               Élevé : cœur du
                                                          computeOpenings(),          cycle de recalcul
                                                          openingsChanged(),          et de génération.
                                                          toggleStrut(),              
                                                          setOpenTrace(), openKeys()  

  5                 src/ui/base-visualization.js          renderBaseTrace(),          Élevé : événements
                                                          pickBaseStrut(),            et état du canvas.
                                                          initBaseTrace(),            
                                                          updateOpeningsReadout(),    
                                                          drawOpenings(),             
                                                          renderBase(), draw3DBase(), 
                                                          initBase3D()                

  6                 src/textile/fabric-context.js         readFabricParams(),         Élevé : cache,
                                                          cutKey(), seamWeight(),     paramètres et
                                                          ensureEtages(),             résultats
                                                          allPieces(), pieceByName(), dépendants.
                                                          sheetOf(), fitsLaize(),     
                                                          bottomSuggestion()          

  7                 src/fabrication/nesting-view.js       ensureNest(), rollPoint(),  Moyen à élevé :
                                                          render2DRoll(),             visualisation liée
                                                          render2DLaizeBlocked(),     aux résultats.
                                                          render2DFlatRows()          

  8                 src/fabrication/pattern-view.js       selectPiece(),              Moyen : sortie
                                                          pieceColor(), gabLabel(),   imprimée/atelier.
                                                          nominalLength(),            
                                                          polyPath(),                 
                                                          render2DEtages(),           
                                                          render2DPiece(),            
                                                          renderPieceSheetTable(),    
                                                          downloadSheetCsv(),         
                                                          printTracing()              

  9                 src/textile/peel-view.js              peelStrategy(), rigid(),    Moyen à élevé :
                                                          peelType(), syncPeelMenu(), choix de stratégie
                                                          buildPeelLayout(),          et rendu.
                                                          render2DPeel(),             
                                                          render2DFlat()              

  10                src/geometry/face-selection.js        pointInTriangle(), sign(),  Élevé : sélection à
                                                          pickFace(),                 la souris et
                                                          updateSelectionReadout(),   synchronisation des
                                                          panZoomActive()             vues.

  11                src/rendering/textured-dome.js        imageProj(),                Élevé : image
                                                          computeImageUV(),           plaquée et UV.
                                                          drawTexturedFace(),         
                                                          setDomeImage(),             
                                                          buildFlatLayout()           

  12                src/app/view-router.js                showView(), infoVisible(),  Moyen : navigation
                                                          renderInfo(),               et modules UI.
                                                          renderStatus() si non       
                                                          déplacée avant              

  13                src/geometry/comparison-tools.js      measurePlan(),              Moyen : résultats
                                                          runComparison(),            de comparaison et
                                                          comparisonHtml()            références.

  14                src/ui/canvas-rendering.js            project(), render(),        Élevé : fonctions
                                                          resizeCanvas(),             de rendu partagées,
                                                          shadeColor(),               risque de
                                                          flattenTriangle(),          dépendances
                                                          renderBaseTriangles(),      implicites.
                                                          render2DGroup(), render2D() 

  15                src/app/main.js                       Initialisation, écouteurs   Dernier :
                                                          d'événements, appels finaux orchestration
                                                          regenerate() et             restante, à
                                                          showView(\'base\')          extraire quand les
                                                                                      autres services ont
                                                                                      des interfaces.
  -------------------------------------------------------------------------------------------------------

\[À CONFIRMER\] La liste exacte doit être validée en faisant une passe
d'analyse des dépendances avant chaque extraction. Les fonctions
ci-dessus sont regroupées par responsabilité probable ; certaines
petites fonctions privées peuvent devoir rester avec leur appelant
plutôt que d'être exportées.

## 2.4 HTML final : inclus / exclu

  -----------------------------------------------------------------------
  **Dans le HTML final**              **Hors du HTML final**
  ----------------------------------- -----------------------------------
  Code applicatif compilé/assemblé.   Sources de développement séparées.

  Bundle Three.js r169 et dépendances Scripts de tests, Playwright et
  nécessaires hors ligne.             outils de build.

  CSS, interface, aide embarquée      Documents d'audit, feuilles de
  utile à l'utilisateur.              route, ADR et documentation
                                      interne.

  Données par défaut minimales        Sources de référence détaillées et
  nécessaires à l'application.        historiques de validation, sauf
                                      données strictement nécessaires au
                                      runtime.

  Éventuellement les références       Sources originales d'Acidome, notes
  compactes indispensables au statut  de recherche, outils de comparaison
  hors ligne.                         et données de tests exhaustives.
  -----------------------------------------------------------------------

\[RECOMMANDATION\] Les références utilisées en production doivent être
embarquées seulement si le statut doit fonctionner hors ligne. Les jeux
exhaustifs de tests et leurs valeurs attendues restent dans
\`data/references/\` et \`tests/fixtures/\`, avec une petite sélection
de données de validation dans le HTML si nécessaire.

Rangement : dômes de référence → \`data/references/domes/\`; valeurs
Domerama → \`data/references/domerama/\`; valeurs Antiprism figées →
\`data/references/antiprism/\`; preuves de toile validée en atelier →
\`data/references/workshop/\` avec date, configuration, résultat,
responsable et fichier de preuve. Audits → \`docs/audits/\`; validation
→ \`docs/validation/\`; feuilles de route → \`docs/roadmap/\`.

# Q3 --- Les trois moteurs de rendu 3D

## 3.1 Faut-il unifier sur Three.js ?

  -----------------------------------------------------------------------
  **Option**        **Gains**         **Risques /       **Avis**
                                      coûts**           
  ----------------- ----------------- ----------------- -----------------
  Un seul renderer  Une caméra,       Poids du bundle ; Cible
  Three.js          matériaux,        adaptation de     recommandée, mais
                    éclairage,        l'ancien rendu ;  migration
                    sélection et      performances à    progressive.
                    outils de         vérifier sur      
                    diagnostic        tablette ;        
                    communs ; moins   logique de        
                    de code dupliqué  sélection des     
                    ; expérience plus faces à           
                    cohérente.        reconstruire.     

  Garder les trois  Pas de chantier   Maintenance       Acceptable
  rendus            immédiat ; les    triple,           pendant la
                    vues Base/Toile   comportements     transition, pas
                    gardent leurs     visuels           comme
                    fonctions         divergents, bugs  architecture
                    actuelles ;       difficiles à      cible.
                    secours possible. reproduire.       

  Three.js +        Renderer          Deux chemins à    Bonne option
  fallback maison   principal riche,  tester ; fallback transitoire si le
  limité            secours minimal   peut dériver.     fallback est
                    pour cas ciblés.                    réellement
                                                        utilisé.
  -----------------------------------------------------------------------

\[CODE\] Le bundle \`threekit-src\` expose \`window.THREEKIT\` avec
\`THREE\`, \`GLTFLoader\`, \`RoomEnvironment\` et \`Sky\`.
\`design3d-three-src\` expose \`Design3DThree.create()\`. Le moteur
maison \`design3d-src\` expose \`Design3D.create()\`, \`buildScene()\`
et \`parseGLB()\`. Le script principal dessine aussi le dôme et la
sélection de faces pour Base/Toile.

\[À CONFIRMER\] La taille exacte du fichier final et les performances
sur les tablettes cibles doivent être mesurées. Le bundle repéré fait
environ 733 ko de texte/script dans le HTML ; cela ne correspond pas
directement à la taille compressée téléchargée ni à l'usage mémoire.

## 3.2 Le fallback WebGL2 est-il utile ?

\[RECOMMANDATION\] Ne pas le supprimer sur la seule base du code. Tester
d'abord les appareils réels : tablettes hors ligne ciblées, navigateurs
utilisés, disponibilité WebGL/WebGL2, mémoire disponible et qualité de
rendu. Three.js s'appuie aussi sur WebGL ; le moteur maison WebGL2 n'est
donc pas automatiquement un fallback si le contexte WebGL2 manque. Un
fallback utile doit fonctionner dans un cas précis où le renderer
principal ne fonctionne pas.

  -----------------------------------------------------------------------
  **Cas à tester**                    **Résultat attendu**
  ----------------------------------- -----------------------------------
  Tablette de showroom cible, mode en Rendu stable, navigation tactile et
  ligne                               temps d'ouverture acceptables.

  Même tablette, mode hors ligne      Aucune ressource externe
                                      indispensable ; GLB et textures
                                      locales fonctionnent.

  Appareil ancien ou WebGL limité     Soit rendu dégradé documenté, soit
                                      message clair ; ne pas prétendre à
                                      un fallback si le moteur dépend du
                                      même contexte.

  Sélection de faces dans Base/Toile  Même face sélectionnée que dans la
                                      version actuelle, y compris après
                                      zoom/rotation.

  Quadrisphère et Design              Même qualité minimale, sans fuite
                                      de ressources lors des changements
                                      d'onglet.
  -----------------------------------------------------------------------

## 3.3 Plan de migration

  ------------------------------------------------------------------------------------
  **Étape**               **Action**                           **Critère de réussite**
  ----------------------- ------------------------------------ -----------------------
  1                       Mesurer bundle, temps de démarrage,  Mesures de départ
                          mémoire et FPS sur appareils cibles. archivées ; appareils
                                                               et scénarios listés.

  2                       Créer une interface commune de       Design et Quadrisphère
                          renderer :                           utilisent la même
                          create/update/render/dispose/pick.   interface sans changer
                                                               leurs calculs.

  3                       Migrer d'abord Design ou             Tests Playwright et
                          Quadrisphère, pas Base/Toile en      captures de référence
                          premier.                             passent ; aucune
                                                               régression GLB.

  4                       Ajouter la sélection de faces et la  Tests manuels de
                          projection d'image dans              sélection sur les cas
                          l'architecture commune.              de référence ; UV et
                                                               face choisie
                                                               identiques.

  5                       Migrer le rendu Base/Toile après que Les interactions
                          les événements et sélections sont    existantes passent ;
                          couverts.                            aucune perte de
                                                               sélection de face.

  6                       Conserver ou supprimer le renderer   Suppression seulement
                          maison selon les mesures d'usage.    si aucun appareil cible
                                                               ne dépend de lui et que
                                                               le plan de secours est
                                                               documenté.
  ------------------------------------------------------------------------------------

  --------------------------------------------------------------------------
  **Recommandation**   **Gain**          **Coût**          **Risque /
                                                           garde-fou**
  -------------------- ----------------- ----------------- -----------------
  Ne pas unifier les   Réduit le risque  Moyen.            Il faudra
  trois rendus en une  de casser les                       maintenir deux
  seule opération.     interactions                        chemins durant la
                       atelier.                            migration.

  --------------------------------------------------------------------------

  --------------------------------------------------------------------------
  **Recommandation**   **Gain**          **Coût**          **Risque /
                                                           garde-fou**
  -------------------- ----------------- ----------------- -----------------
  Mesurer avant de     Décision basée    Petit à moyen.    Les tests doivent
  supprimer le         sur les appareils                   inclure le
  fallback.            réels.                              hors-ligne et les
                                                           appareils
                                                           anciens.

  --------------------------------------------------------------------------

# Q4 --- Où doit vivre le statut de confiance ?

## 4.1 Placement

\[CODE\] Aujourd'hui, \`geometryStatus()\`, \`fabricationStatus()\` et
\`fabricationGate()\` vivent dans le script principal.
\`fabricationGate()\` appelle les statuts et bloque les patrons/exports
lorsque certains cas sont refusés. Le commentaire dans
\`fabricationStatus()\` cite notamment des familles volontairement
refusées jusqu'à une étape ultérieure.

\[RECOMMANDATION\] Créer \`src/validation/validation-service.js\`,
indépendant de l'interface. Le moteur fournit les faits géométriques ;
les modules textile/fabrication fournissent les contrôles des pièces ;
le service de validation applique les règles et retourne un résultat
structuré. L'interface ne fait que présenter le statut et le gate
demande au service si l'action est autorisée.

  -----------------------------------------------------------------------
  **Composant**                       **Responsabilité**
  ----------------------------------- -----------------------------------
  DomeEngine / géométrie              Produire géométrie et métriques ;
                                      ne décide pas à lui seul si l'objet
                                      est « certifié ».

  Textile / fabrication               Produire contrôles : planéité,
                                      laize, chevauchement, ourlet,
                                      coutures, pièces manquantes.

  ValidationService                   Combiner les contrôles, les
                                      références et les règles de
                                      décision.

  UI                                  Afficher couleur, raisons et
                                      détails ; ne contient pas les
                                      règles de vérité.

  FabricationGate                     Autoriser/refuser une action à
                                      partir du résultat de validation
                                      courant.
  -----------------------------------------------------------------------

## 4.2 Forme de statut recommandée

  -----------------------------------------------------------------------
  **Champ**                           **Sens / exemple**
  ----------------------------------- -----------------------------------
  level                               green / yellow / orange / red ;
                                      code stable, libellé français à
                                      l'affichage.

  domain                              geometry, textile, fabrication,
                                      assembly ou overall.

  reasons\[\]                         Codes et messages compréhensibles :
                                      FABRIC_TOO_NARROW,
                                      NON_FLAT_PATTERN, ALIGN_FLIP.

  checks\[\]                          Chaque contrôle : id, résultat
                                      pass/warn/fail/not-run, valeur,
                                      seuil, unité.

  evidence\[\]                        Référence utilisée : id, version,
                                      provenance, date, fichier ou
                                      identifiant de test.

  verifiedAt                          Date de calcul/validation ; ce
                                      n'est pas une date de certification
                                      indépendante.

  inputFingerprint                    Signature des entrées pour prouver
                                      que le statut correspond aux
                                      paramètres actuels.

  generationId                        Génération géométrique à laquelle
                                      le statut s'applique.

  allowedActions\[\]                  Actions permises : view, pattern,
                                      print, export, fabrication.

  rulesVersion                        Version des règles de validation.
  -----------------------------------------------------------------------

Analogie : le statut est comme une fiche de contrôle d'atelier. La
couleur résume ; la liste des contrôles explique pourquoi ; la référence
indique avec quel gabarit ou quelle procédure le contrôle a été fait.

## 4.3 Références modifiables sans toucher au code

\[RECOMMANDATION\] Stocker les références comme données versionnées, pas
comme conditions codées en dur. Exemple de fiche : \`id\`, \`type\`
(Domerama / Antiprism / atelier), \`productFamily\`,
\`geometryFingerprint\`, \`fabricSpecFingerprint\`, \`measuredMetrics\`,
\`tolerances\`, \`result\`, \`evidenceFile\`, \`validatedBy\`,
\`validatedAt\`, \`status\` (draft/reviewed/approved/retired).

  -----------------------------------------------------------------------
  **Événement**                       **Traitement recommandé**
  ----------------------------------- -----------------------------------
  Dôme correspond à une référence     Ajouter une preuve de
  Domerama figée                      correspondance ; le statut ne
                                      devient vert que si les autres
                                      contrôles requis passent.

  Géométrie comparée à Antiprism      Enregistrer les écarts mesurés et
                                      les tolérances ; une comparaison ne
                                      vaut pas automatiquement validation
                                      atelier.

  Toile cousue et contrôlée en        Créer une preuve d'essai associée à
  atelier                             la géométrie exacte, aux paramètres
                                      de toile et aux tolérances. La
                                      règle de validation lit cette
                                      preuve.

  Nouvelle référence qui contredit    Ne pas écraser l'ancienne ; marquer
  l'ancienne                          la référence précédente comme
                                      remplacée et garder l'historique.
  -----------------------------------------------------------------------

\[À CONFIRMER\] Le fait qu'une toile cousue « tombe juste » ne suffit
pas à faire monter automatiquement tout un dôme au vert : il faut
définir le périmètre de la preuve (une pièce, une famille de pièces, un
dôme complet), les tolérances et la reproductibilité. L'ajout de données
peut faire évoluer le statut sans code seulement si les règles de statut
sont déjà génériques.

  --------------------------------------------------------------------------
  **Recommandation**   **Gain**          **Coût**          **Risque /
                                                           garde-fou**
  -------------------- ----------------- ----------------- -----------------
  Séparer calcul et    Statuts testables Moyen.            Risque de
  présentation du      hors interface et                   divergence
  statut.              mêmes règles                        transitoire :
                       partout.                            comparer ancien
                                                           et nouveau statut
                                                           sur tous les
                                                           fixtures.

  --------------------------------------------------------------------------

# Q5 --- Plusieurs produits dans une application

## 5.1 Contenu du noyau commun

  -----------------------------------------------------------------------
  **Service partagé**                 **Fonctions / données**
  ----------------------------------- -----------------------------------
  ProjectService                      Créer, charger, sauvegarder, migrer
                                      et exporter un projet ; identifiant
                                      et version de schéma.

  UnitService                         Conversions explicites : m, mm, m²,
                                      kg, degrés ; unités stockées avec
                                      les champs ou définies dans le
                                      contrat.

  GeometryRuntime                     Cycle de calcul, génération,
                                      identité de géométrie, générationId
                                      ; pas les règles spécifiques au
                                      dôme si elles ne sont pas communes.

  ValidationService                   Contrôles, preuves, statut et
                                      actions permises.

  RendererHost                        Initialiser, mettre à jour,
                                      sélectionner, libérer les
                                      ressources ; support Three.js.

  ProductRegistry                     Déclarer les produits disponibles
                                      et leur contrat.

  Sheet/ReportService                 Fiches techniques, fiches
                                      d'atelier, résumé et exports
                                      standards.

  AssetService                        Importer/valider les modèles GLB,
                                      textures et ressources.

  UI shell                            Navigation, panneaux de statut,
                                      messages d'erreur, modes
                                      client/expert.

  ReferenceService                    Charger les références approuvées
                                      et exposer leur provenance.
  -----------------------------------------------------------------------

\[RECOMMANDATION\] Ne pas appeler « noyau commun » tout ce qui est
actuellement dans le script principal. Un service ne devient commun que
si au moins deux produits ont réellement la même règle et le même
contrat.

## 5.2 Contrat d'un module produit

  -----------------------------------------------------------------------
  **Contrat : le produit fournit**    **Contrat : le noyau fournit**
  ----------------------------------- -----------------------------------
  productId, productVersion,          Projet, unités, stockage versionné,
  displayName, family                 registry.

  schema des paramètres et valeurs    Validation des entrées et migration
  par défaut                          de schéma.

  generateGeometry(params) →          Cycle de génération, générationId,
  géométrie + métriques               signature des entrées.

  getParts(geometry, params) → pièces Services d'export, fiches et format
  métier                              de résultat commun.

  validate(geometry, parts,           ValidationService qui combine les
  references) → contrôles produit     contrôles et calcule le statut
                                      global.

  createRenderer(host, mode) /        RendererHost, ressources et cycle
  updateRenderer / dispose            de vie.

  getShowroomModel(project, mode) →   Mode client/expert, limites
  scène simplifiée                    d'édition, chargement des
                                      ressources.

  getCapabilities() : supportsFabric, Le noyau n'affiche que les
  supportsOpenings, supportsGLB,      commandes prises en charge.
  supportsNesting...                  

  migrateProject(oldVersion, data) ou Stockage et migration globale du
  migrations déclarées                projet.
  -----------------------------------------------------------------------

Analogie : chaque produit est un stand dans un atelier commun. Le noyau
fournit l'électricité, les outils communs et les règles de sécurité ;
chaque stand garde ses machines et sa méthode de fabrication.

## 5.3 Nomad Vision : mode client et mode expert

  -----------------------------------------------------------------------
  **Mode**                **Accès**               **Comportement**
  ----------------------- ----------------------- -----------------------
  Client / showroom       Visualisation,          Données simplifiées,
                          rotation, choix de      pas d'accès aux
                          variantes autorisées,   réglages sensibles ni
                          résumé commercial.      aux commandes de
                                                  fabrication ; mode
                                                  tactile prioritaire.

  Expert / atelier        Paramètres complets,    Même projet et même
                          géométrie, validation   moteur produit ;
                          détaillée, pièces,      détails et actions
                          coûts/poids si          supplémentaires selon
                          disponibles, exports    permissions.
                          autorisés.              

  Passage client → expert Dépend du rôle et de la Ne doit pas créer une
                          protection du projet.   deuxième copie
                                                  divergente du modèle ;
                                                  le mode change les
                                                  capacités UI, pas la
                                                  vérité géométrique.
  -----------------------------------------------------------------------

\[RECOMMANDATION\] Nomad Vision doit consommer le contrat produit et un
\`ShowroomViewModel\`, pas appeler directement \`DomeEngine\`, \`Toile\`
ou des fonctions privées de l'onglet Base.

## 5.4 Ce qui doit rester spécifique

-   Dômes Habitat : fréquence, classes d'arêtes, coupes, dépliage,
    ourlets, coutures et limites de fabrication propres à la toile.

-   Quadrisphère : géométrie d'octaèdre/arches, supports, hubs,
    métriques événementielles et ses paramètres de structure.

-   Solides de Platon et tabourets : faces pentagonales/carrées,
    assemblages et charges propres au mobilier ; ne pas forcer un patron
    textile s'il n'existe pas.

-   Kumiko : vocabulaire, assemblages et contraintes propres au panneau
    ; ne pas imposer la géométrie d'un dôme.

-   Chaise-dôme, love seat, Dodôme : règles de mobilier, confort et
    structure à définir avant mutualisation.

-   Nomad Vision : parcours, ergonomie tactile et autorisations ; ce
    n'est pas un moteur de géométrie.

  --------------------------------------------------------------------------
  **Recommandation**   **Gain**          **Coût**          **Risque /
                                                           garde-fou**
  -------------------- ----------------- ----------------- -----------------
  Créer un noyau       Permet d'ajouter  Gros à moyen      Risque de
  commun limité aux    des produits sans terme.            surabstraction ;
  services réellement  coupler toutes                      commencer avec
  partagés.            leurs règles.                       Habitat et
                                                           Quadrisphère
                                                           comme cas de
                                                           comparaison.

  --------------------------------------------------------------------------

# Q6 --- Objets métier : définitions précises

\[RECOMMANDATION\] Les objets ci-dessous sont des contrats cibles. Ils
ne sont pas tous déjà présents sous ces noms dans la bêta.

## 6.1 DomeGeometry

  -------------------------------------------------------------------------
  **Champ**           **Unité /         **Obligatoire**   **Créé / lu /
                      format**                            modification**
  ------------------- ----------------- ----------------- -----------------
  id                  chaîne stable     Oui               Créé par
                                                          générateur ; lu
                                                          par tous ; jamais
                                                          modifié à la
                                                          main.

  params              paramètres        Oui               Créés par
                      versionnés                          contrôles/UI puis
                                                          validés ; moteur
                                                          lit une copie.

  generationId        entier            Oui               Incrémenté à
                                                          chaque
                                                          régénération
                                                          réussie.

  vertices            coordonnées m ou  Oui               Créés par moteur
                      mm, une unité                       ; consommateurs
                      unique documentée                   en lecture seule.

  faces / edges /     indices et IDs    Oui               Créés par moteur
  struts              stables                             ; pas de mutation
                                                          par UI.

  metrics             m, m², nombre de  Oui               Calculées par
                      faces, écarts                       moteur ou analyse
                                                          ; lecture seule.

  sourceFingerprint   hash/signature    Oui               Calculé
                      des paramètres                      automatiquement ;
                                                          invalide les
                                                          résultats dérivés
                                                          si changé.
  -------------------------------------------------------------------------

\[CODE\] Le moteur expose \`DomeEngine.generateDome()\`. Le script
principal possède \`regenerate()\`, \`domeNominal\`, \`domeStruct\` et
\`domeGen\`. \`window.CoverApp.dome()\` expose le dôme courant. L'objet
cible doit formaliser ces données sans déplacer immédiatement toute la
logique.

## 6.2 FabricSpec

  ----------------------------------------------------------------------------------
  **Champ**            **Unité**         **Obligatoire**   **Correspondance /
                                                           règle**
  -------------------- ----------------- ----------------- -------------------------
  fabricWidth          mm                Oui               Laize saisie via
                                                           \`paramFabricW\` dans
                                                           \`readFabricParams()\`.

  selvage              mm                Oui               Lisière ;
                                                           \`paramSelvage\`.

  usableWidth          mm                Calculé           Laize moins lisières ; ne
                                                           pas permettre une
                                                           modification manuelle.

  overlapTolerance     mm                Oui               Tolérance ;
                                                           \`paramOverlapTol\`.

  seamAllowances.A/B   mm                Oui               Réglages \`paramSeamA\`,
                                                           \`paramSeamB\`.

  hemAllowance         mm                Oui               Ourlet ; champ existant à
                                                           relier au contrat exact.

  bottomRow            enum /            Selon méthode     Paramètre de rangée du
                       identifiant                         bas.

  revision /           chaîne            Oui               Version des paramètres ;
  fingerprint                                              sert à invalider les
                                                           patrons.
  ----------------------------------------------------------------------------------

\[CODE\] \`readFabricParams()\` est le point central de lecture et crée
un objet \`FABRIC\` figé. \[RECOMMANDATION\] \`FabricSpec\` doit devenir
l'objet d'entrée immuable du moteur textile, sans lecture directe du DOM
par les modules de calcul.

## 6.3 FabricPiece

  ----------------------------------------------------------------------------------
  **Champ**         **Unité /         **Obligatoire**   **Correspondance**
                    format**                            
  ----------------- ----------------- ----------------- ----------------------------
  pieceId           chaîne stable     Oui               ID distinct du nom
                                                        d'affichage.

  name              texte atelier     Oui               Nom actuel \`pc.name\` / nom
                                                        de fiche.

  sourceFaces       liste             Oui               Traçabilité vers la
                    d'indices/IDs de                    géométrie.
                    faces                               

  outline           coordonnées 2D,   Oui               Contour théorique développé.
                    mm                                  

  seams / hem       mm + type         Oui               Marges de couture et ourlet
                                                        ajoutés par les fonctions
                                                        textiles.

  flatCheck         résultat +        Oui               Correspond au contrôle
                    erreur, unité                       \`check.flat\` produit dans
                    définie                             \`pieceSheet()\`
                                                        d'\`etages\`.

  gabaritId /       identifiant       Non               Correspond aux groupes
  mirrorOf                                              gabarits et \`gabMirror\` de
                                                        \`Toile.groupGabarits()\`.

  placement         coordonnées sur   Non               Ne doit pas être dans la
                    rouleau, mm                         géométrie théorique de la
                                                        pièce.
  ----------------------------------------------------------------------------------

Point fondamental : \`FabricPiece\` décrit la pièce théorique.
\`NestingPlacement\` décrit où elle est posée sur le rouleau. Ce sont
deux objets séparés : déplacer une pièce sur le rouleau ne doit pas
changer son patron.

## 6.4 Project

  -----------------------------------------------------------------------
  **Champ**         **Format**        **Obligatoire**   **Règle**
  ----------------- ----------------- ----------------- -----------------
  schemaVersion     entier            Oui               Version du format
                                                        sauvegardé.

  projectId         UUID/chaîne       Oui               Stable au fil des
                                                        sauvegardes.

  productId         chaîne            Oui               habitat,
                                                        quadrisphere,
                                                        kumiko, etc.

  createdAt /       ISO 8601          Oui               Dates générées
  updatedAt                                             par
                                                        l'application.

  parameters        objet validé par  Oui               Paramètres métier
                    produit                             ; pas les données
                                                        calculées
                                                        redondantes si
                                                        elles peuvent
                                                        être régénérées.

  designState       objet versionné   Selon produit     État actuel du
                                                        Design ;
                                                        actuellement
                                                        \`version: 1\`,
                                                        \`items\`,
                                                        \`openings\`,
                                                        \`mezz\`,
                                                        \`style\`.

  assets            liste de          Non               GLB, images ;
                    ressources                          limites de taille
                    référencées                         et de type.

  provenance        version app +     Oui               Pour comprendre
                    règles                              avec quelle
                                                        version le projet
                                                        a été créé.
  -----------------------------------------------------------------------

\[CODE\] \`designui-src\` utilise \`localStorage\` sous la clé
\`coverplus-design-v1\`, charge seulement un objet dont \`version ===
1\`, puis combine ses données avec \`Design.defaultState()\`. Le format
est donc aujourd'hui une version simple du sous-état Design, pas
nécessairement un format de projet complet multi-produits.

## 6.5 FabricationResult

  -------------------------------------------------------------------------
  **Champ**          **Format / unité** **Obligatoire**   **Règle**
  ------------------ ------------------ ----------------- -----------------
  inputFingerprint   signature          Oui               Dôme + toile +
                                                          règles +
                                                          stratégie.

  generationId       entier             Oui               Doit correspondre
                                                          au dôme courant.

  pieces\[\]         FabricPiece        Oui               Patrons calculés.

  nesting            NestingResult      Selon besoin      Placement sur
                                                          rouleau séparé
                                                          des pièces.

  checks\[\]         liste de contrôles Oui               Planéité, laize,
                                                          chevauchement,
                                                          etc.

  status             ValidationStatus   Oui               Résultat de
                                                          validation, pas
                                                          une simple
                                                          couleur UI.

  createdAt /        date + version     Oui               Traçabilité et
  engineVersion                                           reproduction.
  -------------------------------------------------------------------------

## 6.6 Qui crée, qui lit, qui modifie ?

  ---------------------------------------------------------------------------
  **Objet**           **Créé par**        **Lecteurs**      **Qui ne doit pas
                                                            le modifier**
  ------------------- ------------------- ----------------- -----------------
  DomeGeometry        DomeEngine /        Ouvertures,       UI, export et
                      générateur produit  textile, rendu,   modules de
                                          validation        présentation.

  FabricSpec          Project/UI input    Textile,          Moteurs de calcul
                      adapter             fabrication,      ; ils reçoivent
                                          validation        une copie figée.

  FabricPiece         PatternGeneration   Export, nesting,  Nesting ne doit
                      (\`Etages\` +       fiches atelier,   pas modifier son
                      \`Toile\`)          validation        contour.

  Project             ProjectService      Produit actif,    Modules de rendu
                                          UI, import/export ; ils ne
                                                            sauvegardent pas
                                                            directement leurs
                                                            mutations.

  FabricationResult   Pipeline de         Validation, UI,   Interface et
                      fabrication         export            renderer ;
                                                            résultats
                                                            recalculés si
                                                            signature
                                                            périmée.
  ---------------------------------------------------------------------------

## 6.7 Ordre de migration sans casser les références

1.  1\. Formaliser \`FabricSpec\` autour de \`readFabricParams()\` sans
    changer les calculs ; comparer les sorties sur les 2 dômes et les
    780 cas.

2.  2\. Ajouter \`inputFingerprint\` et \`generationId\` au résultat
    existant ; comparer à \`cutKey()\` et \`domeGen\` avant de remplacer
    quoi que ce soit.

3.  3\. Formaliser \`FabricPiece\` en adaptateur autour des résultats
    \`pieceSheet()\` / \`allPieces()\` ; garder les anciens champs
    disponibles.

4.  4\. Formaliser \`FabricationResult\` comme enveloppe des résultats
    actuels ; nesting reste une sous-partie distincte.

5.  5\. Formaliser \`DomeGeometry\` comme enveloppe de \`domeNominal\` /
    \`domeStruct\` ; ne pas déplacer tout le moteur au même moment.

6.  6\. Créer \`Project\` et migrer la sauvegarde Design en dernier,
    avec migration de \`version: 1\`.

Critère à chaque étape : aucune différence non expliquée sur les jeux de
référence ; si une différence est voulue, elle doit être documentée
comme changement de résultat attendu.

# Q7 --- Mode opératoire Git pour Nathan et les sessions d'IA

## 7.1 Processus concret

  -----------------------------------------------------------------------------
  **Étape**               **Session IA**                **Nathan**
  ----------------------- ----------------------------- -----------------------
  1\. Ouvrir le chantier  Vérifie la branche de base,   Donne l'objectif et
                          lit les règles du dépôt et    valide le périmètre.
                          choisit un périmètre limité.  

  2\. Créer une branche   Crée une branche unique, ex.  N'a pas besoin de taper
                          \`fix/status-stale-result\`   Git.
                          ou                            
                          \`feature/build-test-all\`.   

  3\. Modifier            Ne touche qu'aux fichiers du  Peut demander un point
                          chantier ; annonce les        d'étape si le chantier
                          fichiers sensibles et         est long.
                          n'écrase jamais une autre     
                          branche.                      

  4\. Construire          Lance l'assemblage du HTML    Ne reçoit pas un HTML
                          depuis les sources.           modifié manuellement.

  5\. Tester              Lance toute la batterie sur   Reçoit un résumé
                          l'artefact assemblé ;         succès/échec, pas
                          conserve rapport et logs.     seulement « ça marche
                                                        ».

  6\. Revue               Présente les changements, les Accepte ou demande une
                          risques et les différences    correction.
                          par rapport à la version de   
                          base.                         

  7\. Fusion              Une seule session             Autorise la fusion si
                          intégratrice fusionne après   le périmètre est clair.
                          tests verts et vérification   
                          qu'aucune branche concurrente 
                          n'a avancé la base.           

  8\. Version             Met à jour \`CHANGELOG.md\`,  Confirme la version
                          le numéro de version et les   bêta/stable à afficher.
                          métadonnées de build.         

  9\. Publication         Reconstruit depuis le commit  Vérifie la checklist de
                          fusionné, relance tests,      5 minutes.
                          publie le seul HTML issu de   
                          ce commit.                    
  -----------------------------------------------------------------------------

## 7.2 Règles de collision entre sessions

-   Une branche par chantier ; aucun travail directement sur la branche
    de publication.

-   Une seule session « intégratrice » est autorisée à fusionner et
    publier à un instant donné.

-   Le HTML généré est un artefact : une session ne le modifie pas
    manuellement et ne publie pas un fichier construit avant la dernière
    fusion.

-   Si deux sessions doivent modifier le même fichier sensible (script
    principal, build, données de référence, tests de référence), elles
    se coordonnent avant de commencer ; sinon, elles séparent les
    périmètres.

-   Avant fusion, l'intégratrice vérifie que la branche cible n'a pas
    avancé ; si elle a avancé, rebase/merge et tests complets à nouveau.

-   Une modification de référence ou d'attendu de test doit expliquer
    pourquoi l'ancienne valeur était incorrecte ou pourquoi le
    comportement attendu change.

-   Aucun test ne peut être supprimé ou ignoré juste pour rendre la
    batterie verte sans approbation et explication écrite.

## 7.3 Journal des changements

  -------------------------------------------------------------------------------
  **Support**                     **Contenu**             **Visible dans
                                                          l'application ?**
  ------------------------------- ----------------------- -----------------------
  CHANGELOG.md                    Résumé utilisateur par  Résumé des changements
                                  version : nouveautés,   significatifs, oui si
                                  corrections,            utile.
                                  limitations.            

  docs/architecture/ADR-xxxx.md   Décisions               Non.
                                  d'architecture,         
                                  contexte, options,      
                                  conséquences.           

  docs/validation/                Références, tests,      Partiellement : raisons
                                  tolérances, preuves et  de validation peuvent
                                  résultats.              être affichées.

  Rapport CI/build                Commit, version, build, Non, mais attaché à la
                                  tests exécutés, échecs. livraison.

  Panneau À propos / Informations Version affichée, date  Oui.
                                  de build,               
                                  éventuellement          
                                  identifiant court du    
                                  commit.                 
  -------------------------------------------------------------------------------

## 7.4 Checklist Nathan --- 5 minutes

-   Ouvrir l'application et vérifier le numéro de version affiché.

-   Ouvrir chacun des cinq onglets : Base, Toile/Cover+, Design,
    Quadrisphère, Informations.

-   Charger les deux dômes de référence et vérifier que les statuts et
    résultats principaux sont ceux attendus.

-   Modifier un paramètre simple, vérifier que le dôme et les statuts se
    mettent à jour ; revenir au réglage de référence.

-   Essayer un cas volontairement refusé : le motif doit être lisible et
    l'export doit rester bloqué.

-   Dans Design, vérifier une sauvegarde/recharge et, si le chantier
    concerne GLB, importer un modèle de test.

-   Lire le résumé des tests : résultat global vert, aucun test ignoré
    sans raison.

\[RECOMMANDATION\] Nathan ne doit pas avoir à évaluer un diff de code.
Son rôle est de vérifier les usages métier et les résultats de référence
; la session IA porte la responsabilité des tests, de la traçabilité et
de la reconstruction.

  --------------------------------------------------------------------------
  **Recommandation**   **Gain**          **Coût**          **Risque /
                                                           garde-fou**
  -------------------- ----------------- ----------------- -----------------
  Une seule session    Évite les deux    Petit.            Peut ralentir les
  intégratrice et une  versions publiées                   fusions quand
  seule publication à  en parallèle.                       plusieurs
  la fois.                                                 chantiers sont
                                                           prêts.

  --------------------------------------------------------------------------

  --------------------------------------------------------------------------
  **Recommandation**   **Gain**          **Coût**          **Risque /
                                                           garde-fou**
  -------------------- ----------------- ----------------- -----------------
  Toujours             Le HTML publié    Petit.            Une publication
  reconstruire après   correspond                          manuelle reste
  la fusion.           exactement au                       possible si la
                       code testé.                         procédure n'est
                                                           pas automatisée ;
                                                           automatiser
                                                           ensuite.

  --------------------------------------------------------------------------

# Q8 --- Données et sécurité

## 8.1 Versionnage des projets

\[CODE\] La clé actuelle est \`coverplus-design-v1\`. \`load()\` accepte
uniquement \`s.version === 1\`; \`save()\` sérialise \`st\` avec
\`JSON.stringify\`. L'état par défaut vient de \`Design.defaultState()\`
et comprend notamment \`version: 1\`, \`items\`, \`openings\`, \`mezz\`
et \`style\`.

\[RECOMMANDATION\] Conserver une migration explicite :

  -----------------------------------------------------------------------
  **Version**                         **Traitement**
  ----------------------------------- -----------------------------------
  Ancien stockage                     Lire en lecture seule, valider les
  \`coverplus-design-v1\`, payload    champs, convertir vers le nouveau
  version 1                           modèle Project v2.

  Nouveau format                      Exporter un JSON avec
                                      \`schemaVersion\`, \`productId\`,
                                      \`projectId\`, \`appVersion\`,
                                      \`createdAt\`, \`updatedAt\`,
                                      \`parameters\`, \`designState\`,
                                      \`assets\` et \`provenance\`.

  Chargement d'un ancien JSON         Détecter sa version ; exécuter une
                                      migration connue ; montrer un
                                      avertissement si conversion avec
                                      perte.

  Version inconnue plus récente       Refuser l'écriture destructrice ;
                                      proposer de conserver le fichier
                                      original et afficher que la version
                                      n'est pas prise en charge.

  Sauvegarde locale                   Ne pas écraser les anciennes
                                      données avant que la migration soit
                                      validée ; garder un backup ponctuel
                                      ou proposer une copie exportée.
  -----------------------------------------------------------------------

Ne pas renommer la clé locale tout de suite sans migration.
L'application peut lire l'ancienne clé, convertir vers
\`nomadom.project.v2\`, vérifier l'objet, écrire la nouvelle valeur puis
seulement ensuite marquer l'ancienne comme migrée. Une sauvegarde de
projet doit pouvoir être exportée indépendamment du navigateur.

## 8.2 Contrôles minimum sur les fichiers importés

  ----------------------------------------------------------------------------
  **Entrée**              **Contrôles minimum**        **Réaction en cas
                                                       d'échec**
  ----------------------- ---------------------------- -----------------------
  JSON                    Taille maximale ; parse JSON Refuser l'import avec
                          ; schéma/version connus ;    message précis ; garder
                          types et champs attendus ;   le projet courant
                          bornes numériques ;          intact.
                          longueurs de chaînes ;       
                          limites du nombre            
                          d'items/ouvertures/modèles ; 
                          valeurs finies ; aucune      
                          mutation avant validation    
                          complète.                    

  GLB                     Taille maximale ;            Refuser le fichier ou
                          signature/structure valide ; le charger en mode
                          parseur glTF ; limites du    isolé ; ne pas
                          nombre de nœuds, primitives, enregistrer avant
                          sommets, matériaux, textures validation.
                          et dimensions ; ressources   
                          embarquées uniquement si     
                          hors ligne ; gérer les       
                          erreurs et délais.           

  Nom de fichier / nom    Traiter comme texte non      Afficher avec
  d'objet                 fiable ; limiter longueur ;  textContent ; échapper
                          supprimer caractères de      si rendu HTML
                          contrôle si nécessaire.      absolument nécessaire.

  Erreur du parseur       Ne pas injecter directement  Afficher du texte, pas
                          le message d'erreur dans     du HTML.
                          \`innerHTML\`.               
  ----------------------------------------------------------------------------

## 8.3 Injection HTML : traitement

\[CODE\] Un exemple concret se trouve dans \`designui-src\` :
\`drawAll()\` construit \`\$(\'dsDome\').innerHTML\` en concaténant
\`window.CoverApp.label()\`. Dans le code actuel, \`CoverApp.label()\`
provient de \`domeLabel()\` et est construit à partir de paramètres de
l'interface ; ce n'est donc pas la preuve d'une exploitation à distance.
C'est néanmoins une frontière HTML à traiter proprement.

\[RECOMMANDATION\] Pour du texte dynamique, créer les éléments avec
\`document.createElement()\` et affecter \`textContent\`. Si un fragment
HTML est nécessaire, les valeurs dynamiques doivent être échappées selon
le contexte (texte HTML, attribut, URL), pas par un échappement
improvisé. Appliquer la même revue aux noms importés, \`file.name\`,
noms d'objets GLB, libellés de pièces et messages d'erreur.

\[À CONFIRMER\] Il faut faire une revue ciblée de toutes les
concaténations dans \`innerHTML\`, des templates HTML produits par
\`Export.tracingDocument()\` et des données importées. Je n'affirme pas
ici qu'une vulnérabilité exploitable a été démontrée ; le point est de
supprimer les insertions non maîtrisées.

## 8.4 Préférences locales vs données du projet

  -----------------------------------------------------------------------
  **Préférences locales (appareil)**  **Données du projet (exportables)**
  ----------------------------------- -----------------------------------
  Onglet ouvert au démarrage, niveau  Paramètres géométriques, paramètres
  de détail UI, qualité 3D,           textiles, ouvertures, items Design,
  préférences de caméra, dernière     niveaux/mezzanine, assets
  aide consultée.                     nécessaires, version de schéma et
                                      provenance.

  Peuvent rester dans localStorage    Doivent survivre à un changement de
  sans export de projet.              tablette et être exportables en
                                      JSON.

  Ne doivent pas modifier le résultat Doivent influencer les calculs et
  métier.                             porter un fingerprint pour
                                      invalider les résultats dérivés.
  -----------------------------------------------------------------------

  --------------------------------------------------------------------------
  **Recommandation**   **Gain**          **Coût**          **Risque /
                                                           garde-fou**
  -------------------- ----------------- ----------------- -----------------
  Ne pas traiter la    Projets           Moyen.            La migration doit
  sauvegarde locale    transférables                       préserver les
  comme l'unique copie entre navigateur                    projets
  du projet.           et tablette.                        existants.

  --------------------------------------------------------------------------

  --------------------------------------------------------------------------
  **Recommandation**   **Gain**          **Coût**          **Risque /
                                                           garde-fou**
  -------------------- ----------------- ----------------- -----------------
  Remplacer les        Réduit le risque  Moyen.            Attention à ne
  concaténations HTML  d'injection et                      pas casser les
  dynamiques par du    rend l'intention                    fragments qui ont
  texte sûr.           explicite.                          réellement besoin
                                                           de mise en forme.

  --------------------------------------------------------------------------

# Décisions à prendre par Nathan

  -----------------------------------------------------------------------------------
  **Décision**      **Options**          **Recommandation**         **Coût / risque**
  ----------------- -------------------- -------------------------- -----------------
  Noms techniques   Tout français / tout Anglais technique pour les Coût petit à
                    anglais technique /  nouveaux identifiants,     moyen ; risque de
                    conserver mélange    français dans l'UI et le   casser des
                                         glossaire ; migration      références si
                                         progressive.               renommage global.

  Cover+            Nom de module / nom  Réserver Cover+ à une      Coût petit ;
                    de gamme / remplacer marque/gamme ; « Toile »   risque faible si
                    partout              dans l'interface ;         les IDs ne
                                         \`fabric-planning\` en     changent pas en
                                         code.                      même temps.

  Statut confiance  Rester dans le       Service de validation      Coût moyen ;
                    script principal /   indépendant, statuts       risque de
                    service indépendant  détaillés avec preuves     divergence
                                         versionnées.               pendant la
                                                                    migration.

  Rendu 3D          Garder 3 / unifier   Migrer progressivement     Coût moyen à gros
                    tout de suite /      vers Three.js après        ; risque élevé si
                    migrer               mesures sur tablette et    sélection de
                    progressivement      tests d'interaction.       faces est migrée
                                                                    trop tôt.

  Références        Conditions codées en Références dans            Coût moyen ;
                    dur / données        \`data/references/\`, avec risque de preuves
                    versionnées          provenance, tolérances et  trop générales si
                                         statut d'approbation.      périmètre mal
                                                                    défini.

  Architecture      Un seul gros modèle  Noyau commun limité aux    Coût gros à terme
  multi-produits    / noyau et modules   services réellement        ; risque de
                    produits             partagés ; chaque produit  surabstraction à
                                         fournit un contrat.        limiter.

  Projets           Garder version 1 /   Format Project versionné   Coût moyen ;
  sauvegardés       migrer sans version  et migration explicite de  risque de perte
                    / schéma versionné   \`coverplus-design-v1\`.   si l'ancien
                                                                    stockage est
                                                                    écrasé trop tôt.

  Publication       Fusion/publication   Une seule session          Coût petit ;
                    libre par session /  intégratrice,              risque faible,
                    intégratrice unique  reconstruction après       légère attente
                                         fusion, publication        entre chantiers.
                                         bloquée si tests rouges.   

  Fallback 3D       Supprimer / garder   Mesurer sur les tablettes  Coût petit à
                    sans mesure / tester réelles avant décision.    moyen ; risque de
                    sur appareils cibles                            supprimer un
                                                                    chemin utile sans
                                                                    le savoir.
  -----------------------------------------------------------------------------------

# Plan d'action proposé --- les trois prochains chantiers

  -----------------------------------------------------------------------
  **Chantier**            **Périmètre**           **Critère de sortie**
  ----------------------- ----------------------- -----------------------
  A. Build/test/release   Une commande construit  Test complet lancé sur
                          le HTML final, lance la l'artefact final ;
                          batterie existante et   échec artificiel
                          renvoie un rapport ;    confirmé comme
                          publication impossible  bloquant.
                          si un test échoue.      

  B. Validation et        Documenter les statuts  Ancien et nouveau
  références              existants, formaliser   statut comparés sur les
                          les codes de raisons,   fixtures ; aucune
                          enregistrer provenance  divergence inexpliquée.
                          et fingerprints sans    
                          changer les règles      
                          métier initiales.       

  C. Contrats métier      Introduire              Les 2 dômes et toutes
                          \`FabricSpec\` puis     les suites de référence
                          \`FabricPiece\` en      gardent les mêmes
                          adaptateurs autour des  résultats.
                          structures existantes.  
  -----------------------------------------------------------------------

**Conclusion**

La prochaine étape n'est pas une refonte visuelle ni une abstraction
générale de tous les produits. C'est de rendre la construction et les
tests fiables, de sortir progressivement la logique de validation de
l'interface, puis de stabiliser les objets qui relient géométrie,
textile et fabrication. Les données de référence doivent rester
immuables et auditables. Chaque changement doit être petit, testé sur le
HTML assemblé et accompagné d'une preuve que les deux dômes de référence
n'ont pas régressé.
