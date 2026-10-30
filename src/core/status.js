
// ---------------------------------------------------------
// status.js — Statuts de confiance d'un dôme (A10, étape 4)
//  🟢 confirmé par une source indépendante (Domerama)
//  🟡 calculé, confirmé seulement par Acidome (ou sans référence)
//  🟠 géométrie correcte mais patrons de toile jamais vérifiés sur une toile cousue
//  🔴 refusé : pas de patron ni d'export
// Logique pure sortie de l'interface (app.js) : testée sous Node (tests/node/status.test.js).
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const ICON = { green: '🟢', yellow: '🟡', orange: '🟠', red: '🔴' };
  const WORD = { green: 'vérifié', yellow: 'calculé', orange: 'non vérifié en atelier', red: 'refusé' };
  // coupes Chords Pentad dont les comptages de montants ont été comparés à Domerama (audit)
  const DOMERAMA_COUNTS = { 1: ['3/4'], 2: ['1/2'], 3: ['5/12', '7/12'], 4: ['1/2'], 5: ['9/20'], 6: ['1/2'] };

  // écart de hauteur (m) entre les nœuds du bord bas : 0 = base plate
  function baseFlatError(d) {
    const ys = d.lines.filter(l => l.selvage).flatMap(l => l.pointIds.map(i => d.pointById.get(i).y));
    return ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
  }

  // statut de la géométrie du dôme calculé (nominal), askedMethod = méthode choisie dans l'interface
  function geometry(nominal, askedMethod) {
    if (!nominal) return { level: 'yellow', reasons: [] };
    const p = nominal.params, V = p.detail, m = p.subdivMethod, sym = p.symmetry, part = p.partial;
    const askedM = askedMethod, full = part === '1' || part === '1/1';
    const reasons = []; let level;
    if (V === 1 && sym !== 'Pentad' && part === '3/4')
      return { level: 'red', reasons: ['1V ' + sym + ' 3/4 : la coupe ne laisse pas de bord (sphère fermée déguisée) — choisir une autre coupe.'] };
    if (askedM !== m) reasons.push(askedM + ' n\'existe pas en ' + V + 'V : le calcul utilise ' + m + '.');
    if (m === 'Chords') {
      if (V <= 6) { level = 'green'; reasons.push('Longueurs : facteurs de corde identiques à Domerama (1V–8V, écart < 0,00001).'); }
      else { level = 'yellow'; reasons.push('7V–8V : facteurs de corde identiques à Domerama, mais le moteur sépare une famille de montants de plus (deux longueurs à 0,25 mm près sur Ø 10 m).'); }
      if (level === 'green' && sym === 'Pentad' && !full) reasons.push((DOMERAMA_COUNTS[V] || []).includes(part)
        ? 'Comptage des montants de cette coupe identique à Domerama.' : 'Comptage des montants de cette coupe non comparé à Domerama (longueurs vérifiées).');
    } else if (m === 'Kruschke') {
      if (V === 3 && sym === 'Pentad' && part === '7/12') { level = 'green'; reasons.push('Dôme de référence Domerama « 3V 5/9 » : 30 A, 35 B, 80 C, 20 D, mêmes longueurs.'); }
      else if (V === 3 && sym === 'Pentad' && part === '5/12') { level = 'green'; reasons.push('Dôme Domerama « 3V 4/9 Kruschke » : 30 A, 30 B, 50 C, 10 D, mêmes angles (vérifié le 30/10/2026).'); }
      else if (V === 3) { level = 'yellow'; reasons.push('Kruschke 3V hors coupes 5/12 et 7/12 Pentad : calculé avec le coefficient validé, coupe sans référence indépendante.'); }
      else { level = 'yellow'; reasons.push('Kruschke 4V : coefficient d\'Acidome tiré d\'une seule valeur Domerama plus une retouche empirique (0,99840).'); }
    } else if (m === 'Arcs' && V === 3) {
      level = 'green'; reasons.push('Arcs 3V : longueurs et comptages identiques à Antiprism (logiciel indépendant), sphère entière.');
    } else if (m === 'Arcs') {
      level = 'yellow'; reasons.push('Arcs ' + V + 'V : même découpage et mêmes comptages qu\'Antiprism (logiciel indépendant), mais longueurs à 0,03 % près (≤ 0,7 mm sur Ø 5 m) : les nœuds intérieurs ne sont pas placés tout à fait de la même façon.');
    } else {
      level = 'yellow'; reasons.push(m + ' : aucune référence indépendante trouvée (confirmé par Acidome seulement).');
    }
    if (sym !== 'Pentad') { if (level === 'green') level = 'yellow'; reasons.push('Symétrie ' + sym + ' : découpe par plan horizontal, sans référence indépendante.'); }
    if (p.alignTheBase && p.alignMoved > 0) { if (level === 'green') level = 'yellow'; reasons.push('Base alignée : ' + p.alignMoved + ' nœuds du bord déplacés, nouvelles longueurs sans référence.'); }
    else if (p.alignTheBase) reasons.push('Base alignée : la base était déjà plate, aucun nœud déplacé.');
    if (!full) { const e = baseFlatError(nominal); if (e > 0.0005) reasons.push('Base non plate (écart ' + Math.round(e * 1000) + ' mm entre nœuds du bord)' + (p.canAlignTheBase && !p.alignTheBase ? ' : cocher « Aligner la base » si besoin.' : '.')); }
    return { level, reasons };
  }

  // fabrication : 🔴 si la géométrie est refusée ou si des morceaux ont des vagues ; sinon 🟠
  // (aucune toile cousue avec ces patrons). nonFlat = fiches de morceaux qui ne se posent pas à plat.
  function fabrication(nominal, geo, nonFlat) {
    if (geo.level === 'red') return { level: 'red', reasons: ['Géométrie refusée : pas de patron.'] };
    // décision de Nathan (30/10/2026) : Triad, Cross et sphère entière restent refusés pour la toile
    // jusqu'à l'étape 9 (découpe depuis l'axe, pôle bas), reportée à un audit ultérieur
    const pp = nominal && nominal.params;
    if (pp && pp.symmetry !== 'Pentad') return { level: 'red', reasons: ['Toile en symétrie ' + pp.symmetry + ' : découpe par étages pas encore juste (étape 9, reportée). Patrons refusés.'] };
    if (pp && (pp.partial === '1/1' || pp.partial === '1')) return { level: 'red', reasons: ['Toile de sphère entière : pôle bas pas encore découpé (étape 9, reportée). Patrons refusés.'] };
    const nf = nonFlat;
    if (nf.length) return { level: 'red', reasons: [nf.length + ' morceau(x) ne se posent pas à plat (vague) : ' + nf.slice(0, 6).map(s => s.name).join(', ') + (nf.length > 6 ? '…' : '') + '.'] };
    return { level: 'orange', reasons: ['Patrons calculés et contrôlés (sans vague, coutures A/B, laize), mais jamais vérifiés sur une toile cousue.'] };
  }

  // contrôle commun avant d'afficher ou d'exporter des patrons :
  // null = autorisé ; { block: 'status', reasons } = 🔴 ; { block: 'laize', bad } = morceaux hors laize.
  // laizeFailures n'est appelée qu'en dernier, si rien d'autre ne bloque.
  function gate(geo, fab, nonFlat, laizeFailures) {
    if (geo.level === 'red') return { block: 'status', reasons: geo.reasons };
    if (fab.level === 'red' && !nonFlat.length) return { block: 'status', reasons: fab.reasons };
    if (nonFlat.length) return { block: 'status', reasons: fab.reasons.concat(['Ce cas (sphère entière en haute fréquence) sera traité à l\'étape 9 du plan.']) };
    const bad = laizeFailures();
    if (bad.length) return { block: 'laize', bad };
    return null;
  }

  const Status = { ICON, WORD, DOMERAMA_COUNTS, baseFlatError, geometry, fabrication, gate };
  if (typeof module !== 'undefined' && module.exports) module.exports = Status;
  else global.Status = Status;
})(typeof window !== 'undefined' ? window : globalThis);
