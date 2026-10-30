
/**
 * ouvertures.js — Lot 4, étape 1 : ouvertures tracées sur la structure
 * ------------------------------------------------------------------
 * Image : le dôme est un carrelage dont les montants sont les joints.
 * On trace le contour d'une ouverture au crayon en suivant les joints
 * (les montants sélectionnés) ; tout ce qui est enfermé par ce contour
 * saute. Si le contour s'arrête sur le bord bas, c'est le sol qui le
 * referme (cas d'une porte).
 *
 * Entrée : le dôme renvoyé par DomeEngine.generateDome() et une liste de
 * montants sélectionnés (clé « idA-idB », idA < idB).
 *
 * Sortie : faces ouvertes, montants du cadre, montants supprimés (dont le
 * seuil au sol), longueur d'ourlet, surface retirée, hauteurs, et un
 * filtre d'adjacence prêt pour les découpes textiles (Étages, Fleur…).
 *
 * Pas encore traité ici (étapes suivantes) : coupe à mi-triangle,
 * châssis, sas, coupole ouvrante.
 * ------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  const edgeKey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);

  function vsub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
  function vcross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
  function vlen(a) { return Math.hypot(a.x, a.y, a.z); }

  function faceArea(dome, f) {
    const [A, B, C] = f.pointIds.map(id => dome.pointById.get(id));
    return vlen(vcross(vsub(B, A), vsub(C, A))) / 2;
  }

  // classe d'un montant (A, B, C…) : la plus proche en longueur
  function classOf(dome, len) {
    let best = '?', bd = Infinity;
    dome.edgeClasses.forEach(g => { const d = Math.abs(g.length - len); if (d < bd) { bd = d; best = g.name; } });
    return best;
  }

  // étiquettes de nœuds N1, N2… : du sommet vers la base, puis par azimut
  // (même convention que la fiche patron d'etages.js)
  function nodeLabels(dome) {
    if (dome._ouvLabels) return dome._ouvLabels;
    const ys = [...new Set(dome.points.map(p => Math.round(p.y * 1e6)))].sort((a, b) => b - a);
    const ring = new Map(dome.points.map(p => [p._id, ys.indexOf(Math.round(p.y * 1e6))]));
    const pts = dome.points.slice().sort((a, b) =>
      (ring.get(a._id) - ring.get(b._id)) || (Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x)));
    const m = new Map(pts.map((p, i) => [p._id, 'N' + (i + 1)]));
    Object.defineProperty(dome, '_ouvLabels', { value: m, enumerable: false });
    return m;
  }

  // index des montants : clé -> { key, pointIds, length, selvage, cls, faces[] }
  function strutIndex(dome) {
    if (dome._ouvStruts) return dome._ouvStruts;
    const m = new Map();
    dome.lines.forEach(l => {
      const k = edgeKey(l.pointIds[0], l.pointIds[1]);
      m.set(k, { key: k, pointIds: l.pointIds.slice(), length: l.length, selvage: l.selvage, cls: classOf(dome, l.length), faces: [] });
    });
    dome.faces.forEach(f => {
      for (let i = 0; i < 3; i++) {
        const s = m.get(edgeKey(f.pointIds[i], f.pointIds[(i + 1) % 3]));
        if (s) s.faces.push(f.index);
      }
    });
    Object.defineProperty(dome, '_ouvStruts', { value: m, enumerable: false });
    return m;
  }

  function countBy(list) {
    const o = {};
    list.forEach(s => { o[s.cls] = (o[s.cls] || 0) + 1; });
    return o;
  }

  /**
   * analyse(dome, selectedKeys) -> résultat (voir en-tête)
   * Plusieurs contours fermés dans la même sélection donnent plusieurs ouvertures.
   */
  function analyse(dome, selectedKeys) {
    const struts = strutIndex(dome);
    const labels = nodeLabels(dome);
    const lab = k => k.split('-').map(id => labels.get(+id)).join('–');
    const res = { ok: false, errors: [], warnings: [], openings: [], openFaces: [], removed: [], frame: [], seuil: [] };

    const sel = new Set();
    (selectedKeys || []).forEach(k => {
      const [a, b] = String(k).split('-').map(Number);
      const key = edgeKey(a, b);
      if (!struts.has(key)) res.errors.push('Montant inconnu : ' + k);
      else sel.add(key);
    });
    if (!sel.size) { res.errors.push('Aucun montant sélectionné : tracez le contour de l\'ouverture.'); return res; }
    if (res.errors.length) return res;

    // 1) contour : chaque nœud doit être traversé (degré pair), sauf sur le
    //    bord bas, où le sol referme le contour
    const baseNodes = new Set();
    struts.forEach(s => { if (s.selvage) s.pointIds.forEach(id => baseNodes.add(id)); });
    const deg = new Map();
    sel.forEach(k => k.split('-').forEach(id => deg.set(+id, (deg.get(+id) || 0) + 1)));
    const loose = [...deg].filter(([id, d]) => d % 2 === 1 && !baseNodes.has(id)).map(([id]) => labels.get(id));
    const looseMsg = 'Contour ouvert : il s\'arrête aux nœuds ' + loose.join(', ') + '. Il doit se refermer, ou finir sur le bord bas.';

    // 2) régions de faces : on se propage d'une face à sa voisine sans traverser le contour
    const region = new Array(dome.faces.length).fill(-1);
    const regions = [];
    dome.faces.forEach(f0 => {
      if (region[f0.index] !== -1) return;
      const id = regions.length, list = [], stack = [f0.index];
      region[f0.index] = id;
      while (stack.length) {
        const i = stack.pop(); list.push(i);
        dome.faceAdjacency[i].forEach(a => {
          if (region[a.neighbor] !== -1) return;
          if (sel.has(edgeKey(a.edgePointIds[0], a.edgePointIds[1]))) return;
          region[a.neighbor] = id; stack.push(a.neighbor);
        });
      }
      regions.push({ id, faces: list, area: list.reduce((s, i) => s + faceArea(dome, dome.faces[i]), 0) });
    });
    if (regions.length < 2) {
      res.errors.push(loose.length ? looseMsg : 'Le contour n\'enferme aucun triangle : il faut une boucle complète de montants (ou une boucle qui finit sur le bord bas).');
      return res;
    }

    // la plus grande région est le dôme qui reste ; toutes les autres sont des ouvertures
    const main = regions.reduce((a, b) => (b.area > a.area ? b : a));
    const isOpen = new Set();
    regions.forEach(r => { if (r !== main) r.faces.forEach(i => isOpen.add(i)); });

    // 3) classement des montants
    const yBase = Math.min(...dome.points.map(p => p.y));
    struts.forEach(s => {
      const open = s.faces.filter(i => isOpen.has(i)).length, n = s.faces.length;
      if (open === 0) return;
      if (open === n) (s.selvage ? res.seuil : res.removed).push(s);  // entièrement dans le trou
      else res.frame.push(s);                                          // borde le trou : cadre
    });
    sel.forEach(k => {
      if (!res.frame.some(s => s.key === k)) res.warnings.push('Le montant ' + lab(k) + ' ne borde aucune ouverture : ignoré.');
    });

    // 4) une fiche par ouverture
    regions.filter(r => r !== main).forEach((r, n) => {
      const fset = new Set(r.faces);
      const touches = s => s.faces.some(i => fset.has(i));
      const frame = res.frame.filter(touches), removed = res.removed.filter(touches), seuil = res.seuil.filter(touches);
      const nodes = new Set(); r.faces.forEach(i => dome.faces[i].pointIds.forEach(id => nodes.add(id)));
      const ys = [...nodes].map(id => Math.round((dome.pointById.get(id).y - yBase) * 1e5) / 1e5); // 0,01 mm
      res.openings.push({
        n: n + 1,
        faces: r.faces.slice().sort((a, b) => a - b),
        area: r.area,
        frameLength: frame.reduce((s, x) => s + x.length, 0),   // = longueur d'ourlet / de renfort
        groundLength: seuil.reduce((s, x) => s + x.length, 0),
        closedByGround: seuil.length > 0,
        heightMin: Math.min(...ys), heightMax: Math.max(...ys),
        frame: frame.map(s => s.key), removed: removed.map(s => s.key), seuil: seuil.map(s => s.key),
        frameByClass: countBy(frame), removedByClass: countBy(removed), seuilByClass: countBy(seuil)
      });
    });

    res.openFaces = [...isOpen].sort((a, b) => a - b);
    res.ok = true;
    return res;
  }

  /**
   * Liste de débit après ouverture : comptage par classe des montants restants.
   */
  function strutCount(dome, result) {
    const gone = new Set([...(result ? result.removed : []), ...(result ? result.seuil : [])].map(s => s.key));
    const out = {};
    strutIndex(dome).forEach(s => { if (!gone.has(s.key)) out[s.cls] = (out[s.cls] || 0) + 1; });
    return out;
  }

  /**
   * Adjacence filtrée pour les découpes textiles : les faces ouvertes n'ont plus
   * de voisines et personne ne les a pour voisine. Les index de faces ne changent
   * pas, la numérotation des triangles reste celle du dôme.
   */
  function textileAdjacency(dome, result) {
    const open = new Set(result && result.ok ? result.openFaces : []);
    return dome.faceAdjacency.map((adj, i) => (open.has(i) ? [] : adj.filter(a => !open.has(a.neighbor))));
  }

  /**
   * Arêtes de toile à ourler : les côtés des triangles conservés qui bordent
   * une ouverture (le seuil au sol n'a pas de toile).
   */
  function hemEdges(dome, result) {
    return result && result.ok ? result.frame.map(s => ({ key: s.key, length: s.length, cls: s.cls })) : [];
  }

  /**
   * Dôme « toile » après ouverture : mêmes nœuds et mêmes montants (la
   * structure ne change pas de forme), mais les triangles ouverts sont retirés
   * de la liste des faces. Les faces restantes sont renumérotées 0..n-1 (les
   * découpes textiles indexent les faces par position) ; origIndex garde le
   * numéro d'origine. openingHem = arêtes de toile à ourler autour des trous.
   */
  function applyToDome(dome, result) {
    if (!result || !result.ok || !result.openFaces.length) return dome;
    const open = new Set(result.openFaces);
    const newIndex = new Map();
    const faces = [];
    dome.faces.forEach(f => {
      if (open.has(f.index)) return;
      newIndex.set(f.index, faces.length);
      faces.push(Object.assign({}, f, { index: faces.length, origIndex: f.index }));
    });
    const faceAdjacency = faces.map(f => (dome.faceAdjacency[f.origIndex] || [])
      .filter(a => !open.has(a.neighbor))
      .map(a => ({ neighbor: newIndex.get(a.neighbor), edgePointIds: a.edgePointIds })));
    const openingHem = new Set(result.frame.map(s => s.key));
    return Object.assign({}, dome, {
      faces, faceAdjacency, openingHem, allFaces: dome.allFaces || dome.faces,
      openings: { count: result.openings.length, openFaces: result.openFaces.slice(), hemLength: result.frame.reduce((a, s) => a + s.length, 0) },
      stats: Object.assign({}, dome.stats, { faceCount: faces.length })
    });
  }

  /**
   * Dôme « structure » après ouverture (onglets Base et Design) : comme
   * applyToDome, et en plus les montants retirés (et le seuil d'une porte)
   * disparaissent de la liste des montants ; comptages mis à jour.
   * allFaces garde toutes les faces : l'enveloppe intérieure (hauteurs sous
   * plafond, sections) reste celle du dôme plein.
   */
  function structureDome(dome, result) {
    const d = applyToDome(dome, result);
    if (d === dome) return dome;
    const gone = new Set([...result.removed, ...result.seuil].map(s => s.key));
    const lines = dome.lines.filter(l => !gone.has(edgeKey(l.pointIds[0], l.pointIds[1])));
    const S = strutIndex(dome), count = {};
    lines.forEach(l => { const c = S.get(edgeKey(l.pointIds[0], l.pointIds[1])).cls; count[c] = (count[c] || 0) + 1; });
    const edgeClasses = dome.edgeClasses.map(g => Object.assign({}, g, { count: count[g.name] || 0 }));
    return Object.assign(d, {
      lines, edgeClasses,
      stats: Object.assign({}, d.stats, { lineCount: lines.length, selvageCount: lines.filter(l => l.selvage).length })
    });
  }

  const Ouvertures = { edgeKey, analyse, strutCount, textileAdjacency, hemEdges, nodeLabels, strutIndex, applyToDome, structureDome };
  if (typeof module !== 'undefined' && module.exports) module.exports = Ouvertures;
  else global.Ouvertures = Ouvertures;
})(typeof window !== 'undefined' ? window : globalThis);

