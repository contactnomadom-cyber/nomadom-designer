
// ---------------------------------------------------------
// info.js — textes de l'onglet « Informations » : explication de chaque
// option et de chaque réglage de Cover+. Contenu statique (HTML).
// Chaque section a un identifiant (#aide-...) : les « ? » à côté des
// réglages ouvrent directement la bonne section.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const SECTIONS = [
    { id: 'aide-comparatif', title: 'Lire le tableau comparatif (toile coupée, rouleau, utilisation…)', html: `
      <p>Image : on découpe des biscuits dans une pâte étalée. La <b>toile coupée</b> est la pâte qui finit dans les biscuits. Le <b>rouleau</b> est toute la pâte qu'il a fallu étaler, chutes comprises. L'<b>utilisation</b> est la part de cette pâte qui a vraiment servi.</p>
      <dl>
        <dt id="aide-col-morceaux">Morceaux</dt><dd>Le nombre de pièces de toile à découper.</dd>
        <dt id="aide-col-gabarits">Gabarits</dt><dd>Le nombre de formes différentes à tracer. Les morceaux identiques, ou symétriques (gabarit retourné ⇋), partagent un même gabarit.</dd>
        <dt id="aide-col-aretes">Arêtes cousues</dt><dd>Le nombre d'arêtes du dôme où deux morceaux se cousent, fermetures d'anneau comprises, sur le total des arêtes intérieures. C'est la quantité de couture à faire.</dd>
        <dt id="aide-col-coupee">Toile coupée (m²)</dt><dd>La surface totale des morceaux découpés, <b>marges et ourlet compris</b>. Ce n'est pas encore ce qu'on achète. La différence avec la surface du dôme (environ 45 m² en 3V Ø5 m) correspond aux marges. Plus il y a de coutures, plus il y a de marges, donc plus de toile coupée.</dd>
        <dt id="aide-col-rouleau">Rouleau (m)</dt><dd>La longueur de rouleau à dérouler pour placer tous les morceaux, d'après le plan de coupe automatique (rotation 0°/180°, jamais retourné). <b>C'est le métrage à acheter</b>, et la colonne à regarder pour le coût de la toile.</dd>
        <dt id="aide-col-rouleau-m2">Rouleau (m²)</dt><dd>La même chose en surface : longueur × laize. Pratique si le fournisseur vend au m².</dd>
        <dt id="aide-col-utilisation">Utilisation</dt><dd>La part de la largeur utile du rouleau (laize moins les lisières) qui finit dans les morceaux : toile coupée ÷ (rouleau × largeur utile). Le reste est de la <b>chute</b> : les vides entre les morceaux, souvent des triangles ou des bandes trop étroites pour y placer autre chose. Les longues bandes courbées laissent beaucoup de vide, les morceaux courts et droits s'emboîtent mieux.</dd>
        <dt id="aide-col-long">Plus long morceau</dt><dd>La longueur du plus grand morceau à manipuler, marges comprises.</dd>
        <dt id="aide-col-controles">Contrôles</dt><dd><b>Sans vague</b> : chaque morceau se pose sur la structure sans pli. <b>Laize</b> : chaque morceau tient dans la largeur utile.</dd>
      </dl>
      <p><b>En résumé :</b> peu de toile coupée ne veut pas dire peu de rouleau. Une découpe avec peu de coutures coupe moins de toile mais se range mal, et le rouleau s'allonge. C'est le compromis que cherche « Moins de toile ».</p>` },
    { id: 'aide-dome', title: 'Onglet Base : fréquence, méthode, symétrie, découpage, alignement', html: `
      <p>L'onglet <b>Base</b> règle la géométrie du dôme, comme le plan de la charpente. Cover+ (la toile) et Design (l'aménagement) suivent automatiquement. Le dôme part d'un <b>icosaèdre</b>, un solide à 20 faces triangulaires, gonflé sur une sphère. Chaque grande face est ensuite recoupée en petits triangles.</p>
      <dl>
        <dt>Fréquence (1V à 8V)</dt><dd>En combien de morceaux on coupe chaque côté des 20 grands triangles. Le nombre de triangles augmente avec le carré de la fréquence : 20 × V² pour la sphère entière. Comme un carrelage : des carreaux deux fois plus petits, c'est quatre fois plus de carreaux. Plus la fréquence est haute, plus le dôme est rond, plus les montants sont courts et nombreux.</dd>
        <dt>Méthode de subdivision</dt><dd><b>Chords</b> (cordes égales) : on coupe chaque côté plat en parts égales, puis on pousse les points sur la sphère. <b>Arcs</b> (arcs égaux) : on coupe l'arc de sphère en angles égaux, ce qui donne des triangles plus réguliers. <b>Kruschke</b> (3V et 4V) : Chords légèrement corrigé pour qu'une rangée entière de nœuds tombe dans un plan, ce qui donne une <b>base plate</b> sans retouche pour les coupes prévues (3V 5/12 et 7/12, 4V 3/8 et 5/8, en Pentad) ; pour les autres coupes, cocher « Aligner la base ».</dd>
        <dt>Symétrie (axe)</dt><dd>Ce qui se trouve au sommet du dôme. <b>Pentad</b> : un nœud à 5 branches, comme un dé posé sur une pointe ; le dôme se compose de 5 parts identiques, sur lesquelles s'appuient les découpes « Moins de gabarits » et la pelure en étoile. <b>Triad</b> : une face au sommet, en 3 parts. <b>Cross</b> : une arête au sommet, en 2 parts.</dd>
        <dt>Découpage</dt><dd>La part de la sphère conservée, avec la même liste qu'ACIDOME : 1/4, puis de 2 en 2 jusqu'aux 3/4, et la sphère entière. En Pentad, on garde des rangées entières de triangles depuis le sommet. En Triad et Cross, on coupe par un plan horizontal. Le « 7/12 » d'ACIDOME en 3V correspond au « 5/9 » de Domerama : 105 triangles dans les deux cas.</dd>
        <dt>Aligner la base</dt><dd>Quand la base n'est pas plate, les nœuds du bord sont ramenés à la même hauteur en glissant sur la sphère. Les longueurs des montants du bas changent un peu (de nouvelles longueurs apparaissent). Disponible aussi en Kruschke : sur les coupes déjà plates rien ne bouge (moins de 0,02 mm), sur les autres la base devient plate (statut 🟡 : calculé, sans référence indépendante). Pas proposé pour l'hémisphère ni la sphère entière. Si l'alignement retournait des triangles (certaines coupes Triad / Cross ou de haute fréquence), il est refusé et le dôme est calculé sans alignement. Le chiffre « Base plate » de l'onglet Base indique l'écart restant.</dd>
        <dt>Diamètre</dt><dd>Le diamètre de la sphère, au centre des nœuds. Le diamètre au sol est plus petit dès qu'on garde moins d'une demi-sphère.</dd>
        <dt>Classes A, B, C…</dt><dd>Les longueurs de montant distinctes, de la plus courte à la plus longue, avec le « facteur de corde » (longueur ÷ rayon), comme sur Domerama. En 3V Kruschke 7/12 Ø5 m : 30×A, 35×B, 80×C et 20×D.</dd>
        <dt>Validation</dt><dd>Le calcul a été comparé à l'ACIDOME d'origine, exécuté tel quel, sur 571 combinaisons (fréquences 1V à 8V, quatre méthodes, trois symétries, tous les découpages, avec et sans base alignée). Les nombres de nœuds, de montants et de faces et toutes les longueurs sont identiques, à moins d'un milliardième du rayon.</dd>
      </dl>` },
    { id: 'aide-coupes', title: 'Noms de coupe : Acidome / Nomad’Om et Domerama', html: `
      <p>Le même dôme porte souvent deux noms. Acidome (et cette appli) compte la coupe en quarts de fréquence (p / 4V) ; Domerama la nomme d’après la hauteur de sphère. Le menu « Découpage » et l’en-tête affichent les deux quand la correspondance est connue (symétrie Pentad).</p>
      <table><tr><th>Fréquence</th><th>Nom Acidome / Nomad’Om</th><th>Méthode</th><th>Nom Domerama</th><th>Faces</th><th>Montants</th></tr><tr><td>1V</td><td>3/4</td><td>Chords</td><td>1V</td><td>15</td><td>25</td></tr><tr><td>2V</td><td>1/2</td><td>Chords</td><td>2V 1/2</td><td>40</td><td>65</td></tr><tr><td>3V</td><td>5/12</td><td>Chords</td><td>3V 3/8</td><td>75</td><td>120</td></tr><tr><td>3V</td><td>5/12</td><td>Kruschke</td><td>3V 4/9 Kruschke</td><td>75</td><td>120</td></tr><tr><td>3V</td><td>7/12</td><td>Chords</td><td>3V 5/8</td><td>105</td><td>165</td></tr><tr><td>3V</td><td>7/12</td><td>Kruschke</td><td>3V 5/9 Kruschke</td><td>105</td><td>165</td></tr><tr><td>4V</td><td>1/2</td><td>Chords</td><td>4V 1/2</td><td>160</td><td>250</td></tr><tr><td>4V</td><td>3/8</td><td>Kruschke</td><td>4V 5/12 Kruschke (à confirmer)</td><td>120</td><td>190</td></tr><tr><td>4V</td><td>5/8</td><td>Kruschke</td><td>4V 7/12 Kruschke (à confirmer)</td><td>200</td><td>310</td></tr><tr><td>5V</td><td>9/20</td><td>Chords</td><td>5V 7/15</td><td>225</td><td>350</td></tr><tr><td>6V</td><td>1/2</td><td>Chords</td><td>6V 1/2</td><td>360</td><td>555</td></tr></table>
      <p>Correspondance établie en comparant les nombres de faces, de montants et de nœuds, et les facteurs de corde. « À confirmer » : déduit de l’emplacement de la base, la page Domerama n’a pas pu être lue. Le 3V 4/9 Kruschke est confirmé par la page Domerama (30 A, 30 B, 50 C, 10 D).</p>` },
    { id: 'aide-structure', title: 'Structure : avec ou sans connecteur', html: `
      <dl>
        <dt>Avec connecteur</dt><dd>La toile repose au niveau des nœuds. Le patron est coté de centre de nœud à centre de nœud, avec les longueurs de Domerama.</dd>
        <dt>Sans connecteur (GoodKarma)</dt><dd>La toile repose sur la face extérieure des montants. La surface à couvrir est donc plus grande, et le patron est agrandi : chaque face est poussée vers l'extérieur de la <b>hauteur d'appui</b>. En 3V Ø5 m avec 120 mm, les longueurs augmentent de 3,6 à 5,3 % selon la classe, et le diamètre au sol de 244 mm. L'encart jaune donne le détail.</dd>
        <dt>Hauteur d'appui</dt><dd>La distance, perpendiculaire à la face, entre le plan qui passe par les nœuds calculés et le dessus des montants. Elle vaut 120 mm par défaut ; c'est à vérifier sur ta structure.</dd>
      </dl>` },
    { id: 'aide-toile', title: 'Toile : laize, lisière, tolérance', html: `
      <dl>
        <dt>Laize</dt><dd>La largeur du rouleau de toile.</dd>
        <dt>Lisière inutilisable</dt><dd>La bande perdue sur chaque bord du rouleau. La <b>largeur utile</b> vaut laize − 2 × lisière, soit 1 480 mm pour une laize de 1 500 et une lisière de 10. C'est le <b>contour de coupe</b> de chaque morceau, marges comprises, qui doit y tenir.</dd>
        <dt>Tolérance de chevauchement</dt><dd>Utilisée par le mode « Développer » et par la découpe en étages. C'est le recouvrement accepté quand un groupe de triangles déplié revient sur lui-même. Les découpes par étage n'en ont jamais besoin.</dd>
      </dl>` },
    { id: 'aide-decoupe', title: 'Découpe des étages : les 4 stratégies', html: `
      <p>Les quatre stratégies coupent le dôme <b>par étages</b>. Un étage est une rangée de triangles entre deux couronnes de nœuds, en dents de scie. Les coupes tombent toujours sur une arête montante, jamais au milieu d'un triangle. Le sommet est fait de 5 triangles séparés. Le tableau comparatif ci-dessus donne les chiffres pour ta configuration.</p>
      <dl>
        <dt>Moins de morceaux</dt><dd>Chaque étage est coupé en morceaux aussi longs que la laize le permet. C'est le <b>moins de coutures</b>. En contrepartie, les longues bandes sont courbées, comme un abat-jour déroulé à plat, et elles laissent beaucoup de toile perdue sur le rouleau.</dd>
        <dt>Moins de gabarits</dt><dd>On profite des 5 parts identiques du dôme : chaque étage est coupé de la même façon dans chaque part. Chaque morceau a 4 jumeaux, tracés avec le <b>même gabarit</b>. Il y a un peu plus de coutures, mais beaucoup moins de formes différentes à tracer, et les morceaux identiques se rangent bien sur le rouleau.</dd>
        <dt>Moins de toile (compromis)</dt><dd>On essaie, étage par étage, plusieurs longueurs de morceau (1, 2, 3… triangles, en découpe libre ou en parts identiques). Chaque essai est placé sur le rouleau, et on garde la combinaison au meilleur score : <b>mètres de rouleau + poids × nombre d'arêtes cousues</b>. Les morceaux courts sont presque droits : ils s'emboîtent tête-bêche sur le rouleau, mais ajoutent des coutures.</dd>
        <dt>Poids d'une couture</dt><dd>Le nombre de centimètres de toile qu'on accepte de payer pour éviter une couture. À 0, on cherche le moins de toile, quel que soit le nombre de coutures. Plus le poids est grand, plus la découpe se rapproche de « Moins de morceaux ». Il vaut 10 cm par défaut.</dd>
        <dt>Triangle par triangle</dt><dd>Chaque triangle est un morceau. Les triangles se rangent très bien sur le rouleau, mais chacun prend une marge sur ses 3 côtés : on coupe plus de toile au total, et toutes les arêtes sont à coudre.</dd>
        <dt>Rangée du bas</dt><dd>La rangée du bas est presque droite une fois dépliée. Elle peut se couper en un seul <b>anneau</b>, d'environ 16 m en 3V Ø5 m, dont les deux bouts se recousent ensemble, ou en 5 morceaux identiques.</dd>
      </dl>` },
    { id: 'aide-coutures', title: 'Coutures, marges et ourlet', html: `
      <dl>
        <dt>Ligne de couture et contour de coupe</dt><dd>La <b>ligne de couture</b> (points P) correspond exactement à la forme du dôme. Le <b>contour de coupe</b> (points C) est la ligne de couture agrandie des marges. C'est sur ce contour qu'on coupe.</dd>
        <dt>Côté A (recouvrant) et côté B (recouvert)</dt><dd>À chaque couture, un morceau recouvre l'autre, comme les tuiles d'un toit. Entre deux étages, c'est toujours le morceau du dessus qui recouvre, pour que l'eau ruisselle par-dessus la couture. Sur une coupe montante, le début d'un morceau recouvre la fin du précédent. Chaque couture a exactement un côté A et un côté B.</dd>
        <dt>Couture simple</dt><dd>Même marge des deux côtés (20 / 20 mm par défaut).</dd>
        <dt>Couture rabattue</dt><dd>Le côté A, plus large (40 mm), se replie sur le côté B (20 mm). C'est la couture la plus courante sur l'acrylique.</dd>
        <dt>Recouvrement / soudure</dt><dd>Le côté A recouvre le côté B, qui n'a pas de marge (40 / 0 mm), pour une soudure ou un collage.</dd>
        <dt>Ourlet bas</dt><dd>La marge ajoutée sur le bord bas du dôme, 50 mm par défaut.</dd>
      </dl>` },
    { id: 'aide-modes', title: 'Les vues et modes de développement', html: `
      <dl>
        <dt>Triangle</dt><dd>Sans sélection : les <b>triangles de base</b>, c'est-à-dire les formes distinctes qui composent le dôme, avec leurs côtés, leurs angles et leur nombre. Avec une sélection : chaque triangle choisi est déplié seul.</dd>
        <dt>Développer</dt><dd>Déplie à plat un groupe de triangles choisi à la main.</dd>
        <dt>Étages (par rangée)</dt><dd>La découpe choisie dans « Découpe des étages ». Les morceaux de même gabarit ont la même couleur. Un clic sur un morceau ouvre sa <b>fiche patron</b> : cotes, angles, plis, marges et export.</dd>
        <dt>Plan de coupe (rouleau)</dt><dd>Place automatiquement les morceaux sur le rouleau. Les morceaux tournent seulement de 0° ou 180°, pour garder le droit-fil, et ne sont jamais retournés, car la toile a un endroit. Deux morceaux peuvent partager un trait de coupe.</dd>
        <dt>⇊ Vue aplatie (cotes)</dt><dd>Tous les morceaux <b>exacts</b> de la découpe choisie, à plat, avec toutes les cotes : classe et longueur nette de chaque bord (ligne de couture, sans marge), plis, et en zoomant (molette) les nœuds N, les côtés A/B et les voisins à coudre. Un clic sur un morceau ouvre sa fiche. Rien n'est étiré, contrairement à l'aplatissement d'ACIDOME (onglet Tent), qui écrase tout le dôme en un seul morceau comme une peau d'orange écrasée sur la table.
          <br><b>En « Moins de gabarits » et « Triangle par triangle » : pelure d'orange.</b> On déroule la toile depuis le sommet. Chaque étage reste entier (ses morceaux côte à côte, comme sur le dôme) et pend sous l'étage du dessus, accroché par <b>une seule arête</b> (trait vert, la charnière). Toutes les charnières sont alignées sur un même côté du dôme, et tous les étages sont ouverts sur le côté opposé, toujours entre deux morceaux. Le reste de chaque couture d'étage s'ouvre en éventail à plat et se referme quand on pose la toile. C'est l'ordre de pose : présenter le sommet, caler chaque point noir sur son nœud N, puis descendre étage par étage depuis la charnière en refermant l'éventail de chaque côté, coller, puis couper. Les contours de coupe se superposent là où les marges se recouvrent : le côté A passe sur le côté B, comme des tuiles. Les pointillés montrent les montants sous la toile.
          <br><b>Type d'ouverture</b> (menu en haut à gauche de la vue) : où l'on fend la pelure. Les fentes passent toujours sur une arête montante, entre deux triangles, et sont réparties de façon égale grâce aux 5 parts identiques du dôme. Le pentagone du sommet reste au centre.
          <br>• <b>1 fente</b> : un seul côté ouvert, toujours entre deux morceaux ; les étages pendent les uns sous les autres.
          <br>• <b>5 fentes — axe des arêtes d'origine</b> : étoile à 5 pétales, fendue dans l'axe des 5 arêtes de l'icosaèdre qui partent du sommet (lignes droites et faciles à repérer).
          <br>• <b>5 fentes — décalées d'un demi-secteur</b> : même étoile tournée de 36° ; les pétales sont centrés sur les arêtes d'origine.
          <br>• <b>10 fentes</b> : les deux combinées, pétales plus étroits (l'éventail s'ouvre moins, la pose est plus facile). L'étage 1 garde 5 fentes : il n'a que 5 triangles accrochés au pentagone par une arête.
          <br>• <b>5 fentes en spirale</b> : les fentes tournent un peu à chaque étage, comme des pales d'éolienne.
          <br>Seuls les types possibles pour ce dôme sont proposés. Un morceau traversé par une fente est dessiné en <b>rouge</b> avec la ligne <b>✂</b> où il faudrait le couper ; la découpe n'est pas modifiée.
          <br>Pour les autres découpes, dont les grands morceaux font plusieurs fois le tour, la vue reste par rangée.</dd>
        <dt>🖼 Image sur le dôme</dt><dd>Plaque une image (JPG, PNG, GIF) sur le dôme 3D, pour visualiser un motif, un logo ou une couleur de toile. <b>Vue du ciel</b> : comme une carte posée sur le dôme vu d'en haut, le centre de l'image tombe au sommet et le bord de l'image au bas du dôme (même projection qu'ACIDOME). <b>Panorama</b> : l'image fait le tour du dôme comme une bande, le haut de l'image au sommet et le bas au sol. « ✕ Image » la retire.</dd>
        
      </dl>` },
    { id: 'aide-notions', title: 'Notions utiles', html: `
      <dl>
        <dt>Gabarit</dt><dd>Une forme tracée une fois, puis réutilisée pour couper tous les morceaux identiques. Un morceau symétrique se trace avec le même gabarit retourné, marqué ⇋.</dd>
        <dt>Sans vague (développable)</dt><dd>Un morceau se pose sur la structure sans faire de pli s'il se plie seulement le long des montants, sans entourer complètement un nœud. Tous les morceaux des découpes par étage sont contrôlés : longueurs conservées, aucun nœud entouré, aucun recouvrement.</dd>
        <dt>Défaut angulaire</dt><dd>Autour d'un nœud, les angles des triangles font un peu moins de 360° : c'est ce qui donne la courbure. En 3V, il manque 5,7 à 8,9° par nœud. Ce manque est repris par les coutures qui se rejoignent sur le nœud.</dd>
        <dt>Pli</dt><dd>À l'intérieur d'un morceau, la toile se plie au droit de chaque montant : de 12 à 14° en 3V, de 18 à 22° en 2V.</dd>
        <dt>Anneau</dt><dd>Un morceau qui fait tout le tour d'un étage. Ses deux extrémités se recousent : c'est la couture de fermeture.</dd>
        <dt>Utilisation de la toile</dt><dd>La part du rouleau réellement occupée par les morceaux. Le reste est de la chute.</dd>
        <dt>Arêtes cousues</dt><dd>Le nombre d'arêtes du dôme où deux morceaux se cousent, fermetures d'anneau comprises. Le total des arêtes intérieures, 150 en 3V 5/9, correspond au triangle par triangle.</dd>
      </dl>` },
    { id: 'aide-design', title: 'Onglet Design : aménagement intérieur', html: `
      <p>Image : on regarde le dôme d'en haut comme une planche d'architecte. Le sol est le polygone de la base, et on y pose des meubles découpés à l'échelle.</p>
      <dl>
        <dt>Plan par niveau</dt><dd>Le rez-de-chaussée, et la mezzanine si elle est activée. Le trait épais est la paroi au sol (ou à la hauteur du plancher de la mezzanine), les traits gris sont les montants vus du dessus. En style <b>noir et blanc</b> c'est un plan d'architecte ; en style <b>couleur</b>, un plan plus parlant pour un client.</dd>
        <dt>Hauteur sous plafond</dt><dd>La paroi descend vers le bord : on ne tient pas debout partout. Le pointillé « debout » entoure la zone où il y a au moins 1,80 m sous la toile, le pointillé « assis » celle où il y a au moins 1,00 m. Ces contours sont calculés sur les facettes réelles du dôme.</dd>
        <dt>Éléments</dt><dd>Lits, canapé, tables, poêle, cuisine, sanitaires, escalier, échelle, formes libres. On les glisse sur le plan (pas de 5 cm). Pour les faire pivoter, on attrape la <b>poignée ↻</b> qui apparaît devant l'élément sélectionné : elle se cale tous les 15°, et tourne librement en tenant <b>Maj</b>. Elle marche à la souris comme au doigt sur tablette. <b>R</b> tourne aussi de 15°. Pour effacer un élément, on le <b>lâche hors du dôme</b> (il s'affiche barré en rouge, et un bouton « Annuler » permet de le récupérer pendant quelques secondes), ou on appuie sur <b>Suppr</b> ; et le panneau sous le plan règle l'angle et les dimensions exactes. Un élément devient <b>rouge ⚠</b> s'il touche la paroi, déborde de la mezzanine, ou s'il est plus haut que la place disponible au-dessus de lui (sous la mezzanine, c'est le dessous du plancher qui compte).</dd>
        <dt>Ouvertures</dt><dd>Porte, fenêtre et baie se posent sur un côté du bord bas, et on les fait glisser le long de la paroi. Comme la toile penche vers l'intérieur, une ouverture haute dépasse la toile au bord : la ligne ⓘ indique la saillie du cadre (sas) qu'il faut prévoir.</dd>
        <dt>Mezzanine</dt><dd>On règle la hauteur du plancher, son épaisseur et sa forme : demi-cercle (coupe droite à une profondeur donnée depuis la paroi), secteur (part de gâteau), ou côtés droits. Le plancher est coupé par la paroi à sa hauteur. Les chiffres indiquent la surface où l'on tient debout ou assis au-dessus.</dd>
        <dt>Rendu 3D</dt><dd>Le rendu utilise <b>Three.js</b>, le moteur 3D de référence du web, intégré au fichier : il marche sans internet. Il apporte des matériaux physiques (bois, tissus, métal, céramique émaillée, verre), un plancher en vraies lames de bois, un ciel réaliste, un éclairage d'ambiance, des ombres douces du soleil (la structure dessine son treillis d'ombre sur le plancher) et une toile translucide. Sur un appareil sans WebGL2, un moteur simplifié prend le relais. « Qualité : rapide » retire les ombres pour un ordinateur lent. Le soleil suit la caméra pour que les ombres restent visibles. Deux styles : <b>réaliste</b>, ou <b>maquette d'architecte</b> (blanc et bois clair, comme une maquette en carton). « Toile en coupe » ouvre le dôme côté spectateur pour voir dedans ; « transparente » ou « structure seule » au choix. Souris : glisser pour tourner, clic droit (ou Maj) pour déplacer, molette pour zoomer, double-clic pour recadrer.</dd>
        <dt>Meubles en 3D</dt><dd>Chaque élément est modélisé en détail et suit ses dimensions : lit avec cadre, tête de lit, matelas, couette repliée et oreillers ; canapé avec accoudoirs et coussins ; poêle avec vitre et conduit jusqu'à la toile ; cuisine avec caissons, plan bois, évier, robinet, plaques ; douche vitrée ; toilette sèche ; escalier avec limons et main courante jusqu'à la mezzanine… La mezzanine reçoit un garde-corps sur ses bords libres et des poteaux.</dd>
        <dt>Importer un modèle (.glb)</dt><dd>Dans le panneau d'un élément, « Importer un .glb… » remplace le meuble modélisé par un modèle 3D au format glTF binaire (.glb), le standard du web. Le modèle garde ses couleurs et sa texture et prend ses dimensions réelles ; on peut ensuite les modifier, le modèle suit. Sources gratuites et libres de droits (licence CC0) : les kits de meubles de Kenney (kenney.nl) ou de Quaternius (quaternius.com). Les modèles compressés (Draco) ne sont pas lus : les réexporter sans compression. Les modèles importés sont gardés dans l'aménagement et dans le fichier .json exporté.</dd>
        <dt>Sauvegarde et impression</dt><dd>L'aménagement est gardé dans le navigateur et peut s'exporter en fichier .json pour l'archiver ou le transmettre. « Imprimer les plans » donne une page A4 par niveau à l'échelle 1:50 (1:100 pour un grand dôme), à imprimer à 100 %.</dd>
      </dl>` },
    { id: 'aide-export', title: 'Fiches et export', html: `
      <dl>
        <dt>Fiche patron</dt><dd>Pour chaque morceau : la vue cotée, les points de la ligne de couture et du contour de coupe, les bords (longueur, classe, morceau voisin, côté A ou B, marge), les plis, les triangles, la position sur le rouleau et le gabarit. Elle s'exporte en CSV.</dd>
        <dt>Fiche de traçage</dt><dd>Une page A4 par gabarit (ou par morceau), à imprimer ou à enregistrer en PDF. 1) La <b>longueur de coupon</b> à couper dans le rouleau, sur toute la laize. 2) Le traçage de la ligne de couture par <b>deux méthodes croisées</b>, à faire toutes les deux pour vérifier : <b>à la corde</b> (deux arcs) et <b>à l'équerre</b> (X le long de la lisière depuis K1, Y perpendiculaire), avec la conduite à tenir en cas d'écart. Corde : depuis les deux coins du coupon le long de la lisière (K1, K2), puis point par point, chaque point étant le croisement de deux arcs dont le côté est indiqué. 3) Les marges et le trait de coupe (points C, eux aussi à la corde). On y trouve aussi les contrôles des longueurs et des angles : à 300 mm du sommet sur chaque bord, l'écart entre les deux marques donne l'angle.</dd>
      </dl>` }
  ];

  const HELP_FOR = {
    paramDetail: 'aide-dome', paramMethod: 'aide-dome', paramPartial: 'aide-dome', paramDiameter: 'aide-dome', paramClass: 'aide-dome', paramSymmetry: 'aide-dome', paramAlign: 'aide-dome', paramBase: 'aide-dome',
    paramStructure: 'aide-structure', paramSupportH: 'aide-structure',
    paramFabricW: 'aide-toile', paramSelvage: 'aide-toile', paramOverlapTol: 'aide-toile',
    paramCutStrategy: 'aide-decoupe', paramSeamWeight: 'aide-decoupe', paramBaseRow: 'aide-decoupe',
    paramPeelType: 'aide-modes', paramSeamType: 'aide-coutures', paramSeamA: 'aide-coutures', paramSeamB: 'aide-coutures', paramHem: 'aide-coutures'
  };

  function helpHtml() {
    return SECTIONS.map(s => `<details class="help" id="${s.id}"><summary>${s.title}</summary><div class="help-body">${s.html}</div></details>`).join('');
  }

  const Info = { SECTIONS, HELP_FOR, helpHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = Info;
  else global.CoverInfo = Info;
})(typeof window !== 'undefined' ? window : globalThis);
