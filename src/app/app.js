
(function(){
  'use strict';

  // ---------------------------------------------------------
  // Génération du dôme via le moteur validé
  // ---------------------------------------------------------
  // Objet dôme unique (A10) : tout l'état du projet courant — géométrie, toile, ouvertures,
  // dômes calculés. Source de vérité unique : src/core/dome-state.js.
  const ds = DomeState.create();
  let rotY = 0.55, rotX = 0.35;
  let zoom = 1;
  let dragging = false, lastX = 0, lastY = 0, dragStartX = 0, dragStartY = 0, dragMoved = false;
  let selection = new Set();
  let hoverIndex = -1;
  let mode2D = 'triangle'; // 'triangle' | 'group' | 'etages' | 'rouleau' | 'flat'  (Dôme complet, Fleur, Bandes/Gores retirés en 0.9.11)
  let panels = []; // panneaux créés (Étape 5), {id, faceIndices}
  let panelCounter = 0;

  const canvas = document.getElementById('viewer3d');
  const ctx = canvas.getContext('2d');
  const canvas2d = document.getElementById('viewer2d');
  const ctx2d = canvas2d.getContext('2d');

  const MODE_BUTTONS = {
    triangle: 'modeTriangle', group: 'btnDevelop', etages: 'btnDevelopEtages', rouleau: 'btnRoll', flat: 'btnFlat'
  };
  function setMode(m){
    mode2D = m;
    if (m !== 'etages') { selectedPiece = null; document.getElementById('btnBackOverview').style.display = 'none'; }
    Object.keys(MODE_BUTTONS).forEach(k => document.getElementById(MODE_BUTTONS[k]).classList.toggle('on', k === m));
    document.getElementById('peelTypeBox').style.display = 'none';
    if (m !== 'etages' && m !== 'rouleau' && m !== 'flat') document.getElementById('panelsReadout').style.display = panels.length ? '' : 'none';
    if (m !== 'etages' && m !== 'rouleau' && m !== 'flat' && panels.length) updatePanelsReadout();
  }

  // --- Ouvertures (Lot 4, étape 1) : contour et résultat dans ds.openings ---
  let openTrace = false;       // mode « tracer le contour » actif
  let hoverStrut = null;
  // ---------------------------------------------------------
  // Onglet Base : listes d'options comme ACIDOME (méthodes selon la
  // fréquence, découpages p / 4V, alignement de la base si possible)
  // ---------------------------------------------------------
  const $id = id => document.getElementById(id);
  const METHOD_LABEL = { Chords: 'Chords (cordes égales)', Arcs: 'Arcs (arcs égaux)', Mexican: 'Mexican', Kruschke: 'Kruschke' };
  // Étape 7 (audit 30/10/2026) : double nom de coupe. Acidome compte en p / 4V, Domerama en hauteur de sphère.
  // Correspondance établie en comparant faces, montants, nœuds et facteurs de corde (rapport d'audit).
  const DOMERAMA_NAME = {
    'Chords|1|3/4': '1V', 'Chords|3|5/12': '3V 3/8', 'Chords|3|7/12': '3V 5/8',
    'Kruschke|3|5/12': '3V 4/9 Kruschke', 'Kruschke|3|7/12': '3V 5/9 Kruschke',
    'Kruschke|4|3/8': '4V 5/12 Kruschke (à confirmer)', 'Kruschke|4|5/8': '4V 7/12 Kruschke (à confirmer)',
    'Chords|5|9/20': '5V 7/15'
  };
  function domeramaName(V, m, f, sym){
    if (sym !== 'Pentad') return null;
    if (m === 'Chords' && f === '1/2' && V % 2 === 0) return V + 'V 1/2';
    return DOMERAMA_NAME[m + '|' + V + '|' + f] || null;
  }
  function partialLabel(V, f, sym, m) {
    const extra = f === '1/1' ? ' — sphère entière' : f === '1/2' ? ' — hémisphère' : '';
    const dn = domeramaName(V, m, f, sym);
    return f + extra + (dn ? ' · Domerama ' + dn : '');
  }
  function syncBaseControls(){
    const dSel = $id('paramDetail'), prevV = parseInt(dSel.value, 10) || 3;
    if (!dSel.options.length) { dSel.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(v => '<option value="' + v + '">' + v + 'V</option>').join(''); dSel.value = '3'; }
    const V = parseInt(dSel.value, 10) || prevV;
    const mSel = $id('paramMethod'), prevM = mSel.value || (V === 3 || V === 4 ? 'Kruschke' : 'Chords');
    // Étape 8 : Mexican retirée des menus (décision de Nathan) — le moteur la garde pour les tests
    const methods = ['Chords'].concat(V >= 3 ? ['Arcs'] : [], (V === 3 || V === 4) ? ['Kruschke'] : []);
    mSel.innerHTML = methods.map(m => '<option value="' + m + '">' + METHOD_LABEL[m] + '</option>').join('');
    mSel.value = methods.includes(prevM) ? prevM : methods[methods.length - 1] === 'Kruschke' ? 'Kruschke' : 'Chords';
    const pSel = $id('paramPartial'), prevP = pSel.value || (V === 3 ? '7/12' : '1/2'), sym = $id('paramSymmetry').value;
    const list = DomeEngine.partialListClassI(V);
    const target = (() => { try { const [a, b] = prevP.split('/').map(Number); return a / (b || 1); } catch (e) { return 0.5; } })();
    let best = list[0]; list.forEach(f => { const [a, b] = f.split('/').map(Number); const [c, d] = best.split('/').map(Number); if (Math.abs(a / b - target) < Math.abs(c / d - target)) best = f; });
    pSel.innerHTML = list.map(f => '<option value="' + f + '">' + partialLabel(V, f, sym, mSel.value) + '</option>').join('');
    pSel.value = list.includes(prevP) ? prevP : best;
    const can = !/^1(\/[12])?$/.test(pSel.value);   // 0.9.4 : aussi en Kruschke
    $id('paramAlign').disabled = !can; if (!can) $id('paramAlign').checked = false;
    $id('paramAlign').parentNode.style.opacity = can ? '' : '0.5';
  }
  function baseParams(){
    return { detail: parseInt($id('paramDetail').value, 10) || 3, subdivMethod: $id('paramMethod').value || 'Chords',
      symmetry: $id('paramSymmetry').value, partial: $id('paramPartial').value || '1/2', alignTheBase: $id('paramAlign').checked };
  }
  function regenerate(){
    syncBaseControls();
    const diameter = parseFloat(document.getElementById('paramDiameter').value) || 5;
    const radius = diameter / 2;
    const bp = baseParams(), V = bp.detail;
    try {
      ds.nominal = DomeEngine.generateDome(Object.assign({ base: 'Icosahedron', subdivClass: 'I', radius }, bp));
      $id('baseWarn').innerHTML = '';
    } catch (err) {
      if (err.code === 'ALIGN_FLIP') {
        // alignement refusé (triangles retournés) : on recalcule sans aligner et on l'explique
        $id('paramAlign').checked = false;
        regenerate();
        $id('baseWarn').innerHTML = '<div class="offset-info warn">« Aligner la base » refusé pour cette coupe : ' + err.flipped +
          ' triangle(s) se retourneraient (toile impossible à coudre). Le dôme est calculé sans alignement.</div>';
        return;
      }
      $id('baseWarn').innerHTML = '<div class="offset-info warn">Calcul impossible : ' + err.message + '</div>';
      return;
    }
    // surface de toile : nœud à nœud (avec connecteur) ou face extérieure des montants (GoodKarma)
    const gk = document.getElementById('paramStructure').value === 'goodkarma';
    document.getElementById('paramSupportH').disabled = !gk;
    const h = (parseFloat(document.getElementById('paramSupportH').value) || 0) / 1000;
    ds.cloth = (gk && h > 0) ? Toile.offsetDome(ds.nominal, h) : ds.nominal;
    const forKey = JSON.stringify([bp.detail, bp.subdivMethod, bp.symmetry, bp.partial, bp.alignTheBase]);
    if (ds.openings.forKey !== forKey) { ds.openings.labels = []; ds.openings.forKey = forKey; }  // autre géométrie : le contour n'a plus de sens
    computeOpenings();
    updateOpeningsReadout();
    ds.gen++;

    const keep = mode2D;
    selection.clear();
    hlType = null;
    etagesCache = null;
    readFabricParams();
    setMode(['etages','rouleau','flat'].includes(keep) ? keep : 'triangle');
    updateStats();
    renderOffsetInfo();
    if (infoVisible()) renderInfo();
    if (window.CoverDesign) window.CoverDesign.domeChanged();
    $id('headDome').textContent = domeLabel();
    renderStatus();
    if ($id('viewBase').style.display !== 'none') renderBase();
    updateSelectionReadout();
    render();
    render2D();
  }

  function openKeys(){
    const byLab = new Map([...Ouvertures.nodeLabels(ds.nominal)].map(([id, l]) => [l, id]));
    const S = Ouvertures.strutIndex(ds.nominal);
    return ds.openings.labels.map(([a, b]) => Ouvertures.edgeKey(byLab.get(a), byLab.get(b))).filter(k => S.has(k));
  }
  function computeOpenings(){
    const keys = openKeys();
    ds.openings.result = keys.length ? Ouvertures.analyse(ds.nominal, keys) : null;
    ds.dome = Ouvertures.applyToDome(ds.cloth, ds.openings.result);
    ds.struct = Ouvertures.structureDome(ds.nominal, ds.openings.result);
  }
  // contour modifié : on recalcule le dôme toile et on vide les découpes en cache
  function openingsChanged(){
    computeOpenings();
    ds.gen++;
    selection.clear();
    etagesCache = null; nestCache = null; views.resetPeel(); hlType = null;
    if (selectedPiece) selectPiece(null);
    updateStats(); updateSelectionReadout(); updateOpeningsReadout();
    baseFor = null;
    if (window.CoverDesign) window.CoverDesign.domeChanged();
    if ($id('viewBase').style.display !== 'none') renderBase();
    else if (infoVisible()) renderInfo(); else { render(); render2D(); }
  }
  function toggleStrut(key){
    const L = Ouvertures.nodeLabels(ds.nominal), pair = key.split('-').map(id => L.get(+id)).sort();
    const i = ds.openings.labels.findIndex(p => p[0] === pair[0] && p[1] === pair[1]);
    if (i >= 0) ds.openings.labels.splice(i, 1); else ds.openings.labels.push(pair);
    openingsChanged();
  }
  function setOpenTrace(on){
    openTrace = on;
    const b = $id('btnBaseOpen'); if (b) { b.classList.toggle('trace', on); b.textContent = on ? 'Terminer le tracé' : 'Tracer les ouvertures'; }
    $id('base3d').style.display = on ? 'none' : '';
    $id('baseTrace').style.display = on ? '' : 'none';
    $id('baseHint').textContent = on ? 'clic sur un montant = l\'ajouter ou le retirer du contour · glisser = tourner · molette = zoom · Échap = terminer'
      : 'glisser = tourner · molette = zoom · double-clic = recadrer';
    btHover = null;
    updateOpeningsReadout();
    if (on) renderBaseTrace(); else { baseFor = null; draw3DBase(); }
  }
  // ----- vue de tracé (onglet Base) : maillage en fil de fer, on pointe les montants -----
  let btCam = { yaw: 0.6, pitch: 0.35, zoom: 1 }, btProj = null, btHover = null, btDrag = null, btMoved = false;
  function btProject(p, W, H){
    const R = ds.nominal.params.radius, sc = Math.min(W, H) / (2.6 * R) * btCam.zoom;
    const cy = Math.cos(btCam.yaw), sy = Math.sin(btCam.yaw), cp = Math.cos(btCam.pitch), sp = Math.sin(btCam.pitch);
    const x1 = p.x * cy + p.z * sy, z1 = p.z * cy - p.x * sy, y = p.y - R * 0.3;
    return { sx: W / 2 + x1 * sc, sy: H * 0.55 - (y * cp - z1 * sp) * sc, sz: z1 * cp + y * sp };
  }
  function renderBaseTrace(){
    const cv = $id('baseTrace'); if (!openTrace || !ds.nominal || cv.style.display === 'none') return;
    const r = cv.getBoundingClientRect(), dpr = devicePixelRatio;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const W = cv.width, H = cv.height, g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    const P = new Map(ds.nominal.points.map(p => [p._id, btProject(p, W, H)])); btProj = P;
    const D = ds.struct || ds.nominal;
    D.faces.map(f => ({ f, z: f.pointIds.reduce((a, id) => a + P.get(id).sz, 0) / 3 })).sort((a, b) => a.z - b.z).forEach(({ f, z }) => {
      const q = f.pointIds.map(id => P.get(id));
      g.beginPath(); g.moveTo(q[0].sx, q[0].sy); g.lineTo(q[1].sx, q[1].sy); g.lineTo(q[2].sx, q[2].sy); g.closePath();
      g.fillStyle = z < 0 ? 'rgba(150,180,205,0.18)' : 'rgba(150,180,205,0.55)'; g.fill();
    });
    const traced = new Set(openKeys());
    const frame = new Set(ds.openings.result && ds.openings.result.ok ? ds.openings.result.frame.map(x => x.key) : []);
    const gone = new Set(ds.openings.result && ds.openings.result.ok ? [...ds.openings.result.removed, ...ds.openings.result.seuil].map(x => x.key) : []);
    ds.nominal.lines.map(l => { const k = Ouvertures.edgeKey(l.pointIds[0], l.pointIds[1]), a = P.get(l.pointIds[0]), b = P.get(l.pointIds[1]);
      return { k, a, b, z: (a.sz + b.sz) / 2, sel: l.selvage }; }).sort((u, v) => u.z - v.z).forEach(({ k, a, b, z, sel }) => {
      let col = z < 0 ? 'rgba(28,31,34,0.16)' : 'rgba(28,31,34,0.55)', w = sel ? 2.2 : 1.3, dash = [];
      if (gone.has(k)) { col = '#b23a2f'; w = 2.2; dash = [6, 4]; }
      if (frame.has(k)) { col = '#2b5a8a'; w = 3.2; }
      if (traced.has(k) && !frame.has(k)) { col = '#d8912b'; w = 3.2; }
      if (k === btHover) { if (!traced.has(k) && !frame.has(k)) col = '#d8912b'; w += 2.5; }
      g.save(); g.globalAlpha = z < 0 && !traced.has(k) && k !== btHover ? 0.6 : 1;
      g.setLineDash(dash.map(v => v * dpr)); g.lineCap = 'round';
      g.beginPath(); g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); g.strokeStyle = col; g.lineWidth = w * dpr; g.stroke(); g.restore();
    });
  }
  function pickBaseStrut(ev){
    if (!btProj) return null;
    const cv = $id('baseTrace'), r = cv.getBoundingClientRect(), dpr = devicePixelRatio;
    const mx = (ev.clientX - r.left) * dpr, my = (ev.clientY - r.top) * dpr;
    let best = null, bs = Infinity;
    ds.nominal.lines.forEach(l => {
      const a = btProj.get(l.pointIds[0]), b = btProj.get(l.pointIds[1]);
      const dx = b.sx - a.sx, dy = b.sy - a.sy, t = Math.max(0, Math.min(1, ((mx - a.sx) * dx + (my - a.sy) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(mx - (a.sx + t * dx), my - (a.sy + t * dy));
      if (d > 9 * dpr) return;
      const score = d - (a.sz + b.sz) / 2 * 40 * dpr;   // à distance égale, le montant de devant gagne
      if (score < bs) { bs = score; best = Ouvertures.edgeKey(l.pointIds[0], l.pointIds[1]); }
    });
    return best;
  }
  function initBaseTrace(){
    const cv = $id('baseTrace');
    cv.addEventListener('pointerdown', e => { btDrag = { x: e.clientX, y: e.clientY }; btMoved = false; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      if (btDrag) {
        const dx = e.clientX - btDrag.x, dy = e.clientY - btDrag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) btMoved = true;
        if (btMoved) { btCam.yaw += dx * 0.008; btCam.pitch = Math.max(-0.3, Math.min(1.5, btCam.pitch + dy * 0.008)); btDrag = { x: e.clientX, y: e.clientY }; renderBaseTrace(); }
        return;
      }
      const k = pickBaseStrut(e);
      if (k !== btHover) {
        btHover = k;
        const st = k && Ouvertures.strutIndex(ds.nominal).get(k), L = Ouvertures.nodeLabels(ds.nominal);
        $id('baseInfo3d').textContent = st ? k.split('-').map(id => L.get(+id)).join('–') + ' · ' + st.cls + ' · ' + (st.length * 1000).toFixed(1) + ' mm' + (st.selvage ? ' · bord bas' : '') : domeLabel();
        renderBaseTrace();
      }
    });
    cv.addEventListener('pointerup', e => { if (!btMoved) { const k = pickBaseStrut(e); if (k) toggleStrut(k); } btDrag = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); btCam.zoom = Math.max(0.4, Math.min(5, btCam.zoom * (e.deltaY < 0 ? 1.08 : 0.93))); renderBaseTrace(); }, { passive: false });
    window.addEventListener('resize', renderBaseTrace);
  }
  function updateOpeningsReadout(){
    const L = Ouvertures.nodeLabels(ds.nominal);
    const lab = k => k.split('-').map(id => L.get(+id)).join('–');
    const mm = v => (v * 1000).toFixed(1) + ' mm', m2 = v => v.toFixed(2) + ' m²';
    const cls = o => Object.keys(o).sort().map(k => o[k] + '×' + k).join(' · ') || '—';
    const ok = ds.openings.result && ds.openings.result.ok;
    const body = editable => {
      let h = '';
      if (!ds.openings.labels.length) h += '<div class="op-status">' + (editable ? 'Cliquez sur « Tracer les ouvertures », puis sur les montants qui entourent l\'ouverture. Le contour doit se refermer, ou finir sur le bord bas (porte : le sol ferme le contour).' : 'Aucune ouverture.') + '</div>';
      else if (!ok) h += '<div class="op-status err">' + ds.openings.result.errors.join('<br>') + ' Tant que le contour n\'est pas fermé, la structure, la toile et le design l\'ignorent.</div>';
      else h += '<div class="op-status ok">' + ds.openings.result.openings.length + ' ouverture' + (ds.openings.result.openings.length > 1 ? 's' : '') + ' · ' +
        ds.openings.result.openFaces.length + ' triangle' + (ds.openings.result.openFaces.length > 1 ? 's' : '') + ' retiré' + (ds.openings.result.openFaces.length > 1 ? 's' : '') +
        ' · structure, toile (Cover+) et design suivent</div>';
      if (ds.openings.result && editable) ds.openings.result.warnings.forEach(w => h += '<div class="op-warn">' + w + '</div>');
      if (ok) ds.openings.result.openings.forEach(o => {
        h += '<div class="op-card"><h4>Ouverture ' + o.n + (o.closedByGround ? ' · fermée par le sol (porte)' : '') + '</h4><dl>' +
          '<dt>Triangles (n° du dôme plein)</dt><dd>' + o.faces.join(', ') + '</dd>' +
          '<dt>Surface de toile retirée</dt><dd>' + m2(o.area) + '</dd>' +
          '<dt>Hauteur au-dessus de la base</dt><dd>' + mm(o.heightMin) + ' → ' + mm(o.heightMax) + '</dd>' +
          '<dt>Cadre (montants gardés)</dt><dd>' + cls(o.frameByClass) + '</dd>' +
          '<dt>Ourlet ou renfort de contour</dt><dd>' + mm(o.frameLength) + '</dd>' +
          '<dt>Montants retirés</dt><dd>' + cls(o.removedByClass) + '</dd>' +
          (o.closedByGround ? '<dt>Seuil au sol retiré</dt><dd>' + cls(o.seuilByClass) + ' · ' + mm(o.groundLength) + '</dd>' : '') +
          '</dl></div>';
      });
      if (editable) {
        h += '<h4>Contour tracé (' + ds.openings.labels.length + ' montants)</h4><div class="small-ids">' + (openKeys().map(lab).join(' · ') || '—') + '</div>';
        h += '<div class="op-legend"><span><i style="background:#d8912b"></i>contour tracé</span><span><i style="background:#2b5a8a"></i>cadre de l\'ouverture</span><span><i style="background:#b23a2f"></i>montant retiré</span></div>';
      }
      return h;
    };
    // Base : fiche complète, avec les commandes
    const eb = $id('baseOpenings');
    eb.innerHTML = '<div class="sheet-head"><b>Ouvertures</b>' +
      (ds.openings.labels.length ? '<button id="opClear" class="ghost">Effacer toutes les ouvertures</button>' : '') +
      '<span class="muted">porte, fenêtre, coupole : on trace le contour sur les montants</span></div>' + body(true);
    if ($id('opClear')) $id('opClear').onclick = () => { ds.openings.labels = []; openingsChanged(); };
    // Cover+ : lecture seule
    const ec = $id('openingsReadout');
    if (!ds.openings.labels.length) { ec.style.display = 'none'; return; }
    ec.style.display = '';
    ec.innerHTML = '<div class="sheet-head"><b>Ouvertures</b><button id="opGoBase" class="ghost">Modifier dans l\'onglet Base</button>' +
      '<span class="muted">les triangles ouverts sont retirés de toutes les découpes · numéros de triangles renumérotés (' + ds.dome.faces.length + ' △)</span></div>' + body(false);
    $id('opGoBase').onclick = () => showView('base');
  }
  function pickStrut(evtX, evtY){
    const P = canvas._projected; if (!P) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = (evtX - rect.left) * devicePixelRatio, my = (evtY - rect.top) * devicePixelRatio;
    let best = null, bs = Infinity;
    ds.nominal.lines.forEach(l => {
      const a = P.get(l.pointIds[0]), b = P.get(l.pointIds[1]); if (!a || !b) return;
      const dx = b.sx - a.sx, dy = b.sy - a.sy, t = Math.max(0, Math.min(1, ((mx - a.sx) * dx + (my - a.sy) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(mx - (a.sx + t * dx), my - (a.sy + t * dy));
      if (d > 8 * devicePixelRatio) return;
      const score = d - (a.sz + b.sz) / 2 * 40 * devicePixelRatio;  // à distance égale, le montant de devant gagne
      if (score < bs) { bs = score; best = Ouvertures.edgeKey(l.pointIds[0], l.pointIds[1]); }
    });
    return best;
  }
  function drawOpenings(projected){
    if (!(ds.openings.result && ds.openings.result.ok)) return;
    const traced = new Set(openKeys());
    const frame = new Set(ds.openings.result && ds.openings.result.ok ? ds.openings.result.frame.map(s => s.key) : []);
    const gone = new Set(ds.openings.result && ds.openings.result.ok ? [...ds.openings.result.removed, ...ds.openings.result.seuil].map(s => s.key) : []);
    ds.nominal.lines.map(l => {
      const k = Ouvertures.edgeKey(l.pointIds[0], l.pointIds[1]), a = projected.get(l.pointIds[0]), b = projected.get(l.pointIds[1]);
      return { k, a, b, z: (a.sz + b.sz) / 2 };
    }).sort((u, v) => u.z - v.z).forEach(({ k, a, b, z }) => {
      let col = null, w = 1.4, dash = [];
      if (gone.has(k)) { col = '#b23a2f'; w = 2.2; dash = [6, 4]; }
      if (frame.has(k)) { col = '#2b5a8a'; w = 3.2; }
      if (!col) return;
      ctx.save(); ctx.globalAlpha = z < 0 ? 0.5 : 1;
      ctx.setLineDash(dash.map(v => v * devicePixelRatio)); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = col; ctx.lineWidth = w * devicePixelRatio; ctx.stroke(); ctx.restore();
    });
  }

  function updateStats(){
    document.getElementById('statPoints').textContent = ds.dome.stats.pointCount;
    document.getElementById('statLines').textContent = (ds.struct || ds.dome).stats.lineCount;
    document.getElementById('statFaces').textContent = ds.dome.stats.faceCount;
    document.getElementById('statSelvage').textContent = (ds.struct || ds.dome).stats.selvageCount;

    const el = document.getElementById('edgeClasses');
    el.innerHTML = '';
    ds.nominal.edgeClasses.forEach(g => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      const t = ds.dome.offset ? ds.dome.edgeClasses.find(c => c.name === g.name) : null;
      chip.innerHTML = '<b>' + g.name + '</b> = ' + (g.length*1000).toFixed(2) + ' mm &nbsp;(×' + g.count + ')' +
        (t ? ' &nbsp;→ toile ' + (t.length*1000).toFixed(1) + ' mm' : '');
      el.appendChild(chip);
    });
  }

  // ---------------------------------------------------------
  // Rendu 3D (projection orthographique custom, sans dépendance)
  // ---------------------------------------------------------
  function resizeCanvas(){
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
  }

  function project(p){
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const x1 = p.x * cosY + p.z * sinY;
    const z1 = p.z * cosY - p.x * sinY;
    const y1 = p.y;
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const y2 = y1 * cosX - z1 * sinX;
    const z2 = z1 * cosX + y1 * sinX;
    return { x: x1, y: y2, z: z2 };
  }

  // palette des pièces (mode Étages) — couleurs franches, alternées pour
  // que deux pièces voisines ne se confondent pas
  const PIECE_COLORS = [[216,145,43],[95,150,200],[120,175,110],[200,110,120],[160,130,200],[90,170,170],[205,180,90],[150,150,150]];

  function render(){
    if (!ds.dome) return;
    resizeCanvas();
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const radius = ds.dome.params.radius;
    const scale = (Math.min(W, H) / (radius * 2.6)) * zoom;
    const cx = W / 2, cy = H / 2 + Math.min(W,H) * 0.06;

    const projected = new Map();
    ds.dome.points.forEach(p => {
      const rp = project(p);
      projected.set(p._id, { sx: cx + rp.x * scale, sy: cy - rp.y * scale, sz: rp.z });
    });

    const faceDepth = ds.dome.faces.map(f => {
      const pts = f.pointIds.map(id => projected.get(id));
      const avgZ = (pts[0].sz + pts[1].sz + pts[2].sz) / 3;
      return { f, avgZ, pts };
    });
    faceDepth.sort((a, b) => a.avgZ - b.avgZ);

    const lightDir = { x: 0.35, y: 0.55, z: 0.78 };
    const ll = Math.hypot(lightDir.x, lightDir.y, lightDir.z);
    lightDir.x/=ll; lightDir.y/=ll; lightDir.z/=ll;

    // en mode Étages, chaque triangle prend la couleur de sa pièce
    const pieceColorOf = new Map();
    let selFaces = null;
    const typeColorMap = (mode2D === 'triangle' && selection.size === 0) ? typeOfFace() : new Map();
    if ((mode2D === 'etages' || mode2D === 'rouleau' || mode2D === 'flat') && etagesCache) {
      etagesCache.forEach(b => b.pieces.forEach(pc => {
        const col = pieceColor(pc);
        pc.chain.forEach(idx => pieceColorOf.set(idx, col));
      }));
      if (selectedPiece) { const sp = pieceByName(selectedPiece); if (sp) selFaces = new Set(sp.chain); }
    }

    faceDepth.forEach(({ f, pts }) => {
      const P = f.pointIds.map(id => ds.dome.pointById.get(id));
      const e1 = { x: P[1].x-P[0].x, y: P[1].y-P[0].y, z: P[1].z-P[0].z };
      const e2 = { x: P[2].x-P[0].x, y: P[2].y-P[0].y, z: P[2].z-P[0].z };
      let nx = e1.y*e2.z - e1.z*e2.y, ny = e1.z*e2.x - e1.x*e2.z, nz = e1.x*e2.y - e1.y*e2.x;
      const nl = Math.hypot(nx,ny,nz) || 1;
      nx/=nl; ny/=nl; nz/=nl;
      let shade = nx*lightDir.x + ny*lightDir.y + nz*lightDir.z;
      shade = 0.45 + 0.5 * Math.max(0, shade);

      const isSelected = selection.has(f.index);
      const isHover = hoverIndex === f.index;

      let fill;
      const tf = (mode2D === 'triangle' && selection.size === 0) ? typeColorMap.get(f.index) : null;
      if (isSelected) fill = shadeColor([216,145,43], shade);
      else if (tf) fill = hlType && tf.id !== hlType ? shadeColor([205,210,214], shade + 0.25) : shadeColor(tf.color, shade + 0.15);
      else if (selFaces) fill = selFaces.has(f.index) ? shadeColor([216,145,43], shade + 0.2) : shadeColor([205,210,214], shade + 0.25);
      else if (pieceColorOf.has(f.index)) fill = shadeColor(pieceColorOf.get(f.index), shade + 0.15);
      else fill = shadeColor([150,180,205], shade);
      if (isHover && !isSelected) fill = shadeColor([190,205,220], shade);

      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      ctx.lineTo(pts[1].sx, pts[1].sy);
      ctx.lineTo(pts[2].sx, pts[2].sy);
      ctx.closePath();
      if (domeImage) {
        // image plaquée : la face prend sa portion d'image, ombrée ; sélection en surimpression
        drawTexturedFace(f, pts, shade);
        const hl = isSelected || (selFaces && selFaces.has(f.index)) ? 'rgba(216,145,43,0.55)'
          : (tf && hlType === tf.id) ? 'rgba(' + tf.color.join(',') + ',0.6)' : (isHover ? 'rgba(255,255,255,0.35)' : null);
        if (hl) { ctx.beginPath(); ctx.moveTo(pts[0].sx, pts[0].sy); ctx.lineTo(pts[1].sx, pts[1].sy); ctx.lineTo(pts[2].sx, pts[2].sy); ctx.closePath(); ctx.fillStyle = hl; ctx.fill(); }
      } else {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.lineWidth = 1 * devicePixelRatio;
      ctx.strokeStyle = 'rgba(28,31,34,0.55)';
      ctx.stroke();

      const midx = (pts[0].sx+pts[1].sx+pts[2].sx)/3;
      const midy = (pts[0].sy+pts[1].sy+pts[2].sy)/3;
      const fontSize = 9.5 * devicePixelRatio * Math.min(1.6, Math.max(0.6, zoom));
      ctx.font = fontSize + 'px monospace';
      ctx.fillStyle = 'rgba(20,22,24,0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.index, midx, midy);
    });

    // en mode Étages : coutures entre pièces en trait épais
    if ((mode2D === 'etages' || mode2D === 'flat') && etagesCache) {
      const pieceOf = new Map();
      let pid = 0;
      etagesCache.forEach(b => b.pieces.forEach(pc => { pc.chain.forEach(i => pieceOf.set(i, pid)); pid++; }));
      ds.dome.faceAdjacency.forEach((adj, i) => adj.forEach(a => {
        if (a.neighbor <= i || pieceOf.get(i) === pieceOf.get(a.neighbor)) return;
        const A = projected.get(a.edgePointIds[0]), B = projected.get(a.edgePointIds[1]);
        ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy);
        ctx.strokeStyle = '#b23a2f'; ctx.lineWidth = 2 * devicePixelRatio; ctx.stroke();
      }));
    }

    ds.dome.lines.forEach(l => {
      if (!l.selvage) return;
      const a = projected.get(l.pointIds[0]);
      const b = projected.get(l.pointIds[1]);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = '#1c1f22';
      ctx.lineWidth = 2.2 * devicePixelRatio;
      ctx.stroke();
    });

    drawOpenings(projected);
    canvas._projected = projected;
    canvas._faceDepth = faceDepth;
  }

  function shadeColor(rgb, shade){
    shade = Math.min(1.1, shade);
    const c = v => Math.max(0, Math.min(255, Math.round(v*shade)));
    return 'rgb(' + c(rgb[0]) + ',' + c(rgb[1]) + ',' + c(rgb[2]) + ')';
  }

  // ---------------------------------------------------------
  // Développement 2D — triangles de base (formes distinctes du dôme).
  // Calculs dans src/geometry/unfold.js ; ici : couleurs, cache et affichage.
  // ---------------------------------------------------------
  const TYPE_COLORS = [[216,145,43],[95,150,200],[120,175,110],[200,110,120],[160,130,200],[90,170,170],[205,180,90],[150,150,150],[230,120,70],[70,120,180]];
  let typeCache = null, hlType = null;
  function baseTriangleTypes(){
    if (typeCache && typeCache.dome === ds.dome) return typeCache.types;
    const types = Unfold.baseTriangleTypes(ds.dome);
    types.forEach((t, i) => { t.color = TYPE_COLORS[i % TYPE_COLORS.length]; });
    typeCache = { dome: ds.dome, types };
    return types;
  }
  function typeOfFace(){
    const m = new Map(); baseTriangleTypes().forEach(t => t.faces.forEach(fi => m.set(fi, t))); return m;
  }

  function renderBaseTriangles(W, H){
    const dpr = devicePixelRatio;
    const types = baseTriangleTypes();
    const hint = document.getElementById('hint2d'), info = document.getElementById('dev2dInfo');
    const n = types.length;
    const nCols = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * W / Math.max(H,1)))));
    const nRows = Math.ceil(n / nCols);
    const cellW = W / nCols, cellH = H / nRows;
    const maxB = Math.max(...types.map(t => t.pts[1].x)), maxH = Math.max(...types.map(t => t.height));
    const sc = Math.min((cellW - 90*dpr) / maxB, (cellH - 90*dpr) / maxH);
    types.forEach((t, i) => {
      const col = i % nCols, row = Math.floor(i / nCols);
      const cx = (col + 0.5) * cellW, cy = row * cellH + 46*dpr + (cellH - 90*dpr) / 2 + t.height*sc/2;
      const S = p => ({ x: cx + (p.x - t.pts[1].x/2) * sc, y: cy - p.y * sc });
      const q = t.pts.map(S);
      ctx2d.beginPath(); ctx2d.moveTo(q[0].x,q[0].y); ctx2d.lineTo(q[1].x,q[1].y); ctx2d.lineTo(q[2].x,q[2].y); ctx2d.closePath();
      ctx2d.fillStyle = 'rgba(' + t.color.join(',') + ',' + (hlType === t.id ? 0.7 : 0.4) + ')'; ctx2d.fill();
      ctx2d.strokeStyle = '#1c1f22'; ctx2d.lineWidth = (hlType === t.id ? 2.6 : 1.6) * dpr; ctx2d.stroke();
      // titre
      ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
      ctx2d.font = 'bold ' + (12*dpr) + 'px monospace'; ctx2d.fillStyle = '#1c1f22';
      ctx2d.fillText(t.id + '  ×' + t.faces.length, cx, row * cellH + 16*dpr);
      ctx2d.font = (9.5*dpr) + 'px monospace'; ctx2d.fillStyle = '#6b7278';
      ctx2d.fillText(t.cls.join('-') + ' · ' + t.kind, cx, row * cellH + 31*dpr);
      // côtés
      [[0,1],[1,2],[2,0]].forEach(([a,b], k) => {
        const A = q[a], B = q[b], dx = B.x-A.x, dy = B.y-A.y, L = Math.hypot(dx,dy) || 1;
        const nx = dy/L, ny = -dx/L; // extérieur (triangle tracé dans le sens horaire à l'écran)
        const m = { x: (A.x+B.x)/2 + nx*12*dpr, y: (A.y+B.y)/2 + ny*12*dpr };
        let ang = Math.atan2(dy, dx); if (ang > Math.PI/2) ang -= Math.PI; if (ang < -Math.PI/2) ang += Math.PI;
        ctx2d.save(); ctx2d.translate(m.x, m.y); ctx2d.rotate(ang);
        ctx2d.font = 'bold ' + (9.5*dpr) + 'px monospace'; ctx2d.fillStyle = '#2b5a8a';
        ctx2d.fillText(t.sides[k].cls + ' ' + (t.sides[k].len*1000).toFixed(1), 0, 0);
        ctx2d.restore();
      });
      // angles
      const g = { x: (q[0].x+q[1].x+q[2].x)/3, y: (q[0].y+q[1].y+q[2].y)/3 };
      q.forEach((v, k) => {
        const p = { x: v.x + (g.x - v.x) * 0.28, y: v.y + (g.y - v.y) * 0.28 };
        ctx2d.font = (8.5*dpr) + 'px monospace'; ctx2d.fillStyle = '#1c1f22';
        ctx2d.fillText(t.angles[k].toFixed(2) + '°', p.x, p.y);
      });
    });
    info.textContent = n + ' triangles de base · ' + ds.dome.faces.length + ' faces';
    hint.textContent = 'Triangles de base de cette configuration (même couleur sur le dôme) — cliquez un type dans le tableau pour le repérer, ou une face du dôme pour la développer';
    hint.style.color = '';
    renderBaseTrianglesTable(types);
  }

  function renderBaseTrianglesTable(types){
    const el = document.getElementById('panelsReadout');
    el.style.display = '';
    el.innerHTML = baseTrianglesHtml(types);
  }
  function baseTrianglesHtml(types){
    const V = document.getElementById('paramDetail').value;
    const params = [
      ['Base', document.getElementById('paramBase').value],
      ['Fréquence', V + 'V'],
      ['Classe', document.getElementById('paramClass').value],
      ['Méthode de subdivision', document.getElementById('paramMethod').value],
      ['Symétrie', document.getElementById('paramSymmetry').value], ['Base alignée', document.getElementById('paramAlign').checked ? 'oui' : 'non'],
      ['Découpage', document.getElementById('paramPartial').value],
      ['Diamètre', domeDiameter().toFixed(2) + ' m'],
      ['Structure', ds.dome.offset ? 'sans connecteur GoodKarma — toile sur montants (' + mm(ds.dome.offset.h) + ' mm)' : 'avec connecteur — nœud à nœud']
    ];
    let h = '<div class="sheet-head"><b>Triangles de base — ' + types.length + ' formes pour ' + ds.dome.faces.length + ' faces</b></div>';
    h += '<div class="sheet-kpis">' + params.map(p => '<span>' + p[0] + ' <b>' + p[1] + '</b></span>').join('') + '</div>';
    h += '<table class="clickable"><tr><th>Type</th><th>Nombre</th><th>Côtés</th><th>Longueurs (mm)</th><th>Angles</th><th>Hauteur (mm)</th><th>Surface (m²)</th><th>Forme</th><th>N° des faces</th></tr>';
    types.forEach(t => {
      h += '<tr data-type="' + t.id + '"' + (hlType === t.id ? ' class="on"' : '') + '><td><span class="gab-dot" style="background:rgb(' + t.color.join(',') + ')"></span><b>' + t.id + '</b></td><td><b>×' + t.faces.length + '</b></td><td>' +
        t.sides.map(sd => sd.cls).join('-') + '</td><td>' + t.sides.map(sd => (sd.len*1000).toFixed(1)).join(' / ') + '</td><td>' + t.angles.map(a => a.toFixed(2) + '°').join(' / ') +
        '</td><td>' + (t.height*1000).toFixed(0) + '</td><td>' + t.area.toFixed(3) + '</td><td>' + t.kind + '</td><td class="muted small-ids">' + t.faces.join(', ') + '</td></tr>';
    });
    const tot = types.reduce((a, t) => a + t.area * t.faces.length, 0);
    h += '<tr><td class="muted">Total</td><td><b>' + ds.dome.faces.length + '</b></td><td colspan="4"></td><td><b>' + tot.toFixed(2) + '</b></td><td colspan="2" class="muted">surface nette couverte</td></tr></table>';
    h += '<div class="muted">Longueurs de ' + (ds.dome.offset ? 'toile (surface GoodKarma)' : 'centre de nœud à centre de nœud') + ', sans marge. Les lettres A, B, C… sont les classes de montants. Les angles sont dans l\'ordre des côtés : côté 1 posé à plat en bas.</div>';
    return h;
  }

  // ---------------------------------------------------------
  // Développement 2D — Étape 6 : dépliage d'un groupe connecté (calcul : Unfold)
  // ---------------------------------------------------------
  function render2DGroup(){
    const rect = canvas2d.getBoundingClientRect();
    canvas2d.width = rect.width * devicePixelRatio;
    canvas2d.height = rect.height * devicePixelRatio;
    const W = canvas2d.width, H = canvas2d.height;
    ctx2d.clearRect(0,0,W,H);

    const hint = document.getElementById('hint2d');
    const info = document.getElementById('dev2dInfo');
    const ids = [...selection].sort((a,b)=>a-b);

    if (ids.length === 0) {
      hint.textContent = 'sélectionnez un groupe de triangles connectés, puis cliquez "Développer"';
      info.textContent = '';
      return;
    }

    const result = Unfold.unfoldGroup(ds.dome, ids);
    const overlaps = Unfold.detectOverlaps(result.placements, result.placedPts, ds.fabric.overlapTol);

    info.textContent = ids.length + ' triangles → panneau';
    let hintMsg = 'Groupe déplié (' + result.placements.length + '/' + ids.length + ' faces placées)';
    if (result.unreached.length) hintMsg += ' — ⚠ non connecté au groupe : #' + result.unreached.join(', #');
    if (overlaps.length) hintMsg += ' — ⚠ chevauchement au-delà de la tolérance (' + (ds.fabric.overlapTol*1000).toFixed(0) + 'mm) : ' +
      overlaps.map(o=>'#'+o.a+'/#'+o.b+' ('+(o.depth*1000).toFixed(1)+'mm)').join(', ');
    hint.textContent = hintMsg;
    hint.style.color = (result.unreached.length || overlaps.length) ? '#b23a2f' : '';

    const allPts = [...result.placedPts.values()];
    const xs = allPts.map(p=>p.x), ys = allPts.map(p=>p.y);
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
    const spanX = maxX-minX || 1, spanY = maxY-minY || 1;
    const pxScale = Math.min(W/spanX, H/spanY) * 0.82;
    const cx = W/2, cy = H/2;
    const midX = (minX+maxX)/2, midY=(minY+maxY)/2;
    const S = p => ({ x: cx + (p.x-midX)*pxScale, y: cy - (p.y-midY)*pxScale });

    const internalEdgeKeys = new Set();
    const overlapSet = new Set(overlaps.flatMap(o => [o.a, o.b]));

    result.placements.forEach(pl => {
      const pts2d = pl.pointIds.map(id => S(result.placedPts.get(id)));
      ctx2d.beginPath();
      ctx2d.moveTo(pts2d[0].x, pts2d[0].y);
      ctx2d.lineTo(pts2d[1].x, pts2d[1].y);
      ctx2d.lineTo(pts2d[2].x, pts2d[2].y);
      ctx2d.closePath();
      ctx2d.fillStyle = overlapSet.has(pl.idx) ? 'rgba(178,58,47,0.30)' : 'rgba(150,180,205,0.30)';
      ctx2d.fill();

      const cxT=(pts2d[0].x+pts2d[1].x+pts2d[2].x)/3, cyT=(pts2d[0].y+pts2d[1].y+pts2d[2].y)/3;
      ctx2d.font = (9*devicePixelRatio)+'px monospace';
      ctx2d.fillStyle = '#1c1f22';
      ctx2d.textAlign='center'; ctx2d.textBaseline='middle';
      ctx2d.fillText('#'+pl.idx, cxT, cyT);
    });

    result.placements.forEach(pl => {
      for (let i=0;i<3;i++){
        const idA = pl.pointIds[i], idB = pl.pointIds[(i+1)%3];
        const key = idA<idB ? idA+'-'+idB : idB+'-'+idA;
        const adj = (ds.dome.faceAdjacency[pl.idx]||[]).find(a =>
          (a.edgePointIds[0]===idA && a.edgePointIds[1]===idB) || (a.edgePointIds[0]===idB && a.edgePointIds[1]===idA));
        const neighborInGroup = adj && selection.has(adj.neighbor);
        const a2 = S(result.placedPts.get(idA)), b2 = S(result.placedPts.get(idB));
        ctx2d.beginPath();
        ctx2d.moveTo(a2.x, a2.y); ctx2d.lineTo(b2.x, b2.y);
        if (neighborInGroup) {
          if (internalEdgeKeys.has(key)) continue;
          internalEdgeKeys.add(key);
          ctx2d.setLineDash([4*devicePixelRatio, 3*devicePixelRatio]);
          ctx2d.strokeStyle = 'rgba(28,31,34,0.45)';
          ctx2d.lineWidth = 1*devicePixelRatio;
        } else {
          ctx2d.setLineDash([]);
          ctx2d.strokeStyle = '#1c1f22';
          ctx2d.lineWidth = 2.2*devicePixelRatio;
        }
        ctx2d.stroke();
      }
    });
    ctx2d.setLineDash([]);
  }

  // ---------------------------------------------------------
  // Paramètres de toile et de couture : ds.fabric (laize, lisière, largeur utile,
  // tolérance, marges, rangée du bas), figé, recalculé uniquement ici.
  // ---------------------------------------------------------
  function readFabricParams(){
    const v = id => document.getElementById(id).value;
    // rangée du bas : marges propres (morceaux qui portent l'ourlet)
    const botOn = document.getElementById('paramBottomOn').checked;
    ['paramBotA', 'paramBotB', 'paramBotHem'].forEach(id => { document.getElementById(id).disabled = !botOn; });
    ds.fabric = DomeState.fabricFromInputs({ laizeMm: v('paramFabricW'), selvageMm: v('paramSelvage'), overlapTolMm: v('paramOverlapTol'),
      seamAMm: v('paramSeamA'), seamBMm: v('paramSeamB'), hemMm: v('paramHem'), seamType: v('paramSeamType'),
      bottomOn: botOn, bottomAMm: v('paramBotA'), bottomBMm: v('paramBotB'), bottomHemMm: v('paramBotHem') });
    readCutParams();
    const preset = Toile.SEAM_PRESETS[ds.fabric.seam.type];
    document.getElementById('seamNote').textContent = preset ? preset.note + ' · le morceau du dessus recouvre celui du dessous (ruissellement)' : '';
  }

  // ---------------------------------------------------------
  // Mode « Étages (par rangée) » — topo du 23/10 avec Nathan :
  //  - objectif : le moins de morceaux possible, chacun avec le plus de
  //    triangles possible (= le moins de coutures) ;
  //  - un étage = une rangée de triangles entre deux anneaux de nœuds,
  //    en dents de scie (accepté tant que ça tient dans la laize) ;
  //  - les coupes entre morceaux tombent toujours sur une arête montante
  //    d'un triangle (jamais au milieu d'un triangle) ;
  //  - le sommet = 5 triangles indépendants, cousus ensemble.
  // 27/10 : marges A/B + ourlet, contour de coupe, mode GoodKarma (toile.js).
  // ---------------------------------------------------------
  let etagesCache = null;     // plan de découpe courant
  let etagesTool = null;      // fonctions etages.js liées au dôme courant
  let selectedPiece = null;   // nom de la pièce sélectionnée (ex. 'E2-1') ou null
  let sheetCache = new Map(); // nom -> fiche patron (avec marges)
  let etagesHit = [];         // zones cliquables de la vue d'ensemble
  let gabGroups = [];         // gabarits : [{ id:'G1', members:[{sheet, mirrored}], ref }]
  let view2d = { zoom: 1, panX: 0, panY: 0 };   // zoom/déplacement de la vue détaillée

  let optimState = null;      // recherche « moins de toile » : { key, tool, result, progress, text }
  // Clé de découpe : identité complète du dôme (base, fréquence, méthode, symétrie, coupe, base alignée,
  // diamètre, structure) + numéro de génération (change à chaque recalcul) + paramètres de toile.
  // Toute modification du dôme invalide donc le résultat « moins de toile » et le comparatif.
  function readCutParams(){
    ds.cut = { strategy: document.getElementById('paramCutStrategy').value, baseRow: document.getElementById('paramBaseRow').value };
  }
  function cutKey(){ seamWeight(); return DomeState.key(ds); }
  function seamWeight(){ return (ds.seamWeight = DomeState.seamWeightFromInput(document.getElementById('paramSeamWeight').value)); }
  function startOptim(){
    const key = cutKey(), tool = makeEtages(ds.dome), myDome = ds.dome;
    optimState = { key, tool, result: null, progress: 0, text: 'Démarrage…' };
    const st = optimState;
    Optim.optimizeFabric(tool, ds.fabric.usable, ds.fabric.seam, ds.fabric.overlapTol, seamWeight(), (f, t) => {
      st.progress = f; st.text = t;
      if (optimState === st && (mode2D === 'etages' || mode2D === 'rouleau' || mode2D === 'flat')) drawBusy('Recherche du découpage « moins de toile »', f, t);
    }).then(r => {
      if (optimState !== st || ds.dome !== myDome) return;
      st.result = r; etagesCache = null; nestCache = null;
      render2D(); render();
      if (infoVisible()) renderInfo();
    });
  }
  function drawBusy(title, f, t){
    const rect = canvas2d.getBoundingClientRect();
    canvas2d.width = rect.width * devicePixelRatio; canvas2d.height = rect.height * devicePixelRatio;
    const W = canvas2d.width, H = canvas2d.height, dpr = devicePixelRatio;
    ctx2d.clearRect(0,0,W,H);
    ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
    ctx2d.font = 'bold ' + (12*dpr) + 'px monospace'; ctx2d.fillStyle = '#1c1f22';
    ctx2d.fillText(title, W/2, H/2 - 28*dpr);
    ctx2d.strokeStyle = '#c7cccf'; ctx2d.strokeRect(W*0.2, H/2 - 8*dpr, W*0.6, 16*dpr);
    ctx2d.fillStyle = '#2b5a8a'; ctx2d.fillRect(W*0.2, H/2 - 8*dpr, W*0.6*f, 16*dpr);
    ctx2d.font = (10*dpr) + 'px monospace'; ctx2d.fillStyle = '#6b7278';
    ctx2d.fillText(Math.round(f*100) + ' % — ' + (t || ''), W/2, H/2 + 26*dpr);
    document.getElementById('hint2d').textContent = 'Calcul en cours : on essaie plusieurs longueurs de morceaux par étage et on place chaque essai sur le rouleau.';
    document.getElementById('dev2dInfo').textContent = 'calcul…';
  }

  // renvoie false tant que la découpe n'est pas prête (recherche en cours)
  function ensureEtages(){
    if (etagesCache) return true;
    const strategy = ds.cut.strategy;
    let res;
    if (strategy === 'toile') {
      if (!optimState || optimState.key !== cutKey()) { startOptim(); return false; }
      if (!optimState.result) return false;
      etagesTool = optimState.tool;
      res = optimState.result;
    } else {
      etagesTool = makeEtages(ds.dome);
      res = Toile.planFabric(etagesTool, ds.fabric.usable, ds.fabric.seam, ds.fabric.overlapTol,
        { strategy, base: ds.cut.baseRow });
    }
    etagesCache = res.plan;
    sheetCache = res.sheets;
    nestCache = null;
    gabGroups = Toile.groupGabarits(allPieces().map(pc => sheetCache.get(pc.name)), true);
    if (selectedPiece && !allPieces().some(pc => pc.name === selectedPiece)) selectedPiece = null;
    document.getElementById('btnBackOverview').style.display = selectedPiece ? '' : 'none';
    return true;
  }
  function allPieces(){ return etagesCache.flatMap(b => b.pieces); }
  function pieceByName(n){ return allPieces().find(pc => pc.name === n); }
  function sheetOf(n){ return sheetCache.get(n); }
  function fitsLaize(sh){ return PlanRules.fitsLaize(sh, ds.fabric.usable); }
  // Étape 3 (audit 30/10/2026) : un morceau plus large que la laize utile ne peut pas être coupé.
  // Dans ce cas le plan de coupe et TOUS ses exports sont refusés (pas d'affichage partiel).
  function laizeFailures(){
    if (!etagesCache) return [];
    return PlanRules.laizeFailures(allPieces().map(pc => sheetOf(pc.name)), ds.fabric.usable);
  }
  // Si seuls des morceaux de la rangée du bas dépassent : quel ourlet (avec leurs marges actuelles) les ferait passer ?
  function bottomSuggestion(bad){
    const raw = n => { const pc = pieceByName(n); return pc ? etagesTool.pieceSheet(etagesCache, pc) : null; };
    const opts = PlanRules.bottomHemOptions(bad, ds.fabric.seam, ds.fabric.usable, raw, Toile.applyAllowances);
    if (!opts) return '';
    if (!opts.length) return '<div style="margin-top:6px">Ces morceaux sont tous dans la rangée du bas, mais même sans marge ni ourlet ils ne tiennent pas : il faut une laize plus large ou une couture à travers ces triangles.</div>';
    return '<div style="margin-top:6px;padding:6px 10px;background:#eef4ea;border-left:3px solid #5c8a4a">Ces morceaux sont tous dans la <b>rangée du bas</b>. Cochez « Rangée du bas : marges propres » (ligne « Rangée du bas ») avec par exemple : ' +
      opts.map(o => 'marges A' + mm(o.A) + '/B' + mm(o.B) + ' avec un ourlet de <b>' + mm(o.hem) + ' mm</b> au plus').join(' ; ') + '. Les autres rangées gardent leurs marges.</div>';
  }
  function render2DLaizeBlocked(bad){
    selectedPiece = null;
    document.getElementById('btnBackOverview').style.display = 'none';
    document.getElementById('peelTypeBox').style.display = 'none';
    const rect = canvas2d.getBoundingClientRect();
    canvas2d.width = rect.width * devicePixelRatio; canvas2d.height = rect.height * devicePixelRatio;
    const W = canvas2d.width, H = canvas2d.height, dpr = devicePixelRatio;
    ctx2d.clearRect(0,0,W,H);
    ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
    ctx2d.fillStyle = '#b23a2f'; ctx2d.font = 'bold ' + (14*dpr) + 'px monospace';
    ctx2d.fillText('⛔ Laize trop étroite — plan de coupe refusé', W/2, H/2 - 22*dpr);
    ctx2d.fillStyle = '#1c1f22'; ctx2d.font = (11*dpr) + 'px monospace';
    const maxW = Math.max(...bad.map(sh => sh.cutWidth));
    ctx2d.fillText(bad.length + ' morceau(x) plus large(s) que la largeur utile (' + mm(ds.fabric.usable) + ' mm)', W/2, H/2 + 4*dpr);
    ctx2d.fillText('laize minimale nécessaire : ' + mm(maxW + 2*ds.fabric.selvage) + ' mm', W/2, H/2 + 24*dpr);
    ctx2d.textAlign = 'left';
    const hint = document.getElementById('hint2d');
    hint.textContent = 'Aucun patron ni export tant qu\'un morceau ne tient pas dans la laize : on ne coupe pas une toile qu\'on ne peut pas réaliser.';
    hint.style.color = '#b23a2f';
    document.getElementById('dev2dInfo').textContent = 'refusé : laize trop étroite';
    const el = document.getElementById('panelsReadout');
    el.style.display = '';
    let h = '<div class="bad" style="font-weight:700">⛔ Plan de coupe refusé : ' + bad.length + ' morceau(x) ne tiennent pas dans la laize, même seuls.</div>' +
      '<div style="margin:6px 0">Largeur utile actuelle : <b>' + mm(ds.fabric.usable) + ' mm</b> (laize ' + mm(ds.fabric.laize) + ' − 2 × lisière ' + mm(ds.fabric.selvage) + '). ' +
      'Laize minimale pour cette découpe : <b>' + mm(maxW + 2*ds.fabric.selvage) + ' mm</b>.</div>' +
      '<table><tr><th>Morceau</th><th>Triangles</th><th>Largeur de coupe (mm)</th><th>Dépassement (mm)</th></tr>';
    bad.slice().sort((a, b) => b.cutWidth - a.cutWidth).forEach(sh => {
      h += '<tr><td>' + sh.name + '</td><td>' + sh.triangles.length + '</td><td class="bad">' + mm(sh.cutWidth) + '</td><td class="bad">+' + mm(sh.cutWidth - ds.fabric.usable) + '</td></tr>';
    });
    h += '</table>' + bottomSuggestion(bad) + '<div class="muted" style="margin-top:6px">Pour débloquer : une laize plus large, des marges plus petites (onglet Cover+, « Coutures » ou « Rangée du bas »), une autre découpe (« Triangle par triangle » donne les morceaux les plus étroits), ou un dôme plus petit / de fréquence plus haute (triangles plus petits). Les fiches, le plan de coupe, l\'impression PDF et le CSV restent bloqués tant qu\'un morceau dépasse.</div>';
    el.innerHTML = h;
  }
  function selectPiece(name){
    selectedPiece = name;
    view2d = { zoom: 1, panX: 0, panY: 0 };
    document.getElementById('btnBackOverview').style.display = name ? '' : 'none';
    render(); render2D();
  }
  // même couleur pour tous les morceaux d'un même gabarit
  const GAB_COLORS = [[216,145,43],[95,150,200],[120,175,110],[200,110,120],[160,130,200],[90,170,170],[205,180,90],[150,150,150],
                      [230,120,70],[70,120,180],[170,200,90],[190,90,160],[110,110,200],[60,150,120]];
  function pieceColor(pc){
    const sh = sheetCache.get(pc.name);
    const gi = sh && sh.gabarit ? parseInt(sh.gabarit.slice(1), 10) - 1 : pc.pieceIndex;
    return GAB_COLORS[gi % GAB_COLORS.length];
  }
  function gabLabel(sh){ return sh.gabarit + (sh.gabMirror ? ' ⇋' : ''); }
  const mm = v => Math.round(v * 1000);
  const deg = v => v.toFixed(1) + '°';
  const SIDE_TXT = PlanRules.SIDE_TXT;
  function nominalLength(e){
    if (!ds.dome.offset) return null;
    return ds.dome.offset.nominalLengthOf.get(Toile.edgeKey(e.nodeIds[0], e.nodeIds[1]));
  }
  function polyPath(pts, S){
    ctx2d.beginPath();
    pts.forEach((p, i) => { const v = S(p); if (i) ctx2d.lineTo(v.x, v.y); else ctx2d.moveTo(v.x, v.y); });
    ctx2d.closePath();
  }

  function render2DEtages(){
    if (!ensureEtages()) { drawBusy('Recherche du découpage « moins de toile »', optimState ? optimState.progress : 0, optimState ? optimState.text : ''); return; }
    if (fabricationGate()) return;
    if (selectedPiece) { render2DPiece(); return; }

    const rect = canvas2d.getBoundingClientRect();
    canvas2d.width = rect.width * devicePixelRatio;
    canvas2d.height = rect.height * devicePixelRatio;
    const W = canvas2d.width, H = canvas2d.height, dpr = devicePixelRatio;
    ctx2d.clearRect(0,0,W,H);
    etagesHit = [];

    const hint = document.getElementById('hint2d');
    const info = document.getElementById('dev2dInfo');
    const bands = etagesCache;

    const rows = bands.map(b => b.pieces.map(pc => {
      const sh = sheetOf(pc.name);
      return { pc, sh, len: sh.cutLength, wid: sh.cutWidth, ok: fitsLaize(sh) };
    }));

    const gap = 0.25;
    const rowLen = rows.map(r => r.reduce((a,u) => a + u.len, 0) + gap*(r.length-1));
    const maxLen = Math.max(...rowLen);
    const rowH = Math.max(ds.fabric.usable, ...rows.flat().map(u => u.wid));
    const labelH = 16*dpr;
    const pad = 10*dpr, bottomPad = 40*dpr;
    const pxScale = Math.min((W - 2*pad) / maxLen, (H - pad - bottomPad - rows.length*labelH) / (rows.length * rowH * 1.08));

    let y0 = pad;
    ctx2d.textBaseline = 'middle';
    rows.forEach((r, ri) => {
      const b = bands[ri];
      const rowOk = r.every(u => u.ok);
      ctx2d.font = (9.5*dpr)+'px monospace';
      ctx2d.fillStyle = rowOk ? '#1c1f22' : '#b23a2f';
      ctx2d.textAlign = 'left';
      const gIds = [...new Set(r.map(u => u.sh.gabarit))];
      const gTxt = gIds.map(g => g + '×' + r.filter(u => u.sh.gabarit === g).length).join(' ');
      ctx2d.fillText((b.cap ? 'Sommet' : 'Étage ' + b.level) + ' — ' + b.band.order.length + '△ en ' + r.length + ' morceau' + (r.length>1?'x':'') + ' · gabarits ' + gTxt + (rowOk ? '' : ' ⚠ hors laize'), pad, y0 + labelH/2);
      y0 += labelH;
      let x0 = pad;
      r.forEach(u => {
        const col = pieceColor(u.pc);
        ctx2d.fillStyle = 'rgba(28,31,34,0.05)';
        ctx2d.fillRect(x0, y0, u.len*pxScale, ds.fabric.usable*pxScale);
        ctx2d.setLineDash([3*dpr, 3*dpr]);
        ctx2d.strokeStyle = 'rgba(28,31,34,0.25)'; ctx2d.lineWidth = 1*dpr;
        ctx2d.strokeRect(x0, y0, u.len*pxScale, ds.fabric.usable*pxScale);
        ctx2d.setLineDash([]);
        const S = p => ({ x: x0 + p.x*pxScale, y: y0 + (ds.fabric.usable - p.y)*pxScale });
        // contour de coupe
        polyPath(u.sh.cut, S);
        ctx2d.fillStyle = u.ok ? 'rgba(' + col.join(',') + ',0.18)' : 'rgba(178,58,47,0.25)'; ctx2d.fill();
        ctx2d.strokeStyle = u.ok ? '#1c1f22' : '#b23a2f'; ctx2d.lineWidth = 1.3*dpr; ctx2d.stroke();
        const hitTris = [];
        u.sh.triangles.forEach(t => {
          const q = t.pts.map(S); hitTris.push(q);
          ctx2d.beginPath(); ctx2d.moveTo(q[0].x,q[0].y); ctx2d.lineTo(q[1].x,q[1].y); ctx2d.lineTo(q[2].x,q[2].y); ctx2d.closePath();
          ctx2d.fillStyle = 'rgba(' + col.join(',') + ',0.40)'; ctx2d.fill();
          ctx2d.strokeStyle = 'rgba(28,31,34,0.30)'; ctx2d.lineWidth = 0.6*dpr; ctx2d.stroke();
        });
        hitTris.push([S(u.sh.cut[0]), ...u.sh.cut.slice(1, 3).map(S)]);
        ctx2d.font = (8.5*dpr)+'px monospace'; ctx2d.fillStyle = '#1c1f22'; ctx2d.textAlign = 'center';
        const c = S({ x: u.len/2, y: u.wid/2 });
        ctx2d.fillText(u.pc.name, c.x, c.y - 6*dpr);
        ctx2d.font = 'bold ' + (8.5*dpr)+'px monospace'; ctx2d.fillText(gabLabel(u.sh), c.x, c.y + 6*dpr);
        etagesHit.push({ name: u.pc.name, tris: hitTris });
        x0 += u.len*pxScale + gap*pxScale;
      });
      y0 += rowH*pxScale*1.08;
    });

    const st = etagesTool.seamStats(etagesCache);
    const sheets = allPieces().map(pc => sheetOf(pc.name));
    const nBad = sheets.filter(sh => !fitsLaize(sh)).length;
    const estLen = sheets.reduce((s, sh) => s + sh.cutLength, 0);
    const nPieces = allPieces().length;
    info.textContent = nPieces + ' morceaux · ' + gabGroups.length + ' gabarits (' + ds.dome.faces.length + ' △)';
    hint.textContent = 'Cliquez un morceau (ici ou sur le dôme) pour sa fiche patron — contours de coupe marges comprises · largeur utile ' + mm(ds.fabric.usable) + ' mm · ' +
      st.sewn + ' arêtes cousues / ' + st.total + (st.closures ? ' (dont ' + st.closures + ' fermeture d\'anneau)' : '') +
      ' · ≈ ' + estLen.toFixed(1) + ' m de toile si les morceaux sont mis bout à bout (voir « Plan de coupe » pour le métrage réel)' + (nBad ? ' · ⚠ ' + nBad + ' morceau(x) hors laize' : '');
    hint.style.color = nBad ? '#b23a2f' : '';

    const el = document.getElementById('panelsReadout');
    el.style.display = '';
    let html = '<div class="sheet-head"><b>Découpe par étages — ' + allPieces().length + ' morceaux, ' + gabGroups.length + ' gabarits</b>' + (tracingBlocked() ? AXES_BLOCK_HTML : '<button id="btnPrintAll">Tout exporter — une fiche par gabarit (imprimer / PDF)</button>') + '</div>Cliquez un morceau pour ouvrir sa fiche. Dimensions de <b>coupe</b> (marges et ourlet compris). Toutes les pièces sont contrôlées <i>développables sans vague</i>.' +
      (nBad ? '<div class="bad" style="margin-top:4px">⚠ ' + nBad + ' morceau(x) ne tiennent pas dans la laize utile, même seuls : il faut une laize plus large, des marges plus petites, ou une couture à travers ces triangles.</div>' : '') +
      '<table class="clickable"><tr><th>Gabarit</th><th>À couper</th><th>Morceaux (cliquer pour la fiche)</th><th>Triangles</th><th>Coupe (mm)</th><th>m² / morceau</th><th>m² total</th><th>Sans vague</th></tr>';
    gabGroups.forEach(g => {
      const sh = g.ref, col = pieceColor(pieceByName(sh.name));
      const tot = g.members.reduce((a, m) => a + m.sheet.cutArea, 0);
      html += '<tr><td><span class="gab-dot" style="background:rgb(' + col.join(',') + ')"></span><b>' + g.id + '</b></td><td><b>×' + g.members.length + '</b></td><td>' +
        g.members.map(m => '<span class="piece-chip" data-piece="' + m.sheet.name + '">' + m.sheet.name + (m.mirrored ? ' ⇋' : '') + (m.sheet.closedRing ? ' (anneau)' : '') + '</span>').join(' ') +
        '</td><td>' + sh.triangles.length + '</td><td' + (fitsLaize(sh) ? '' : ' class="bad"') + '>' + mm(sh.cutLength) + ' × ' + mm(sh.cutWidth) + '</td><td>' + sh.cutArea.toFixed(2) +
        '</td><td>' + tot.toFixed(2) + '</td><td>' + (g.members.every(m => m.sheet.check.flat) ? '✓' : '<span class="bad">✗</span>') + '</td></tr>';
    });
    html += '<tr><td colspan="8" class="muted">⇋ = même gabarit, retourné (le morceau est le symétrique). ' + gabGroups.length + ' gabarits pour ' + allPieces().length + ' morceaux.</td></tr>';
    const totArea = sheets.reduce((s, sh) => s + sh.cutArea, 0), netArea = sheets.reduce((s, sh) => s + sh.area, 0);
    html += '<tr><td colspan="6" class="muted">Total</td><td><b>' + totArea.toFixed(2) + '</b> <span class="muted">(dont ' + netArea.toFixed(2) + ' couvrants)</span></td><td></td></tr>';
    el.innerHTML = html + '</table>';
    if (document.getElementById('btnPrintAll')) document.getElementById('btnPrintAll').addEventListener('click', () => printTracing(sheets, true, 'Traçage toile de dôme'));
  }

  // ---------------------------------------------------------
  // Étape 9 — Plan de coupe sur le rouleau (nesting.js)
  // rotation 0/180°, jamais retourné, trait de coupe commun, rouleau continu
  // ---------------------------------------------------------
  let nestCache = null;
  function ensureNest(){
    if (!ensureEtages()) return null;
    if (laizeFailures().length || fabricationStatus().level === 'red') return null;   // étapes 3 et 5
    if (!nestCache) {
      const items = allPieces().map(pc => { const sh = sheetOf(pc.name);
        return { name: pc.name, poly: sh.cut, L: sh.cutLength, W: sh.cutWidth, area: sh.cutArea }; });
      nestCache = Nesting.nest(items, ds.fabric.usable, { row: 0.01, tries: 8 });
      nestCache.naive = items.reduce((a, i) => a + i.L, 0);
      nestCache.byName = new Map(nestCache.placed.map(p => [p.name, p]));
    }
    return nestCache;
  }
  // position d'un point de la fiche (repère du morceau) sur le rouleau
  function rollPoint(pl, p){
    return { x: pl.x + (pl.rot ? pl.L - p.x : p.x), y: ds.fabric.selvage + pl.y + (pl.rot ? pl.W - p.y : p.y) };
  }


  function pointInPoly(pt, poly){
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  }

  // ---------- Étape 8 : fiches de traçage à la main (impression / PDF) ----------
  function tracingMeta(title){
    const preset = Toile.SEAM_PRESETS[ds.fabric.seam.type];
    return {
      title,
      dome: domeLabel() + ' · statut ' + STATUS_ICON[geometryStatus().level] + ' géométrie ' + STATUS_WORD[geometryStatus().level] + ', ' + STATUS_ICON[fabricationStatus().level] + ' toile ' + STATUS_WORD[fabricationStatus().level],
      structure: ds.dome.offset ? 'sans connecteur GoodKarma, toile sur montants (appui ' + mm(ds.dome.offset.h) + ' mm)' : 'avec connecteur (nœud à nœud)',
      seams: preset.label + ' A' + mm(ds.fabric.seam.A) + '/B' + mm(ds.fabric.seam.B) + ', ourlet ' + mm(ds.fabric.seam.hem) +
        (ds.fabric.seam.bottom ? ' · rangée du bas : A' + mm(ds.fabric.seam.bottom.A) + '/B' + mm(ds.fabric.seam.bottom.B) + ', ourlet ' + mm(ds.fabric.seam.bottom.hem) : ''),
      laize: mm(ds.fabric.laize) + ' mm (utile ' + mm(ds.fabric.usable) + ')',
      date: new Date().toLocaleDateString('fr-BE')
    };
  }
  // ADR-0002 (étanchéité avant tout) : la découpe « axes » aligne les coutures
  // montantes du sommet au sol ; elle reste consultable, mais aucune fiche de
  // traçage ni CSV de fabrication n'est fourni pour elle.
  function tracingBlocked(){ return ds.cut.strategy === 'axes'; }
  const AXES_BLOCK_HTML = '<span class="axes-block">⛔ Fiches de traçage non fournies : découpe déconseillée (coutures montantes alignées → étanchéité)</span>';
  function printTracing(sheets, withSummary, title){
    if (tracingBlocked()) return;
    if (laizeFailures().length || fabricationStatus().level === 'red') { render2D(); return; }   // étapes 3 et 5 : export refusé
    const meta = tracingMeta(title);
    const nr = ensureNest();
    if (!nr) return;
    meta.selvage = ds.fabric.selvage;
    meta.fabricW = ds.fabric.laize;
    meta.roll = nr;
    meta.placements = new Map(nr.placed.map(p => [p.name, p]));
    if (withSummary) meta.gabarits = gabGroups;
    const html = CoverExport.tracingDocument(sheets, meta, withSummary);
    const w = window.open('', '_blank');
    if (w) {
      w.document.open(); w.document.write(html); w.document.close();
      setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 400);
    } else {
      // fenêtre bloquée : on télécharge la page, à ouvrir puis imprimer
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      a.download = title.replace(/\s+/g, '_') + '.html';
      document.body.appendChild(a); a.click(); a.remove();
    }
  }

  // ---------- vue détaillée d'une pièce (cotes, angles, plis, coupe) ----------
  const EDGE_STYLE = { ourlet: '#2b5a8a', fermeture: '#8a4fb0', montante: '#b23a2f', etage: '#1c1f22' };

  function render2DPiece(){
    const sh = sheetOf(selectedPiece);
    const pc = pieceByName(selectedPiece);
    const rect = canvas2d.getBoundingClientRect();
    canvas2d.width = rect.width * devicePixelRatio;
    canvas2d.height = rect.height * devicePixelRatio;
    const W = canvas2d.width, H = canvas2d.height, dpr = devicePixelRatio;
    ctx2d.clearRect(0,0,W,H);

    const pad = 60*dpr;
    const spanY = Math.max(sh.cutWidth, ds.fabric.usable);
    const base = Math.min((W - 2*pad) / sh.cutLength, (H - 2*pad - 30*dpr) / spanY);
    const sc = base * view2d.zoom;
    const ox = W/2 - (sh.cutLength/2)*sc + view2d.panX, oy = H/2 + (spanY/2)*sc + view2d.panY - 10*dpr;
    const S = p => ({ x: ox + p.x*sc, y: oy - p.y*sc });

    // laize utile derrière la pièce
    const l0 = S({x: -0.1, y: 0}), l1 = S({x: sh.cutLength + 0.1, y: ds.fabric.usable});
    ctx2d.fillStyle = 'rgba(43,90,138,0.06)';
    ctx2d.fillRect(l0.x, l1.y, l1.x - l0.x, l0.y - l1.y);
    ctx2d.setLineDash([5*dpr, 4*dpr]); ctx2d.strokeStyle = 'rgba(43,90,138,0.5)'; ctx2d.lineWidth = 1*dpr;
    ctx2d.strokeRect(l0.x, l1.y, l1.x - l0.x, l0.y - l1.y); ctx2d.setLineDash([]);

    // contour de coupe (trait de coupe) + zone de marge
    const ok = fitsLaize(sh);
    polyPath(sh.cut, S);
    ctx2d.fillStyle = 'rgba(255,255,255,0.9)'; ctx2d.fill();
    ctx2d.strokeStyle = ok ? '#1c1f22' : '#b23a2f'; ctx2d.lineWidth = 1.6*dpr; ctx2d.stroke();

    const col = pieceColor(pc);
    sh.triangles.forEach(t => {
      const q = t.pts.map(S);
      ctx2d.beginPath(); ctx2d.moveTo(q[0].x,q[0].y); ctx2d.lineTo(q[1].x,q[1].y); ctx2d.lineTo(q[2].x,q[2].y); ctx2d.closePath();
      ctx2d.fillStyle = 'rgba(' + col.join(',') + ',0.30)'; ctx2d.fill();
      const c = { x: (q[0].x+q[1].x+q[2].x)/3, y: (q[0].y+q[1].y+q[2].y)/3 };
      ctx2d.font = (8.5*dpr)+'px monospace'; ctx2d.fillStyle = 'rgba(28,31,34,0.55)'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
      ctx2d.fillText('#' + t.idx, c.x, c.y);
    });

    sh.folds.forEach(f => {
      const A = S(f.A), B = S(f.B);
      ctx2d.beginPath(); ctx2d.moveTo(A.x, A.y); ctx2d.lineTo(B.x, B.y);
      ctx2d.setLineDash([4*dpr, 3*dpr]); ctx2d.strokeStyle = 'rgba(28,31,34,0.5)'; ctx2d.lineWidth = 1*dpr; ctx2d.stroke(); ctx2d.setLineDash([]);
      if (sc * f.length > 55*dpr) {
        const m = { x: (A.x+B.x)/2, y: (A.y+B.y)/2 };
        let ang = Math.atan2(B.y - A.y, B.x - A.x); if (ang > Math.PI/2) ang -= Math.PI; if (ang < -Math.PI/2) ang += Math.PI;
        ctx2d.save(); ctx2d.translate(m.x, m.y); ctx2d.rotate(ang);
        ctx2d.font = (8*dpr)+'px monospace'; ctx2d.fillStyle = '#6b7278'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'bottom';
        ctx2d.fillText('pli ' + f.fold.toFixed(1) + '°', 0, -2*dpr);
        ctx2d.restore();
      }
    });

    // ligne de couture (contour net), couleur par type de bord + cote
    sh.edges.forEach((e, i) => {
      const A = S(sh.points[i]), B = S(sh.points[(i+1) % sh.points.length]);
      ctx2d.beginPath(); ctx2d.moveTo(A.x, A.y); ctx2d.lineTo(B.x, B.y);
      ctx2d.strokeStyle = EDGE_STYLE[e.kind]; ctx2d.lineWidth = 2*dpr; ctx2d.stroke();
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
      if (L < 70*dpr) return;
      const nx = -dy / L, ny = dx / L; // vers l'extérieur (repère écran)
      const off = e.allowance * sc + 11*dpr;
      const m = { x: (A.x+B.x)/2 + nx*off, y: (A.y+B.y)/2 + ny*off };
      let ang = Math.atan2(dy, dx); if (ang > Math.PI/2) ang -= Math.PI; if (ang < -Math.PI/2) ang += Math.PI;
      ctx2d.save(); ctx2d.translate(m.x, m.y); ctx2d.rotate(ang);
      ctx2d.font = 'bold ' + (9*dpr)+'px monospace'; ctx2d.fillStyle = EDGE_STYLE[e.kind]; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
      ctx2d.fillText(e.cls + ' ' + mm(e.length) + (e.other ? ' ↔' + e.other : '') + (e.side === 'H' ? ' (ourlet)' : ' (' + e.side + ')'), 0, 0);
      ctx2d.restore();
    });

    sh.points.forEach((p, i) => {
      const v = S(p);
      const prev = S(sh.points[(i - 1 + sh.points.length) % sh.points.length]), next = S(sh.points[(i + 1) % sh.points.length]);
      let bx = (prev.x - v.x) / (Math.hypot(prev.x - v.x, prev.y - v.y) || 1) + (next.x - v.x) / (Math.hypot(next.x - v.x, next.y - v.y) || 1);
      let by = (prev.y - v.y) / (Math.hypot(prev.x - v.x, prev.y - v.y) || 1) + (next.y - v.y) / (Math.hypot(next.x - v.x, next.y - v.y) || 1);
      let bl = Math.hypot(bx, by);
      if (bl < 1e-6) { bx = -(next.y - v.y); by = next.x - v.x; bl = Math.hypot(bx, by) || 1; }
      bx /= bl; by /= bl;
      if (p.angle > 180) { bx = -bx; by = -by; }
      ctx2d.beginPath(); ctx2d.arc(v.x, v.y, 3*dpr, 0, Math.PI*2); ctx2d.fillStyle = '#1c1f22'; ctx2d.fill();
      ctx2d.font = 'bold ' + (9.5*dpr)+'px monospace'; ctx2d.fillStyle = '#1c1f22'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
      ctx2d.fillText(p.label, v.x - bx*16*dpr, v.y - by*16*dpr);
      ctx2d.font = (8.5*dpr)+'px monospace'; ctx2d.fillStyle = '#6b7278';
      ctx2d.fillText(deg(p.angle), v.x + bx*24*dpr, v.y + by*24*dpr);
    });

    const b0 = S({x:0, y:0}), b1 = S({x: sh.cutLength, y: 0});
    ctx2d.strokeStyle = '#6b7278'; ctx2d.lineWidth = 1*dpr;
    ctx2d.beginPath(); ctx2d.moveTo(b0.x, b0.y + 26*dpr); ctx2d.lineTo(b1.x, b1.y + 26*dpr); ctx2d.stroke();
    ctx2d.font = (9*dpr)+'px monospace'; ctx2d.fillStyle = ok ? '#6b7278' : '#b23a2f'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'top';
    ctx2d.fillText('coupe ' + mm(sh.cutLength) + ' × ' + mm(sh.cutWidth) + ' mm' + (ok ? '' : ' ⚠ HORS LAIZE') + '  ·  bande bleue = largeur utile ' + mm(ds.fabric.usable) + ' mm, rouleau →', (b0.x + b1.x)/2, b0.y + 30*dpr);

    const hint = document.getElementById('hint2d');
    document.getElementById('dev2dInfo').textContent = 'Morceau ' + sh.name + ' — ' + sh.triangles.length + ' triangles';
    hint.textContent = 'Vu de l\'extérieur · côté sommet en haut · trait noir = coupe · trait coloré = couture · molette = zoom · glisser = déplacer · double-clic = recadrer · Échap = retour';
    hint.style.color = '';
    renderPieceSheetTable(sh, pc);
  }

  function renderPieceSheetTable(sh, pc){
    const el = document.getElementById('panelsReadout');
    el.style.display = '';
    const gk = !!ds.dome.offset;
    let h = '<div class="sheet-head"><b>Fiche patron — morceau ' + sh.name + '</b>' + (sh.closedRing ? ' (anneau complet : les deux extrémités se recousent)' : '') +
      (tracingBlocked() ? ' ' + AXES_BLOCK_HTML : ' <button id="btnSheetPrint">Fiche de traçage (imprimer / PDF)</button> <button id="btnSheetCsv" class="ghost">CSV</button>') + '</div>';
    h += '<div class="sheet-kpis">' +
      '<span>Coupe <b' + (fitsLaize(sh) ? '' : ' class="bad"') + '>' + mm(sh.cutLength) + ' × ' + mm(sh.cutWidth) + ' mm</b> (long. × larg.)</span>' +
      '<span>Net (couture) <b>' + mm(sh.length) + ' × ' + mm(sh.width) + ' mm</b></span>' +
      '<span>Toile coupée <b>' + sh.cutArea.toFixed(3) + ' m²</b> <span class="muted">(couvrant ' + sh.area.toFixed(3) + ' m²)</span></span>' +
      '<span>Chute dans le rectangle <b>' + Math.round(100 * (1 - sh.cutArea / sh.bboxArea)) + ' %</b></span>' +
      '<span>Sans vague <b>' + (sh.check.flat ? '✓ oui' : '✗ non') + '</b></span>' +
      '</div>';
    if (sh.gabGroup) {
      const g = sh.gabGroup, others = g.members.filter(m => m.sheet !== sh);
      h += '<div class="gab-info"><span class="gab-dot" style="background:rgb(' + pieceColor(pc).join(',') + ')"></span><b>Gabarit ' + g.id + '</b> — ' +
        (g.members.length > 1 ? 'même gabarit pour <b>' + g.members.length + ' morceaux</b> : ' + g.members.map(m => '<span class="piece-chip' + (m.sheet === sh ? ' cur' : '') + '" data-piece="' + m.sheet.name + '">' + m.sheet.name + (m.mirrored ? ' ⇋' : '') + '</span>').join(' ') +
          (sh.gabMirror ? '. <b>Ce morceau se trace avec le gabarit retourné.</b>' : (g.members.some(m => m.mirrored) ? '. ⇋ = gabarit retourné.' : ''))
          : 'gabarit unique (1 seul morceau).') + '</div>';
    }
    { const nr = ensureNest(), pl = nr.byName.get(sh.name);
      if (pl) h += '<div class="roll-pos">Sur le rouleau : de <b>' + pl.x.toFixed(3) + ' m</b> à <b>' + (pl.x + pl.L).toFixed(3) + ' m</b>, à ' + mm(ds.fabric.selvage + pl.y) + ' mm du bord, ' +
        (pl.rot ? '<b>tourné 180°</b> : côté sommet du dôme vers le bord de référence' : 'non tourné : côté sommet du dôme vers le bord opposé au bord de référence') + '.</div>'; }
    h += '<div class="muted">Repère : X le long du rouleau, Y à travers la laize, origine en bas à gauche du contour de coupe. Pièce vue de l\'extérieur (endroit), côté sommet en haut. ' +
      'Les points P sont sur la <b>ligne de couture</b> (' + (gk ? 'surface de toile GoodKarma, appui ' + mm(ds.dome.offset.h) + ' mm' : 'centres des nœuds') + '). ' +
      'Assemblage : ' + Toile.SEAM_PRESETS[ds.fabric.seam.type].label + ' — A ' + mm(ds.fabric.seam.A) + ' mm (recouvrant), B ' + mm(ds.fabric.seam.B) + ' mm, ourlet ' + mm(ds.fabric.seam.hem) + ' mm.</div>';

    h += '<div class="sheet-grid"><div><h4>Ligne de couture (points P)</h4><table><tr><th>Point</th><th>Nœud</th><th>X (mm)</th><th>Y (mm)</th><th>Angle</th></tr>';
    sh.points.forEach(p => { h += '<tr><td><b>' + p.label + '</b></td><td>' + p.node + '</td><td>' + mm(p.x) + '</td><td>' + mm(p.y) + '</td><td>' + deg(p.angle) + '</td></tr>'; });
    h += '</table><h4>Contour de coupe (points C)</h4><table><tr><th>Point</th><th>X (mm)</th><th>Y (mm)</th></tr>';
    sh.cut.forEach((p, i) => { h += '<tr><td>C' + (i + 1) + '</td><td>' + mm(p.x) + '</td><td>' + mm(p.y) + '</td></tr>'; });
    h += '</table></div>';

    h += '<div><h4>Bords</h4><table><tr><th>Bord</th><th>Longueur (mm)</th>' + (gk ? '<th>Nœud à nœud</th>' : '') + '<th>Classe</th><th>Type</th><th>Côté</th><th>Marge</th></tr>';
    sh.edges.forEach(e => {
      const nl = nominalLength(e);
      h += '<tr><td>' + e.from + '→' + e.to + '</td><td>' + mm(e.length) + '</td>' + (gk ? '<td class="muted">' + mm(nl) + ' (+' + mm(e.length - nl) + ')</td>' : '') +
        '<td>' + e.cls + '</td><td><span class="k-' + e.kind + '">■</span> ' + e.type + '</td><td>' + SIDE_TXT[e.side] + '</td><td>' + mm(e.allowance) + '</td></tr>';
    });
    h += '</table>';

    h += '<h4>Plis internes (au droit des montants)</h4>';
    if (sh.folds.length) {
      h += '<table><tr><th>Pli</th><th>Longueur (mm)</th><th>Classe</th><th>Angle de pli</th><th>Entre △</th></tr>';
      sh.folds.forEach(f => { h += '<tr><td>' + f.from + '–' + f.to + '</td><td>' + mm(f.length) + '</td><td>' + f.cls + '</td><td>' + f.fold.toFixed(2) + '°</td><td>#' + f.tris.join(' / #') + '</td></tr>'; });
      h += '</table>';
    } else h += '<div class="muted">Aucun (triangle seul).</div>';
    h += '</div></div>';

    h += '<h4>Triangles (cotes nettes)</h4><table><tr><th>△</th><th>Nœuds</th><th>Côté 1 (mm)</th><th>Côté 2 (mm)</th><th>Côté 3 (mm)</th><th>Angles</th><th>Surface (m²)</th></tr>';
    sh.triangles.forEach(t => {
      h += '<tr><td>#' + t.idx + '</td><td>' + t.nodes.join('-') + '</td>' +
        t.sides.map(sd => '<td>' + sd.cls + ' ' + mm(sd.len) + '</td>').join('') +
        '<td>' + t.angles.map(deg).join(' / ') + '</td><td>' + t.area.toFixed(3) + '</td></tr>';
    });
    h += '</table>';
    el.innerHTML = h;
    if (!tracingBlocked()) document.getElementById('btnSheetCsv').addEventListener('click', () => downloadSheetCsv(sh));
    if (!tracingBlocked()) document.getElementById('btnSheetPrint').addEventListener('click', () => printTracing([sh], false, 'Traçage ' + sh.name));
  }

  function downloadSheetCsv(sh){
    if (tracingBlocked()) return;
    if (laizeFailures().length || fabricationStatus().level === 'red') { render2D(); return; }   // étapes 3 et 5 : export refusé
    const csv = PlanRules.sheetCsv(sh, ds.dome.offset, ds.fabric.seam, Toile.SEAM_PRESETS[ds.fabric.seam.type].label, nominalLength);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'nomadom_' + sh.name + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- encart « agrandissement » du mode GoodKarma ----------
  function renderOffsetInfo(){
    const el = document.getElementById('offsetInfo');
    if (!ds.dome.offset) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.innerHTML = offsetInfoHtml();
  }
  function offsetInfoHtml(){
    const o = ds.dome.offset;
    const baseR = d => { const ys = d.points.map(p => p.y), yb = Math.min(...ys);
      return Math.max(...d.points.filter(p => Math.abs(p.y - yb) < 1e-6).map(p => Math.hypot(p.x, p.z))); };
    const topH = d => Math.max(...d.points.map(p => p.y)) - Math.min(...d.points.map(p => p.y));
    let h = '<b>Mode sans connecteur (GoodKarma) — patron agrandi</b> : la toile repose sur la face extérieure des montants, à ' + mm(o.h) +
      ' mm du plan des nœuds calculés. Chaque face est décalée de cette distance ; les nœuds de base restent au sol.' +
      '<table><tr><th>Classe</th><th>Montant nœud à nœud</th><th>Toile (ligne de couture)</th><th>Agrandissement</th><th>Écart dans la classe</th></tr>';
    ds.dome.edgeClasses.forEach(g => {
      h += '<tr><td><b>' + g.name + '</b> ×' + g.count + '</td><td>' + (g.nominal*1000).toFixed(1) + ' mm</td><td>' + (g.length*1000).toFixed(1) + ' mm</td><td>+' +
        ((g.length - g.nominal)*1000).toFixed(1) + ' mm (+' + ((g.length/g.nominal - 1)*100).toFixed(2) + ' %)</td><td>' +
        ((g.max - g.min)*1000 < 0.5 ? '—' : (g.min*1000).toFixed(1) + ' à ' + (g.max*1000).toFixed(1) + ' mm') + '</td></tr>';
    });
    h += '<tr><td>Ø au sol</td><td>' + (2*baseR(ds.nominal)*1000).toFixed(0) + ' mm</td><td>' + (2*baseR(ds.dome)*1000).toFixed(0) + ' mm</td><td>+' + (2*(baseR(ds.dome)-baseR(ds.nominal))*1000).toFixed(0) + ' mm</td><td></td></tr>';
    h += '<tr><td>Hauteur</td><td>' + (topH(ds.nominal)*1000).toFixed(0) + ' mm</td><td>' + (topH(ds.dome)*1000).toFixed(0) + ' mm</td><td>+' + ((topH(ds.dome)-topH(ds.nominal))*1000).toFixed(0) + ' mm</td><td></td></tr>';
    h += '</table><div class="warn" style="margin-top:6px">Les classes ne restent pas parfaitement égales près de la base (la toile descend jusqu\'au sol) : chaque morceau utilise ses longueurs exactes. ' +
      'Planéité des triangles de toile : écart max ' + (o.maxPlaneDev*1000).toFixed(1) + ' mm par rapport au plan des montants. ' +
      'Vérifiez la hauteur d\'appui : c\'est la distance, perpendiculaire à la face, entre le plan passant par les nœuds calculés et le dessus des montants.</div>';
    return h;
  }

  // ---------------------------------------------------------
  // Image plaquée sur le dôme 3D (repris de l'onglet « Tent » d'ACIDOME)
  //  - « ciel »     : vue du ciel, centre de l'image au sommet, bord de
  //                   l'image au bas du dôme (distance angulaire depuis le
  //                   sommet, comme ACIDOME : stratoUV) ;
  //  - « panorama » : l'image fait le tour du dôme, haut de l'image au
  //                   sommet, bas de l'image au sol.
  // Chaque face reçoit sa portion d'image par une transformation affine.
  // ---------------------------------------------------------
  let domeImage = null, imageUV = null;
  function imageProj(){ return document.getElementById('paramImageProj').value; }
  function computeImageUV(){
    const proj = imageProj();
    if (imageUV && imageUV.dome === ds.dome && imageUV.proj === proj) return imageUV.map;
    const map = new Map();
    const ys = ds.dome.points.map(p => p.y), yTop = Math.max(...ys), yBot = Math.min(...ys);
    const ha = p => Math.atan2(Math.hypot(p.x, p.z), p.y);
    const maxHa = Math.max(...ds.dome.points.map(ha)) || 1;
    ds.dome.points.forEach(p => {
      const r = Math.hypot(p.x, p.z);
      if (proj === 'ciel') {
        const rho = ha(p) / maxHa;
        map.set(p._id, r < 1e-12 ? [0.5, 0.5] : [0.5 + rho * p.x / r / 2, 0.5 - rho * p.z / r / 2]);
      } else {
        map.set(p._id, [r < 1e-12 ? null : (Math.atan2(p.z, p.x) + Math.PI) / (2 * Math.PI), (yTop - p.y) / ((yTop - yBot) || 1)]);
      }
    });
    imageUV = { dome: ds.dome, proj, map };
    return map;
  }
  function drawTexturedFace(f, pts, shade){
    const map = computeImageUV(), W = domeImage.naturalWidth, H = domeImage.naturalHeight;
    const uv = f.pointIds.map(id => map.get(id).slice());
    if (imageProj() === 'panorama') {
      const known = uv.filter(q => q[0] !== null);
      const umin = Math.min(...known.map(q => q[0])), umax = Math.max(...known.map(q => q[0]));
      if (umax - umin > 0.5) known.forEach(q => { if (q[0] < 0.5) q[0] += 1; });
      const um = known.reduce((a, q) => a + q[0], 0) / known.length;
      uv.forEach(q => { if (q[0] === null) q[0] = um; });
    }
    const s = uv.map(q => ({ x: q[0] * W, y: q[1] * H })), d = pts.map(p => ({ x: p.sx, y: p.sy }));
    const den = (s[1].x - s[0].x) * (s[2].y - s[0].y) - (s[2].x - s[0].x) * (s[1].y - s[0].y);
    ctx.save();
    // triangle légèrement agrandi : pas de liseré entre faces voisines
    const cx = (d[0].x + d[1].x + d[2].x) / 3, cy = (d[0].y + d[1].y + d[2].y) / 3;
    ctx.beginPath();
    d.forEach((v, i) => { const L = Math.hypot(v.x - cx, v.y - cy) || 1, k = 0.8 / L; const x = v.x + (v.x - cx) * k, y = v.y + (v.y - cy) * k; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.closePath(); ctx.clip();
    if (Math.abs(den) > 1e-9) {
      const a = ((d[1].x - d[0].x) * (s[2].y - s[0].y) - (d[2].x - d[0].x) * (s[1].y - s[0].y)) / den;
      const c = ((d[2].x - d[0].x) * (s[1].x - s[0].x) - (d[1].x - d[0].x) * (s[2].x - s[0].x)) / den;
      const b = ((d[1].y - d[0].y) * (s[2].y - s[0].y) - (d[2].y - d[0].y) * (s[1].y - s[0].y)) / den;
      const dd = ((d[2].y - d[0].y) * (s[1].x - s[0].x) - (d[1].y - d[0].y) * (s[2].x - s[0].x)) / den;
      const e = d[0].x - a * s[0].x - c * s[0].y, g = d[0].y - b * s[0].x - dd * s[0].y;
      ctx.transform(a, b, c, dd, e, g);
      ctx.drawImage(domeImage, 0, 0);
      if (imageProj() === 'panorama') ctx.drawImage(domeImage, W, 0);
    }
    ctx.restore();
    // ombrage pour garder le relief
    ctx.beginPath(); ctx.moveTo(pts[0].sx, pts[0].sy); ctx.lineTo(pts[1].sx, pts[1].sy); ctx.lineTo(pts[2].sx, pts[2].sy); ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,' + Math.max(0, Math.min(0.5, (1 - Math.min(1, shade)) * 0.45)).toFixed(3) + ')';
    ctx.fill();
  }
  function setDomeImage(img){
    domeImage = img; imageUV = null;
    document.getElementById('btnImageOff').style.display = img ? '' : 'none';
    document.querySelector('.img-btn').classList.toggle('on', !!img);
    render();
  }

  // ---------------------------------------------------------
  // Vue aplatie (rangées, pelure d'orange) et plan de coupe sur le rouleau :
  // affichage dans src/rendering/view2d.js ; ici, ce dont il a besoin.
  // ---------------------------------------------------------
  const views = View2D.create({
    canvas: canvas2d, ctx: ctx2d, ds, mm, EDGE_STYLE, AXES_BLOCK_HTML,
    plan: () => etagesCache, sheets: () => sheetCache, tool: () => etagesTool, view: () => view2d,
    optim: () => optimState, gabGroups: () => gabGroups,
    ensureEtages, ensureNest, drawBusy, fabricationGate, sheetOf, allPieces, pieceByName, pieceColor, gabLabel,
    tracingBlocked, printTracing, showView
  });

  function render2D(){
    readFabricParams();
    if (mode2D === 'group') { render2DGroup(); return; }
    if (mode2D === 'etages') { render2DEtages(); return; }
    if (mode2D === 'rouleau') { views.renderRoll(); return; }
    if (mode2D === 'flat') { views.renderFlat(); return; }
    if (!ds.dome) return;
    const rect = canvas2d.getBoundingClientRect();
    canvas2d.width = rect.width * devicePixelRatio;
    canvas2d.height = rect.height * devicePixelRatio;
    const W = canvas2d.width, H = canvas2d.height;
    ctx2d.clearRect(0, 0, W, H);

    const ids = [...selection].sort((a,b)=>a-b);
    const hint = document.getElementById('hint2d');
    const info = document.getElementById('dev2dInfo');
    hint.style.color = '';

    if (ids.length === 0) { renderBaseTriangles(W, H); return; }
    if (!panels.length) document.getElementById('panelsReadout').style.display = 'none';

    hint.textContent = 'Mode Triangle : chaque face est développée séparément (longueurs réelles conservées)';
    info.textContent = ids.length + ' triangle' + (ids.length>1?'s':'');

    const developed = ids.map(idx => {
      const f = ds.dome.faces[idx];
      const P = f.pointIds.map(id => ds.dome.pointById.get(id));
      return { idx, flat: Unfold.flattenTriangle(P[0], P[1], P[2]) };
    });

    const maxSpan = Math.max(...developed.map(d => {
      const xs = d.flat.pts.map(p=>p.x), ys = d.flat.pts.map(p=>p.y);
      return Math.max(Math.max(...xs)-Math.min(...xs), Math.max(...ys)-Math.min(...ys));
    }));
    const cellSize = maxSpan * 1.9 + 1e-6;
    const nCols = Math.min(ids.length, Math.max(1, Math.round(Math.sqrt(ids.length * (W/Math.max(H,1))))));
    const nRows = Math.ceil(ids.length / nCols);
    const pxScale = Math.min(W / nCols, H / nRows) / cellSize * 0.86;

    ctx2d.lineWidth = 1.4 * devicePixelRatio;
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';

    developed.forEach((d, i) => {
      const col = i % nCols, row = Math.floor(i / nCols);
      const originX = (col + 0.5) * (W / nCols);
      const originY = (row + 0.5) * (H / nRows);
      const xs = d.flat.pts.map(p=>p.x), ys = d.flat.pts.map(p=>p.y);
      const bboxCx = (Math.max(...xs)+Math.min(...xs))/2;
      const bboxCy = (Math.max(...ys)+Math.min(...ys))/2;
      const S = (pt) => ({ x: originX + (pt.x - bboxCx) * pxScale, y: originY - (pt.y - bboxCy) * pxScale });
      const S0 = S(d.flat.pts[0]), S1 = S(d.flat.pts[1]), S2 = S(d.flat.pts[2]);

      ctx2d.beginPath();
      ctx2d.moveTo(S0.x, S0.y); ctx2d.lineTo(S1.x, S1.y); ctx2d.lineTo(S2.x, S2.y); ctx2d.closePath();
      ctx2d.fillStyle = 'rgba(150,180,205,0.35)';
      ctx2d.fill();
      ctx2d.strokeStyle = '#1c1f22';
      ctx2d.stroke();

      [S0,S1,S2].forEach(p => {
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, 2*devicePixelRatio, 0, Math.PI*2);
        ctx2d.fillStyle = '#1c1f22';
        ctx2d.fill();
      });

      const edgePairs = [[S0,S1,d.flat.edges[0]], [S1,S2,d.flat.edges[1]], [S2,S0,d.flat.edges[2]]];
      ctx2d.font = (9.5*devicePixelRatio) + 'px monospace';
      edgePairs.forEach(([pa,pb,len]) => {
        const mx = (pa.x+pb.x)/2, my = (pa.y+pb.y)/2;
        const cls = Unfold.classifyLength(ds.dome, len);
        ctx2d.fillStyle = '#2b5a8a';
        ctx2d.fillText((cls?cls.name+' ':'') + (len*1000).toFixed(1)+'mm', mx, my - 6*devicePixelRatio);
      });

      d.flat.angles.forEach((ang, k) => {
        const p = [S0,S1,S2][k];
        ctx2d.fillStyle = '#6b7278';
        ctx2d.font = (8.5*devicePixelRatio) + 'px monospace';
        const dx = (originX - p.x) * 0.12, dy = (originY - p.y) * 0.12;
        ctx2d.fillText((ang*180/Math.PI).toFixed(1)+'°', p.x + dx, p.y + dy);
      });

      ctx2d.font = (10.5*devicePixelRatio) + 'px monospace';
      ctx2d.fillStyle = '#1c1f22';
      ctx2d.fillText('#' + d.idx, originX, originY + (H/nRows)*0.42);
    });
  }

  // ---------------------------------------------------------
  // Interaction souris : rotation / zoom / sélection
  // ---------------------------------------------------------
  function pointInTriangle(px, py, pts){
    function sign(ax,ay,bx,by,cx,cy){ return (ax-cx)*(by-cy)-(bx-cx)*(ay-cy); }
    const d1 = sign(px,py, pts[0].sx,pts[0].sy, pts[1].sx,pts[1].sy);
    const d2 = sign(px,py, pts[1].sx,pts[1].sy, pts[2].sx,pts[2].sy);
    const d3 = sign(px,py, pts[2].sx,pts[2].sy, pts[0].sx,pts[0].sy);
    const hasNeg = (d1<0)||(d2<0)||(d3<0);
    const hasPos = (d1>0)||(d2>0)||(d3>0);
    return !(hasNeg && hasPos);
  }

  function pickFace(evtX, evtY){
    const rect = canvas.getBoundingClientRect();
    const px = (evtX - rect.left) * devicePixelRatio;
    const py = (evtY - rect.top) * devicePixelRatio;
    const list = canvas._faceDepth;
    if (!list) return -1;
    for (let i = list.length - 1; i >= 0; i--) {
      if (pointInTriangle(px, py, list[i].pts)) return list[i].f.index;
    }
    return -1;
  }

  canvas.addEventListener('mousedown', e => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    dragStartX = e.clientX; dragStartY = e.clientY; dragMoved = false;
    canvas.classList.add('dragging');
  });
  window.addEventListener('mouseup', () => { dragging = false; canvas.classList.remove('dragging'); });
  window.addEventListener('mousemove', e => {
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 3) dragMoved = true;
      rotY += dx * 0.008;
      rotX = Math.max(-1.5, Math.min(1.5, rotX + dy * 0.008));
      render();
    } else {
      const idx = pickFace(e.clientX, e.clientY);
      if (idx !== hoverIndex) {
        hoverIndex = idx;
        document.getElementById('hoverInfo').textContent = idx >= 0 ? ('triangle #' + idx) : '';
        render();
      }
    }
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    zoom *= (e.deltaY < 0) ? 1.08 : 0.93;
    zoom = Math.max(0.2, Math.min(6, zoom));
    render();
  }, { passive: false });

  canvas.addEventListener('click', e => {
    if (dragMoved) { dragMoved = false; return; }
    const idx = pickFace(e.clientX, e.clientY);
    if (idx < 0) {
      // clic dans le vide : on vide la sélection (retour aux triangles de base)
      if (mode2D === 'triangle' && selection.size) { selection.clear(); updateSelectionReadout(); render(); render2D(); }
      return;
    }
    if ((mode2D === 'etages' || mode2D === 'flat') && etagesCache) {
      const pc = allPieces().find(p => p.chain.includes(idx));
      if (pc && mode2D === 'flat') { setMode('etages'); selectPiece(pc.name); return; }
      if (pc) selectPiece(pc.name === selectedPiece ? null : pc.name);
      return;
    }
    if (e.shiftKey) {
      if (selection.has(idx)) selection.delete(idx); else selection.add(idx);
    } else {
      selection.clear();
      selection.add(idx);
    }
    updateSelectionReadout();
    render();
    render2D();
  });

  function updateSelectionReadout(){
    const el = document.getElementById('selectionReadout');
    if (selection.size === 0) {
      el.innerHTML = '<span class="muted">Aucun triangle sélectionné — cliquez sur une face du dôme. (Clic dans le vide ou Échap pour vider la sélection.)</span>';
      return;
    }
    const ids = [...selection].sort((a,b)=>a-b);
    el.innerHTML = 'Sélection (' + ids.length + ') : ' + ids.join(', ');
  }

  window.addEventListener('resize', () => { render(); render2D(); });

  document.getElementById('btnRegenerate').addEventListener('click', regenerate);
  ['paramDetail', 'paramMethod', 'paramSymmetry', 'paramPartial', 'paramAlign'].forEach(id => $id(id).addEventListener('change', regenerate));
  $id('paramDiameter').addEventListener('change', regenerate);
  document.getElementById('modeTriangle').addEventListener('click', function(){ setMode('triangle'); render(); render2D(); });
  document.getElementById('btnDevelop').addEventListener('click', function(){
    if (selection.size === 0) return;
    setMode('group'); render(); render2D();
  });
  document.getElementById('btnCreatePanel').addEventListener('click', function(){
    if (selection.size === 0) return;
    panelCounter++;
    panels.push({ id: panelCounter, faceIndices: [...selection].sort((a,b)=>a-b) });
    updatePanelsReadout();
  });
  document.getElementById('btnDevelopEtages').addEventListener('click', function(){
    readFabricParams();
    etagesCache = null;
    selection.clear(); updateSelectionReadout();
    setMode('etages'); selectPiece(null);
  });

  document.getElementById('btnRoll').addEventListener('click', function(){
    readFabricParams();
    selection.clear(); updateSelectionReadout();
    setMode('rouleau');
    document.getElementById('hint2d').textContent = 'Calcul du placement…';
    setTimeout(() => { render2D(); render(); }, 30);
  });
  canvas2d.addEventListener('click', e => {
    if (mode2D !== 'rouleau') return;
    const r = canvas2d.getBoundingClientRect();
    const pt = { x: (e.clientX - r.left) * devicePixelRatio, y: (e.clientY - r.top) * devicePixelRatio };
    const hit = views.rollHits().find(hh => pointInPoly(pt, hh.poly));
    if (hit) { setMode('etages'); selectPiece(hit.name); }
  });

  // ----- interactions de la vue 2D (mode Étages) -----
  document.getElementById('btnBackOverview').addEventListener('click', () => selectPiece(null));
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (openTrace) { setOpenTrace(false); return; }
    if (mode2D === 'etages' && selectedPiece) selectPiece(null);
    else if (mode2D === 'triangle' && selection.size) { selection.clear(); updateSelectionReadout(); render(); render2D(); }
  });
  document.getElementById('panelsReadout').addEventListener('click', e => {
    const trT = e.target.closest('tr[data-type]');
    if (trT && mode2D === 'triangle') { const id = trT.getAttribute('data-type'); hlType = hlType === id ? null : id; render(); render2D(); return; }
    const tr = e.target.closest('[data-piece]');
    if (tr && (mode2D === 'etages' || mode2D === 'rouleau' || mode2D === 'flat')) { if (mode2D !== 'etages') setMode('etages'); selectPiece(tr.getAttribute('data-piece')); }
  });
  let drag2d = null;
  canvas2d.addEventListener('mousedown', e => {
    if (panZoomActive()) drag2d = { x: e.clientX, y: e.clientY, moved: false };
  });
  window.addEventListener('mousemove', e => {
    if (!drag2d) return;
    const dx = e.clientX - drag2d.x, dy = e.clientY - drag2d.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag2d.moved = true;
    view2d.panX += dx * devicePixelRatio; view2d.panY += dy * devicePixelRatio;
    drag2d.x = e.clientX; drag2d.y = e.clientY;
    render2D();
  });
  let drag2dLast = null;
  window.addEventListener('mouseup', () => { drag2dLast = drag2d; drag2d = null; });
  canvas2d.addEventListener('wheel', e => {
    if (!panZoomActive()) return;
    e.preventDefault();
    const r = canvas2d.getBoundingClientRect();
    const mx = (e.clientX - r.left) * devicePixelRatio, my = (e.clientY - r.top) * devicePixelRatio;
    const k = e.deltaY < 0 ? 1.15 : 1/1.15;
    const nz = Math.max(0.3, Math.min(40, view2d.zoom * k)), kk = nz / view2d.zoom;
    const cx = canvas2d.width/2, cy = canvas2d.height/2;
    view2d.panX = (mx - cx) - ((mx - cx) - view2d.panX) * kk;
    view2d.panY = (my - cy) - ((my - cy) - view2d.panY) * kk;
    view2d.zoom = nz;
    render2D();
  }, { passive: false });
  function panZoomActive(){ return (mode2D === 'etages' && selectedPiece) || mode2D === 'flat'; }
  canvas2d.addEventListener('click', e => {
    if (mode2D !== 'flat' || (drag2dLast && drag2dLast.moved)) return;
    const r = canvas2d.getBoundingClientRect();
    const pt = { x: (e.clientX - r.left) * devicePixelRatio, y: (e.clientY - r.top) * devicePixelRatio };
    const hit = views.flatHits().find(hh => pointInPoly(pt, hh.poly));
    if (hit) { setMode('etages'); selectPiece(hit.name); }
  });
  canvas2d.addEventListener('dblclick', () => { if (panZoomActive()) { view2d = { zoom: 1, panX: 0, panY: 0 }; render2D(); } });
  canvas2d.addEventListener('click', e => {
    if (mode2D !== 'etages' || selectedPiece) return;
    const r = canvas2d.getBoundingClientRect();
    const px = (e.clientX - r.left) * devicePixelRatio, py = (e.clientY - r.top) * devicePixelRatio;
    const hit = etagesHit.find(h => h.tris.some(q => pointInTriangle(px, py, q.map(v => ({ sx: v.x, sy: v.y })))));
    if (hit) selectPiece(hit.name);
  });
  canvas2d.addEventListener('mousemove', e => {
    if (mode2D === 'rouleau') { const r = canvas2d.getBoundingClientRect(); const pt = { x: (e.clientX - r.left) * devicePixelRatio, y: (e.clientY - r.top) * devicePixelRatio };
      canvas2d.style.cursor = views.rollHits().some(hh => pointInPoly(pt, hh.poly)) ? 'pointer' : 'default'; return; }
    if (mode2D === 'flat') { const r = canvas2d.getBoundingClientRect(); const pt = { x: (e.clientX - r.left) * devicePixelRatio, y: (e.clientY - r.top) * devicePixelRatio };
      canvas2d.style.cursor = views.flatHits().some(hh => pointInPoly(pt, hh.poly)) ? 'pointer' : 'grab'; return; }
    if (mode2D !== 'etages' || selectedPiece) { canvas2d.style.cursor = (mode2D === 'etages' && selectedPiece) ? 'grab' : 'default'; return; }
    const r = canvas2d.getBoundingClientRect();
    const px = (e.clientX - r.left) * devicePixelRatio, py = (e.clientY - r.top) * devicePixelRatio;
    canvas2d.style.cursor = etagesHit.some(h => h.tris.some(q => pointInTriangle(px, py, q.map(v => ({ sx: v.x, sy: v.y }))))) ? 'pointer' : 'default';
  });
  document.getElementById('btnBaseOpen').addEventListener('click', function(){ setOpenTrace(!openTrace); });
  initBaseTrace();
  document.getElementById('btnFlat').addEventListener('click', function(){
    readFabricParams();
    selection.clear(); updateSelectionReadout();
    view2d = { zoom: 1, panX: 0, panY: 0 };
    setMode('flat'); render(); render2D();
  });
  document.getElementById('paramDomeImage').addEventListener('change', function(e){
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const img = new Image(); img.onload = () => setDomeImage(img); img.src = ev.target.result; };
    reader.readAsDataURL(file);
  });
  document.getElementById('paramImageProj').addEventListener('change', function(){ imageUV = null; render(); });
  document.getElementById('btnImageOff').addEventListener('click', function(){ setDomeImage(null); });
  document.getElementById('paramPeelType').addEventListener('change', function(){ views.resetPeel(); view2d = { zoom: 1, panX: 0, panY: 0 }; render2D(); });
  function fabricChanged(){
    etagesCache = null;
    nestCache = null;
    readFabricParams();
    if (infoVisible()) renderInfo(); else { render2D(); render(); }
  }
  ['paramFabricW','paramSelvage','paramOverlapTol','paramHem','paramCutStrategy','paramBaseRow','paramSeamWeight','paramBottomOn','paramBotA','paramBotB','paramBotHem'].forEach(id => document.getElementById(id).addEventListener('change', fabricChanged));
  function syncCutControls(){
    const st = document.getElementById('paramCutStrategy').value;
    document.getElementById('lblSeamWeight').style.display = st === 'toile' ? '' : 'none';
    document.getElementById('lblBaseRow').style.display = (st === 'pieces' || st === 'gabarits') ? '' : 'none';
    document.getElementById('cutWarnAxes').style.display = st === 'axes' ? '' : 'none';
  }
  document.getElementById('paramCutStrategy').addEventListener('change', syncCutControls);
  document.getElementById('paramCutStrategy').addEventListener('change', function(){ if (this.value === 'axes') views.preferPeel('edges5'); });
  syncCutControls();
  ['paramSeamA','paramSeamB'].forEach(id => document.getElementById(id).addEventListener('change', function(){
    const p = Toile.SEAM_PRESETS[document.getElementById('paramSeamType').value];
    if (p && p.A !== null && (mm(p.A/1000) !== +document.getElementById('paramSeamA').value || mm(p.B/1000) !== +document.getElementById('paramSeamB').value))
      document.getElementById('paramSeamType').value = 'perso';
    fabricChanged();
  }));
  document.getElementById('paramSeamType').addEventListener('change', function(){
    const p = Toile.SEAM_PRESETS[this.value];
    if (p && p.A !== null) { document.getElementById('paramSeamA').value = p.A; document.getElementById('paramSeamB').value = p.B; }
    fabricChanged();
  });
  ['paramStructure','paramSupportH'].forEach(id => document.getElementById(id).addEventListener('change', regenerate));

  function updatePanelsReadout(){
    const el = document.getElementById('panelsReadout');
    if (panels.length === 0) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.innerHTML = panels.map(p =>
      'Panneau #' + p.id + ' — ' + p.faceIndices.length + ' triangle(s) : ' + p.faceIndices.join(', ')
    ).join('<br>');
  }


  // ---------------------------------------------------------
  // Onglet « Informations » : comparatif des découpes + tableaux +
  // explications de chaque option et réglage (info.js)
  // ---------------------------------------------------------
  let compareState = null;   // { key, rows: Map(strategy -> mesures), running }
  const STRATS = [
    { id: 'pieces', label: 'Moins de morceaux', note: 'le moins de coutures' },
    { id: 'gabarits', label: 'Moins de gabarits', note: 'morceaux identiques répétés' },
    { id: 'axes', label: '⛔ Gabarits alignés sur les axes', note: 'DÉCONSEILLÉ : coutures montantes alignées (étanchéité) · pas de fiches de traçage' },
    { id: 'toile', label: 'Moins de toile', note: 'compromis toile / coutures' },
    { id: 'triangles', label: 'Triangle par triangle', note: 'chaque triangle séparé' }
  ];
  function infoVisible(){ return document.getElementById('viewInfo').style.display !== 'none'; }
  // ---------------------------------------------------------
  // Onglet Base : dôme 3D, chiffres clés, montants, triangles de base
  // ---------------------------------------------------------
  let baseEng = null, baseCam = null, baseDirty = true, baseFor = null;
  function initBase3D(){
    if (baseEng !== null) return;
    try { baseEng = (window.Design3DThree && Design3DThree.create($id('base3d'))) || (window.Design3D && Design3D.create($id('base3d'))) || false; } catch (e) { baseEng = false; }
    if (!baseEng) return;
    const cv = $id('base3d'); let d = null;
    cv.addEventListener('mousedown', e => { d = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mousemove', e => { if (!d) return; baseCam.yaw -= (e.clientX - d.x) * 0.008; baseCam.pitch = Math.max(-0.4, Math.min(1.5, baseCam.pitch + (e.clientY - d.y) * 0.008)); d = { x: e.clientX, y: e.clientY }; baseEng.render(baseCam, false); });
    window.addEventListener('mouseup', () => { d = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); baseCam.dist = Math.max(1.5, Math.min(60, baseCam.dist * (e.deltaY < 0 ? 0.92 : 1.08))); baseEng.render(baseCam, false); }, { passive: false });
    cv.addEventListener('dblclick', () => { baseCam = null; draw3DBase(); });
  }
  function draw3DBase(){
    initBase3D(); if (!baseEng) { $id('baseInfo3d').textContent = 'rendu 3D indisponible sur cet appareil'; return; }
    const SD = ds.struct || ds.nominal, model = Design.domeModel(SD);
    if (!baseCam) baseCam = { yaw: 0.7, pitch: 0.38, dist: model.radius * 3.8, target: [0, model.height * 0.45, 0] };
    if (baseFor !== SD) {
      const st = Design.defaultState();
      if (baseEng.isThree) baseEng.update(Design, model, st, { style: 'real', toile: 'verre', openings: [] }, () => baseEng.render(baseCam, false));
      else baseEng.setScene(Design3D.buildScene(Design, model, st, { style: 'real', toile: 'verre', openings: [] }));
      baseFor = SD;
    }
    baseEng.render(baseCam, false);
  }
  function renderBase(){
    if (!ds.nominal) return;
    if (openTrace) renderBaseTrace(); else draw3DBase();
    updateOpeningsReadout();
    const D = ds.struct || ds.nominal, model = Design.domeModel(D), stt = Design.stats(model, Design.defaultState());
    const R = D.params.radius, fr = (v, n) => v.toFixed(n === undefined ? 2 : n).replace('.', ',');
    const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    let toile = 0; D.faces.forEach(f => { const [a, b, c] = f.pointIds.map(id => D.pointById.get(id)); const u = [b.x - a.x, b.y - a.y, b.z - a.z], v = [c.x - a.x, c.y - a.y, c.z - a.z];
      toile += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2; });
    const strutLen = D.lines.reduce((a, l) => a + l.length, 0);
    const deg = new Map(); D.lines.forEach(l => l.pointIds.forEach(id => deg.set(id, (deg.get(id) || 0) + 1)));
    const hist = {}; deg.forEach(n => { hist[n] = (hist[n] || 0) + 1; });
    const sel = new Set(); D.lines.forEach(l => { if (l.selvage) l.pointIds.forEach(id => sel.add(id)); });
    const ys = [...sel].map(id => D.pointById.get(id).y), flatErr = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
    const flat = flatErr < 0.0005;
    const kp = [['Diamètre de la sphère', fr(2 * R) + ' m'], ['Hauteur', fr(stt.height) + ' m'], ['Rapport hauteur / diamètre', fr(stt.height / (2 * R), 3)],
      ['Ø au sol', fr(stt.diameter) + ' m'], ['Surface au sol', fr(stt.ground, 1) + ' m²'], ['Surface debout (≥ 1,80 m)', fr(stt.stand, 1) + ' m²'], ['Volume intérieur', fr(stt.volume, 1) + ' m³'],
      ['Surface de toile (nette)', fr(toile, 1) + ' m²'], ['Nœuds', D.stats.pointCount], ['Montants', D.stats.lineCount + ' (' + fr(strutLen, 1) + ' m au total)'], ['Faces (triangles)', D.stats.faceCount],
      ['Classes de montants', D.edgeClasses.length], ['Connecteurs', Object.keys(hist).sort((a, b) => a - b).map(n => hist[n] + ' × ' + n + ' branches').join(', ')],
      ['Base plate', flat ? '✓ oui' : '✗ non — écart ' + Math.round(flatErr * 1000) + ' mm entre nœuds du bord']];
    $id('baseKpis').innerHTML = '<div class="kpi-grid">' + kp.map(r => '<span>' + r[0] + '</span><b>' + r[1] + '</b>').join('') + '</div>' +
      '<div class="muted" style="margin-top:10px">Calculé sur la géométrie réelle (facettes), centres des nœuds. ' + (ds.dome.offset ? 'Structure GoodKarma : la toile est ' + mm(ds.dome.offset.h) + ' mm au-dessus (voir Cover+).' : '') + '</div>';
    $id('baseInfo3d').textContent = domeLabel();
    // montants
    const gk = !!ds.dome.offset;
    let h = '<div class="sheet-head"><b>Montants — ' + D.stats.lineCount + ' en ' + D.edgeClasses.length + ' longueurs</b><span class="muted">longueur de centre de nœud à centre de nœud (liste de débit simple)</span></div>';
    h += '<table><tr><th>Classe</th><th>Nombre</th><th>Longueur (mm)</th><th>Facteur de corde</th>' + (gk ? '<th>Toile GoodKarma (mm)</th>' : '') + '<th>Total (m)</th></tr>' +
      D.edgeClasses.map(g => { const t = gk ? ds.dome.edgeClasses.find(c => c.name === g.name) : null;
        return '<tr><td><b>' + g.name + '</b></td><td>×' + g.count + '</td><td>' + (g.length * 1000).toFixed(2) + '</td><td>' + (g.length / R).toFixed(6) + '</td>' + (t ? '<td>' + (t.length * 1000).toFixed(1) + '</td>' : '') + '<td>' + fr(g.length * g.count, 2) + '</td></tr>'; }).join('') +
      '<tr><td class="muted">Total</td><td><b>' + D.stats.lineCount + '</b></td><td colspan="' + (gk ? 3 : 2) + '"></td><td><b>' + fr(strutLen, 2) + '</b></td></tr></table>';
    if (D !== ds.nominal) h += '<div class="muted" style="margin-top:4px">Avec ouvertures. Dôme plein : ' + ds.nominal.stats.lineCount + ' montants (' +
      ds.nominal.edgeClasses.map(g => g.count + '×' + g.name).join(' · ') + ').</div>';
    $id('baseStruts').innerHTML = h;
    $id('baseTris').innerHTML = baseTrianglesHtml(baseTriangleTypes());
    // avertissements d'usage
    const bp = baseParams(), w = [];
    if (!flat) w.push('La base n\'est pas plate : cochez « Aligner la base » (sauf Kruschke) ou choisissez un autre découpage.');
    if (bp.symmetry !== 'Pentad') w.push('Symétrie ' + bp.symmetry + ' : les découpes par étage de Cover+ suivent les anneaux de nœuds depuis le sommet ; la pelure d\'orange n\'est proposée qu\'avec 1 fente (ses ouvertures en étoile supposent la symétrie d\'ordre 5).');
    $id('baseWarn').innerHTML = w.length ? '<div class="offset-info"><span class="warn">' + w.join('<br>') + '</span></div>' : '';
  }
  // ---------------------------------------------------------
  // Étape 5 (audit 30/10/2026) : statut de confiance affiché
  //  🟢 confirmé par une source indépendante (Domerama)
  //  🟡 calculé, confirmé seulement par Acidome (ou sans référence)
  //  🟠 géométrie correcte mais patrons de toile jamais vérifiés sur une toile cousue
  //  🔴 refusé : pas de patron ni d'export
  // ---------------------------------------------------------
  const STATUS_ICON = Status.ICON, STATUS_WORD = Status.WORD;
  // règles des statuts : src/core/status.js ; ici seulement l'affichage
  function geometryStatus(){ return Status.geometry(ds.nominal, baseParams().subdivMethod); }
  // fabrication : 🔴 si la géométrie est refusée ou si des morceaux ont des vagues ; sinon 🟠 (aucune toile cousue avec ces patrons)
  function nonFlatSheets(){
    if (!etagesCache) return [];
    return allPieces().map(pc => sheetOf(pc.name)).filter(sh => sh && !sh.check.flat);
  }
  function fabricationStatus(){ return Status.fabrication(ds.nominal, geometryStatus(), nonFlatSheets()); }
  function statusBadge(st, what){ return '<span class="st-badge st-' + st.level + '" title="' + st.reasons.join(' ').replace(/"/g, '&quot;') + '">' + STATUS_ICON[st.level] + ' ' + what + ' ' + STATUS_WORD[st.level] + '</span>'; }
  function renderStatus(){
    const g = geometryStatus(), f = fabricationStatus();
    const hs = $id('headStatus'); if (hs) hs.innerHTML = statusBadge(g, 'géométrie') + ' ' + statusBadge(f, 'toile');
    const el = $id('domeStatus'); if (!el) return;
    el.innerHTML = '<div class="st-card"><div><b>Statut de ce dôme</b> — ' + statusBadge(g, 'géométrie') + ' · ' + statusBadge(f, 'toile') + '</div><ul>' +
      g.reasons.concat(f.reasons).map(r => '<li>' + r + '</li>').join('') + '</ul>' +
      '<div class="muted">🟢 confirmé par une source indépendante (Domerama) · 🟡 calculé, sans référence indépendante · 🟠 patrons jamais vérifiés sur une toile cousue · 🔴 refusé (pas de patron ni d\'export).</div></div>';
  }
  function render2DGeoBlocked(reasons){
    selectedPiece = null;
    document.getElementById('btnBackOverview').style.display = 'none';
    document.getElementById('peelTypeBox').style.display = 'none';
    const rect = canvas2d.getBoundingClientRect();
    canvas2d.width = rect.width * devicePixelRatio; canvas2d.height = rect.height * devicePixelRatio;
    const W = canvas2d.width, H = canvas2d.height, dpr = devicePixelRatio;
    ctx2d.clearRect(0,0,W,H); ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
    ctx2d.fillStyle = '#b23a2f'; ctx2d.font = 'bold ' + (14*dpr) + 'px monospace';
    ctx2d.fillText('⛔ Patrons refusés pour ce dôme (statut 🔴)', W/2, H/2); ctx2d.textAlign = 'left';
    const hint = document.getElementById('hint2d'); hint.textContent = reasons.join(' '); hint.style.color = '#b23a2f';
    document.getElementById('dev2dInfo').textContent = 'refusé : statut 🔴';
    const el = document.getElementById('panelsReadout'); el.style.display = '';
    el.innerHTML = '<div class="bad" style="font-weight:700">⛔ Patrons refusés (statut 🔴) : aucune fiche, plan de coupe ni export.</div><ul>' + reasons.map(r => '<li>' + r + '</li>').join('') + '</ul>';
    renderStatus();
  }
  // contrôle commun avant d'afficher ou d'exporter des patrons : renvoie true si bloqué (et affiche pourquoi)
  function fabricationGate(){
    const g = geometryStatus(), nf = g.level === 'red' ? [] : nonFlatSheets();
    const b = Status.gate(g, Status.fabrication(ds.nominal, g, nf), nf, laizeFailures);
    if (b && b.block === 'status') { render2DGeoBlocked(b.reasons); return true; }
    if (b) { render2DLaizeBlocked(b.bad); renderStatus(); return true; }
    renderStatus();
    return false;
  }
  // Ø du dôme réellement calculé (case vide ou invalide : le calcul prend 5 m)
  function domeDiameter(){ return ds.nominal ? 2 * ds.nominal.params.radius : (parseFloat($id('paramDiameter').value) || 5); }
  function domeLabel(){
    const bp = baseParams();
    const dn = domeramaName(bp.detail, ds.nominal ? ds.nominal.params.subdivMethod : bp.subdivMethod, bp.partial, bp.symmetry);
    return bp.detail + 'V ' + bp.subdivMethod + (bp.symmetry !== 'Pentad' ? ' ' + bp.symmetry : '') + ' ' + bp.partial + (dn ? ' (Domerama ' + dn + ')' : '') + (bp.alignTheBase ? ' (base alignée)' : '') + ' Ø' + domeDiameter().toFixed(2).replace('.', ',') + ' m';
  }
  function showView(which){
    const info = which === 'info', design = which === 'design', base = which === 'base';
    document.getElementById('viewBase').style.display = base ? '' : 'none';
    document.getElementById('tabBase').classList.toggle('active', base);
    if (base) { document.getElementById('viewCover').style.display = 'none'; document.getElementById('viewInfo').style.display = 'none'; document.getElementById('viewDesign').style.display = 'none';
      document.getElementById('tabCover').classList.remove('active'); document.getElementById('tabInfo').classList.remove('active'); document.getElementById('tabDesign').classList.remove('active');
      renderBase(); return; }
    document.getElementById('viewCover').style.display = (info || design) ? 'none' : '';
    document.getElementById('viewInfo').style.display = info ? '' : 'none';
    document.getElementById('viewDesign').style.display = design ? '' : 'none';
    document.getElementById('tabCover').classList.toggle('active', !info && !design);
    document.getElementById('tabInfo').classList.toggle('active', info);
    document.getElementById('tabDesign').classList.toggle('active', design);
    if (info) renderInfo(); else if (design) { if (window.CoverDesign) window.CoverDesign.show(); } else { render(); render2D(); }
  }
  function measurePlan(tool, res){ return PlanRules.measurePlan(tool, res, ds.fabric, { Toile, Nesting }); }
  async function runComparison(){
    const key = cutKey() + '|' + ds.cut.baseRow;
    if (compareState && compareState.key === key && (compareState.running || compareState.rows.size === STRATS.length)) return;
    const st = { key, rows: new Map(), running: true };
    compareState = st;
    const tick = () => new Promise(r => setTimeout(r, 20));
    for (const sg of STRATS) {
      if (compareState !== st) return;
      renderInfo();
      await tick();
      let tool, res;
      if (sg.id === 'toile') {
        if (!optimState || optimState.key !== cutKey()) startOptim();
        const os = optimState;
        while (!os.result) { await new Promise(r => setTimeout(r, 150)); if (compareState !== st || optimState !== os) return; renderInfo(); }
        tool = os.tool; res = os.result;
      } else {
        tool = makeEtages(ds.dome);
        res = Toile.planFabric(tool, ds.fabric.usable, ds.fabric.seam, ds.fabric.overlapTol, { strategy: sg.id, base: ds.cut.baseRow });
      }
      st.rows.set(sg.id, measurePlan(tool, res));
    }
    st.running = false;
    if (infoVisible()) renderInfo();
  }

  function comparisonHtml(){
    const st = compareState, cur = ds.cut.strategy;
    const rows = STRATS.map(sg => ({ sg, m: st ? st.rows.get(sg.id) : null }));
    const done = rows.filter(r => r.m);
    const best = (f, dir) => done.length ? (dir < 0 ? Math.min(...done.map(r => f(r.m))) : Math.max(...done.map(r => f(r.m)))) : null;
    const bPieces = best(m => m.pieces, -1), bGab = best(m => m.gabarits, -1), bSewn = best(m => m.sewn, -1),
          bCut = best(m => m.cutArea, -1), bRoll = best(m => m.roll, -1), bUtil = best(m => m.util, 1);
    const cell = (v, b, txt, worse) => '<td class="' + (b !== null && Math.abs(v - b) < 1e-9 ? 'best' : '') + '">' + txt + '</td>';
    const q = id => '<a class="help-q" data-help="' + id + '" title="Que représente cette colonne ?">?</a>';
    let h = '<table class="compare"><tr><th>Découpe des étages <a class="help-q" data-help="aide-decoupe" title="Les 5 stratégies">?</a></th><th>Morceaux' + q('aide-col-morceaux') + '</th><th>Gabarits' + q('aide-col-gabarits') +
      '</th><th>Arêtes cousues' + q('aide-col-aretes') + '</th><th>Toile coupée (m²)' + q('aide-col-coupee') + '</th><th>Rouleau (m)' + q('aide-col-rouleau') +
      '</th><th>Rouleau (m²)' + q('aide-col-rouleau-m2') + '</th><th>Utilisation' + q('aide-col-utilisation') + '</th><th>Plus long morceau' + q('aide-col-long') +
      '</th><th>Contrôles' + q('aide-col-controles') + '</th><th></th></tr>';
    rows.forEach(({ sg, m }) => {
      h += '<tr' + (sg.id === cur ? ' class="current"' : '') + '><td><b>' + sg.label + '</b><div class="muted">' + sg.note + (sg.id === 'toile' ? ' · poids ' + Math.round(seamWeight()*100) + ' cm' : '') + '</div></td>';
      if (!m) {
        const busy = sg.id === 'toile' && optimState && !optimState.result ? 'calcul… ' + Math.round(optimState.progress * 100) + ' %' : (st && st.running ? 'calcul…' : '—');
        h += '<td colspan="9" class="muted">' + busy + '</td><td></td></tr>'; return;
      }
      h += cell(m.pieces, bPieces, m.pieces) + cell(m.gabarits, bGab, m.gabarits) + cell(m.sewn, bSewn, m.sewn + ' / ' + m.total) +
        cell(m.cutArea, bCut, m.cutArea.toFixed(1)) + cell(m.roll, bRoll, '<b>' + m.roll.toFixed(1) + '</b>') + '<td>' + m.rollArea.toFixed(1) + '</td>' +
        cell(m.util, bUtil, Math.round(m.util * 100) + ' %') + '<td>' + (m.maxLen).toFixed(1) + ' m</td>' +
        '<td>' + (m.flat ? '✓ sans vague' : '<span class="bad">✗ vague</span>') + (m.over ? ' · <span class="bad">' + m.over + ' hors laize</span>' : ' · laize ✓') + '</td>' +
        '<td>' + (sg.id === cur ? '<span class="muted">choisie</span>' : '<button class="use-strat" data-strat="' + sg.id + '">Utiliser</button>') + '</td></tr>';
    });
    h += '</table><div class="muted">Calculé avec les réglages actuels (laize ' + mm(ds.fabric.laize) + ' mm, largeur utile ' + mm(ds.fabric.usable) + ' mm, ' +
      Toile.SEAM_PRESETS[ds.fabric.seam.type].label.toLowerCase() + ' A' + mm(ds.fabric.seam.A) + '/B' + mm(ds.fabric.seam.B) + ', ourlet ' + mm(ds.fabric.seam.hem) + ', rangée du bas : ' +
      (ds.cut.baseRow === 'ring' ? 'anneau' : '5 morceaux') + '). En vert : la meilleure valeur de chaque colonne. ' +
      'Rouleau = longueur de toile à acheter avec le plan de coupe automatique.</div>';
    const curRow = st && st.rows.get(cur);
    if (curRow) {
      const net = baseTriangleTypes().reduce((a, t) => a + t.area * t.faces.length, 0);
      const usable = curRow.roll * ds.fabric.usable;
      h += '<div class="explain"><b>Comment lire ces chiffres</b> <a class="help-q" data-help="aide-comparatif" title="Explication détaillée">?</a> — exemple avec la découpe choisie (' + STRATS.find(x => x.id === cur).label + ') :' +
        '<ul><li>Le dôme lui-même fait <b>' + net.toFixed(1) + ' m²</b>. Avec les marges et l\'ourlet, on découpe <b>' + curRow.cutArea.toFixed(1) + ' m²</b> de toile (<b>toile coupée</b>) : ' + (curRow.cutArea - net).toFixed(1) + ' m² de marges.</li>' +
        '<li>Pour placer ces morceaux, il faut dérouler <b>' + curRow.roll.toFixed(1) + ' m</b> de rouleau (<b>le métrage à acheter</b>), soit ' + curRow.roll.toFixed(1) + ' m × ' + (ds.fabric.laize).toFixed(2) + ' m = <b>' + curRow.rollArea.toFixed(1) + ' m²</b>.</li>' +
        '<li>Sur la largeur utile (' + mm(ds.fabric.usable) + ' mm, sans les lisières), cela fait ' + usable.toFixed(1) + ' m², dont ' + curRow.cutArea.toFixed(1) + ' m² servent : <b>utilisation ' + Math.round(curRow.util * 100) + ' %</b>. Les ' + (usable - curRow.cutArea).toFixed(1) + ' m² restants sont de la chute.</li></ul>' +
        'Image : la toile coupée est la pâte qui finit dans les biscuits, le rouleau est toute la pâte étalée, l\'utilisation est la part qui a servi.</div>';
    }
    return h;
  }

  function renderInfo(){
    const el = document.getElementById('viewInfo');
    if (!ds.dome) return;
    const openIds = [...el.querySelectorAll('details[open]')].map(d => d.id);
    const types = baseTriangleTypes();
    let h = '<div class="info-head"><h2>Informations</h2><button id="btnInfoBack">← Retour au patron</button></div>';
    h += '<section class="info-card"><h3>Comparatif des découpes</h3>' + comparisonHtml() + '</section>';
    h += '<section class="info-card">' + baseTrianglesHtml(types) + '</section>';
    h += '<section class="info-card"><h3>Classes de montants</h3><table><tr><th>Classe</th><th>Nombre</th><th>Longueur nœud à nœud (mm)</th>' + (ds.dome.offset ? '<th>Toile GoodKarma (mm)</th>' : '') + '</tr>' +
      ds.nominal.edgeClasses.map(g => { const t = ds.dome.offset ? ds.dome.edgeClasses.find(c => c.name === g.name) : null;
        return '<tr><td><b>' + g.name + '</b></td><td>×' + g.count + '</td><td>' + (g.length*1000).toFixed(2) + '</td>' + (t ? '<td>' + (t.length*1000).toFixed(1) + '</td>' : '') + '</tr>'; }).join('') +
      '</table>' + (ds.dome.offset ? '<div class="offset-info" style="margin-top:8px">' + offsetInfoHtml() + '</div>' : '') + '</section>';
    h += '<section class="info-card"><h3>Comprendre les options et réglages</h3>' + CoverInfo.helpHtml() + '</section>';
    el.innerHTML = h;
    openIds.forEach(id => { const d = document.getElementById(id); if (d) d.open = true; });
    document.getElementById('btnInfoBack').addEventListener('click', () => showView('cover'));
    el.querySelectorAll('.help-q[data-help]').forEach(a => a.addEventListener('click', ev => {
      ev.preventDefault();
      const target = document.getElementById(a.getAttribute('data-help'));
      if (!target) return;
      const d = target.tagName === 'DETAILS' ? target : target.closest('details');
      if (d) d.open = true;
      target.classList.add('flash'); setTimeout(() => target.classList.remove('flash'), 1600);
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    el.querySelectorAll('.use-strat').forEach(b => b.addEventListener('click', () => {
      document.getElementById('paramCutStrategy').value = b.getAttribute('data-strat'); readCutParams();
      syncCutControls(); etagesCache = null; nestCache = null;
      showView('cover'); setMode('etages'); selectPiece(null);
    }));
    runComparison();
  }

  document.getElementById('tabCover').addEventListener('click', () => showView('cover'));
  document.getElementById('tabInfo').addEventListener('click', () => showView('info'));
  document.getElementById('tabDesign').addEventListener('click', () => showView('design'));
  document.getElementById('tabBase').addEventListener('click', () => showView('base'));
  // accès du module Design (onglet séparé) au dôme courant
  window.CoverApp = { dome: () => ds.struct || ds.nominal, label: domeLabel, showView };
  // « ? » à côté de chaque réglage : ouvre l'explication correspondante
  Object.keys(CoverInfo.HELP_FOR).forEach(id => {
    const input = document.getElementById(id);
    const lab = input && input.closest('label');
    if (!lab) return;
    const q = document.createElement('a');
    q.className = 'help-q'; q.textContent = '?'; q.title = 'Explication de ce réglage';
    q.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation();
      showView('info');
      const d = document.getElementById(CoverInfo.HELP_FOR[id]);
      if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    const head = document.createElement('span');
    head.className = 'lab-head';
    head.appendChild(lab.firstChild);
    head.appendChild(q);
    lab.insertBefore(head, lab.firstChild);
  });

  regenerate();
  showView('base');
})();
