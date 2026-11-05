// ---------------------------------------------------------
// openings-ctl.js — Commandes des portes d'aplomb, sas d'entrée et plancher (NOMAD-2026-005 à 007),
// sorties de app.js (qui reste sous 2 000 lignes). Relie l'objet dôme (ds), les calculs (Door, Floor,
// SasToile, Joinery) et les fiches (DoorUI, FloorUI). Aucun calcul ici : seulement l'aiguillage.
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const DOOR_SECTION = { w: 0.045, d: 0.07 };   // 45 × 70 mm, en attendant les vraies sections (aperçu 🟠)

  // ctx = { ds, $id, readout() (réécrit la fiche des ouvertures), redraw() (3D Base et Design) }
  function create(ctx) {
    const ds = ctx.ds, $id = ctx.$id;
    let doorFiche = null;   // fiche d'assemblage ouverte
    const doorKey = (o, L) => o.seuil.map(k => k.split('-').map(id => L.get(+id)).sort().join('–')).sort().join(' ');

    function doorBlock(o, L) {
      const key = doorKey(o, L), d = ds.openings.doors[key];
      if (!d) return '<div class="door"><button class="ghost" data-door-add="' + key.replace(/"/g, '&quot;') + '">Ajouter une porte d\'aplomb</button></div>';
      const r = Door.compute(ds.nominal, Ouvertures.strutIndex(ds.nominal), o, d);
      const deep = r.ok ? Math.max(0, -Math.min(...r.nodes.map(p => p.depth - d.setback))) : 0;
      const st = r.ok && Door.build(r, d, DOOR_SECTION, Joinery.resolve(d.joints));
      return DoorUI.html(Joinery, { key, door: d, result: r, structure: st, joints: Joinery.resolve(d.joints), fiche: doorFiche, deep,
        sasLoad: st && st.kind === 'sas' ? Floor.sasLoad(st, ds.floor ? Floor.layout(ds.nominal, ds.floor).options : null) : null });
    }
    // structures des portes qui passent (3D Base et Design, plan du Design, récapitulatifs)
    function doorStructures() {
      const res = ds.openings.result; if (!(res && res.ok)) return [];
      const L = Ouvertures.nodeLabels(ds.nominal), S = Ouvertures.strutIndex(ds.nominal), out = [];
      res.openings.forEach(o => { const d = o.closedByGround && ds.openings.doors[doorKey(o, L)]; if (!d) return;
        const st = Door.build(Door.compute(ds.nominal, S, o, d), d, DOOR_SECTION, Joinery.resolve(d.joints)); if (st) out.push(st); });
      return out;
    }
    const sasScenes = () => doorStructures().filter(x => x.kind === 'sas');
    function doorsChanged() { ctx.readout(); updateFloorReadout(); ctx.redraw(); }
    function doorClick(ev) {
      const t = ev.target, add = t.getAttribute && t.getAttribute('data-door-add'), del = t.getAttribute && t.getAttribute('data-door-del');
      const fiche = t.getAttribute && t.getAttribute('data-joint-fiche');
      if (fiche) { ev.preventDefault(); doorFiche = doorFiche === fiche ? null : fiche; ctx.readout(); return; }
      if (add) { ds.openings.doors[add] = { width: 0.9, height: 2, offset: 0, setback: 0 }; doorsChanged(); }
      else if (del) { delete ds.openings.doors[del]; doorsChanged(); }
    }
    function doorChange(ev) {
      const t = ev.target, k = t.getAttribute && t.getAttribute('data-door-key'), f = t.getAttribute('data-door-f');
      if (!k || !ds.openings.doors[k]) return;
      doorFiche = DoorUI.apply(ds.openings.doors[k], f, t.value, t.tagName) || doorFiche;
      doorsChanged();
    }

    // plancher : calcul avec les pilotis des sas extérieurs (et leurs charges)
    function floorLayout() {
      if (!ds.floor) return null;
      const lay = Floor.layout(ds.nominal, ds.floor); if (!lay.ok) return lay;
      const extra = [];
      sasScenes().forEach(sc => { const pts = sc.groundPoints || []; if (!pts.length) return;
        Floor.extraPiles(lay, pts, -0.0225, Floor.sasLoad(sc, lay.options)).forEach(p => extra.push(p)); });
      // poteaux d'angle des avant-corps (porte sans sas) : un pilotis sous chaque pied hors du plancher
      doorStructures().filter(x => x.kind !== 'sas').forEach(sc => { const pts = Floor.outsideDeck(lay, sc.groundPoints); if (!pts.length) return;
        Floor.extraPiles(lay, pts, -0.0225, Floor.sasLoad(sc, lay.options), 'porte').forEach(p => extra.push(p)); });
      return Floor.withExtra(lay, extra);
    }
    function floorScene() { const lay = floorLayout(); return lay && lay.ok ? Floor.scene(lay) : null; }
    function updateFloorReadout() {
      const el = $id('baseFloor'); if (!el) return;
      el.innerHTML = FloorUI.html(Floor, ds.floor, floorLayout());
      el.onclick = ev => { const t = ev.target, on = t.getAttribute('data-floor-on'), off = t.getAttribute('data-floor-off');
        if (on || off) { ds.floor = on ? Floor.choices() : null; floorChanged(); } };
      el.onchange = ev => { const t = ev.target, f = t.getAttribute('data-floor-f'); if (!f || !ds.floor) return;
        if (t.tagName === 'SELECT') ds.floor[f] = t.value; else { const v = parseFloat(t.value); if (isFinite(v)) ds.floor[f] = v; }
        floorChanged(); };
    }
    function floorChanged() { updateFloorReadout(); ctx.readout(); ctx.redraw(); }

    // toile des sas (Cover+) : patrons, raccord au dôme, consommation de rouleau
    const sasToile = () => sasScenes().map(sc => SasToile.patterns(sc, ds.fabric));
    // récapitulatifs pour Cover+ et Informations
    const summary = mode => DoorUI.summary(doorStructures(), floorLayout(), mode) + (mode === 'cover' ? SasToile.html(sasToile())
      : sasToile().map(T => '<section class="info-card"><h3>Toile du sas</h3><p>' + T.pieces.length + ' pièces' + (T.pignon ? ' + pignon' : '') + ' · ' + T.netArea.toFixed(2).replace('.', ',') +
        ' m² net · environ ' + T.rollLength.toFixed(1).replace('.', ',') + ' m de rouleau · raccord au dôme ' + T.raccord.length.toFixed(2).replace('.', ',') + ' m (rabat sous la toile du dôme) · 🟠 patrons détaillés dans Cover+</p></section>').join(''));

    // sas dans la 3D de Cover+ (vue en projection, dessinée par-dessus le dôme)
    // phase 'back' : faces derrière le centre du dôme (dessinées avant lui) ; 'front' : devant (après lui)
    function drawCover3D(c2d, proj, yBase, dpr, phase) {
      sasScenes().forEach(sc => {
        const faces = sc.panels.filter(p => p.kind !== 'plancher-sas').map(p => { const P = p.pts.map(q => proj({ x: q.x, y: q.y + yBase, z: q.z }));
          return { P, z: P.reduce((s, q) => s + q.z, 0) / P.length, roof: p.kind === 'toit' }; }).filter(f => !phase || (phase === 'back') === (f.z < 0)).sort((a, b) => a.z - b.z);
        faces.forEach(f => { c2d.beginPath(); f.P.forEach((q, i) => (i ? c2d.lineTo(q.x, q.y) : c2d.moveTo(q.x, q.y))); c2d.closePath();
          c2d.fillStyle = f.roof ? 'rgba(216,190,140,0.55)' : 'rgba(205,190,160,0.45)'; c2d.fill();
          c2d.strokeStyle = '#7d6a50'; c2d.lineWidth = 1.2 * dpr; c2d.stroke(); });
      });
    }

    return { doorBlock, doorClick, doorChange, doorStructures, floorLayout, floorScene, updateFloorReadout, summary, sasToile, drawCover3D, DOOR_SECTION };
  }

  const OpeningsCtl = { create, DOOR_SECTION };
  if (typeof module !== 'undefined' && module.exports) module.exports = OpeningsCtl;
  else global.OpeningsCtl = OpeningsCtl;
})(typeof window !== 'undefined' ? window : globalThis);
