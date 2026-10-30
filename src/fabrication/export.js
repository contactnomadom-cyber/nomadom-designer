
// ---------------------------------------------------------
// export.js — Étape 8 : fiches de traçage à la main (impression / PDF)
// Logique pure : prend des fiches patron (pieceSheet + applyAllowances)
// et renvoie une page HTML imprimable (A4 portrait, une page par morceau).
// ---------------------------------------------------------
(function (global) {
  'use strict';

  const mm = v => Math.round(v * 1000);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function rollPoint(pl, p, selvage) {
    return { x: pl.x + (pl.rot ? pl.L - p.x : p.x), y: (selvage || 0) + pl.y + (pl.rot ? pl.W - p.y : p.y) };
  }
  const SIDE_TXT = { A: 'A (recouvrant)', B: 'B (recouvert)', H: 'ourlet' };

  // étiquette P d'un point 2D (les sommets des triangles sont tous sur le contour)
  function labelOf(sheet, p) {
    let best = null, bd = Infinity;
    sheet.points.forEach(q => { const d = d2(p, q); if (d < bd) { bd = d; best = q; } });
    return best;
  }

  // Méthode des triangles : on trace une première ligne, puis chaque nouveau
  // point se trouve à l'intersection de deux arcs (deux longueurs au ruban)
  // depuis deux points déjà tracés. On suit l'ordre de la bande.
  function triangulationSteps(sheet) {
    const steps = [];
    const placed = new Set();
    const t0 = sheet.triangles[0];
    const pts0 = t0.pts.map(p => labelOf(sheet, p));
    // base : les deux sommets les plus bas du premier triangle (presque parallèle au rouleau)
    // base : le côté du premier triangle le plus parallèle au rouleau
    let bi = 0, bslope = Infinity;
    for (let k = 0; k < 3; k++) {
      const u = pts0[k], v = pts0[(k + 1) % 3], sl = Math.abs(v.y - u.y) / (d2(u, v) || 1);
      if (sl < bslope) { bslope = sl; bi = k; }
    }
    let a = pts0[bi], b = pts0[(bi + 1) % 3]; const c = pts0[(bi + 2) % 3];
    if (a.x > b.x) [a, b] = [b, a];
    steps.push({ kind: 'base', a, b, len: d2(a, b) });
    placed.add(a.label); placed.add(b.label);
    const above = ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) > 0;
    steps.push({ kind: 'point', p: c, from: [[a, d2(a, c)], [b, d2(b, c)]], tri: t0.idx, sideText: above ? 'du côté opposé à la lisière' : 'du côté de la lisière' });
    placed.add(c.label);
    for (let i = 1; i < sheet.triangles.length; i++) {
      const t = sheet.triangles[i];
      const ps = t.pts.map(p => labelOf(sheet, p));
      const fresh = ps.filter(p => !placed.has(p.label));
      const known = ps.filter(p => placed.has(p.label));
      if (fresh.length === 1 && known.length === 2) {
        const p = fresh[0];
        // le nouveau point est de l'autre côté de la ligne (connu1–connu2) que le
        // 3e sommet du triangle déjà tracé qui partage ces deux points
        let opp = null;
        for (let j = i - 1; j >= 0 && !opp; j--) {
          const q = sheet.triangles[j].pts.map(v => labelOf(sheet, v));
          if (q.some(v => v.label === known[0].label) && q.some(v => v.label === known[1].label)) opp = q.find(v => v.label !== known[0].label && v.label !== known[1].label);
        }
        steps.push({ kind: 'point', p, from: known.map(k => [k, d2(k, p)]), tri: t.idx, opp });
        placed.add(p.label);
      } else if (fresh.length === 0) {
        // dernier triangle d'un anneau : rien de nouveau, contrôle seulement
        steps.push({ kind: 'check', a: ps[0], b: ps[1], c: ps[2], tri: t.idx });
      }
    }
    return steps;
  }

  // mesures de contrôle : les plus grandes distances entre points du contour
  function controlMeasures(sheet) {
    const P = sheet.points, res = [];
    const byX = P.slice().sort((p, q) => p.x - q.x);
    const first = byX[0], last = byX[byX.length - 1];
    res.push({ a: first, b: last, len: d2(first, last), why: 'longueur totale' });
    let best = null;
    P.forEach(p => P.forEach(q => { if (p !== q && (!best || d2(p, q) > best.len) && !(p === first && q === last) && !(p === last && q === first)) best = { a: p, b: q, len: d2(p, q) }; }));
    if (best) res.push(Object.assign(best, { why: 'grande diagonale' }));
    return res;
  }

  // ---------- schéma SVG étiqueté (pas à l'échelle 1:1) ----------
  function pieceSvg(sheet, W, H) {
    const pad = 46;
    const sc = Math.min((W - 2 * pad) / sheet.cutLength, (H - 2 * pad) / sheet.cutWidth);
    const ox = (W - sheet.cutLength * sc) / 2, oy = (H + sheet.cutWidth * sc) / 2;
    const S = p => ({ x: ox + p.x * sc, y: oy - p.y * sc });
    const f = v => v.toFixed(1);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block">`;
    s += `<polygon points="${sheet.cut.map(S).map(v => f(v.x) + ',' + f(v.y)).join(' ')}" fill="#fff" stroke="#000" stroke-width="1.4"/>`;
    sheet.triangles.forEach(t => {
      const q = t.pts.map(S);
      s += `<polygon points="${q.map(v => f(v.x) + ',' + f(v.y)).join(' ')}" fill="#eef2f6" stroke="none"/>`;
      const c = { x: (q[0].x + q[1].x + q[2].x) / 3, y: (q[0].y + q[1].y + q[2].y) / 3 };
      s += `<text x="${f(c.x)}" y="${f(c.y)}" class="tri">#${t.idx}</text>`;
    });
    sheet.folds.forEach(fl => { const A = S(fl.A), B = S(fl.B);
      s += `<line x1="${f(A.x)}" y1="${f(A.y)}" x2="${f(B.x)}" y2="${f(B.y)}" stroke="#777" stroke-width="0.8" stroke-dasharray="4 3"/>`; });
    const n = sheet.points.length;
    sheet.edges.forEach((e, i) => {
      const A = S(sheet.points[i]), B = S(sheet.points[(i + 1) % n]);
      s += `<line x1="${f(A.x)}" y1="${f(A.y)}" x2="${f(B.x)}" y2="${f(B.y)}" stroke="#000" stroke-width="1" stroke-dasharray="6 2 1 2"/>`;
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
      if (L < 46) return;
      const nx = -dy / L, ny = dx / L, off = e.allowance * sc + 9;
      let ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
      const m = { x: (A.x + B.x) / 2 + nx * off, y: (A.y + B.y) / 2 + ny * off };
      const txt = mm(e.length) + (e.other ? ' ↔ ' + e.other : (e.kind === 'ourlet' ? ' ourlet' : e.kind === 'fermeture' ? ' fermeture' : '')) + (e.side !== 'H' ? ' · ' + e.side : '');
      s += `<text x="${f(m.x)}" y="${f(m.y)}" transform="rotate(${ang.toFixed(1)} ${f(m.x)} ${f(m.y)})" class="edge">${esc(txt)}</text>`;
    });
    sheet.points.forEach((p, i) => {
      const v = S(p), prev = S(sheet.points[(i - 1 + n) % n]), next = S(sheet.points[(i + 1) % n]);
      const u1 = { x: prev.x - v.x, y: prev.y - v.y }, u2 = { x: next.x - v.x, y: next.y - v.y };
      const l1 = Math.hypot(u1.x, u1.y) || 1, l2 = Math.hypot(u2.x, u2.y) || 1;
      let bx = u1.x / l1 + u2.x / l2, by = u1.y / l1 + u2.y / l2, bl = Math.hypot(bx, by);
      if (bl < 1e-6) { bx = -u2.y; by = u2.x; bl = Math.hypot(bx, by) || 1; }
      bx /= bl; by /= bl; if (p.angle > 180) { bx = -bx; by = -by; }
      s += `<circle cx="${f(v.x)}" cy="${f(v.y)}" r="2.2" fill="#000"/>`;
      s += `<text x="${f(v.x - bx * 15)}" y="${f(v.y - by * 15)}" class="pt">${p.label}</text>`;
      s += `<text x="${f(v.x - bx * 15)}" y="${f(v.y - by * 15 + 9)}" class="node">${p.node}</text>`;
    });
    // flèche du rouleau + repères
    s += `<g class="roll"><line x1="${W - 150}" y1="${H - 10}" x2="${W - 20}" y2="${H - 10}" stroke="#2b5a8a" stroke-width="1.2" marker-end="url(#arr)"/>` +
         `<text x="${W - 85}" y="${H - 15}" class="note">sens du rouleau</text></g>`;
    s += `<text x="12" y="16" class="note" text-anchor="start">↑ côté sommet du dôme · ENDROIT (vu de l'extérieur)</text>`;
    s += `<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#2b5a8a"/></marker></defs>`;
    return s + '</svg>';
  }

  // ---------- une page par morceau / gabarit ----------
  // Traçage avec des outils simples : une corde (ou un ruban) tenue à un point
  // sert de compas. Chaque point = croisement de deux arcs.
  const CHORD_R = 0.3; // contrôle d'angle : marques à 300 mm du sommet sur chaque bord
  function couponLength(sheet) { return Math.ceil(sheet.cutLength * 100 + 1e-9) / 100; } // arrondi au cm supérieur

  function piecePage(sheet, meta, group) {
    const steps = triangulationSteps(sheet);
    const ctrl = controlMeasures(sheet);
    const P = sheet.points, nP = P.length;
    const sel = meta.selvage || 0;
    const L = couponLength(sheet);
    // repère du coupon : K1 = coin bas-gauche, K2 = coin bas-droit, sur la lisière (bord de référence)
    const onCoupon = p => ({ x: p.x, y: p.y + sel });
    const K1 = { x: 0, y: 0 }, K2 = { x: L, y: 0 };
    const title = group ? `Gabarit ${esc(group.id)} <span class="times">× ${group.members.length}</span>` : `Morceau ${esc(sheet.name)}`;
    let h = `<section class="page"><header><div><h1>${title}</h1>` +
      `<div class="sub">${esc(meta.dome)} · ${esc(meta.structure)}${group ? ' · tracé ci-dessous : morceau ' + esc(sheet.name) : ''}</div></div>` +
      `<div class="kpi"><div>Coupon <b>${mm(L)} mm</b> de rouleau</div><div>Coupe ${mm(sheet.cutLength)} × ${mm(sheet.cutWidth)} mm · ${sheet.triangles.length} △</div>` +
      (sheet.closedRing ? '<div><b>Anneau</b> : les 2 extrémités se recousent</div>' : '') + `</div></header>`;

    // coupon à découper
    const n = group ? group.members.length : 1;
    h += `<div class="rollbox"><b>1. Couper le coupon</b> : dérouler et couper <b>${mm(L)} mm</b> de rouleau, sur toute la laize (${esc(meta.laize).replace(/ \(utile .*\)/, '')}).` +
      (n > 1 ? ` Il en faut <b>${n}</b> pour ce gabarit, soit <b>${(n * L).toFixed(2).replace('.', ',')} m</b> au total.` : '') +
      ` La lisière du bas sert de <b>bord de référence</b> ; le morceau occupe ${mm(sheet.cutWidth)} mm de haut, à partir de ${mm(sel)} mm de ce bord.</div>`;
    if (group && group.members.length > 1) {
      h += `<div class="gabbox"><b>Morceaux tracés avec ce gabarit :</b> ` +
        group.members.map(m => `<b>${esc(m.sheet.name)}</b>${m.mirrored ? ' (gabarit <b>retourné</b> ⇋)' : ''}`).join(', ') +
        `. Les voisins à coudre diffèrent d'un morceau à l'autre : voir la synthèse.</div>`;
    }
    h += `<div class="fig">${pieceSvg(sheet, 720, 185)}</div>`;
    h += `<div class="legend">Trait plein = coupe · trait mixte = ligne de couture (points P) · pointillé = pli au droit d'un montant · ↔ = morceau voisin à coudre · A/B = côté recouvrant/recouvert. Schéma non à l'échelle.</div>`;

    // ---- 2. ligne de couture : deux méthodes croisées ----
    const XY = p => { const q = onCoupon(p); return `X <b>${mm(q.x)}</b> · Y <b>${mm(q.y)}</b>`; };
    h += `<h2>2. Tracer la ligne de couture — deux méthodes croisées</h2>`;
    h += `<div class="tip"><b>Corde</b> : corde fixée sur un point, tendue à la longueur indiquée → arc ; même chose depuis le second point ; le point est au croisement des deux arcs, du côté indiqué. ` +
      `<b>Équerre</b> : mesurer <b>X</b> le long de la lisière depuis K1, puis <b>Y</b> perpendiculairement à la lisière. ` +
      `Faire les deux : les deux marques doivent tomber au même endroit (écart ≤ 5 mm). Sinon, voir « En cas d'écart ».</div>`;
    h += `<table class="steps-x${steps.length > 16 ? ' long' : ''}"><tr><th>Point</th><th>Méthode corde (2 arcs)</th><th>Méthode équerre (depuis K1)</th></tr>`;
    h += `<tr><td>K1, K2</td><td colspan="2">Les deux coins du coupon le long de la lisière du bas : K1 à gauche, K2 à droite, à ${mm(L)} mm. K1 est l'origine (X = 0, Y = 0).</td></tr>`;
    steps.forEach(st => {
      if (st.kind === 'base') {
        const A = onCoupon(st.a), B = onCoupon(st.b);
        h += `<tr><td><b>${st.a.label}</b></td><td><b>${mm(d2(K1, A))}</b> de K1 · <b>${mm(d2(K2, A))}</b> de K2 <span class="muted">(dans la toile)</span></td><td>${XY(st.a)}</td></tr>`;
        h += `<tr><td><b>${st.b.label}</b></td><td><b>${mm(d2(K1, B))}</b> de K1 · <b>${mm(d2(K2, B))}</b> de K2 <span class="muted">· contrôle ${st.a.label}–${st.b.label} = ${mm(st.len)}</span></td><td>${XY(st.b)}</td></tr>`;
      } else if (st.kind === 'point') {
        const side = st.opp ? 'opposé à ' + st.opp.label : (st.sideText || '').replace('du côté ', '');
        h += `<tr><td><b>${st.p.label}</b></td><td><b>${mm(st.from[0][1])}</b> de ${st.from[0][0].label} · <b>${mm(st.from[1][1])}</b> de ${st.from[1][0].label} <span class="muted">→ ${side}</span></td><td>${XY(st.p)}</td></tr>`;
      } else h += `<tr class="muted"><td>△#${st.tri}</td><td colspan="2">déjà tracé — contrôle ${st.a.label}–${st.b.label} = ${mm(d2(st.a, st.b))}</td></tr>`;
    });
    h += `</table>`;

    h += `<div class="cols"><div>`;
    h += `<h3>En cas d'écart entre les deux marques</h3><div class="tip">` +
      `• La <b>corde</b> garde les bonnes longueurs entre points voisins, mais une erreur se reporte sur tous les points suivants. ` +
      `• L'<b>équerre</b> place chaque point indépendamment depuis la lisière, sans accumuler d'erreur, mais une équerre mal tenue fausse surtout les grands Y. ` +
      `→ Si l'écart dépasse 5 mm : refaire les deux mesures. S'il persiste, garder le point <b>équerre</b> et vérifier au ruban la longueur des bords qui y arrivent (colonne corde). ` +
      `Perpendiculaire sans équerre : règle <b>3-4-5</b> (60 cm sur la lisière, 80 cm vers le haut, la diagonale doit faire 100 cm).</div>`;
    h += `<div class="tip">Relier les points voisins au cordeau (corde tendue) : c'est la ligne de couture.</div>`;
    h += `<h3>Contrôles des longueurs</h3><table>` + ctrl.map(c => `<tr><td>${c.a.label} – ${c.b.label}</td><td><b>${mm(c.len)} mm</b></td><td class="muted">${c.why}</td></tr>`).join('') + `</table>`;
    const angRows = P.filter(p => Math.abs(p.angle - 180) > 10);
    h += `<h3>Contrôle des angles (à la corde)</h3><div class="tip">Depuis le point, marquer ${mm(CHORD_R)} mm sur chacun des deux bords. L'écart entre les deux marques doit faire la valeur indiquée. Les points non listés sont presque alignés (170° à 190°) : contrôle à la règle.</div>`;
    h += `<table class="small"><tr><th>Point</th><th>Angle</th><th>Écart à ${mm(CHORD_R)} mm</th></tr>` +
      angRows.map(p => `<tr><td>${p.label}</td><td>${p.angle.toFixed(1)}°${p.angle > 180 ? ' (rentrant)' : ''}</td><td><b>${mm(2 * CHORD_R * Math.sin(p.angle * Math.PI / 360))} mm</b></td></tr>`).join('') + `</table>`;
    h += `</div><div>`;

    // ---- 3. marges et trait de coupe ----
    h += `<h2>3. Ajouter les marges</h2><table><tr><th>Bords</th><th>Long.</th><th>Marge</th><th>À coudre avec</th></tr>`;
    const groups = [];
    sheet.edges.forEach(e => {
      const key = e.side + '|' + e.allowance + '|' + (e.other || e.kind);
      const g = groups[groups.length - 1];
      if (g && g.key === key) { g.to = e.to; g.len += e.length; g.n++; } else groups.push({ key, from: e.from, to: e.to, len: e.length, n: 1, e });
    });
    groups.forEach(g => {
      const e = g.e;
      h += `<tr><td>${g.from}→${g.to}${g.n > 1 ? ' <span class="muted">(' + g.n + ' bords)</span>' : ''}</td><td>${mm(g.len)}</td><td><b>${mm(e.allowance)}</b> ${SIDE_TXT[e.side]}</td><td>${e.other ? '<b>' + esc(e.other) + '</b>' : (e.kind === 'ourlet' ? 'bas du dôme' : 'lui-même (anneau)')}</td></tr>`;
    });
    h += `</table><div class="tip">Le plus simple : tracer chaque marge en parallèle à la ligne de couture (deux marques à la règle, reliées au cordeau), puis prolonger jusqu'aux croisements. Les points C ci-dessous servent à vérifier les coins.</div>`;
    h += `<h3>Trait de coupe (points C) — deux méthodes</h3>`;
    h += `<table class="small"><tr><th>Point</th><th>Corde (dehors du bord)</th><th>Équerre</th></tr>`;
    sheet.cut.forEach((c, i) => {
      const near = P.map(p => ({ p, d: d2(p, c) })).sort((u, v) => u.d - v.d);
      const a = near[0].p, ia = P.indexOf(a);
      const nb = [P[(ia + 1) % nP], P[(ia - 1 + nP) % nP]].sort((u, v) => d2(u, c) - d2(v, c))[0];
      h += `<tr><td>C${i + 1}</td><td><b>${mm(d2(a, c))}</b> de ${a.label} · <b>${mm(d2(nb, c))}</b> de ${nb.label}</td><td>${XY(c)}</td></tr>`;
    });
    h += `</table>`;
    h += `</div></div>`;
    h += `<footer>${esc(meta.seams)} · Nomad'Om Designer Beta · ${esc(meta.date)}</footer></section>`;
    return h;
  }

  // ---------- page de synthèse (export complet) ----------
  function rollSvg(roll, meta, W) {
    const seg = 10, nSeg = Math.ceil(roll.length / seg), fw = meta.fabricW;
    const sc = (W - 40) / seg, rowH = fw * sc, gap = 22;
    const H = nSeg * (rowH + gap) + 6;
    const f = v => v.toFixed(1);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block">`;
    for (let k = 0; k < nSeg; k++) {
      const x0 = k * seg, top = 4 + k * (rowH + gap), segLen = Math.min(seg, roll.length - x0);
      const S = p => ({ x: 20 + (p.x - x0) * sc, y: top + (fw - (meta.selvage || 0) - p.y) * sc });
      s += `<clipPath id="c${k}"><rect x="20" y="${f(top)}" width="${f(segLen * sc)}" height="${f(rowH)}"/></clipPath>`;
      s += `<rect x="20" y="${f(top)}" width="${f(segLen * sc)}" height="${f(rowH)}" fill="#f4f1ea" stroke="#888" stroke-width="0.8"/>`;
      s += `<g clip-path="url(#c${k})">`;
      roll.placed.forEach(pl => {
        const xs = pl.poly.map(q => q.x), mn = Math.min(...xs), mx = Math.max(...xs);
        if (mx < x0 || mn > x0 + seg) return;
        s += `<polygon points="${pl.poly.map(S).map(v => f(v.x) + ',' + f(v.y)).join(' ')}" fill="#dde6ee" stroke="#000" stroke-width="0.8"/>`;
        const c = S({ x: (mn + mx) / 2, y: pl.y + pl.W / 2 });
        const cx = Math.max(34, Math.min(20 + segLen * sc - 14, c.x));
        s += `<text x="${f(cx)}" y="${f(c.y)}" class="pt">${esc(pl.name)}${pl.rot ? ' ↻' : ''}</text>`;
      });
      s += `</g>`;
      for (let m = 0; m <= segLen + 1e-9; m += 1) {
        const x = 20 + m * sc;
        s += `<line x1="${f(x)}" y1="${f(top + rowH)}" x2="${f(x)}" y2="${f(top + rowH + 3)}" stroke="#666" stroke-width="0.6"/>`;
        if (m % 2 === 0) s += `<text x="${f(x)}" y="${f(top + rowH + 10)}" class="node">${x0 + m} m</text>`;
      }
    }
    return s + '</svg>';
  }

  function summaryPage(sheets, meta) {
    const gabs = meta.gabarits;
    let h = `<section class="page"><header><div><h1>Toile de dôme — fiches de traçage</h1><div class="sub">${esc(meta.dome)} · ${esc(meta.structure)}</div></div>` +
      `<div class="kpi"><div><b>${sheets.length}</b> morceaux${gabs ? ` · <b>${gabs.length}</b> gabarits` : ''}</div><div>Toile coupée <b>${sheets.reduce((s, x) => s + x.cutArea, 0).toFixed(1)} m²</b></div>` +
      `<div>Laize ${esc(meta.laize)}</div></div></header>`;
    h += `<p class="sub">${esc(meta.seams)}. Toutes les cotes en mm. Les nœuds N1…Nn sont numérotés du sommet vers la base : deux bords à coudre ensemble portent les mêmes nœuds à leurs extrémités.</p>`;
    if (gabs) {
      h += `<h2>Gabarits</h2><table><tr><th>Gabarit</th><th>À couper</th><th>Morceaux</th><th>△</th><th>Coupons (mm)</th></tr>` +
        gabs.map(g => `<tr><td><b>${esc(g.id)}</b></td><td><b>×${g.members.length}</b></td><td>${g.members.map(m => esc(m.sheet.name) + (m.mirrored ? ' ⇋' : '')).join(', ')}</td><td>${g.ref.triangles.length}</td><td>${g.members.length} × ${mm(couponLength(g.ref))}</td></tr>`).join('') +
        `</table><h2>Morceaux et assemblage</h2>`;
    }
    const totCoupons = sheets.reduce((a, x) => a + couponLength(x), 0);
    h += `<p class="sub">Coupons à découper : <b>${sheets.length}</b>, pour une longueur totale de <b>${totCoupons.toFixed(2).replace('.', ',')} m</b> de rouleau si chaque morceau est coupé dans son propre coupon.</p>`;
    h += `<table><tr><th>Morceau</th>${gabs ? '<th>Gabarit</th>' : ''}<th>△</th><th>Coupon (mm)</th><th>Coupe (mm)</th><th>m²</th><th>Voisins à coudre</th></tr>`;
    sheets.forEach(sh => {
      const nb = [...new Set(sh.edges.filter(e => e.other).map(e => e.other))];
      h += `<tr><td><b>${esc(sh.name)}</b>${sh.closedRing ? ' (anneau)' : ''}</td>${gabs ? `<td>${esc(sh.gabarit || '')}${sh.gabMirror ? ' ⇋' : ''}</td>` : ''}<td>${sh.triangles.length}</td><td><b>${mm(couponLength(sh))}</b></td><td>${mm(sh.cutLength)} × ${mm(sh.cutWidth)}</td><td>${sh.cutArea.toFixed(2)}</td><td>${nb.map(esc).join(', ')}${sh.edges.some(e => e.kind === 'ourlet') ? (nb.length ? ' · ' : '') + 'ourlet bas' : ''}</td></tr>`;
    });
    h += `</table><footer>Nomad'Om Designer Beta · ${esc(meta.date)}</footer></section>`;
    return h;
  }

  const CSS = `
    @page { size: A4 portrait; margin: 10mm; }
    *{ box-sizing: border-box; }
    body{ font-family: "IBM Plex Sans","Segoe UI",Arial,sans-serif; font-size: 8.8pt; color:#111; margin:0; background:#fff; }
    .page{ page-break-after: always; break-after: page; padding: 0; }
    .page:last-child{ page-break-after: auto; break-after: auto; }
    header{ display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #111; padding-bottom: 4px; margin-bottom: 6px; gap: 12px; }
    h1{ font-size: 17pt; margin:0; letter-spacing:.02em; }
    h2{ font-size: 10pt; margin: 5px 0 2px; border-bottom: 1px solid #999; }
    h3{ font-size: 9pt; margin: 4px 0 1px; }
    .sub{ color:#444; font-size: 9pt; }
    .kpi{ text-align:right; font-size: 9pt; } .kpi b{ font-size: 10.5pt; }
    .fig{ border: 1px solid #ccc; margin: 4px 0; }
    .legend, .tip{ font-size: 7.6pt; color:#444; margin: 2px 0 4px; }
    .cols{ display:grid; grid-template-columns: 1fr 1.15fr; gap: 0 14px; }
    table{ border-collapse: collapse; width: 100%; } th, td{ text-align:left; padding: 1.5px 4px; border-bottom: 0.5px solid #ddd; font-weight: normal; }
    th{ color:#555; border-bottom: 1px solid #888; } table.small td, table.small th{ padding: 1px 4px; font-size: 8.5pt; }
    table.steps-x td, table.steps-x th{ padding: 1px 6px 1px 0; font-size: 8.6pt; } table.steps-x.long td{ font-size: 8pt; padding: 1px 6px 1px 0; }
    ol.steps{ margin: 0; padding-left: 24px; font-size: 9pt; } ol.steps li{ margin: 0.5px 0; } ol.steps.long{ font-size: 8pt; }
    .muted{ color:#777; }
    .rollbox{ margin: 2px 0 4px; padding: 3px 6px; background: #eef4ea; border-left: 3px solid #5c8a4a; font-size: 9pt; }
    .gabbox{ margin: 2px 0 4px; padding: 3px 6px; background: #f3eefa; border-left: 3px solid #8a4fb0; font-size: 9pt; }
    h1 .times{ font-size: 13pt; color:#8a4fb0; }
    footer{ margin-top: 6px; font-size: 7.5pt; color:#777; border-top: 0.5px solid #bbb; padding-top: 2px; }
    svg text{ font-family: "IBM Plex Mono",Consolas,monospace; text-anchor: middle; dominant-baseline: middle; }
    svg .pt{ font-size: 10px; font-weight: 700; } svg .node{ font-size: 7.5px; fill:#555; }
    svg .edge{ font-size: 8px; } svg .tri{ font-size: 7px; fill:#9aa; } svg .note{ font-size: 8.5px; fill:#2b5a8a; }
    @media screen{ body{ background:#e8e8e8; } .page{ background:#fff; width: 190mm; margin: 8mm auto; padding: 8mm; box-shadow: 0 1px 4px rgba(0,0,0,.2); } }
  `;

  function tracingDocument(sheets, meta, withSummary) {
    const pages = meta.gabarits
      ? meta.gabarits.map(g => piecePage((g.members.find(m => !m.mirrored) || g.members[0]).sheet, meta, g))
      : sheets.map(s => piecePage(s, meta));
    const body = (withSummary ? summaryPage(sheets, meta) : '') + pages.join('');
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(meta.title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
  }

  const Export = { couponLength, tracingDocument, triangulationSteps, controlMeasures, pieceSvg };
  if (typeof module !== 'undefined' && module.exports) module.exports = Export;
  else global.CoverExport = Export;
})(typeof window !== 'undefined' ? window : globalThis);
