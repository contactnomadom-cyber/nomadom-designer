
// ---------------------------------------------------------
// view2d.js — Affichage 2D de Cover+ (A10, étape 6)
// Vue aplatie (rangées d'étages, pelure d'orange) et plan de coupe sur le
// rouleau. Affichage seulement : les calculs (pelure : peel.js ; placement :
// nesting.js ; fiches : toile.js) sont faits ailleurs. app.js fournit l'accès
// à l'état courant par `env` (plan de coupe, fiches, zoom…).
// ---------------------------------------------------------
(function (global) {
  'use strict';
  function create(env) {
    const canvas2d = env.canvas, ctx2d = env.ctx, ds = env.ds, mm = env.mm, EDGE_STYLE = env.EDGE_STYLE, AXES_BLOCK_HTML = env.AXES_BLOCK_HTML;
    const { ensureEtages, ensureNest, drawBusy, fabricationGate, sheetOf, allPieces, pieceByName, pieceColor, gabLabel,
      tracingBlocked, printTracing, showView } = env;
    let rollHit = [];

    function render2DRoll(){
      const rect = canvas2d.getBoundingClientRect();
      canvas2d.width = rect.width * devicePixelRatio;
      canvas2d.height = rect.height * devicePixelRatio;
      const W = canvas2d.width, H = canvas2d.height, dpr = devicePixelRatio;
      ctx2d.clearRect(0,0,W,H);
      const hint = document.getElementById('hint2d'), info = document.getElementById('dev2dInfo');
      if (ensureEtages() && fabricationGate()) return;
      const nr = ensureNest();
      if (!nr) { drawBusy('Recherche du découpage « moins de toile »', env.optim() ? env.optim().progress : 0, env.optim() ? env.optim().text : ''); return; }
      rollHit = [];

      // le rouleau est replié en tronçons empilés (comme des lignes de texte)
      const pad = 34*dpr, gapRow = 26*dpr;
      let seg = 5;
      const fitSeg = sg => { const nSeg = Math.ceil(nr.length / sg); const sc = (W - 2*pad) / sg; return { nSeg, sc, h: nSeg * (ds.fabric.laize*sc + gapRow) }; };
      while (fitSeg(seg).h > H - 50*dpr && seg < 200) seg += 5;
      const { nSeg, sc } = fitSeg(seg);
      const rowH = ds.fabric.laize * sc;
      for (let k = 0; k < nSeg; k++) {
        const x0 = k * seg, top = 12*dpr + k * (rowH + gapRow);
        const segLen = Math.min(seg, nr.length - x0);
        const S = p => ({ x: pad + (p.x - x0) * sc, y: top + (ds.fabric.laize - ds.fabric.selvage - p.y) * sc });
        // toile + lisières
        ctx2d.fillStyle = '#f1ece0'; ctx2d.fillRect(pad, top, segLen*sc, rowH);
        ctx2d.fillStyle = 'rgba(28,31,34,0.12)';
        ctx2d.fillRect(pad, top, segLen*sc, ds.fabric.selvage*sc); ctx2d.fillRect(pad, top + rowH - ds.fabric.selvage*sc, segLen*sc, ds.fabric.selvage*sc);
        ctx2d.strokeStyle = '#8a8f94'; ctx2d.lineWidth = 1*dpr; ctx2d.strokeRect(pad, top, segLen*sc, rowH);
        ctx2d.save(); ctx2d.beginPath(); ctx2d.rect(pad, top, segLen*sc, rowH); ctx2d.clip();
        nr.placed.forEach(pl => {
          const minX = Math.min(...pl.poly.map(q => q.x)), maxX = Math.max(...pl.poly.map(q => q.x));
          if (maxX < x0 || minX > x0 + seg) return;
          const pc = pieceByName(pl.name);
          const col = pieceColor(pc);
          ctx2d.beginPath(); pl.poly.forEach((q, i) => { const v = S(q); if (i) ctx2d.lineTo(v.x, v.y); else ctx2d.moveTo(v.x, v.y); }); ctx2d.closePath();
          ctx2d.fillStyle = 'rgba(' + col.join(',') + ',0.55)'; ctx2d.fill();
          ctx2d.strokeStyle = '#1c1f22'; ctx2d.lineWidth = 1*dpr; ctx2d.stroke();
          const c = S({ x: (minX + maxX)/2, y: pl.y + pl.W/2 });
          ctx2d.font = 'bold ' + (9*dpr) + 'px monospace'; ctx2d.fillStyle = '#1c1f22'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
          ctx2d.fillText(pl.name + (pl.rot ? ' ↻' : ''), Math.max(pad + 20*dpr, Math.min(pad + segLen*sc - 20*dpr, c.x)), c.y);
          rollHit.push({ name: pl.name, poly: pl.poly.map(S) });
        });
        ctx2d.restore();
        // graduation en mètres
        ctx2d.font = (8.5*dpr) + 'px monospace'; ctx2d.fillStyle = '#6b7278'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'top';
        const step = seg <= 10 ? 1 : (seg <= 30 ? 5 : 10);
        for (let m = 0; m <= segLen + 1e-9; m += step) {
          const x = pad + m * sc;
          ctx2d.fillRect(x, top + rowH, 1*dpr, 4*dpr);
          ctx2d.fillText((x0 + m).toFixed(0) + ' m', x, top + rowH + 5*dpr);
        }
      }
      const gain = 1 - nr.length / nr.naive;
      info.textContent = 'Rouleau ' + nr.length.toFixed(2) + ' m';
      hint.textContent = 'Plan de coupe — laize ' + mm(ds.fabric.laize) + ' mm (lisières grisées) · ' + nr.length.toFixed(2) + ' m de toile (au lieu de ' + nr.naive.toFixed(1) +
        ' m sans placement, −' + Math.round(gain*100) + ' %) · utilisation ' + Math.round(nr.utilisation*100) + ' % · ↻ = tourné 180° · cliquez un morceau pour sa fiche' +
        (nr.check.overlaps || nr.check.outside ? ' · ⚠ contrôle : ' + nr.check.overlaps + ' chevauchement(s)' : '');
      hint.style.color = (nr.check.overlaps || nr.check.outside || nr.tooWide.length) ? '#b23a2f' : '';

      const el = document.getElementById('panelsReadout');
      el.style.display = '';
      let h = '<div class="sheet-head"><b>Plan de coupe sur le rouleau</b>' + (tracingBlocked() ? AXES_BLOCK_HTML : '<button id="btnPrintAll2">Tout exporter — plan + fiches de traçage (imprimer / PDF)</button>') + '</div>';
      h += '<div class="sheet-kpis"><span>Métrage <b>' + nr.length.toFixed(2) + ' m</b></span><span>Sans placement <b>' + nr.naive.toFixed(1) + ' m</b> (−' + Math.round(gain*100) + ' %)</span>' +
        '<span>Utilisation de la toile <b>' + Math.round(nr.utilisation*100) + ' %</b></span><span>Contrôle chevauchements <b>' + (nr.check.overlaps + nr.check.outside === 0 ? '✓ aucun' : '✗ ' + nr.check.overlaps) + '</b></span></div>';
      if (nr.tooWide.length) h += '<div class="bad">⚠ Hors laize, non placés : ' + nr.tooWide.join(', ') + '</div>';
      h += '<div class="muted">Règles : rotation 0° ou 180° seulement (droit-fil), jamais retourné (endroit), trait de coupe commun autorisé. X = distance depuis le début du rouleau, Y = distance depuis le bord de référence de la toile (lisière comprise), au coin bas-gauche du rectangle de coupe du morceau.</div>';
      h += '<table class="clickable"><tr><th>Morceau</th><th>De X (m)</th><th>À X (m)</th><th>Y (mm)</th><th>Rotation</th><th>Coupe (mm)</th></tr>';
      nr.placed.slice().sort((a, b) => a.x - b.x).forEach(pl => {
        h += '<tr data-piece="' + pl.name + '"><td><b>' + pl.name + '</b></td><td>' + pl.x.toFixed(3) + '</td><td>' + (pl.x + pl.L).toFixed(3) + '</td><td>' + mm(ds.fabric.selvage + pl.y) +
          '</td><td>' + (pl.rot ? '180° ↻' : '0°') + '</td><td>' + mm(pl.L) + ' × ' + mm(pl.W) + '</td></tr>';
      });
      el.innerHTML = h + '</table>';
      if (document.getElementById('btnPrintAll2')) document.getElementById('btnPrintAll2').addEventListener('click', () => printTracing(allPieces().map(pc => sheetOf(pc.name)), true, 'Traçage toile de dôme'));
    }

    // ---------------------------------------------------------
    // Vue aplatie (cotes) — morceaux EXACTS de la découpe choisie, posés à
    // plat étage par étage (sommet en haut), dans l'ordre du tour du dôme.
    // Toutes les cotes : longueur et classe de chaque bord, plis, angles aux
    // points, nœuds. Plus on zoome, plus les détails apparaissent.
    // ---------------------------------------------------------
    let flatHit = [], flatLayout = null;
    function buildFlatLayout(){
      if (flatLayout && flatLayout.plan === env.plan() && flatLayout.sheets === env.sheets()) return flatLayout;
      const gapX = 0.35, gapY = 0.45, labelH = 0.35;
      const rows = []; let y = 0, maxW = 0;
      env.plan().forEach(b => {
        const items = []; let x = 0, h = 0;
        b.pieces.forEach(pc => { const sh = sheetOf(pc.name); items.push({ pc, sh, x }); x += sh.cutLength + gapX; h = Math.max(h, sh.cutWidth); });
        const w = x - gapX; maxW = Math.max(maxW, w);
        rows.push({ band: b, items, y: y + labelH, h, w }); y += labelH + h + gapY;
      });
      flatLayout = { plan: env.plan(), sheets: env.sheets(), rows, W: maxW, H: y - gapY };
      return flatLayout;
    }
    function render2DFlatRows(){
      if (!ensureEtages()) { drawBusy('Recherche du découpage « moins de toile »', env.optim() ? env.optim().progress : 0, env.optim() ? env.optim().text : ''); return; }
      const rect = canvas2d.getBoundingClientRect();
      canvas2d.width = rect.width * devicePixelRatio; canvas2d.height = rect.height * devicePixelRatio;
      const W = canvas2d.width, H = canvas2d.height, dpr = devicePixelRatio;
      ctx2d.clearRect(0, 0, W, H);
      const L = buildFlatLayout();
      const pad = 16 * dpr;
      const base = Math.min((W - 2 * pad) / L.W, (H - 2 * pad - 20 * dpr) / L.H);
      const sc = base * env.view().zoom;
      const ox = W / 2 - (L.W / 2) * sc + env.view().panX, oy = H / 2 - (L.H / 2) * sc + env.view().panY;
      flatHit = [];
      const txt = (t, x, y, ang, font, color, base_) => {
        ctx2d.save(); ctx2d.translate(x, y); if (ang) ctx2d.rotate(ang);
        ctx2d.font = font; ctx2d.fillStyle = color; ctx2d.textAlign = 'center'; ctx2d.textBaseline = base_ || 'middle';
        ctx2d.lineWidth = 3 * dpr; ctx2d.strokeStyle = 'rgba(255,255,255,0.85)'; ctx2d.strokeText(t, 0, 0); ctx2d.fillText(t, 0, 0); ctx2d.restore();
      };
      const upright = a => { if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI; return a; };
      L.rows.forEach(row => {
        const b = row.band;
        // titre de l'étage
        const tl = { x: ox, y: oy + (row.y - 0.18) * sc };
        if (tl.y > -20 * dpr && tl.y < H + 20 * dpr) {
          ctx2d.font = 'bold ' + (10 * dpr) + 'px monospace'; ctx2d.fillStyle = '#2b5a8a'; ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'middle';
          ctx2d.fillText((b.cap ? 'Sommet' : 'Étage ' + b.level) + ' — ' + b.pieces.length + ' morceau' + (b.pieces.length > 1 ? 'x' : '') + ' · ' + b.band.order.length + ' △', Math.max(4 * dpr, tl.x), tl.y);
        }
        row.items.forEach(it => {
          const sh = it.sh, col = pieceColor(it.pc);
          // repère du morceau : y vers le haut, bas du morceau aligné en bas de la rangée
          const S = p => ({ x: ox + (it.x + p.x) * sc, y: oy + (row.y + row.h - p.y) * sc });
          const cutS = sh.cut.map(S);
          const minX = Math.min(...cutS.map(v => v.x)), maxX = Math.max(...cutS.map(v => v.x)), minY = Math.min(...cutS.map(v => v.y)), maxY = Math.max(...cutS.map(v => v.y));
          if (maxX < 0 || minX > W || maxY < 0 || minY > H) return;
          flatHit.push({ name: sh.name, poly: cutS });
          // contour de coupe
          ctx2d.beginPath(); cutS.forEach((v, i) => i ? ctx2d.lineTo(v.x, v.y) : ctx2d.moveTo(v.x, v.y)); ctx2d.closePath();
          ctx2d.fillStyle = '#fff'; ctx2d.fill(); ctx2d.strokeStyle = 'rgba(28,31,34,0.45)'; ctx2d.lineWidth = 1 * dpr; ctx2d.stroke();
          // triangles
          sh.triangles.forEach(t => { const q = t.pts.map(S);
            ctx2d.beginPath(); ctx2d.moveTo(q[0].x, q[0].y); ctx2d.lineTo(q[1].x, q[1].y); ctx2d.lineTo(q[2].x, q[2].y); ctx2d.closePath();
            ctx2d.fillStyle = 'rgba(' + col.join(',') + ',0.28)'; ctx2d.fill(); });
          // plis + cotes
          sh.folds.forEach(fl => {
            const A = S(fl.A), B = S(fl.B), Lp = Math.hypot(B.x - A.x, B.y - A.y);
            ctx2d.beginPath(); ctx2d.moveTo(A.x, A.y); ctx2d.lineTo(B.x, B.y); ctx2d.setLineDash([4 * dpr, 3 * dpr]);
            ctx2d.strokeStyle = 'rgba(28,31,34,0.55)'; ctx2d.lineWidth = 1 * dpr; ctx2d.stroke(); ctx2d.setLineDash([]);
            if (Lp > 70 * dpr) txt(fl.cls + ' ' + mm(fl.length) + (Lp > 150 * dpr ? ' · pli ' + fl.fold.toFixed(1) + '°' : ''), (A.x + B.x) / 2, (A.y + B.y) / 2, upright(Math.atan2(B.y - A.y, B.x - A.x)), (8.5 * dpr) + 'px monospace', '#555');
          });
          // ligne de couture + cotes des bords
          const n = sh.points.length;
          sh.edges.forEach((e, i) => {
            const A = S(sh.points[i]), B = S(sh.points[(i + 1) % n]);
            ctx2d.beginPath(); ctx2d.moveTo(A.x, A.y); ctx2d.lineTo(B.x, B.y); ctx2d.strokeStyle = EDGE_STYLE[e.kind]; ctx2d.lineWidth = 1.8 * dpr; ctx2d.stroke();
            const dx = B.x - A.x, dy = B.y - A.y, Le = Math.hypot(dx, dy) || 1;
            if (Le < 55 * dpr) return;
            const nx = dy / Le, ny = -dx / Le; // vers l'intérieur (contour trigonométrique, y écran inversé)
            const m = { x: (A.x + B.x) / 2 + nx * 9 * dpr, y: (A.y + B.y) / 2 + ny * 9 * dpr };
            const extra = Le > 170 * dpr ? (e.other ? ' ↔' + e.other : (e.kind === 'ourlet' ? ' ourlet' : e.kind === 'fermeture' ? ' ferm.' : '')) : '';
            txt(e.cls + ' ' + mm(e.length) + extra, m.x, m.y, upright(Math.atan2(dy, dx)), 'bold ' + (9 * dpr) + 'px monospace', EDGE_STYLE[e.kind]);
          });
          // points : étiquette, nœud, angle
          const big = Math.min(maxX - minX, maxY - minY) > 160 * dpr;
          sh.points.forEach((p, i) => {
            const v = S(p), prev = S(sh.points[(i - 1 + n) % n]), next = S(sh.points[(i + 1) % n]);
            ctx2d.beginPath(); ctx2d.arc(v.x, v.y, 2.2 * dpr, 0, Math.PI * 2); ctx2d.fillStyle = '#1c1f22'; ctx2d.fill();
            if (!big) return;
            let bx = (prev.x - v.x) / (Math.hypot(prev.x - v.x, prev.y - v.y) || 1) + (next.x - v.x) / (Math.hypot(next.x - v.x, next.y - v.y) || 1);
            let by = (prev.y - v.y) / (Math.hypot(prev.x - v.x, prev.y - v.y) || 1) + (next.y - v.y) / (Math.hypot(next.x - v.x, next.y - v.y) || 1);
            let bl = Math.hypot(bx, by); if (bl < 1e-6) { bx = -(next.y - v.y); by = next.x - v.x; bl = Math.hypot(bx, by) || 1; }
            bx /= bl; by /= bl; if (p.angle > 180) { bx = -bx; by = -by; }
            txt(p.label + ' ' + p.node, v.x - bx * 16 * dpr, v.y - by * 16 * dpr, 0, 'bold ' + (8.5 * dpr) + 'px monospace', '#1c1f22');
            txt(p.angle.toFixed(1) + '°', v.x + bx * 22 * dpr, v.y + by * 22 * dpr, 0, (8 * dpr) + 'px monospace', '#6b7278');
          });
          // nom du morceau
          const cxp = (minX + maxX) / 2, cyp = (minY + maxY) / 2;
          txt(sh.name + ' · ' + gabLabel(sh), cxp, cyp - 6 * dpr, 0, 'bold ' + (10 * dpr) + 'px monospace', '#1c1f22');
          if (maxX - minX > 260 * dpr && maxY - minY > 70 * dpr) txt(mm(sh.length) + ' × ' + mm(sh.width) + ' net · coupe ' + mm(sh.cutLength) + ' × ' + mm(sh.cutWidth), cxp, cyp + 8 * dpr, 0, (8.5 * dpr) + 'px monospace', '#6b7278');
        });
      });
      const nP = allPieces().length;
      document.getElementById('dev2dInfo').textContent = 'Vue aplatie — ' + nP + ' morceaux exacts';
      const hint = document.getElementById('hint2d');
      hint.textContent = 'Morceaux exacts (sans vague) de la découpe choisie, sommet en haut · cotes nettes en mm, de nœud à nœud · molette = zoom (plus de détails en zoomant) · glisser = déplacer · double-clic = recadrer · clic sur un morceau = sa fiche';
      hint.style.color = '';
      const el = document.getElementById('panelsReadout');
      el.style.display = '';
      el.innerHTML = '<div class="sheet-head"><b>Vue aplatie — ' + nP + ' morceaux, ' + env.gabGroups().length + ' gabarits</b></div>' +
        '<div class="muted">Chaque morceau est posé à plat tel qu\'il sera coupé (vu de l\'extérieur, côté sommet en haut), rangée par rangée, dans l\'ordre du tour du dôme. ' +
        'Bords : <span class="k-etage">■</span> couture d\'étage · <span class="k-montante">■</span> coupe montante · <span class="k-fermeture">■</span> fermeture d\'anneau · <span class="k-ourlet">■</span> ourlet. ' +
        'Pointillés = plis au droit des montants. Les cotes sont celles de la ligne de couture (sans marge) ; le trait gris extérieur est le contour de coupe. ' +
        'Zoomer pour voir les angles, les nœuds et les voisins à coudre. La présentation en <b>pelure d\'orange</b> (étages attachés depuis le sommet) est disponible avec les découpes « Moins de gabarits » et « Triangle par triangle ».</div>';
    }

    // ---------------------------------------------------------
    // Pelure d'orange (vue aplatie des découpes « Moins de gabarits » et
    // « Triangle par triangle ») — choix de Nathan du 29/10 :
    //  - chaque étage reste d'un seul tenant : ses morceaux sont posés côte à
    //    côte comme sur le dôme (bande dépliée) ;
    //  - chaque étage s'accroche à celui du dessus par UNE seule arête
    //    (charnière), toutes les charnières sur le même méridien φ0 ;
    //  - tous les étages sont ouverts (fente) sur le méridien opposé φ0 + 180°,
    //    toujours entre deux morceaux (jamais au milieu d'un morceau) ;
    //  - le reste de chaque couture d'étage s'ouvre en éventail à plat et se
    //    referme quand on pose la toile sur le dôme.
    // Chaque morceau garde sa fiche (marges, gabarit) : on le replace par une
    // rotation + translation (jamais retourné) sur sa position dans la pelure.
    // ---------------------------------------------------------
    let peelLayout = null;
    function peelStrategy(){ const s = ds.cut.strategy; return s === 'gabarits' || s === 'triangles' || s === 'axes'; }
    function rigid(a0, a1, b0, b1){
      const ang = Math.atan2(b1.y - b0.y, b1.x - b0.x) - Math.atan2(a1.y - a0.y, a1.x - a0.x), c = Math.cos(ang), s = Math.sin(ang);
      return p => ({ x: b0.x + c * (p.x - a0.x) - s * (p.y - a0.y), y: b0.y + s * (p.x - a0.x) + c * (p.y - a0.y) });
    }
    function peelType(){ return document.getElementById('paramPeelType').value || 'one'; }
    // menu « Type d'ouverture » : seuls les types possibles pour ce dôme et cette découpe
    // « Gabarits alignés sur les axes » : la pelure s'ouvre d'office sur les
    // 5 axes des arêtes d'origine, là où tombent les jonctions entre gabarits
    let peelPref = null;
    function syncPeelMenu(){
      const sel = document.getElementById('paramPeelType');
      const av = Peel.availableTypes(ds.dome, env.tool(), env.plan());
      const cur = peelPref || sel.value || 'one'; peelPref = null;
      sel.innerHTML = av.map(t => '<option value="' + t.id + '"' + (t.ok ? '' : ' disabled') + ' title="' + (t.reason || '').replace(/"/g, '&quot;') + '">' +
        t.label + (t.ok ? '' : ' — impossible ici') + '</option>').join('');
      sel.value = av.some(t => t.id === cur && t.ok) ? cur : 'one';
    }
    function buildPeelLayout(){
      const type = peelType();
      if (peelLayout && peelLayout.plan === env.plan() && peelLayout.sheets === env.sheets() && peelLayout.req === type) return peelLayout;
      peelLayout = Peel.build(ds.dome, env.tool(), env.plan(), sheetOf, type);
      peelLayout.plan = env.plan(); peelLayout.sheets = env.sheets(); peelLayout.req = type;
      return peelLayout;
    }

    function render2DPeel(){
      const rect = canvas2d.getBoundingClientRect();
      canvas2d.width = rect.width * devicePixelRatio; canvas2d.height = rect.height * devicePixelRatio;
      const W = canvas2d.width, H = canvas2d.height, dpr = devicePixelRatio;
      ctx2d.clearRect(0, 0, W, H);
      const L = buildPeelLayout();
      const pad = 16 * dpr, LW = L.maxX - L.minX, LH = L.maxY - L.minY;
      const base = Math.min((W - 2 * pad) / LW, (H - 2 * pad - 24 * dpr) / LH);
      const sc = base * env.view().zoom;
      const ox = W / 2 - ((L.minX + L.maxX) / 2) * sc + env.view().panX, oy = H / 2 + ((L.minY + L.maxY) / 2) * sc + env.view().panY - 8 * dpr;
      const toS = v => ({ x: ox + v.x * sc, y: oy - v.y * sc });
      const txt = (t, x, y, ang, font, color) => {
        ctx2d.save(); ctx2d.translate(x, y); if (ang) ctx2d.rotate(ang);
        ctx2d.font = font; ctx2d.fillStyle = color; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
        ctx2d.lineWidth = 3 * dpr; ctx2d.strokeStyle = 'rgba(255,255,255,0.85)'; ctx2d.strokeText(t, 0, 0); ctx2d.fillText(t, 0, 0); ctx2d.restore();
      };
      const upright = a => { if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI; return a; };
      flatHit = [];
      // a) morceaux avec leurs marges : du bas vers le haut, puis dans le sens de la bande,
      //    pour que le côté A (recouvrant) soit dessiné par-dessus le côté B (recouvert)
      const order = L.pieces.slice().sort((a, b) => b.level - a.level);
      order.forEach(p => {
        const S = q => toS(p.T(q)), col = pieceColor(p.pc);
        const cutS = p.sh.cut.map(S);
        ctx2d.beginPath(); cutS.forEach((v, i) => i ? ctx2d.lineTo(v.x, v.y) : ctx2d.moveTo(v.x, v.y)); ctx2d.closePath();
        ctx2d.fillStyle = 'rgba(255,255,255,0.80)'; ctx2d.fill();
        ctx2d.fillStyle = 'rgba(' + col.join(',') + ',0.18)'; ctx2d.fill();
        ctx2d.strokeStyle = 'rgba(28,31,34,0.55)'; ctx2d.lineWidth = 1 * dpr; ctx2d.stroke();
        p.sh.triangles.forEach(t => { const q = t.pts.map(S);
          ctx2d.beginPath(); ctx2d.moveTo(q[0].x, q[0].y); ctx2d.lineTo(q[1].x, q[1].y); ctx2d.lineTo(q[2].x, q[2].y); ctx2d.closePath();
          ctx2d.fillStyle = 'rgba(' + col.join(',') + ',0.30)'; ctx2d.fill(); });
        flatHit.push({ name: p.sh.name, poly: cutS });
      });
      // b) repères : montants sous la toile (toutes les arêtes des triangles)
      L.pieces.forEach(p => p.sh.folds.forEach(fl => {
        const A = toS(p.T(fl.A)), B = toS(p.T(fl.B)), Lp = Math.hypot(B.x - A.x, B.y - A.y);
        ctx2d.beginPath(); ctx2d.moveTo(A.x, A.y); ctx2d.lineTo(B.x, B.y); ctx2d.setLineDash([4 * dpr, 3 * dpr]);
        ctx2d.strokeStyle = 'rgba(28,31,34,0.6)'; ctx2d.lineWidth = 1 * dpr; ctx2d.stroke(); ctx2d.setLineDash([]);
        if (Lp > 70 * dpr) txt(fl.cls + ' ' + mm(fl.length) + (Lp > 150 * dpr ? ' · pli ' + fl.fold.toFixed(1) + '°' : ''), (A.x + B.x) / 2, (A.y + B.y) / 2, upright(Math.atan2(B.y - A.y, B.x - A.x)), (8.5 * dpr) + 'px monospace', '#555');
      }));
      // c) lignes de couture et cotes de chaque bord (côté intérieur du morceau)
      L.pieces.forEach(p => {
        const n = p.sh.points.length, ptsS = p.sh.points.map(q => toS(p.T(q)));
        let a2 = 0; ptsS.forEach((v, i) => { const w = ptsS[(i + 1) % n]; a2 += v.x * w.y - w.x * v.y; });
        const sgn = a2 > 0 ? 1 : -1;
        p.sh.edges.forEach((e, i) => {
          const A = ptsS[i], B = ptsS[(i + 1) % n];
          ctx2d.beginPath(); ctx2d.moveTo(A.x, A.y); ctx2d.lineTo(B.x, B.y); ctx2d.strokeStyle = EDGE_STYLE[e.kind]; ctx2d.lineWidth = 1.8 * dpr; ctx2d.stroke();
          const dx = B.x - A.x, dy = B.y - A.y, Le = Math.hypot(dx, dy) || 1;
          if (Le < 55 * dpr) return;
          const nx = -sgn * dy / Le, ny = sgn * dx / Le;
          const m = { x: (A.x + B.x) / 2 + nx * 9 * dpr, y: (A.y + B.y) / 2 + ny * 9 * dpr };
          const extra = Le > 150 * dpr ? (e.side !== 'H' ? ' ' + e.side : '') + (e.other ? ' ↔' + e.other : (e.kind === 'ourlet' ? ' ourlet' : e.kind === 'fermeture' ? ' ferm.' : '')) : '';
          txt(e.cls + ' ' + mm(e.length) + extra, m.x, m.y, upright(Math.atan2(dy, dx)), 'bold ' + (9 * dpr) + 'px monospace', EDGE_STYLE[e.kind]);
        });
      });
      // c bis) morceaux traversés par une fente : en ROUGE, posés triangle par
      //        triangle, avec la ligne où il faudrait les couper
      L.broken.forEach(bp => {
        const polys = [];
        bp.parts.forEach(part => {
          part.forEach(t => { const q = t.pts.map(toS); polys.push(q);
            ctx2d.beginPath(); ctx2d.moveTo(q[0].x, q[0].y); ctx2d.lineTo(q[1].x, q[1].y); ctx2d.lineTo(q[2].x, q[2].y); ctx2d.closePath();
            ctx2d.fillStyle = 'rgba(178,58,47,0.32)'; ctx2d.fill(); ctx2d.strokeStyle = 'rgba(178,58,47,0.9)'; ctx2d.lineWidth = 1.2 * dpr; ctx2d.stroke(); });
          // contour de la partie (arêtes non partagées entre triangles voisins de la partie)
          const cnt = new Map(), key = (a, b) => a < b ? a + '-' + b : b + '-' + a;
          part.forEach(t => [[0,1],[1,2],[2,0]].forEach(([u, v]) => { const k = key(t.pointIds[u], t.pointIds[v]); cnt.set(k, (cnt.get(k) || 0) + 1); }));
          part.forEach(t => [[0,1],[1,2],[2,0]].forEach(([u, v]) => {
            const k = key(t.pointIds[u], t.pointIds[v]); const A = toS(t.pts[u]), B = toS(t.pts[v]);
            ctx2d.beginPath(); ctx2d.moveTo(A.x, A.y); ctx2d.lineTo(B.x, B.y);
            if (cnt.get(k) > 1) { ctx2d.setLineDash([4 * dpr, 3 * dpr]); ctx2d.strokeStyle = 'rgba(120,30,25,0.6)'; ctx2d.lineWidth = 1 * dpr; }
            else { ctx2d.strokeStyle = '#b23a2f'; ctx2d.lineWidth = 2 * dpr; }
            ctx2d.stroke(); ctx2d.setLineDash([]);
            const Le = Math.hypot(B.x - A.x, B.y - A.y);
            if (Le > 70 * dpr) { const c = t.pts.map(toS), g = { x: (c[0].x + c[1].x + c[2].x) / 3, y: (c[0].y + c[1].y + c[2].y) / 3 };
              const m = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, d = Math.hypot(g.x - m.x, g.y - m.y) || 1;
              const P = ds.dome.pointById.get(t.pointIds[u]), Q = ds.dome.pointById.get(t.pointIds[v]);
              txt(mm(Math.hypot(P.x - Q.x, P.y - Q.y, P.z - Q.z)) + '', m.x + (g.x - m.x) / d * 9 * dpr, m.y + (g.y - m.y) / d * 9 * dpr, upright(Math.atan2(B.y - A.y, B.x - A.x)), (8.5 * dpr) + 'px monospace', '#7a2620'); }
          }));
          const c = part.flatMap(t => t.pts).map(toS);
          txt('⚠ ' + bp.pc.name + ' · ' + gabLabel(bp.sh), c.reduce((a, v) => a + v.x, 0) / c.length, c.reduce((a, v) => a + v.y, 0) / c.length, 0, 'bold ' + (9.5 * dpr) + 'px monospace', '#b23a2f');
        });
        // ligne de coupe, des deux côtés de la fente
        bp.cutLines.forEach(cl => cl.sides.forEach(sd => {
          const A = toS(sd.A), B = toS(sd.B);
          ctx2d.beginPath(); ctx2d.moveTo(A.x, A.y); ctx2d.lineTo(B.x, B.y); ctx2d.setLineDash([7 * dpr, 4 * dpr]);
          ctx2d.strokeStyle = '#d4140a'; ctx2d.lineWidth = 3.5 * dpr; ctx2d.stroke(); ctx2d.setLineDash([]);
          if (Math.hypot(B.x - A.x, B.y - A.y) > 50 * dpr) txt('✂ ' + mm(cl.length), (A.x + B.x) / 2, (A.y + B.y) / 2, upright(Math.atan2(B.y - A.y, B.x - A.x)), 'bold ' + (9 * dpr) + 'px monospace', '#d4140a');
        }));
        polys.forEach(q => flatHit.push({ name: bp.pc.name, poly: q }));
      });
      // d) charnières entre étages (là où la toile reste attachée)
      L.hinges.forEach(h => { const A = toS(h.A), B = toS(h.B);
        ctx2d.beginPath(); ctx2d.moveTo(A.x, A.y); ctx2d.lineTo(B.x, B.y); ctx2d.strokeStyle = '#2c8a3c'; ctx2d.lineWidth = 4 * dpr; ctx2d.stroke(); });
      // e) nœuds N (repères d'alignement sur la structure)
      const seen = new Set();
      const nodeLabels = env.tool().nodeLabels();
      const big = sc * 0.25 > 25 * dpr;
      L.arcs.forEach(s => s.pl.forEach(t => t.pointIds.forEach((id, k) => {
        const v = toS(t.pts[k]), key = id + ':' + Math.round(v.x) + ':' + Math.round(v.y);
        if (seen.has(key)) return; seen.add(key);
        ctx2d.beginPath(); ctx2d.arc(v.x, v.y, 3 * dpr, 0, Math.PI * 2); ctx2d.fillStyle = '#1c1f22'; ctx2d.fill();
        ctx2d.beginPath(); ctx2d.arc(v.x, v.y, 6 * dpr, 0, Math.PI * 2); ctx2d.strokeStyle = 'rgba(28,31,34,0.6)'; ctx2d.lineWidth = 1 * dpr; ctx2d.stroke();
        if (big) txt(nodeLabels.get(id), v.x + 12 * dpr, v.y - 10 * dpr, 0, 'bold ' + (8.5 * dpr) + 'px monospace', '#1c1f22');
      })));
      // f) noms des morceaux
      L.pieces.forEach(p => {
        const c = p.sh.triangles.flatMap(t => t.pts).map(q => toS(p.T(q)));
        const cx = c.reduce((a, v) => a + v.x, 0) / c.length, cy = c.reduce((a, v) => a + v.y, 0) / c.length;
        txt(p.sh.name + ' · ' + gabLabel(p.sh), cx, cy, 0, 'bold ' + (9.5 * dpr) + 'px monospace', '#1c1f22');
      });
      const nP = allPieces().length;
      const tlabel = Peel.TYPES.find(t => t.id === L.type).label;
      const nl = env.tool().nodeLabels();
      document.getElementById('dev2dInfo').textContent = 'Pelure d\'orange — ' + tlabel;
      const hint = document.getElementById('hint2d');
      hint.textContent = 'Pelure d\'orange depuis le sommet · vert = charnière · rouge = morceau traversé par une fente (✂ = où le couper) · molette = zoom (cotes, nœuds N, côtés A/B) · glisser = déplacer · double-clic = recadrer · clic = fiche' +
        (L.overlap > 1e-6 ? ' · ⚠ recouvrement à plat ' + mm(L.overlap) + ' mm' : '');
      hint.style.color = (L.overlap > 1e-6 || L.broken.length) ? '#b23a2f' : '';
      const el = document.getElementById('panelsReadout');
      el.style.display = '';
      const slitTxt = L.slitsPerBand.slice(1).map((n, k) => 'étage ' + (k + 1) + ' : ' + n).join(' · ');
      el.innerHTML = '<div class="sheet-head"><b>Pelure d\'orange — ' + tlabel + ' — ' + nP + ' morceaux, ' + env.gabGroups().length + ' gabarits</b> <a class="help-q" data-help="aide-modes" title="Explication">?</a></div>' +
        '<div class="muted">Comme une peau d\'orange qu\'on déroule depuis le haut : le sommet reste au centre ; chaque étage est fendu aux <b>fentes</b>, et chaque arc pend sous l\'étage du dessus, accroché par <b>une seule arête</b> (trait vert). ' +
        'À plat, le reste de chaque couture d\'étage s\'ouvre en éventail ; il se referme quand on pose la toile sur le dôme. Fentes par étage — ' + slitTxt + '.</div>' +
        (L.broken.length ? '<div class="bad" style="margin-top:4px">⚠ ' + L.broken.length + ' morceau(x) traversé(s) par une fente : ' +
          L.broken.map(bp => '<span class="piece-chip" data-piece="' + bp.pc.name + '">' + bp.pc.name + '</span> (' + bp.cutLines.map(c => '✂ ' + nl.get(c.ids[0]) + '–' + nl.get(c.ids[1]) + ', ' + mm(c.length) + ' mm').join(' ; ') + ')').join(' ') +
          '. La découpe n\'est pas changée : pour utiliser cette ouverture, il faudrait couper ces morceaux le long de la ligne rouge ✂ (une couture de plus chacune). Leurs marges ne sont pas dessinées ici.</div>'
          : '<div class="muted" style="margin-top:4px">✓ Toutes les fentes passent entre deux morceaux : aucun gabarit à casser.</div>') +
        '<div class="muted" style="margin-top:4px"><b>Pour poser</b> : présenter le sommet, caler chaque point noir sur son nœud N, puis descendre étage par étage depuis les charnières vertes en refermant chaque éventail. ' +
        '<b>Recouvrement</b> : là où deux contours de coupe se superposent (zone plus foncée), le côté <b>A</b> passe sur le côté <b>B</b>, comme des tuiles. ' +
        'Pointillés = montants sous la toile (plis). Bords : <span class="k-etage">■</span> couture d\'étage · <span class="k-montante">■</span> coupe montante · <span class="k-fermeture">■</span> fermeture · <span class="k-ourlet">■</span> ourlet. Cotes nettes en mm.</div>' +
        '<div class="muted" style="margin-top:4px">Contrôles : triangles sans recouvrement à plat ' + (L.overlap > 1e-6 ? '<span class="bad">✗ ' + mm(L.overlap) + ' mm</span>' : '✓') + ' · morceaux entiers replacés exactement ' + (L.maxFit < 1e-6 ? '✓' : '<span class="bad">✗ ' + (L.maxFit * 1000).toFixed(3) + ' mm</span>') + '.</div>';
      el.querySelectorAll('.help-q[data-help]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); showView('info'); const d = document.getElementById('aide-modes'); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }));
    }
    function render2DFlat(){
      if (!ensureEtages()) { drawBusy('Recherche du découpage « moins de toile »', env.optim() ? env.optim().progress : 0, env.optim() ? env.optim().text : ''); return; }
      if (fabricationGate()) return;
      const peel = peelStrategy();
      document.getElementById('peelTypeBox').style.display = peel ? '' : 'none';
      let peelOk = peel;
      if (peel) { syncPeelMenu(); const L = buildPeelLayout(); if (L.overlap > 0.001) peelOk = false; }
      document.getElementById('peelTypeBox').style.display = peelOk ? '' : 'none';
      if (peelOk) render2DPeel();
      else { render2DFlatRows(); if (peel) document.getElementById('panelsReadout').insertAdjacentHTML('afterbegin', '<div class="ds-warn" style="color:#b23a2f;margin-bottom:6px">Pour ce dôme, la pelure d\'orange se recouvrirait à plat (étages trop refermés sous l\'équateur) : affichage par rangée.</div>'); }
    }

    return {
      renderFlat: render2DFlat, renderRoll: render2DRoll,
      flatHits: () => flatHit, rollHits: () => rollHit,
      resetPeel: () => { peelLayout = null; },
      preferPeel: type => { peelPref = type; peelLayout = null; }
    };
  }
  const View2D = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = View2D;
  else global.View2D = View2D;
})(typeof window !== 'undefined' ? window : globalThis);
