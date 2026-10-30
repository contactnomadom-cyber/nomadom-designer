
// ---------------------------------------------------------
// designui.js — interface de l'onglet « Design » (plan d'architecte 2D par
// niveau + rendu 3D). La géométrie et les contrôles sont dans design.js.
// ---------------------------------------------------------
(function () {
  'use strict';
  const Z = window.Design;
  const STORE = 'coverplus-design-v1';
  let st = load(), model = null, level = 0, sel = null, built = false;
  let rotY = 0.7, rotX = 0.55, zoom3 = 1, view = { zoom: 1, panX: 0, panY: 0 };
  let toileMode = 'coupe', showZones = true, style3 = 'real', dirty3 = true, eng = null, saveWarn = false;
  let cam = { yaw: 0.7, pitch: 0.55, dist: 9, target: [0, 1.1, 0] };
  const glbCache = new Map();   // id -> modèle .glb lu (Design3D.parseGLB)
  const mm = v => Math.round(v * 1000), cm = v => Math.round(v * 100);
  const fr = (v, d) => v.toFixed(d === undefined ? 2 : d).replace('.', ',');
  const $ = id => document.getElementById(id);

  function load() {
    try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.version === 1) return Object.assign(Z.defaultState(), s, { openings: [], mezz: Object.assign(Z.defaultState().mezz, s.mezz) }); } catch (e) {}
    return Z.defaultState();
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(st)); saveWarn = false; } catch (e) { saveWarn = true; } }
  function changed() { save(); dirty3 = true; drawAll(); }

  // ---------------------------------------------------------
  // Construction de l'onglet
  // ---------------------------------------------------------
  function build() {
    const cats = [...new Set(Z.LIBRARY.map(l => l.cat))];
    const libOpts = cats.map(c => '<optgroup label="' + c + '">' + Z.LIBRARY.filter(l => l.cat === c).map(l => '<option value="' + l.type + '">' + l.label + ' (' + cm(l.w) + '×' + cm(l.d) + ')</option>').join('') + '</optgroup>').join('');
    $('viewDesign').innerHTML = `
      <div class="info-head"><h2>Design — aménagement intérieur</h2><span class="stat" id="dsDome"></span></div>
      <div class="toolbar">
        <span class="group-title">Plan</span>
        <label>Niveau<select id="dsLevel"><option value="0">Rez-de-chaussée</option><option value="1">Mezzanine</option></select></label>
        <label>Style<select id="dsStyle"><option value="nb">Architecte noir et blanc</option><option value="color">Couleur</option></select></label>
        <label class="chk"><input type="checkbox" id="dsZones" checked> Hauteurs sous plafond</label>
        <label>Ajouter un élément<span style="display:flex;gap:4px"><select id="dsAddType">${libOpts}</select><button class="primary" id="dsAdd">+ Ajouter</button></span></label>
        <label>Ouvertures<span class="muted" style="font-size:11px;max-width:200px">Tracées dans l'onglet Base (porte, fenêtre, coupole) : elles apparaissent ici dans la toile et la structure.</span></label>
      </div>
      <div class="toolbar">
        <span class="group-title">Mezzanine</span>
        <label class="chk"><input type="checkbox" id="dsMezzOn"> Mezzanine</label>
        <label>Hauteur du plancher (m)<input type="number" id="dsMezzH" step="0.05" min="0.5"></label>
        <label>Épaisseur (m)<input type="number" id="dsMezzT" step="0.01" min="0"></label>
        <label>Forme<select id="dsMezzShape"><option value="demi">Demi-cercle (coupe droite)</option><option value="secteur">Secteur (part de gâteau)</option><option value="droit">Côtés droits (rectangle)</option></select></label>
        <label id="dsLDepth">Profondeur depuis la paroi (m)<input type="number" id="dsMezzD" step="0.05" min="0.3"></label>
        <label id="dsLWidth">Largeur (m)<input type="number" id="dsMezzW" step="0.05" min="0.5"></label>
        <label id="dsLAngle">Ouverture (°)<input type="number" id="dsMezzA" step="5" min="20" max="350"></label>
        <label>Orientation (°)<input type="number" id="dsMezzO" step="5"></label>
      </div>
      <div class="panes">
        <section class="pane"><h2><span>PLAN — VUE DU DESSUS</span><span id="dsPlanInfo"></span></h2>
          <div class="body"><canvas id="dsPlan"></canvas><div class="hint">glisser un élément = le déplacer (pas de 5 cm) · poignée ↻ = le faire pivoter (pas de 15°, libre avec Maj) · lâcher hors du dôme ou Suppr = effacer · molette = zoom · double-clic = recadrer</div></div></section>
        <section class="pane"><h2><span>RENDU 3D</span><span><select id="ds3dStyle" style="font-family:var(--mono);font-size:11px;margin-right:6px"><option value="real">Réaliste</option><option value="maquette">Maquette d'architecte</option></select><select id="dsQual" style="font-family:var(--mono);font-size:11px;margin-right:6px;display:none" title="Haute : ombres douces, pleine résolution. Rapide : sans ombres, pour un ordinateur lent."><option value="1">Qualité haute</option><option value="0">Rapide</option></select><select id="dsToile" style="font-family:var(--mono);font-size:11px"><option value="coupe">Toile en coupe (voir dedans)</option><option value="verre">Toile transparente</option><option value="fil">Structure seule</option></select></span></h2>
          <div class="body"><canvas id="ds3d"></canvas><div class="hint" id="ds3dHint">glisser = tourner · clic droit ou Maj + glisser = déplacer · molette = zoom · double-clic = recadrer</div></div></section>
      </div>
      <div class="selection-readout ds-props" id="dsProps"></div>
      <div class="selection-readout" id="dsList"></div>
      <div class="btnrow ds-actions">
        <button id="dsPrint">Imprimer les plans (PDF) — un plan par niveau, à l'échelle</button>
        <button id="dsExport">Exporter l'aménagement (.json)</button>
        <label class="img-btn">Importer (.json)<input type="file" id="dsImport" accept="application/json,.json"></label>
        <button id="dsClear">Tout effacer</button>
        <span class="muted" style="align-self:center;font-family:var(--mono);font-size:11px">L'aménagement est gardé automatiquement dans ce navigateur.</span>
      </div>`;
    syncInputs();
    $('dsLevel').addEventListener('change', e => { level = +e.target.value; sel = null; drawAll(); });
    $('dsStyle').addEventListener('change', e => { st.style = e.target.value; changed(); });
    $('dsZones').addEventListener('change', e => { showZones = e.target.checked; drawAll(); });
    $('dsToile').addEventListener('change', e => { toileMode = e.target.value; dirty3 = true; draw3D(); });
    $('ds3dStyle').addEventListener('change', e => { style3 = e.target.value; dirty3 = true; draw3D(); });
    $('dsQual').addEventListener('change', e => { if (eng && eng.setQuality) { eng.setQuality(e.target.value === '1'); draw3D(); } });
    $('dsAdd').addEventListener('click', () => {
      const it = Z.newItem($('dsAddType').value, 0, 0, level);
      if (it.type === 'escalier' || it.type === 'echelle') { it.level = 0; it.h = st.mezz.h; }
      st.items.push(it); sel = { kind: 'item', id: it.id }; if (it.level !== level) { level = it.level; $('dsLevel').value = level; } changed();
    });
    if ($('dsAddO')) $('dsAddO').addEventListener('click', () => {
      const O = Z.OPENINGS.find(o => o.type === $('dsAddOpen').value);
      const op = { id: 'o' + Date.now().toString(36), type: O.type, edge: 0, offset: 0, w: O.w, h: O.h, sill: O.sill };
      st.openings.push(op); sel = { kind: 'open', id: op.id }; level = 0; $('dsLevel').value = 0; changed();
    });
    const mz = (id, key, num) => $(id).addEventListener('change', e => { st.mezz[key] = num ? parseFloat(e.target.value) || 0 : e.target.value; syncInputs(); changed(); });
    $('dsMezzOn').addEventListener('change', e => { st.mezz.on = e.target.checked; syncInputs(); changed(); });
    mz('dsMezzH', 'h', true); mz('dsMezzT', 'thick', true); mz('dsMezzShape', 'shape'); mz('dsMezzD', 'depth', true); mz('dsMezzW', 'width', true); mz('dsMezzA', 'angle', true); mz('dsMezzO', 'orient', true);
    $('dsPrint').addEventListener('click', printPlans);
    $('dsExport').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(Object.assign({ dome: window.CoverApp.label() }, st), null, 1)], { type: 'application/json' }));
      a.download = 'amenagement-dome.json'; document.body.appendChild(a); a.click(); a.remove();
    });
    $('dsImport').addEventListener('change', e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      const r = new FileReader();
      r.onload = ev => { try { const s = JSON.parse(ev.target.result); st = Object.assign(Z.defaultState(), s, { openings: [], mezz: Object.assign(Z.defaultState().mezz, s.mezz) }); sel = null; (st.models || []).forEach(loadModel); syncInputs(); changed(); } catch (err) { alertBox('Fichier illisible : ce n\'est pas un aménagement Nomad\'Om Designer.'); } };
      r.readAsText(f);
    });
    $('dsClear').addEventListener('click', () => { if ($('dsClear').dataset.armed) { st = Z.defaultState(); sel = null; syncInputs(); changed(); delete $('dsClear').dataset.armed; $('dsClear').textContent = 'Tout effacer'; } else { $('dsClear').dataset.armed = 1; $('dsClear').textContent = 'Confirmer : tout effacer ?'; setTimeout(() => { if ($('dsClear')) { delete $('dsClear').dataset.armed; $('dsClear').textContent = 'Tout effacer'; } }, 3000); } });
    planEvents();
    try { eng = window.Design3DThree && Design3DThree.create($('ds3d')); } catch (err) { eng = null; console.warn(err); }
    if (!eng) try { eng = window.Design3D && Design3D.create($('ds3d')); } catch (err) { eng = null; console.warn(err); }
    if (eng && eng.isThree) $('dsQual').style.display = '';
    if (eng) events3DGL(); else { events3DCanvas(); $('ds3dHint').textContent = 'WebGL2 indisponible sur cet appareil : rendu simplifié · glisser = tourner · molette = zoom'; }
    (st.models || []).forEach(loadModel);
    $('dsProps').addEventListener('input', onProp); $('dsProps').addEventListener('change', e => { if (e.target.dataset.act === 'glb') { const f = e.target.files[0]; e.target.value = ''; if (f && sel && sel.kind === 'item') importGLB(f, st.items.find(i => i.id === sel.id)); return; } onProp(e); }); $('dsProps').addEventListener('click', onPropClick);
    $('dsList').addEventListener('click', e => { const tr = e.target.closest('[data-sel]'); if (!tr) return; const [k, id] = tr.dataset.sel.split(':'); sel = { kind: k, id }; if (k === 'item') { level = st.items.find(i => i.id === id).level; $('dsLevel').value = level; } else { level = 0; $('dsLevel').value = 0; } drawAll(); });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', () => { if (visible()) drawAll(); });
    built = true;
  }
  function alertBox(t) { $('dsProps').innerHTML = '<span class="ds-warn">' + t + '</span>'; }
  function visible() { return $('viewDesign') && $('viewDesign').style.display !== 'none'; }
  function syncInputs() {
    const m = st.mezz;
    $('dsStyle').value = st.style; $('dsMezzOn').checked = m.on;
    $('dsMezzH').value = m.h; $('dsMezzT').value = m.thick; $('dsMezzShape').value = m.shape; $('dsMezzD').value = m.depth; $('dsMezzW').value = m.width; $('dsMezzA').value = m.angle; $('dsMezzO').value = m.orient;
    ['dsMezzH', 'dsMezzT', 'dsMezzShape', 'dsMezzD', 'dsMezzW', 'dsMezzA', 'dsMezzO'].forEach(id => $(id).disabled = !m.on);
    $('dsLDepth').style.display = m.shape === 'secteur' ? 'none' : '';
    $('dsLWidth').style.display = m.shape === 'droit' ? '' : 'none';
    $('dsLAngle').style.display = m.shape === 'secteur' ? '' : 'none';
    $('dsLevel').querySelector('option[value="1"]').disabled = !m.on;
    if (!m.on && level === 1) { level = 0; $('dsLevel').value = 0; }
  }

  // ---------------------------------------------------------
  // Dessin du plan — un seul code pour l'écran (canvas) et l'impression (SVG)
  // pen : poly(pts, style) / line / circle / ellipse / text / arc
  // ---------------------------------------------------------
  function canvasPen(ctx, k) {
    const apply = s => { ctx.lineWidth = (s.w || 1) * k; ctx.strokeStyle = s.stroke || '#000'; ctx.setLineDash((s.dash || []).map(v => v * k)); };
    return {
      poly(pts, s) { if (!pts.length) return; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); if (!s.open) ctx.closePath();
        if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); } if (s.stroke !== 'none') { apply(s); ctx.stroke(); } ctx.setLineDash([]); },
      line(a, b, s) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); apply(s); ctx.stroke(); ctx.setLineDash([]); },
      ellipse(c, rx, ry, rot, s) { ctx.beginPath(); ctx.ellipse(c.x, c.y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); } if (s.stroke !== 'none') { apply(s); ctx.stroke(); } ctx.setLineDash([]); },
      arc(c, r, a0, a1, s) { ctx.beginPath(); ctx.arc(c.x, c.y, r, a0, a1, a1 < a0); apply(s); ctx.stroke(); ctx.setLineDash([]); },
      text(t, p, s) { ctx.save(); ctx.translate(p.x, p.y); if (s.rot) ctx.rotate(s.rot); ctx.font = (s.bold ? 'bold ' : '') + (s.size || 9) * k + 'px "IBM Plex Mono",monospace'; ctx.textAlign = s.align || 'center'; ctx.textBaseline = 'middle';
        if (s.halo !== false) { ctx.lineWidth = 3 * k; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.strokeText(t, 0, 0); } ctx.fillStyle = s.color || '#000'; ctx.fillText(t, 0, 0); ctx.restore(); }
    };
  }
  function svgPen(out, k) {
    const f = v => v.toFixed(2), st_ = s => `stroke="${s.stroke || '#000'}" stroke-width="${f((s.w || 1) * k)}"${s.dash ? ` stroke-dasharray="${s.dash.map(v => f(v * k)).join(' ')}"` : ''}`;
    const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    return {
      poly(pts, s) { if (!pts.length) return; out.push(`<${s.open ? 'polyline' : 'polygon'} points="${pts.map(p => f(p.x) + ',' + f(p.y)).join(' ')}" fill="${s.fill || 'none'}" ${s.stroke === 'none' ? 'stroke="none"' : st_(s)}/>`); },
      line(a, b, s) { out.push(`<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}" ${st_(s)}/>`); },
      ellipse(c, rx, ry, rot, s) { out.push(`<ellipse cx="${f(c.x)}" cy="${f(c.y)}" rx="${f(Math.abs(rx))}" ry="${f(Math.abs(ry))}" transform="rotate(${f(rot * 180 / Math.PI)} ${f(c.x)} ${f(c.y)})" fill="${s.fill || 'none'}" ${s.stroke === 'none' ? 'stroke="none"' : st_(s)}/>`); },
      arc(c, r, a0, a1, s) { const p0 = { x: c.x + r * Math.cos(a0), y: c.y + r * Math.sin(a0) }, p1 = { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) };
        out.push(`<path d="M${f(p0.x)},${f(p0.y)} A${f(r)},${f(r)} 0 ${Math.abs(a1 - a0) > Math.PI ? 1 : 0} ${a1 > a0 ? 1 : 0} ${f(p1.x)},${f(p1.y)}" fill="none" ${st_(s)}/>`); },
      text(t, p, s) { out.push(`<text x="${f(p.x)}" y="${f(p.y)}" font-size="${f((s.size || 9) * k)}" ${s.bold ? 'font-weight="700" ' : ''}text-anchor="${s.align === 'left' ? 'start' : s.align === 'right' ? 'end' : 'middle'}" dominant-baseline="middle" fill="${s.color || '#000'}"${s.rot ? ` transform="rotate(${f(s.rot * 180 / Math.PI)} ${f(p.x)} ${f(p.y)})"` : ''} paint-order="stroke" stroke="#fff" stroke-width="${f(2.5 * k)}">${esc(t)}</text>`); }
    };
  }

  // segment de paroi i (bord bas) et position d'une ouverture
  function openingGeom(op) {
    const B = model.base, n = B.length, i = ((op.edge % n) + n) % n, A = B[i], C = B[(i + 1) % n];
    const L = Math.hypot(C.x - A.x, C.z - A.z), ux = (C.x - A.x) / L, uz = (C.z - A.z) / L;
    const mid = L / 2 + (op.offset || 0), w = Math.min(op.w, L);
    const c = Math.max(w / 2, Math.min(L - w / 2, mid));
    // normale intérieure (vers l'axe)
    let nx = -uz, nz = ux; if (nx * (A.x + C.x) / 2 + nz * (A.z + C.z) / 2 > 0) { nx = -nx; nz = -nz; }
    return { A, C, L, ux, uz, nx, nz, p0: { x: A.x + ux * (c - w / 2), z: A.z + uz * (c - w / 2) }, p1: { x: A.x + ux * (c + w / 2), z: A.z + uz * (c + w / 2) }, w, edge: i };
  }

  // la paroi penche vers l'intérieur : hauteur de toile juste derrière l'ouverture
  function openingCheck(op) {
    const g = openingGeom(op), c = { x: (g.p0.x + g.p1.x) / 2 + g.nx * 0.05, z: (g.p0.z + g.p1.z) / 2 + g.nz * 0.05 };
    const ceil = Z.ceilingAt(model, c.x, c.z) || 0, top = (op.sill || 0) + op.h, out = [];
    if (op.w > g.L + 1e-9) out.push('plus large que le côté (' + mm(g.L) + ' mm) : structure à modifier');
    // distance horizontale où la toile atteint le haut de l'ouverture
    let d = 0; while (d < 3 && (Z.ceilingAt(model, c.x + g.nx * d, c.z + g.nz * d) || 0) < top) d += 0.02;
    if (ceil < top) out.push('la toile n\'est qu\'à ' + cm(ceil) + ' cm au bord : cadre en saillie (sas) d\'environ ' + cm(d) + ' cm');
    return out;
  }
  function drawPlan(pen, T, k, lvl, opts) {
    opts = opts || {};
    const nb = st.style !== 'color';
    const base = Z.section(model, 0), mp = Z.mezzPolygon(model, st.mezz);
    const floorY = lvl === 1 ? st.mezz.h : 0;
    const wall = lvl === 1 ? Z.section(model, st.mezz.h) : base;
    const P = pts => pts.map(T);
    // sol
    pen.poly(P(lvl === 1 && mp ? mp : base), { fill: nb ? '#fff' : (lvl === 1 ? '#e9eef6' : '#f4efe4'), stroke: 'none' });
    // zones de hauteur sous plafond
    if (opts.zones !== false && showZones) {
      const z1 = Z.section(model, floorY + 1.0), z18 = Z.section(model, floorY + 1.8);
      const lab = (poly, txt, col) => { if (!poly) return; const p = poly.reduce((a, q) => (q.z > a.z ? q : a), poly[0]); pen.text(txt, T({ x: p.x, z: p.z - 0.12 }), { size: 7.5, color: col }); };
      if (z18) pen.poly(P(z18), { stroke: nb ? '#555' : '#2c8a3c', w: 0.8, dash: [6, 3] });
      if (z1) pen.poly(P(z1), { stroke: nb ? '#888' : '#c08a1e', w: 0.8, dash: [2, 3] });
      lab(z18, 'debout ≥ 1,80 m', nb ? '#444' : '#2c8a3c'); lab(z1, 'assis ≥ 1,00 m', nb ? '#666' : '#a87310');
    }
    // structure vue du dessus (montants)
    if (opts.structure !== false) model.lines.forEach(l => {
      if (lvl === 1 && Math.max(l[0].y, l[1].y) < floorY) return;
      pen.line(T(l[0]), T(l[1]), { stroke: nb ? '#c8c8c8' : '#c9d3dc', w: 0.5 });
    });
    // mezzanine
    if (mp && lvl === 0) { pen.poly(P(mp), { stroke: nb ? '#000' : '#2b5a8a', w: 1, dash: [10, 3, 2, 3] });
      const c = mp.reduce((a, q) => ({ x: a.x + q.x / mp.length, z: a.z + q.z / mp.length }), { x: 0, z: 0 });
      pen.text('mezzanine au-dessus (sous-face ' + fr(st.mezz.h - st.mezz.thick) + ' m)', T(c), { size: 7.5, color: nb ? '#333' : '#2b5a8a' }); }
    if (lvl === 1) { pen.poly(P(base), { stroke: nb ? '#999' : '#b9c0c6', w: 0.6, dash: [3, 3] });
      if (mp) pen.poly(P(mp), { stroke: '#000', w: 2.2 }); }
    // paroi : bande pleine (poché) de l'épaisseur montant + toile, vers l'extérieur
    const tW = 0.07, poche = nb ? '#1d1d1d' : '#7d6a50';
    const outer = wall.map(p => { const r = Math.hypot(p.x, p.z) || 1; return { x: p.x * (r + tW) / r, z: p.z * (r + tW) / r }; });
    if (lvl === 0) wall.forEach((p, i) => { const j = (i + 1) % wall.length; pen.poly([T(p), T(wall[j]), T(outer[j]), T(outer[i])], { fill: poche, stroke: poche, w: 0.3 }); });
    else pen.poly(P(wall), { stroke: '#000', w: 1.4 });
    // ouvertures
    if (lvl === 0) st.openings.forEach(op => {
      const g = openingGeom(op), a = T(g.p0), b = T(g.p1), on = sel && sel.kind === 'open' && sel.id === op.id;
      const ow = 0.075, o0 = T({ x: g.p0.x - g.nx * ow, z: g.p0.z - g.nz * ow }), o1 = T({ x: g.p1.x - g.nx * ow, z: g.p1.z - g.nz * ow });
      pen.poly([a, b, o1, o0], { fill: '#fff', stroke: 'none' });          // ouverture dans la paroi
      pen.line(a, o0, { stroke: '#000', w: 1 }); pen.line(b, o1, { stroke: '#000', w: 1 }); // tableaux
      const col = on ? '#d8912b' : '#000';
      if (op.type === 'porte') {
        const hinge = g.p0, leaf = { x: hinge.x + g.nx * g.w, z: hinge.z + g.nz * g.w };
        pen.line(T(hinge), T(leaf), { stroke: col, w: 1.4 });
        const c = T(hinge), r = Math.hypot(T(leaf).x - c.x, T(leaf).y - c.y);
        const a0 = Math.atan2(T(leaf).y - c.y, T(leaf).x - c.x), a1 = Math.atan2(b.y - c.y, b.x - c.x);
        let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        pen.arc(c, r, a0, a0 + d, { stroke: col, w: 0.7, dash: [3, 2] });
      } else {
        const off = 0.03, sh = (p, s) => T({ x: p.x + g.nx * s, z: p.z + g.nz * s });
        [-off, 0, off].forEach(s => pen.line(sh(g.p0, s), sh(g.p1, s), { stroke: col, w: op.type === 'baie' ? 1 : 0.7 }));
      }
      pen.text((op.type === 'porte' ? 'P' : op.type === 'baie' ? 'B' : 'F') + ' ' + cm(op.w), T({ x: (g.p0.x + g.p1.x) / 2 - g.nx * 0.25, z: (g.p0.z + g.p1.z) / 2 - g.nz * 0.25 }), { size: 7.5, color: col });
    });
    // éléments
    st.items.filter(it => (it.level || 0) === lvl || (lvl === 1 && (it.type === 'escalier' || it.type === 'echelle'))).forEach(it => {
      const L = Z.libOf(it.type), issues = Z.checkItem(model, st, it), on = sel && sel.kind === 'item' && sel.id === it.id;
      const ghost = lvl === 1 && (it.level || 0) === 0; // trémie de l'escalier vue depuis la mezzanine
      const a = (it.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      const loc = (x, y) => T({ x: it.x + c * x - s * y, z: it.z + s * x + c * y });
      const stroke = issues.length && !ghost ? '#b23a2f' : (on ? '#d8912b' : '#000');
      const fill = ghost ? 'none' : nb ? '#fff' : 'rgba(' + L.color.join(',') + ',0.55)';
      const sty = { stroke, w: on ? 1.8 : 1, fill, dash: ghost ? [4, 3] : null };
      Z.symbolOps(it).forEach((o, i) => {
        const s1 = i === 0 ? sty : { stroke, w: o.thin ? 0.45 : 0.8, fill: o.nofill || ghost ? null : (o.fill ? (nb ? '#fff' : 'rgba(255,255,255,0.55)') : null), dash: ghost ? [4, 3] : (o.dash || null) };
        if (o.t === 'rect') pen.poly([loc(o.x, o.y), loc(o.x + o.w, o.y), loc(o.x + o.w, o.y + o.h), loc(o.x, o.y + o.h)], i === 0 ? sty : Object.assign({}, s1, { fill: s1.fill }));
        else if (o.t === 'line') pen.line(loc(o.x1, o.y1), loc(o.x2, o.y2), s1);
        else if (o.t === 'poly') pen.poly(o.pts.map(q => loc(q[0], q[1])), Object.assign({}, s1, { open: o.open }));
        else if (o.t === 'circle' || o.t === 'ellipse') {
          const ctr = loc(o.cx, o.cy), px = loc(o.cx + (o.rx || o.r), o.cy), py = loc(o.cx, o.cy + (o.ry || o.r));
          pen.ellipse(ctr, Math.hypot(px.x - ctr.x, px.y - ctr.y), Math.hypot(py.x - ctr.x, py.y - ctr.y), Math.atan2(px.y - ctr.y, px.x - ctr.x), i === 0 ? sty : s1);
        }
      });
      if (!ghost) {
        const ctr = T({ x: it.x, z: it.z }), sz = Math.min(it.w, it.d);
        pen.text(it.name, { x: ctr.x, y: ctr.y - (sz > 0.6 ? 5 * k : 0) }, { size: 8, bold: true, color: stroke === '#000' ? '#000' : stroke });
        if (sz > 0.6 && opts.dims !== false) pen.text(cm(it.w) + '×' + cm(it.d), { x: ctr.x, y: ctr.y + 6 * k }, { size: 7, color: '#444' });
        if (issues.length) pen.text('⚠', T({ x: it.x + it.w / 2.5 * c, z: it.z + it.w / 2.5 * s }), { size: 10, color: '#b23a2f' });
      } else pen.text('trémie ' + it.name.toLowerCase(), T({ x: it.x, z: it.z }), { size: 7, color: '#555' });
    });
    // cote du diamètre au sol + flèche du nord + échelle
    const R = Math.max(...wall.map(p => Math.hypot(p.x, p.z)));
    if (opts.cotes !== false) {
      const y0 = -R - 0.35, a = T({ x: -R, z: y0 }), b = T({ x: R, z: y0 });
      pen.line(a, b, { stroke: '#000', w: 0.6 });
      [a, b].forEach(p => pen.line({ x: p.x, y: p.y - 3 * k }, { x: p.x, y: p.y + 3 * k }, { stroke: '#000', w: 0.6 }));
      pen.text('Ø ' + fr(2 * R) + ' m ' + (lvl === 1 ? 'à ' + fr(st.mezz.h) + ' m' : 'au sol'), { x: (a.x + b.x) / 2, y: a.y - 6 * k }, { size: 8 });
    }
  }

  // ---------------------------------------------------------
  // Plan à l'écran
  // ---------------------------------------------------------
  let planT = null;
  function planTransform(cv) {
    const W = cv.width, H = cv.height, R = model.radius + 0.6;
    const s = Math.min(W, H) / (2 * R) * view.zoom;
    const cx = W / 2 + view.panX, cy = H / 2 + view.panY;
    return { s, f: p => ({ x: cx + p.x * s, y: cy + p.z * s }), inv: q => ({ x: (q.x - cx) / s, z: (q.y - cy) / s }) };
  }
  function drawPlanScreen() {
    const cv = $('dsPlan'), r = cv.getBoundingClientRect(), dpr = devicePixelRatio;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = st.style === 'color' ? '#f7f8f8' : '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    planT = planTransform(cv);
    // quadrillage 50 cm
    const g = st.style === 'color' ? 'rgba(43,90,138,0.08)' : 'rgba(0,0,0,0.06)', R = model.radius + 0.6;
    ctx.strokeStyle = g; ctx.lineWidth = 1;
    for (let v = -Math.ceil(R / 0.5) * 0.5; v <= R; v += 0.5) {
      const a = planT.f({ x: v, z: -R }), b = planT.f({ x: v, z: R }), c = planT.f({ x: -R, z: v }), d = planT.f({ x: R, z: v });
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    }
    drawPlan(canvasPen(ctx, dpr), planT.f, dpr, level);
    // nord + échelle
    const pen = canvasPen(ctx, dpr);
    const nx = cv.width - 30 * dpr, ny = 34 * dpr;
    pen.poly([{ x: nx, y: ny - 16 * dpr }, { x: nx + 7 * dpr, y: ny + 6 * dpr }, { x: nx, y: ny + 1 * dpr }, { x: nx - 7 * dpr, y: ny + 6 * dpr }], { fill: '#000', stroke: 'none' });
    pen.text('N', { x: nx, y: ny - 24 * dpr }, { size: 9, bold: true });
    const sx = 16 * dpr, sy = cv.height - 44 * dpr, L1 = planT.s;
    for (let i = 0; i < 2; i++) pen.poly([{ x: sx + i * L1, y: sy }, { x: sx + (i + 1) * L1, y: sy }, { x: sx + (i + 1) * L1, y: sy + 5 * dpr }, { x: sx + i * L1, y: sy + 5 * dpr }], { fill: i ? '#fff' : '#000', stroke: '#000', w: 0.8 });
    pen.text('0', { x: sx, y: sy + 13 * dpr }, { size: 7.5 }); pen.text('1', { x: sx + L1, y: sy + 13 * dpr }, { size: 7.5 }); pen.text('2 m', { x: sx + 2 * L1, y: sy + 13 * dpr }, { size: 7.5 });
    drawRotHandle(ctx, dpr);
    drawDropOut(ctx, dpr);
    $('dsPlanInfo').textContent = level === 1 ? 'MEZZANINE — plancher à ' + fr(st.mezz.h) + ' m' : 'REZ-DE-CHAUSSÉE';
  }

  // poignée de rotation : devant l'élément (côté +profondeur), à 30 cm du bord
  let rotating = null;
  function handleOf(it) {
    const a = (it.rot || 0) * Math.PI / 180, L = it.d / 2 + 0.3;
    return { x: it.x - Math.sin(a) * L, z: it.z + Math.cos(a) * L, ex: it.x - Math.sin(a) * it.d / 2, ez: it.z + Math.cos(a) * it.d / 2 };
  }
  function selectedItemOnLevel() {
    if (!sel || sel.kind !== 'item') return null;
    const it = st.items.find(i => i.id === sel.id);
    return it && (it.level || 0) === level ? it : null;
  }
  function drawRotHandle(ctx, dpr) {
    const it = selectedItemOnLevel(); if (!it) return;
    const h = handleOf(it), H = planT.f(h), E = planT.f({ x: h.ex, z: h.ez });
    ctx.save();
    ctx.strokeStyle = '#d8912b'; ctx.lineWidth = 1.5 * dpr; ctx.setLineDash([4 * dpr, 3 * dpr]);
    ctx.beginPath(); ctx.moveTo(E.x, E.y); ctx.lineTo(H.x, H.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(H.x, H.y, 9 * dpr, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d8912b'; ctx.lineWidth = 2 * dpr; ctx.stroke();
    ctx.fillStyle = '#d8912b'; ctx.font = 'bold ' + (12 * dpr) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('↻', H.x, H.y + 0.5 * dpr);
    if (rotating) {
      const C = planT.f({ x: it.x, z: it.z });
      ctx.font = 'bold ' + (11 * dpr) + 'px monospace'; ctx.lineWidth = 3 * dpr; ctx.strokeStyle = '#fff';
      const t = Math.round(it.rot || 0) + '°'; ctx.strokeText(t, C.x, C.y - 22 * dpr); ctx.fillStyle = '#b5701a'; ctx.fillText(t, C.x, C.y - 22 * dpr);
    }
    ctx.restore();
  }
  function hitHandle(p) {
    const it = selectedItemOnLevel(); if (!it) return null;
    const h = handleOf(it), tol = 14 * devicePixelRatio / planT.s;
    return Math.hypot(p.x - h.x, p.z - h.z) < tol ? it : null;
  }
  function hitItem(p) {
    const list = st.items.filter(it => (it.level || 0) === level).slice().reverse();
    return list.find(it => Z.pointIn(p, Z.itemPolygon(it)));
  }
  function hitOpening(p) {
    if (level !== 0) return null;
    return st.openings.find(op => { const g = openingGeom(op), m = { x: (g.p0.x + g.p1.x) / 2, z: (g.p0.z + g.p1.z) / 2 }; return Math.hypot(p.x - m.x, p.z - m.z) < Math.max(0.3, g.w / 2 + 0.1); });
  }
  function planEvents() {
    const cv = $('dsPlan');
    let drag = null;
    const pos = e => { const r = cv.getBoundingClientRect(); return planT.inv({ x: (e.clientX - r.left) * devicePixelRatio, y: (e.clientY - r.top) * devicePixelRatio }); };
    cv.style.touchAction = 'none';
    cv.addEventListener('pointermove', e => { if (drag) return; const p = pos(e); cv.style.cursor = hitHandle(p) ? 'alias' : (hitItem(p) || hitOpening(p) ? 'move' : 'default'); });
    cv.addEventListener('pointerdown', e => {
      const p = pos(e), rh = hitHandle(p);
      if (rh) { drag = { kind: 'rot', it: rh }; rotating = true; try { cv.setPointerCapture(e.pointerId); } catch (err) {} drawPlanScreen(); return; }
      const it = hitItem(p), op = !it && hitOpening(p);
      if (it) { sel = { kind: 'item', id: it.id }; drag = { kind: 'item', it, dx: it.x - p.x, dz: it.z - p.z, orig: { x: it.x, z: it.z } }; }
      else if (op) { sel = { kind: 'open', id: op.id }; drag = { kind: 'open', op }; }
      else { sel = null; drag = { kind: 'pan', x: e.clientX, y: e.clientY }; }
      drawAll();
    });
    window.addEventListener('pointermove', e => {
      if (!drag || !visible()) return;
      if (drag.kind === 'pan') { view.panX += (e.clientX - drag.x) * devicePixelRatio; view.panY += (e.clientY - drag.y) * devicePixelRatio; drag.x = e.clientX; drag.y = e.clientY; drawPlanScreen(); return; }
      const p = pos(e);
      if (drag.kind === 'rot') {
        // angle de la poignée autour du centre ; pas de 15°, libre avec Maj
        let a = Math.atan2(-(p.x - drag.it.x), p.z - drag.it.z) * 180 / Math.PI;
        if (!e.shiftKey) a = Math.round(a / 15) * 15;
        drag.it.rot = Math.round(((a % 360) + 360) % 360 * 10) / 10; drag.moved = true; drawPlanScreen(); return;
      }
      if (drag.kind === 'item') { drag.it.x = Math.round((p.x + drag.dx) / 0.05) * 0.05; drag.it.z = Math.round((p.z + drag.dz) / 0.05) * 0.05; drag.moved = true; dropOut = outsideDome(drag.it) ? drag.it.id : null; drawPlanScreen(); }
      else if (drag.kind === 'open') {
        // l'ouverture glisse le long de la paroi : côté le plus proche + décalage
        const B = model.base, n = B.length; let best = null;
        for (let i = 0; i < n; i++) { const A = B[i], C = B[(i + 1) % n], L = Math.hypot(C.x - A.x, C.z - A.z), ux = (C.x - A.x) / L, uz = (C.z - A.z) / L;
          const t = Math.max(0, Math.min(L, (p.x - A.x) * ux + (p.z - A.z) * uz)), q = { x: A.x + ux * t, z: A.z + uz * t }, d = Math.hypot(p.x - q.x, p.z - q.z);
          if (!best || d < best.d) best = { d, i, off: Math.round((t - L / 2) / 0.05) * 0.05 }; }
        drag.op.edge = best.i; drag.op.offset = best.off; drag.moved = true; drawPlanScreen();
      }
    });
    window.addEventListener('pointerup', () => { const was = drag; drag = null; rotating = null; dropOut = null;
      if (was && was.kind === 'item' && was.moved && outsideDome(was.it)) { deleteWithUndo(was.it, was.orig); return; }
      if (was && was.moved) changed(); else if (was && was.kind === 'rot') drawPlanScreen(); });
    cv.addEventListener('wheel', e => { e.preventDefault(); const k = e.deltaY < 0 ? 1.12 : 1 / 1.12; view.zoom = Math.max(0.5, Math.min(8, view.zoom * k)); view.panX *= k; view.panY *= k; drawPlanScreen(); }, { passive: false });
    cv.addEventListener('dblclick', () => { view = { zoom: 1, panX: 0, panY: 0 }; drawPlanScreen(); });
  }
  function onKey(e) {
    if (!visible() || !sel || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { removeSel(); e.preventDefault(); }
    else if ((e.key === 'r' || e.key === 'R') && sel.kind === 'item') { const it = st.items.find(i => i.id === sel.id); it.rot = ((it.rot || 0) + (e.shiftKey ? -15 : 15) + 360) % 360; changed(); }
  }
  // objet lâché hors du dôme (centre au-delà de la paroi) : supprimé, avec « Annuler »
  let dropOut = null, undoTimer = null;
  function outsideDome(it) {
    const sec = Z.section(model, (it.level || 0) ? st.mezz.h : 0);
    return !sec || !Z.pointIn({ x: it.x, z: it.z }, sec);
  }
  function drawDropOut(ctx, dpr) {
    if (!dropOut) return;
    const it = st.items.find(i => i.id === dropOut); if (!it) return;
    const poly = Z.itemPolygon(it).map(planT.f);
    ctx.save(); ctx.beginPath(); poly.forEach((v, i) => i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)); ctx.closePath();
    ctx.fillStyle = 'rgba(178,58,47,0.25)'; ctx.fill(); ctx.strokeStyle = '#b23a2f'; ctx.lineWidth = 2 * dpr; ctx.stroke();
    const xs = poly.map(v => v.x), ys = poly.map(v => v.y), a = { x: Math.min(...xs), y: Math.min(...ys) }, b = { x: Math.max(...xs), y: Math.max(...ys) };
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(b.x, a.y); ctx.lineTo(a.x, b.y); ctx.stroke();
    const C0 = planT.f({ x: it.x, z: it.z }), C = { x: Math.max(95 * dpr, Math.min(ctx.canvas.width - 95 * dpr, C0.x)), y: C0.y };
    ctx.font = 'bold ' + (11 * dpr) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3 * dpr; ctx.strokeStyle = '#fff';
    ctx.strokeText('relâcher pour supprimer', C.x, b.y + 14 * dpr); ctx.fillStyle = '#b23a2f'; ctx.fillText('relâcher pour supprimer', C.x, b.y + 14 * dpr);
    ctx.restore();
  }
  function deleteWithUndo(it, orig) {
    const idx = st.items.indexOf(it);
    st.items = st.items.filter(i => i !== it); if (sel && sel.id === it.id) sel = null;
    changed();
    let box = $('dsUndo');
    if (!box) { box = document.createElement('div'); box.id = 'dsUndo'; box.className = 'overlay-sel'; box.style.left = 'auto'; box.style.right = '8px';
      $('dsPlan').parentNode.appendChild(box); }
    box.innerHTML = '🗑 ' + it.name + ' supprimé <button style="font-family:var(--mono);font-size:11px;padding:3px 8px;margin-left:6px;cursor:pointer">Annuler</button>';
    box.style.display = '';
    box.querySelector('button').onclick = () => {
      Object.assign(it, orig); st.items.splice(Math.min(idx, st.items.length), 0, it); sel = { kind: 'item', id: it.id };
      box.style.display = 'none'; clearTimeout(undoTimer); changed();
    };
    clearTimeout(undoTimer); undoTimer = setTimeout(() => { box.style.display = 'none'; }, 7000);
  }
  function removeSel() {
    if (!sel) return;
    if (sel.kind === 'item') st.items = st.items.filter(i => i.id !== sel.id); else st.openings = st.openings.filter(o => o.id !== sel.id);
    sel = null; changed();
  }

  // ---------------------------------------------------------
  // Propriétés, liste, chiffres
  // ---------------------------------------------------------
  function renderProps() {
    const el = $('dsProps');
    if (!sel) { el.innerHTML = '<span class="muted">Cliquez un élément ou une ouverture sur le plan pour le régler. Ajoutez des éléments avec « + Ajouter ».</span>'; return; }
    const num = (k, v, lab, step) => `<label>${lab}<input type="number" data-k="${k}" value="${+(+v).toFixed(3)}" step="${step || 0.05}"></label>`;
    if (sel.kind === 'item') {
      const it = st.items.find(i => i.id === sel.id); if (!it) { sel = null; return renderProps(); }
      const L = Z.libOf(it.type), issues = Z.checkItem(model, st, it), access = it.type === 'escalier' || it.type === 'echelle';
      el.innerHTML = `<div class="sheet-head"><b>${L.label}</b>${issues.length ? '<span class="ds-warn">⚠ ' + issues.join(' · ') + '</span>' : '<span class="muted">✓ tient à sa place</span>'}</div>
        <label>Nom<input type="text" data-k="name" value="${it.name.replace(/"/g, '&quot;')}"></label>
        ${num('w', it.w, 'Largeur (m)')}${num('d', it.d, 'Profondeur (m)')}${num('h', it.h, access ? 'Hauteur à monter (m)' : 'Hauteur (m)')}
        ${num('rot', it.rot || 0, 'Rotation (°)', 15)}${num('x', it.x, 'Position X (m)')}${num('z', it.z, 'Position Z (m)')}
        ${access ? '' : `<label>Niveau<select data-k="level"><option value="0"${it.level ? '' : ' selected'}>Rez</option><option value="1"${it.level ? ' selected' : ''}${st.mezz.on ? '' : ' disabled'}>Mezzanine</option></select></label>`}
        <label>Modèle 3D<select data-k="model"><option value="">Modélisé (par défaut)</option>${(st.models || []).map(m => '<option value="' + m.id + '"' + (it.model === m.id ? ' selected' : '') + '>' + m.name + (m.error ? ' (illisible)' : '') + '</option>').join('')}</select></label>
        <label class="img-btn" style="flex-direction:row;padding:5px 10px;margin-top:12px">Importer un .glb…<input type="file" data-act="glb" accept=".glb,model/gltf-binary"></label>
        ${it.model ? '<div class="muted">Le modèle importé est mis aux dimensions ci-dessus (largeur × hauteur × profondeur). Il est gardé dans l\'aménagement et dans le fichier .json exporté.</div>' : ''}
        <div><button data-act="rot90">↻ Tourner 90°</button><button data-act="dup">Dupliquer</button><button data-act="del" class="danger">Supprimer</button></div>`;
    } else {
      const op = st.openings.find(o => o.id === sel.id); if (!op) { sel = null; return renderProps(); }
      const g = openingGeom(op);
      el.innerHTML = `<div class="sheet-head"><b>${Z.OPENINGS.find(o => o.type === op.type).label}</b><span class="muted">côté ${g.edge + 1} / ${model.base.length} du bord bas (longueur ${mm(g.L)} mm) — glisser sur le plan pour la déplacer</span></div>
        ${num('edge', g.edge + 1, 'Côté n°', 1)}${num('offset', op.offset || 0, 'Décalage (m)')}${num('w', op.w, 'Largeur (m)')}${num('h', op.h, 'Hauteur (m)')}${num('sill', op.sill || 0, 'Allège (m)')}
        <div><button data-act="del" class="danger">Supprimer</button></div>
        ${openingCheck(op).map(t => '<div style="color:#a8650f">ⓘ ' + t + '</div>').join('')}`;
    }
  }
  function onProp(e) {
    const k = e.target.dataset.k; if (!k || !sel) return;
    if (e.type === 'input' && e.target.type !== 'text') return;
    const obj = sel.kind === 'item' ? st.items.find(i => i.id === sel.id) : st.openings.find(o => o.id === sel.id);
    let v = e.target.value;
    if (k === 'model') { obj.model = v || undefined; return changed(); }
    if (k !== 'name') v = parseFloat(v) || 0;
    if (k === 'edge') v = Math.round(v) - 1;
    if (k === 'level') { v = +e.target.value; level = v; $('dsLevel').value = v; }
    obj[k] = v;
    if (k === 'name') { save(); drawPlanScreen(); renderList(); return; }
    changed();
  }
  function onPropClick(e) {
    const a = e.target.dataset.act; if (!a || a === 'glb') return;
    if (a === 'del') return removeSel();
    const it = st.items.find(i => i.id === sel.id);
    if (a === 'rot90') it.rot = ((it.rot || 0) + 90) % 360;
    if (a === 'dup') { const c = Object.assign({}, it, { id: 'i' + Date.now().toString(36), x: it.x + 0.3, z: it.z + 0.3 }); st.items.push(c); sel = { kind: 'item', id: c.id }; }
    changed();
  }
  function renderList() {
    const s = Z.stats(model, st);
    let h = '<div class="sheet-head"><b>Surfaces et volume</b><span class="muted">calculés sur les facettes réelles du dôme (' + window.CoverApp.label() + ', surface des nœuds)</span></div>';
    h += '<div class="sheet-kpis"><span>Ø au sol <b>' + fr(s.diameter) + ' m</b></span><span>Hauteur <b>' + fr(s.height) + ' m</b></span><span>Sol <b>' + fr(s.ground, 1) + ' m²</b></span>' +
      '<span>Debout (≥ 1,80 m) <b>' + fr(s.stand, 1) + ' m²</b></span><span>Assis (≥ 1,00 m) <b>' + fr(s.sit, 1) + ' m²</b></span><span>Volume <b>' + fr(s.volume, 1) + ' m³</b></span>' +
      (st.mezz.on ? '<span>Mezzanine <b>' + fr(s.mezz, 1) + ' m²</b> (debout ' + fr(s.mezzStand, 1) + ', assis ' + fr(s.mezzSit, 1) + ')</span><span>Surface totale <b>' + fr(s.ground + s.mezz, 1) + ' m²</b></span>' : '') + '</div>';
    if (saveWarn) h += '<div class="ds-warn">⚠ Les modèles importés sont trop lourds pour la sauvegarde automatique du navigateur : utilisez « Exporter l\'aménagement (.json) » pour les garder.</div>';
    if (st.mezz.on && !Z.mezzPolygon(model, st.mezz)) h += '<div class="ds-warn">⚠ La mezzanine est trop haute : le plancher dépasse le sommet du dôme.</div>';
    else if (st.mezz.on && s.mezzSit < 0.5) h += '<div class="ds-warn">⚠ Sur la mezzanine, il reste moins d\'1 m sous la toile presque partout : baisser le plancher (le dôme fait ' + fr(s.height) + ' m de haut).</div>';
    const rows = st.items.map(it => { const iss = Z.checkItem(model, st, it); return `<tr data-sel="item:${it.id}"${sel && sel.id === it.id ? ' class="on"' : ''}><td><b>${it.name}</b></td><td>${it.level ? 'Mezzanine' : 'Rez'}</td><td>${cm(it.w)} × ${cm(it.d)} × ${cm(it.h)} cm</td><td>${it.rot || 0}°</td><td>${iss.length ? '<span class="ds-warn">⚠ ' + iss.join(' · ') + '</span>' : '✓'}</td></tr>`; }).join('') +
      st.openings.map(op => { const g = openingGeom(op); return `<tr data-sel="open:${op.id}"${sel && sel.id === op.id ? ' class="on"' : ''}><td><b>${Z.OPENINGS.find(o => o.type === op.type).label}</b></td><td>Rez, côté ${g.edge + 1}</td><td>${cm(op.w)} × ${cm(op.h)} cm, allège ${cm(op.sill || 0)}</td><td></td><td>${(c => c.length ? '<span style="color:#a8650f">ⓘ ' + c.join(' · ') + '</span>' : '✓')(openingCheck(op))}</td></tr>`; }).join('');
    h += rows ? '<table class="clickable"><tr><th>Élément</th><th>Niveau</th><th>Dimensions</th><th>Rotation</th><th>Place</th></tr>' + rows + '</table>' : '<div class="muted">Aucun élément pour l\'instant.</div>';
    $('dsList').innerHTML = h;
  }

  // ---------------------------------------------------------
  // Rendu 3D (projection orthographique + peintre, sans dépendance)
  // ---------------------------------------------------------
  function events3DCanvas() {
    const cv = $('ds3d'); let d = null;
    cv.addEventListener('mousedown', e => { d = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mousemove', e => { if (!d) return; rotY += (e.clientX - d.x) * 0.008; rotX = Math.max(-0.2, Math.min(1.55, rotX + (e.clientY - d.y) * 0.008)); d = { x: e.clientX, y: e.clientY }; draw3D(); });
    window.addEventListener('mouseup', () => { d = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); zoom3 = Math.max(0.4, Math.min(5, zoom3 * (e.deltaY < 0 ? 1.08 : 0.93))); draw3D(); }, { passive: false });
  }
  function draw3DCanvas() {
    const cv = $('ds3d'), r = cv.getBoundingClientRect(), dpr = devicePixelRatio;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.fillStyle = '#fbfcfc'; ctx.fillRect(0, 0, W, H);
    const cY = Math.cos(rotY), sY = Math.sin(rotY), cX = Math.cos(rotX), sX = Math.sin(rotX);
    const sc = Math.min(W, H) / (model.radius * 2.7) * zoom3, ox = W / 2, oy = H / 2 + model.height * sc * 0.25;
    const pr = p => { const x1 = p.x * cY + p.z * sY, z1 = p.z * cY - p.x * sY, y = p.y - model.height * 0.35; const y2 = y * cX - z1 * sX, z2 = z1 * cX + y * sX; return { x: ox + x1 * sc, y: oy - y2 * sc, d: z2 }; };
    const view = { x: -sY * cX, y: sX, z: cY * cX }; // vers la caméra
    const polys = [];
    const add = (pts3, fill, stroke, lw) => { const q = pts3.map(pr); polys.push({ q, d: q.reduce((a, v) => a + v.d, 0) / q.length, fill, stroke, lw }); };
    const light = n => 0.55 + 0.45 * Math.max(0, n.x * 0.35 + n.y * 0.8 + n.z * 0.45);
    const nrm = (a, b, c) => { const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z }; const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x }, L = Math.hypot(n.x, n.y, n.z) || 1; return { x: n.x / L, y: n.y / L, z: n.z / L }; };
    const shade = (rgb, k, a) => 'rgba(' + rgb.map(v => Math.round(Math.min(255, v * k))).join(',') + ',' + (a === undefined ? 1 : a) + ')';
    // sol
    const base = Z.section(model, 0);
    add(base.map(p => ({ x: p.x, y: 0, z: p.z })), '#e8e1d3', '#8a8f94', 1);
    // toile
    if (toileMode !== 'fil') model.tris.forEach(t => {
      let n = nrm(t[0], t[1], t[2]); const c = { x: (t[0].x + t[1].x + t[2].x) / 3, z: (t[0].z + t[1].z + t[2].z) / 3 };
      if (n.x * c.x + n.z * c.z + n.y * 0.3 < 0) n = { x: -n.x, y: -n.y, z: -n.z };
      const facing = n.x * view.x + n.y * view.y + n.z * view.z > 0;
      if (toileMode === 'coupe' && facing) return; // on enlève la toile côté caméra : on voit dedans
      add(t, shade([214, 205, 186], light(n), toileMode === 'verre' ? 0.28 : 0.92), 'rgba(80,70,55,0.5)', 0.8);
    });
    // structure
    model.lines.forEach(l => add([l[0], l[1]], null, toileMode === 'fil' ? '#6b5a44' : 'rgba(90,75,55,0.55)', toileMode === 'fil' ? 2 : 1));
    // mezzanine
    const mp = Z.mezzPolygon(model, st.mezz);
    if (mp) {
      const top = mp.map(p => ({ x: p.x, y: st.mezz.h, z: p.z })), bot = mp.map(p => ({ x: p.x, y: st.mezz.h - st.mezz.thick, z: p.z }));
      add(bot, '#b9a27e', '#6b5a44', 1);
      mp.forEach((p, i) => { const q = mp[(i + 1) % mp.length]; add([{ x: p.x, y: st.mezz.h, z: p.z }, { x: q.x, y: st.mezz.h, z: q.z }, { x: q.x, y: st.mezz.h - st.mezz.thick, z: q.z }, { x: p.x, y: st.mezz.h - st.mezz.thick, z: p.z }], '#a88f69', '#6b5a44', 0.8); });
      add(top, '#d9c49f', '#6b5a44', 1);
    }
    // ouvertures (cadre vertical sur le côté du bord bas)
    st.openings.forEach(op => { const g = openingGeom(op), s0 = op.sill || 0, s1 = s0 + op.h, e = 0.02;
      add([{ x: g.p0.x - g.nx * e, y: s0, z: g.p0.z - g.nz * e }, { x: g.p1.x - g.nx * e, y: s0, z: g.p1.z - g.nz * e }, { x: g.p1.x - g.nx * e, y: s1, z: g.p1.z - g.nz * e }, { x: g.p0.x - g.nx * e, y: s1, z: g.p0.z - g.nz * e }],
        op.type === 'porte' ? '#7a5a3a' : 'rgba(120,170,210,0.75)', '#3a2a1a', 1.2); });
    // éléments : prismes
    st.items.forEach(it => {
      const L = Z.libOf(it.type), y0 = (it.level || 0) ? st.mezz.h : 0, y1 = y0 + ((it.type === 'escalier' || it.type === 'echelle') ? Math.min(it.h, st.mezz.h) : it.h);
      const poly = Z.itemPolygon(it), col = Z.checkItem(model, st, it).length ? [200, 90, 80] : L.color;
      if (it.type === 'escalier') { // marches
        const n = Math.max(4, Math.round(it.d / 0.25)), a = (it.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
        for (let k = 0; k < n; k++) { const yA = y0 + (y1 - y0) * (k + 1) / n, d0 = -it.d / 2 + it.d * (n - 1 - k) / n, d1 = d0 + it.d / n;
          const P = (x, y) => ({ x: it.x + c * x - s * y, z: it.z + s * x + c * y });
          const q = [P(-it.w / 2, d0), P(it.w / 2, d0), P(it.w / 2, d1), P(-it.w / 2, d1)];
          add(q.map(p => ({ x: p.x, y: yA, z: p.z })), shade(col, 1.05), '#3a2a1a', 0.7);
          add([{ x: q[0].x, y: yA, z: q[0].z }, { x: q[1].x, y: yA, z: q[1].z }, { x: q[1].x, y: yA - (y1 - y0) / n, z: q[1].z }, { x: q[0].x, y: yA - (y1 - y0) / n, z: q[0].z }], shade(col, 0.8), '#3a2a1a', 0.5); }
        return;
      }
      poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; const n = nrm({ x: p.x, y: y0, z: p.z }, { x: q.x, y: y0, z: q.z }, { x: p.x, y: y1, z: p.z });
        add([{ x: p.x, y: y0, z: p.z }, { x: q.x, y: y0, z: q.z }, { x: q.x, y: y1, z: q.z }, { x: p.x, y: y1, z: p.z }], shade(col, 0.75 + 0.25 * Math.abs(n.x * 0.6 + n.z * 0.8)), 'rgba(30,30,30,0.6)', 0.6); });
      add(poly.map(p => ({ x: p.x, y: y1, z: p.z })), shade(col, 1.1), 'rgba(30,30,30,0.7)', 0.8);
    });
    polys.sort((a, b) => a.d - b.d);
    polys.forEach(p => {
      ctx.beginPath(); p.q.forEach((v, i) => i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)); if (p.q.length > 2) ctx.closePath();
      if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(); }
      if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = (p.lw || 1) * dpr; ctx.stroke(); }
    });
  }

  // ---------------------------------------------------------
  // Rendu 3D WebGL (design3d.js) : vraie profondeur, ombres, matériaux
  // ---------------------------------------------------------
  function draw3D() {
    if (!eng) return draw3DCanvas();
    if (dirty3) {
      const openings = st.openings.map(op => Object.assign(openingGeom(op), { type: op.type, h: op.h, sill: op.sill || 0 }));
      if (eng.isThree) eng.update(Z, model, st, { style: style3, toile: toileMode, openings }, () => eng.render(cam, toileMode === 'coupe'));
      else eng.setScene(Design3D.buildScene(Z, model, st, { style: style3, toile: toileMode, models: glbCache, openings }));
      cam.target[1] = Math.min(cam.target[1], model.height); dirty3 = false;
    }
    eng.render(cam, toileMode === 'coupe');
  }
  function events3DGL() {
    const cv = $('ds3d'); let d = null;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('mousedown', e => { d = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; });
    window.addEventListener('mousemove', e => {
      if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY;
      if (d.pan) { const k = cam.dist * 0.0016, c = Math.cos(cam.yaw), s = Math.sin(cam.yaw); cam.target[0] -= c * dx * k; cam.target[2] += s * dx * k; cam.target[1] = Math.max(0, Math.min(model.height, cam.target[1] + dy * k)); }
      else { cam.yaw -= dx * 0.008; cam.pitch = Math.max(0.03, Math.min(1.5, cam.pitch + dy * 0.008)); }
      eng.render(cam, toileMode === 'coupe');
    });
    window.addEventListener('mouseup', () => { d = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(1.5, Math.min(40, cam.dist * (e.deltaY < 0 ? 0.92 : 1.08))); eng.render(cam, toileMode === 'coupe'); }, { passive: false });
    cv.addEventListener('dblclick', () => { cam = { yaw: 0.7, pitch: 0.55, dist: model.radius * 3.6, target: [0, model.height * 0.38, 0] }; eng.render(cam, toileMode === 'coupe'); });
    cam.dist = model ? model.radius * 3.6 : 9;
  }
  // modèles .glb importés : gardés en base64 dans l'aménagement
  function b64ToBuf(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function bufToB64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function loadModel(m) {
    if (glbCache.has(m.id)) return Promise.resolve(glbCache.get(m.id));
    return Design3D.parseGLB(b64ToBuf(m.data)).then(g => { glbCache.set(m.id, g); dirty3 = true; if (visible()) draw3D(); return g; })
      .catch(err => { m.error = err.message; renderProps(); });
  }
  function importGLB(file, it) {
    const r = new FileReader();
    r.onload = ev => {
      Design3D.parseGLB(ev.target.result).then(g => {
        const id = 'm' + Date.now().toString(36);
        st.models = st.models || [];
        st.models.push({ id, name: file.name.replace(/\.glb$/i, ''), data: bufToB64(ev.target.result) });
        glbCache.set(id, g);
        it.model = id;
        // dimensions réelles du modèle (glTF en mètres), arrondies au cm
        const rc = v => Math.max(0.05, Math.round(v * 100) / 100);
        it.w = rc(g.size[0]); it.h = rc(g.size[1]); it.d = rc(g.size[2]);
        changed();
      }).catch(err => { $('dsProps').insertAdjacentHTML('beforeend', '<div class="ds-warn">Import impossible : ' + err.message + '</div>'); });
    };
    r.readAsArrayBuffer(file);
  }

  // ---------------------------------------------------------
  // Impression : un plan par niveau, à l'échelle (1:50, ou 1:100 si grand)
  // ---------------------------------------------------------
  function printPlans() {
    const R = model.radius + 0.6, scale = 2 * R * 1000 / 50 <= 180 ? 50 : 100;
    const k = 1000 / scale; // mm papier par m
    const levels = [0].concat(Z.mezzPolygon(model, st.mezz) ? [1] : []);
    const s = Z.stats(model, st), date = new Date().toLocaleDateString('fr-BE');
    const pages = levels.map(lvl => {
      const out = [], size = 2 * R * k, T = p => ({ x: size / 2 + p.x * k, y: size / 2 + p.z * k });
      drawPlan(svgPen(out, 0.28), T, 0.28, lvl, {});
      // échelle + nord
      const sb = [`<g transform="translate(4 ${size - 8})"><rect x="0" y="0" width="${k}" height="1.6" fill="#000"/><rect x="${k}" y="0" width="${k}" height="1.6" fill="#fff" stroke="#000" stroke-width="0.2"/><text x="0" y="5" font-size="2.6" text-anchor="middle">0</text><text x="${k}" y="5" font-size="2.6" text-anchor="middle">1</text><text x="${2 * k}" y="5" font-size="2.6" text-anchor="middle">2 m</text></g>`,
        `<g transform="translate(${size - 8} 10)"><path d="M0,-6 L2.5,2 L0,0.4 L-2.5,2 z" fill="#000"/><text x="0" y="-8.5" font-size="3" font-weight="700" text-anchor="middle">N</text></g>`];
      const legend = st.items.filter(it => (it.level || 0) === lvl).map(it => `<tr><td>${it.name}</td><td>${cm(it.w)} × ${cm(it.d)} × ${cm(it.h)} cm</td><td>${Z.checkItem(model, st, it).join(', ') || '✓'}</td></tr>`).join('') +
        (lvl === 0 ? st.openings.map(op => { const g = openingGeom(op); return `<tr><td>${Z.OPENINGS.find(o => o.type === op.type).label}</td><td>${cm(op.w)} × ${cm(op.h)} cm, allège ${cm(op.sill || 0)} cm, côté ${g.edge + 1}</td><td>${openingCheck(op).join(' · ') || '✓'}</td></tr>`; }).join('') : '');
      return `<section class="page"><header><div><h1>${lvl ? 'Mezzanine' : 'Rez-de-chaussée'}</h1><div class="sub">Dôme ${window.CoverApp.label()} · plan d'aménagement · échelle 1:${scale}</div></div>
        <div class="kpi">${lvl ? 'Plancher à ' + fr(st.mezz.h) + ' m · ' + fr(s.mezz, 1) + ' m² (debout ' + fr(s.mezzStand, 1) + ' m²)' : 'Sol ' + fr(s.ground, 1) + ' m² · debout ' + fr(s.stand, 1) + ' m² · assis ' + fr(s.sit, 1) + ' m²'}<br>Ø au sol ${fr(s.diameter)} m · hauteur ${fr(s.height)} m · volume ${fr(s.volume, 1)} m³</div></header>
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}mm" height="${size}mm" viewBox="0 0 ${size} ${size}" style="font-family:'IBM Plex Mono',monospace">${out.join('')}${sb.join('')}</svg>
        <div class="legend-l">Traits fins pointillés : hauteur sous plafond (debout ≥ 1,80 m, assis ≥ 1,00 m) · traits gris : montants vus du dessus · ⚠ = élément qui touche la paroi ou trop haut à sa place.</div>
        ${legend ? '<table><tr><th>Élément</th><th>Dimensions</th><th>Contrôle</th></tr>' + legend + '</table>' : ''}
        <footer>Nomad'Om Designer Beta · Design · ${date} · imprimer à 100 % (sans « ajuster à la page ») pour garder l'échelle</footer></section>`;
    });
    const css = `@page{size:A4 portrait;margin:10mm} body{font-family:"IBM Plex Sans",Arial,sans-serif;font-size:9pt;margin:0} .page{page-break-after:always} .page:last-child{page-break-after:auto}
      header{display:flex;justify-content:space-between;border-bottom:2px solid #000;margin-bottom:4mm;padding-bottom:2mm} h1{margin:0;font-size:16pt} .sub{color:#444} .kpi{text-align:right;font-size:8.5pt}
      svg{display:block;margin:0 auto} table{border-collapse:collapse;width:100%;margin-top:3mm} td,th{text-align:left;border-bottom:0.3pt solid #ccc;padding:1mm 2mm;font-weight:normal} th{color:#555}
      .legend-l{font-size:7.5pt;color:#444;margin-top:2mm} footer{margin-top:4mm;font-size:7.5pt;color:#777;border-top:0.3pt solid #bbb}
      @media screen{body{background:#e8e8e8}.page{background:#fff;width:190mm;margin:8mm auto;padding:8mm;box-shadow:0 1px 4px rgba(0,0,0,.2)}}`;
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Plans d'aménagement</title><style>${css}</style></head><body>${pages.join('')}</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 400); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })); a.download = 'plans-amenagement.html'; document.body.appendChild(a); a.click(); a.remove(); }
  }

  function drawAll() {
    if (!visible() || !model) return;
    $('dsDome').innerHTML = 'Dôme <b>' + window.CoverApp.label() + '</b> <span class="muted">(se règle dans l\'onglet Base, ouvertures comprises)</span>';
    drawPlanScreen(); draw3D(); renderProps(); renderList();
  }
  window.CoverDesign = {
    show() { const first = !built; model = Z.domeModel(window.CoverApp.dome()); if (first) build(); dirty3 = true; if (first && eng) { cam.dist = model.radius * 3.6; cam.target = [0, model.height * 0.38, 0]; } syncInputs(); drawAll(); },
    domeChanged() { if (window.CoverApp) model = Z.domeModel(window.CoverApp.dome()); dirty3 = true; if (built) drawAll(); },
    state: () => st, _model: () => model
  };
})();
