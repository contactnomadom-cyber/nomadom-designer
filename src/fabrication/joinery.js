// ---------------------------------------------------------
// joinery.js — Bibliothèque d'assemblages de menuiserie et de techniques constructives
// (mission NOMAD-2026-005). Données pures + schémas SVG, sans DOM, testées sous Node
// (tests/node/joinery.test.js).
//
// Image : c'est le classeur de fiches de l'atelier. Chaque raccord calculé par la
// structure (door.js) appartient à une FAMILLE (angle, T, oblique, pose, nœud du dôme,
// montant du dôme, sol) ; chaque famille propose plusieurs ASSEMBLAGES, chacun avec sa
// fiche : à quoi il sert, quand le choisir, ses limites, l'outillage, les étapes, un schéma.
//
// Statut : 🟠 fiches didactiques, non vérifiées en atelier ; aucune ne remplace une
// note de calcul. Les assemblages ne changent pas la géométrie : ils disent COMMENT
// relier les pièces que la structure place.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  // familles de raccords (classées par door.js) et assemblage proposé par défaut
  const FAMILIES = {
    angle: { name: 'Angle (deux pièces finissent au même point)', default: 'tenon-mortaise', options: ['tenon-mortaise', 'mi-bois', 'equerre'] },
    T: { name: 'En T (une pièce arrive sur une autre)', default: 'tenon-mortaise', options: ['tenon-mortaise', 'sabot', 'equerre', 'vis-structurelle'] },
    oblique: { name: 'Oblique (rencontre en biais)', default: 'embrevement', options: ['embrevement', 'entaille', 'vis-structurelle'] },
    pose: { name: 'Posé sur (pièces côte à côte)', default: 'vis-structurelle', options: ['vis-structurelle', 'boulon', 'entaille'] },
    'dome-noeud': { name: 'Sur un nœud du dôme', default: 'platine', options: ['platine', 'boulon'] },
    'dome-montant': { name: 'Sur un montant du dôme', default: 'moise', options: ['moise', 'cale-biaise', 'sabot'] },
    sol: { name: 'Au sol', default: 'pied-poteau', options: ['pied-poteau', 'platine-plancher', 'lisse-ancree'] }
  };

  // petits outils de dessin : schémas en élévation, 160 × 100
  const R = (x, y, w, h, c) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (c || '#d9b48a') + '" stroke="#5a3d22" stroke-width="1.2"/>';
  const Pl = (pts, c) => '<polygon points="' + pts + '" fill="' + (c || '#d9b48a') + '" stroke="#5a3d22" stroke-width="1.2"/>';
  const Ln = (x1, y1, x2, y2, c, dash) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (c || '#5a3d22') + '" stroke-width="1.2"' + (dash ? ' stroke-dasharray="3 2"' : '') + '/>';
  const Ci = (x, y, r, c) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (c || '#8a8f96') + '" stroke="#3b3f44" stroke-width="1"/>';
  const T = (x, y, s) => '<text x="' + x + '" y="' + y + '" font-size="8" fill="#3b2a18" font-family="sans-serif">' + s + '</text>';
  const SVG = body => '<svg viewBox="0 0 160 100" width="160" height="100" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  const STEEL = '#b9bec4', DOME = '#c9a06e';

  const LIBRARY = {
    'tenon-mortaise': { name: 'Tenon-mortaise', family: 'bois-bois', analogy: 'Une clé dans sa serrure : le tenon entre dans la mortaise et ne peut plus pivoter.',
      use: 'Assemblage d\'angle ou en T des cadres (huisserie, potelets sur chevêtre). Transmet bien la compression et tient l\'équerrage.',
      limits: 'Affaiblit la pièce mortaisée (garder au moins 1/3 de bois de chaque côté). Tenon = 1/3 de l\'épaisseur. Cheviller ou coller ; craint la traction seule.',
      tools: 'Scie, ciseau à bois ou mortaiseuse, trusquin, maillet.',
      steps: ['Tracer au trusquin le tenon (1/3 de l\'épaisseur) et la mortaise', 'Scier les joues et les épaulements du tenon', 'Creuser la mortaise 2 mm plus profonde que le tenon', 'Ajuster à sec, puis cheviller (cheville décalée de 1 à 2 mm pour serrer)'],
      svg: SVG(R(20, 10, 30, 80) + R(50, 35, 90, 30) + R(35, 41, 15, 18, '#c49a6c') + Ln(35, 41, 35, 59, '#5a3d22', true) + Ci(42, 50, 2.5, '#7a5230') + T(60, 30, 'tenon') + T(4, 98, 'mortaise')) },
    'mi-bois': { name: 'Mi-bois', family: 'bois-bois', analogy: 'Deux mains qui se croisent à plat : chaque pièce perd la moitié de son épaisseur pour se loger dans l\'autre.',
      use: 'Angle simple et rapide de cadre (huisserie, traverses). Les faces restent affleurantes.',
      limits: 'Chaque pièce garde seulement la moitié de sa section au droit de l\'assemblage. Toujours visser ou cheviller ; faible en flexion.',
      tools: 'Scie circulaire réglée à mi-épaisseur, ciseau, vis.',
      steps: ['Régler la profondeur de coupe à la moitié de l\'épaisseur', 'Faire des traits de scie rapprochés sur la largeur de l\'autre pièce', 'Nettoyer au ciseau', 'Assembler, coller et visser en quinconce'],
      svg: SVG(R(20, 30, 120, 25) + R(20, 30, 25, 60, '#c49a6c') + Ln(20, 42, 45, 42, '#5a3d22', true) + T(60, 25, 'chaque pièce : 1/2 épaisseur')) },
    embrevement: { name: 'Embrèvement', family: 'bois-bois', analogy: 'Le pied d\'une échelle calé dans une marche : la pièce en biais pousse dans une entaille et ne glisse pas.',
      use: 'Rencontre en biais qui travaille en compression : rampant sur potelet, contrefiche sur chevêtre.',
      limits: 'Ne tient que si la pièce pousse ; ajouter une vis ou un boulon contre le soulèvement. Profondeur ≤ 1/4 de la hauteur de la pièce entaillée.',
      tools: 'Fausse équerre, scie, ciseau, rabot.',
      steps: ['Relever l\'angle à la fausse équerre', 'Tracer l\'entaille selon la bissectrice de l\'angle', 'Scier et dégager l\'entaille au ciseau', 'Couper l\'about de la pièce en biais, ajuster et fixer d\'une vis'],
      svg: SVG(R(10, 60, 140, 25) + Pl('40,60 55,52 130,10 118,4 40,52') + Pl('40,60 55,60 55,52', '#c49a6c') + T(80, 50, 'pousse')) },
    entaille: { name: 'Entaille simple', family: 'bois-bois', analogy: 'Un tiroir dans son rail : la pièce repose dans une encoche qui l\'empêche de glisser.',
      use: 'Chevron ou traverse posé sur une pièce porteuse ; reprise d\'un appui sans quincaillerie visible.',
      limits: 'Entaille ≤ 1/3 de la hauteur de la pièce porteuse. Fixer par vis ; ne tient pas seule en traction.',
      tools: 'Scie, ciseau, défonceuse (option).',
      steps: ['Tracer la largeur de la pièce posée', 'Scier les deux joues à la profondeur', 'Dégager au ciseau', 'Poser et visser'],
      svg: SVG(R(10, 50, 140, 30) + R(60, 30, 30, 32, '#c49a6c') + Ln(60, 50, 90, 50, '#5a3d22', true) + T(95, 40, 'encoche ≤ 1/3')) },
    sabot: { name: 'Sabot métallique', family: 'quincaillerie', analogy: 'Une chaussure pour le bout de la poutre : le sabot la porte et se cloue sur la pièce d\'en face.',
      use: 'Pièce qui arrive en T sur une autre (chevron, traverse). Rapide, ne fragilise pas le bois. Variante à ailes inclinables sur un montant de dôme.',
      limits: 'Utiliser les pointes crantées ou vis prescrites par le fabricant, toutes les perforations. Galvanisé ou inox à l\'extérieur.',
      tools: 'Visseuse, pointes annelées ou vis à tête cylindrique pour connecteurs.',
      steps: ['Choisir le sabot à la section de la pièce portée (ici 45 × 70)', 'Fixer le sabot sur la pièce porteuse, de niveau', 'Poser la pièce, fixer toutes les perforations'],
      svg: SVG(R(10, 15, 30, 80) + R(40, 40, 110, 25) + Pl('40,36 70,36 70,69 40,69 40,65 66,65 66,40 40,40', STEEL) + T(75, 34, 'sabot')) },
    equerre: { name: 'Équerre renforcée', family: 'quincaillerie', analogy: 'Le coin d\'un livre relié : une cornière tient l\'angle à 90°.',
      use: 'Angle ou T sans usinage, tenue de l\'équerrage d\'un cadre ; montage rapide ou démontable.',
      limits: 'Toujours par paire (une de chaque côté) pour un effort sérieux. Ne remplace pas un appui en compression.',
      tools: 'Visseuse, vis pour connecteurs.',
      steps: ['Présenter les pièces d\'équerre', 'Fixer l\'équerre sur la pièce porteuse', 'Fixer sur la pièce portée, puis la seconde équerre de l\'autre côté'],
      svg: SVG(R(20, 10, 25, 80) + R(45, 60, 105, 25) + Pl('45,30 50,30 50,55 75,55 75,60 45,60', STEEL) + T(80, 50, 'équerre')) },
    'vis-structurelle': { name: 'Vis structurelle', family: 'quincaillerie', analogy: 'Une couture invisible : de longues vis filetées tirent les deux pièces l\'une contre l\'autre.',
      use: 'Pièces posées l\'une sur l\'autre (chevêtre sur linteau), reprises rapides en biais.',
      limits: 'Respecter les distances aux bords et la longueur d\'ancrage du fabricant ; avant-trou dans les bois durs. Pas d\'appui en bout de bois seul.',
      tools: 'Visseuse puissante, embout adapté.',
      steps: ['Serrer les pièces', 'Visser en croix (deux vis inclinées l\'une vers l\'autre)', 'Respecter l\'espacement indiqué par le fabricant'],
      svg: SVG(R(10, 20, 140, 25) + R(10, 45, 140, 25, '#c49a6c') + Ln(50, 15, 70, 70, '#3b3f44') + Ln(110, 15, 90, 70, '#3b3f44') + T(10, 90, 'vis en croix')) },
    boulon: { name: 'Boulon traversant', family: 'quincaillerie', analogy: 'Un serre-joint qui reste en place : la tige traverse les pièces et l\'écrou serre.',
      use: 'Liaison démontable de deux pièces côte à côte, ou d\'une pièce sur une platine de nœud.',
      limits: 'Rondelles larges côté bois, resserrer après séchage. Distance au bout ≥ 7 diamètres.',
      tools: 'Perceuse et mèche longue, clés.',
      steps: ['Serrer les pièces', 'Percer au diamètre du boulon', 'Poser boulon, rondelles larges et écrou ; serrer sans écraser le bois'],
      svg: SVG(R(10, 25, 140, 22) + R(10, 47, 140, 22, '#c49a6c') + R(76, 15, 8, 64, STEEL) + R(68, 15, 24, 6, STEEL) + R(68, 73, 24, 6, STEEL) + T(96, 18, 'rondelle')) },
    platine: { name: 'Platine sur nœud', family: 'dome', analogy: 'Une prise multiple : le nœud du dôme reçoit une plaque, et la nouvelle pièce s\'y branche.',
      use: 'Pièce qui arrive sur un nœud du dôme (lisse sur le seuil, chevron au nœud). Les efforts vont droit dans le nœud.',
      limits: 'Dépend du type de connecteur du dôme : vérifier la place libre sur le nœud et le perçage. Acier galvanisé, boulonné.',
      tools: 'Perceuse, clés, plat acier ou platine du fournisseur.',
      steps: ['Repérer le nœud (étiquette N…)', 'Fixer une platine coudée sous la plaque du nœud ou sur ses boulons', 'Boulonner la pièce sur la platine'],
      svg: SVG(Ci(60, 50, 14) + R(20, 45, 30, 10, DOME) + R(60, 10, 10, 30, DOME) + R(74, 44, 20, 12, STEEL) + R(94, 44, 56, 12) + T(100, 40, 'nouvelle pièce') + T(28, 80, 'nœud du dôme')) },
    moise: { name: 'Moisage', family: 'dome', analogy: 'Un sandwich : deux planches serrent le montant du dôme et la nouvelle pièce, boulonnées au travers.',
      use: 'Raccord n\'importe où le long d\'un montant du dôme incliné, sans l\'entailler. Très bon pour les appuis et chevrons.',
      limits: 'Deux moises par raccord, au moins 2 boulons par pièce serrée. Ne pas percer à moins de 7 diamètres du bout du montant.',
      tools: 'Scie, perceuse et mèche longue, boulons, clés.',
      steps: ['Couper deux moises (environ 300 mm)', 'Les présenter de part et d\'autre du montant et de la pièce', 'Percer au travers, boulonner, serrer'],
      svg: SVG(Pl('20,90 40,90 120,10 100,10', DOME) + R(55, 40, 95, 18) + R(40, 30, 70, 8, '#c49a6c') + R(40, 60, 70, 8, '#c49a6c') + Ci(62, 49, 3) + Ci(92, 49, 3) + T(112, 36, 'moises')) },
    'cale-biaise': { name: 'Cale biaise vissée', family: 'dome', analogy: 'Une cale sous un pied de table bancal : elle rattrape la pente du montant pour offrir une face d\'appui droite.',
      use: 'Poser une pièce horizontale sur un montant de dôme incliné, avec une face d\'appui franche.',
      limits: 'La cale est collée et vissée au montant ; la pièce est vissée dans la cale. Angle relevé sur place à la fausse équerre.',
      tools: 'Fausse équerre, scie à onglet, visseuse.',
      steps: ['Relever l\'angle entre le montant et l\'horizontale', 'Couper une cale à cet angle', 'Coller et visser la cale sur le montant', 'Poser la pièce et la visser dans la cale'],
      svg: SVG(Pl('20,90 40,90 120,10 100,10', DOME) + Pl('70,40 92,40 92,62', '#c49a6c') + R(92, 32, 58, 16) + T(96, 60, 'cale')) },
    'pied-poteau': { name: 'Pied de poteau réglable', family: 'sol', analogy: 'Les pieds réglables d\'une machine à laver : le poteau ne touche pas le sol mouillé et se met de niveau.',
      use: 'Poteau d\'angle de l\'avant-corps posé sur une dalle, un plot ou une terrasse. Tient le bois à l\'écart de l\'eau.',
      limits: 'Garder au moins 20 mm entre le bois et le sol. Ancrage chimique ou mécanique dans le support.',
      tools: 'Perforateur, cheville ou scellement, visseuse.',
      steps: ['Tracer l\'implantation', 'Cheviller la platine basse dans le support', 'Régler la hauteur, fixer le poteau dans l\'étrier'],
      svg: SVG(R(0, 85, 160, 15, '#bdb6aa') + R(66, 10, 28, 58) + R(70, 68, 20, 4, STEEL) + R(78, 72, 4, 10, STEEL) + R(64, 82, 32, 4, STEEL) + T(100, 78, '≥ 20 mm')) },
    'platine-plancher': { name: 'Platine sur plancher', family: 'sol', analogy: 'Une semelle de chaussure vissée : la pièce s\'appuie sur une plaque fixée dans le plancher.',
      use: 'Montant ou poteau posé à l\'intérieur, sur le plancher du dôme (sas intérieur).',
      limits: 'Visser dans une solive ou une lambourde, pas seulement dans le panneau de plancher.',
      tools: 'Visseuse, vis structurelles.',
      steps: ['Repérer la solive sous le plancher', 'Visser la platine', 'Fixer la pièce sur la platine'],
      svg: SVG(R(0, 80, 160, 12, '#c9a06e') + R(66, 10, 28, 66) + Pl('56,76 104,76 104,80 56,80', STEEL) + T(110, 74, 'platine')) },
    'lisse-ancree': { name: 'Lisse basse ancrée', family: 'sol', analogy: 'Le rail d\'une porte coulissante : une pièce couchée au sol reçoit les montants et répartit leur appui.',
      use: 'Pied de paroi ou de poteau : relie les poteaux d\'angle au seuil du dôme et ancre l\'ensemble au sol.',
      limits: 'Sur une bande d\'arase (ou de la membrane) pour couper les remontées d\'eau ; ancrage tous les 600 mm environ.',
      tools: 'Perforateur, chevilles, visseuse.',
      steps: ['Poser une bande d\'arase sous la lisse', 'Cheviller la lisse au support', 'Assembler les montants sur la lisse (tenon ou équerre)'],
      svg: SVG(R(0, 85, 160, 15, '#bdb6aa') + R(10, 72, 140, 13) + R(30, 15, 20, 57) + R(110, 15, 20, 57) + Ln(70, 72, 70, 95, '#3b3f44') + T(76, 68, 'ancrage')) }
  };

  // assemblage choisi pour une famille (choix de l'utilisateur s'il est valable, sinon défaut)
  function resolve(choices) {
    const out = {};
    Object.keys(FAMILIES).forEach(f => { const c = choices && choices[f]; out[f] = FAMILIES[f].options.includes(c) ? c : FAMILIES[f].default; });
    return out;
  }

  const Joinery = { FAMILIES, LIBRARY, resolve };
  if (typeof module !== 'undefined' && module.exports) module.exports = Joinery;
  else global.Joinery = Joinery;
})(typeof window !== 'undefined' ? window : globalThis);
