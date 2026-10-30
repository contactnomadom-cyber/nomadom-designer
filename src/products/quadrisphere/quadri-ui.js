
// ---------------------------------------------------------
// quadri-ui.js — onglet Quadrisphère : réglages, chiffres clés, débit,
// et rendu Three.js dans le même esprit que l'onglet Design :
// PBR (bois veiné, acier, thermolaqué noir, toile), ciel physique (Sky),
// éclairage d'ambiance (RoomEnvironment), ombres douces PCF, tons ACES.
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const $q = id => document.getElementById(id);
  const G = global.QuadriGeom;
  if (!G || !$q('viewQuadri')) return;

  const st = { side: 5, nu: 3, arch: 1.6, k: 1.5, lintel: false, mode: 'hub', mat: 'wood', b: 140, h: 70, hub: 120,
    style: 'real', colors: false, cover: false, person: true };
  const memo = { wood: { b: 140, h: 70, hub: 120 }, steel: { b: 60, h: 3, hub: 60 } };
  let dome = null;
  const fmt = (x, d = 0) => x.toLocaleString('fr-BE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const tName = i => 'D' + (i + 1);
  const tColor = (i, n) => 'hsl(' + Math.round((i * 360 / Math.max(n, 1) + 200) % 360) + ', 55%, 50%)';
  const tubeSide = () => st.mat === 'wood' ? st.b : st.b; // largeur dans le plan du dôme
  const tubeDepth = () => st.mat === 'wood' ? st.h : st.b; // épaisseur radiale
  const massPerM = () => st.mat === 'wood' ? st.b * st.h * 1e-6 * 470 : (st.b * st.b - Math.pow(st.b - 2 * st.h, 2)) * 1e-6 * 7850;

  function compute() {
    dome = G.computeDome({ side: st.side, nu: st.nu, archRatio: st.side > 0 ? st.arch / st.side : 0, k: st.k, lintel: st.lintel, b: tubeSide(), hub: st.hub });
  }

  // ---------------- tableaux ----------------
  function renderTables() {
    const d = dome, ns = d.struts.length, mpm = massPerM();
    $q('qdStatV').textContent = d.V.length; $q('qdStatE').textContent = ns; $q('qdStatH').textContent = fmt(d.H, 2) + ' m';
    $q('qdInfo3d').textContent = st.nu + 'V · ' + fmt(st.side, 1) + ' × ' + fmt(st.side, 1) + ' m · ' + (st.mode === 'hub' ? 'avec connecteur' : 'sans connecteur');
    const totHub = d.struts.reduce((s, x) => s + x.hubLen, 0), totGk = d.struts.reduce((s, x) => s + x.gkLen, 0);
    const feet = d.isSupport.filter(Boolean).length, joints = d.struts.reduce((s, x) => s + (x.ea.free ? 0 : 1) + (x.eb.free ? 0 : 1), 0);
    const rows = [
      ['Types de barres', d.hubTypes.length, d.gkTypes.length],
      ['Connecteurs', (d.V.length - feet) + ' + ' + feet + ' pieds', '0 + ' + feet + ' pieds'],
      ['Types de connecteurs', d.nodeTypes.size, '–'],
      ['Assemblages barre/barre', '–', joints],
      ['Longueur totale', fmt(totHub, 1) + ' m', fmt(totGk, 1) + ' m'],
      ['Poids des barres', fmt(totHub * mpm, 0) + ' kg', fmt(totGk * mpm, 0) + ' kg'],
      ['Boulons (2 par about)', ns * 4, ns * 4]
    ];
    const cur = st.mode === 'hub' ? 1 : 2;
    let h = '<div class="kpi-grid" style="margin-bottom:10px"><span>Ø sphère</span><b>' + fmt(2 * d.R, 2) + ' m</b><span>Faîte</span><b>' + fmt(d.H, 2) + ' m</b><span>Nœuds d\'arche</span><b>' + fmt(d.archMin, 2) + ' m</b><span>Emprise</span><b>' + fmt(st.side, 1) + ' × ' + fmt(st.side, 1) + ' m</b></div>';
    h += '<table class="compare" style="border-collapse:collapse;width:100%"><tr><th style="text-align:left;color:var(--ink-dim);font-weight:normal;border-bottom:1px solid var(--line);padding:4px 8px 4px 0"></th><th style="text-align:right;color:var(--ink-dim);font-weight:normal;border-bottom:1px solid var(--line);padding:4px 8px">Avec connecteur</th><th style="text-align:right;color:var(--ink-dim);font-weight:normal;border-bottom:1px solid var(--line);padding:4px 0 4px 8px">Sans connecteur</th></tr>';
    rows.forEach(r => { h += '<tr><td style="padding:4px 8px 4px 0;color:var(--ink-dim)">' + r[0] + '</td>' + [1, 2].map(c => '<td style="text-align:right;padding:4px 8px;' + (c === cur ? 'color:var(--accent);font-weight:700' : '') + '">' + r[c] + '</td>').join('') + '</tr>'; });
    h += '</table><div class="explain" style="margin-top:12px">Avec connecteur, les barres se branchent dans un moyeu comme des fiches dans une multiprise : peu de types. Sans connecteur, chaque barre se boulonne sur le flanc de sa voisine, comme une ronde où chacun tient la main du suivant : pas de moyeu, mais environ deux fois plus de types.</div>';
    $q('qdKpis').innerHTML = h;

    const w = [], maxL = Math.max(...d.struts.map(s => Math.max(s.hubLen, s.gkLen)));
    if (maxL > (st.mat === 'wood' ? 3.0 : 6.0)) w.push('Barre la plus longue ' + fmt(maxL, 2) + ' m : au-delà du débit courant, passer à une fréquence plus haute.');
    if (d.archMin < 1.2 && st.arch > 0) w.push('Nœuds d\'arche à ' + fmt(d.archMin, 2) + ' m : passage bas, monter la hauteur d\'arche.');
    if (st.nu === 4 && st.side < 7) w.push('En 4V sous 7 m d\'entraxe, les arches deviennent irrégulières : 3V est plus adapté.');
    $q('qdWarn').innerHTML = w.length ? '<div class="offset-info"><span class="warn">' + w.join('<br>') + '</span></div>' : '';

    const types = st.mode === 'hub' ? d.hubTypes : d.gkTypes, n = types.length;
    let c = '<h4 style="margin-top:0">LISTE DE DÉBIT — ' + (st.mode === 'hub' ? 'AVEC CONNECTEUR' : 'SANS CONNECTEUR (GOODKARMA)') + '</h4><table><tr>';
    if (st.mode === 'hub') {
      c += '<th>Type</th><th>Qté</th><th>Axe c/c</th><th>Coupe</th><th>Angle axial</th><th>Poids u.</th></tr>';
      types.forEach(([k, idx], i) => { const s = d.struts[idx[0]];
        const ax = [...new Set(idx.flatMap(j => [d.struts[j].axA, d.struts[j].axB]).map(x => x.toFixed(1)))].sort((a, b) => a - b);
        c += '<tr><td><span class="gab-dot" style="background:' + tColor(i, n) + '"></span>' + tName(i) + '</td><td>' + idx.length + '</td><td>' + fmt(s.chord * 1000) + ' mm</td><td><b>' + fmt(s.hubLen * 1000) + ' mm</b></td><td>' + (ax.length > 2 ? ax[0] + '–' + ax[ax.length - 1] : ax.join(' / ')) + '°</td><td>' + fmt(s.hubLen * mpm, 1) + ' kg</td></tr>'; });
      c += '</table><div class="muted" style="margin-top:6px">Coupe = axe centre à centre − 2 × ' + st.hub + ' mm de recul dans le connecteur. About droit ; l\'angle axial se reprend dans le pli des plaques du connecteur.</div>';
    } else {
      c += '<th>Type</th><th>Qté</th><th>Axe c/c</th><th>Coupe</th><th>About A</th><th>About B</th></tr>';
      const ab = e => e.free ? 'droit (rive)' : fmt(e.cut, 1) + '°';
      types.forEach(([k, idx], i) => { const s = d.struts[idx[0]];
        c += '<tr><td><span class="gab-dot" style="background:' + tColor(i, n) + '"></span>' + tName(i) + '</td><td>' + idx.length + '</td><td>' + fmt(s.chord * 1000) + ' mm</td><td><b>' + fmt(s.gkLen * 1000) + ' mm</b></td><td>' + ab(s.ea) + '</td><td>' + ab(s.eb) + '</td></tr>'; });
      c += '</table><div class="muted" style="margin-top:6px">Moulinet : chaque barre est décalée de ' + fmt(tubeSide() / 2) + ' mm à côté du nœud et vient buter contre le flanc de sa voisine, où elle est boulonnée. Angle d\'about mesuré en plan entre les deux barres. Détail du joint GoodKarma à confirmer.</div>';
    }
    $q('qdCut').innerHTML = c;

    const roleFr = { pied: 'Pied (platine au sol)', sommet: 'Sommet', rive: 'Rive d\'arche', courant: 'Courant' };
    let nh = '<h4 style="margin-top:0">NŒUDS</h4><table><tr><th>Connecteur</th><th>Rôle</th><th>Qté</th><th>Branches</th><th>Hauteur</th></tr>';
    [...d.nodeTypes.entries()].sort((a, b) => d.V[b[1][0]][2] - d.V[a[1][0]][2]).forEach(([sig, idx], i) => { const p = sig.split('|');
      nh += '<tr><td>C' + (i + 1) + '</td><td>' + roleFr[p[0]] + '</td><td>' + idx.length + '</td><td>' + p[1] + '</td><td>' + fmt(d.V[idx[0]][2], 2) + ' m</td></tr>'; });
    nh += '</table><div class="muted" style="margin-top:6px">Pré-dimensionnement géométrique. Sections, ancrage et tenue au vent à valider par un calcul de structure avant fabrication en série.</div>';
    $q('qdNodes').innerHTML = nh;
  }

  // ---------------- rendu Three.js ----------------
  const K = global.THREEKIT, T = K && K.THREE;
  let eng = null, dirty = true, drag = null;
  const cam = { yaw: 0.65, pitch: 0.38, dist: 14, target: [0, 1.5, 0] };
  const Y = p => new T.Vector3(p[0], p[2], -p[1]); // géométrie Z-haut → Three Y-haut

  function canvasTex(size, draw, rep) {
    const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    if (rep) t.repeat.set(rep, rep); return t;
  }
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(4242);
  function makeTex() {
    return {
      grain: canvasTex(512, (g, S) => { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
        for (let k = 0; k < 170; k++) { const y = rnd() * S; g.strokeStyle = 'rgba(110,70,35,' + (0.04 + rnd() * 0.09) + ')'; g.lineWidth = 0.5 + rnd() * 2.5;
          g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= S; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + k) * 3 + (rnd() - 0.5) * 2); g.stroke(); }
        for (let k = 0; k < 6; k++) { const x = rnd() * S, y = rnd() * S; g.fillStyle = 'rgba(90,55,25,0.25)'; g.beginPath(); g.ellipse(x, y, 7 + rnd() * 6, 3 + rnd() * 2, 0, 0, 7); g.fill(); } }),
      grass: canvasTex(512, (g, S) => { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
        for (let k = 0; k < 9000; k++) { const v = 0.75 + rnd() * 0.35; g.fillStyle = 'rgba(' + Math.round(120 * v) + ',' + Math.round(150 * v) + ',' + Math.round(80 * v) + ',0.35)'; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 2 + rnd() * 4); } }, 18),
      fabric: canvasTex(256, (g, S) => { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
        for (let y = 0; y < S; y += 2) { g.fillStyle = 'rgba(0,0,0,' + (0.025 + rnd() * 0.03) + ')'; g.fillRect(0, y, S, 1); }
        for (let x = 0; x < S; x += 2) { g.fillStyle = 'rgba(0,0,0,' + (0.015 + rnd() * 0.025) + ')'; g.fillRect(x, 0, 1, S); } }, 6)
    };
  }

  function createEngine(canvas) {
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); } catch (e) { return null; }
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.outputColorSpace = T.SRGBColorSpace;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(38, 1, 0.05, 400);
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new K.RoomEnvironment(), 0.04).texture;
    const hemi = new T.HemisphereLight(0xdfe9f5, 0x6b5a40, 0.6); scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff1dc, 2.8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
    scene.add(sun); scene.add(sun.target);
    const sky = new K.Sky(); sky.scale.setScalar(400); scene.add(sky);
    const su = sky.material.uniforms; su.turbidity.value = 2.2; su.rayleigh.value = 2.6; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
    const tex = makeTex();
    let content = new T.Group(); scene.add(content);
    let H = 3.5;

    function dispose(o) { o.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material) [].concat(x.material).forEach(m => m.dispose()); }); }
    function box(P, Q, nm, w, h, mat) {
      const a = Y(P), b = Y(Q), u = b.clone().sub(a); const L = u.length(); u.normalize();
      const n = Y(nm).normalize(), yv = new T.Vector3().crossVectors(n, u).normalize(), zv = new T.Vector3().crossVectors(u, yv);
      const m = new T.Mesh(new T.BoxGeometry(L, w, h), mat);
      m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(u, yv, zv));
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.castShadow = m.receiveShadow = true; return m;
    }

    function update() {
      const d = dome, maq = st.style === 'maquette';
      scene.remove(content); dispose(content); content = new T.Group(); scene.add(content);
      const w = tubeSide() / 1000, h = tubeDepth() / 1000;
      const types = st.mode === 'hub' ? d.hubTypes : d.gkTypes, tIdx = new Map();
      types.forEach(([k, idx], i) => idx.forEach(j => tIdx.set(j, i)));
      const black = new T.MeshStandardMaterial({ color: maq ? 0x3a3d40 : 0x1b1d1f, roughness: 0.55, metalness: 0.35 });
      const strutMat = i => {
        if (st.colors) return new T.MeshStandardMaterial({ color: new T.Color(tColor(i, types.length)), roughness: 0.6, metalness: 0 });
        if (maq) return new T.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.85 });
        if (st.mat === 'wood') return new T.MeshStandardMaterial({ color: 0xd2a26a, map: tex.grain, roughness: 0.62, metalness: 0 });
        return new T.MeshStandardMaterial({ color: 0xa7b0b6, roughness: 0.32, metalness: 0.8 });
      };
      const mats = new Map(); const matFor = i => { if (!mats.has(i)) mats.set(i, strutMat(i)); return mats.get(i); };
      // barres : face extérieure sur la surface géométrique
      d.struts.forEach((s, j) => {
        const P = st.mode === 'hub' ? s.Ha : s.Pa, Q = st.mode === 'hub' ? s.Hb : s.Pb;
        const off = [-s.nm[0] * h / 2, -s.nm[1] * h / 2, -s.nm[2] * h / 2];
        content.add(box([P[0] + off[0], P[1] + off[1], P[2] + off[2]], [Q[0] + off[0], Q[1] + off[1], Q[2] + off[2]], s.nm, w, h, matFor(tIdx.get(j))));
        if (st.mode === 'gk') [[s.Pa, 1], [s.Pb, -1]].forEach(([E, sg]) => { // boulon à chaque about
          const u = [s.Pb[0] - s.Pa[0], s.Pb[1] - s.Pa[1], s.Pb[2] - s.Pa[2]], L = Math.hypot(...u);
          const p = [E[0] + u[0] / L * sg * w * 0.6 + off[0], E[1] + u[1] / L * sg * w * 0.6 + off[1], E[2] + u[2] / L * sg * w * 0.6 + off[2]];
          const t = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, w * 1.25, 10), black);
          const side = Y(s.nm).cross(Y(u)).normalize(); t.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), side);
          t.position.copy(Y(p)); t.castShadow = true; content.add(t);
        });
      });
      // connecteurs et pieds
      d.V.forEach((v, i) => {
        const n = Y(d.Nn[i]).normalize(), c = Y(v).addScaledVector(n, -h / 2);
        if (st.mode === 'hub' && !d.isSupport[i]) {
          const r = Math.max(st.hub / 1000, 0.05), sides = Math.max(d.adj[i].length, 4);
          const hubM = new T.Mesh(new T.CylinderGeometry(r * 1.02, r * 1.02, h * 1.12, sides), black);
          hubM.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), n); hubM.position.copy(c); hubM.castShadow = hubM.receiveShadow = true; content.add(hubM);
          const bolt = new T.Mesh(new T.CylinderGeometry(r * 0.28, r * 0.28, h * 1.2, 16), new T.MeshStandardMaterial({ color: 0x8c9196, roughness: 0.3, metalness: 0.9 }));
          bolt.quaternion.copy(hubM.quaternion); bolt.position.copy(c); content.add(bolt);
        }
        if (d.isSupport[i]) {
          const pl = new T.Mesh(new T.BoxGeometry(0.34, 0.014, 0.34), black); pl.position.set(Y(v).x, 0.007, Y(v).z); pl.castShadow = pl.receiveShadow = true; content.add(pl);
          const out = new T.Vector3(Y(v).x, 0, Y(v).z).normalize();
          [-1, 1].forEach(sg => { const g = new T.Mesh(new T.BoxGeometry(0.012, 0.28, 0.24), black);
            const side = new T.Vector3(-out.z, 0, out.x); g.position.set(Y(v).x + side.x * sg * 0.075, 0.14, Y(v).z + side.z * sg * 0.075);
            g.lookAt(g.position.clone().add(side)); g.rotateY(Math.PI / 2); g.castShadow = true; content.add(g); });
        }
      });
      // toile
      if (st.cover) {
        const pos = []; d.faces.forEach(f => f.forEach(k => { const p = Y(d.V[k]).addScaledVector(Y(d.Nn[k]).normalize(), 0.012); pos.push(p.x, p.y, p.z); }));
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
        const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] * 0.5, (pos[i + 1] + pos[i + 2]) * 0.5); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
        const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: maq ? 0xf4f3f0 : 0xe9e1cf, map: maq ? null : tex.fabric, roughness: 0.92, metalness: 0, side: T.DoubleSide, flatShading: true }));
        m.castShadow = true; m.receiveShadow = true; content.add(m);
      }
      // sol
      const ground = new T.Mesh(new T.CircleGeometry(st.side * 3.2, 64), new T.MeshStandardMaterial({ color: maq ? 0xe6e5e1 : 0x8fae6a, map: maq ? null : tex.grass, roughness: 1, metalness: 0 }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; content.add(ground);
      // silhouette 1,80 m sous une arche
      if (st.person) {
        const pm = new T.MeshStandardMaterial({ color: maq ? 0xcfcfcf : 0x4b5866, roughness: 0.85 });
        const body = new T.Mesh(new T.CapsuleGeometry(0.19, 1.05, 6, 14), pm); body.position.y = 0.19 + 0.525 + 0.02; body.castShadow = true;
        const head = new T.Mesh(new T.SphereGeometry(0.11, 18, 12), pm); head.position.y = 1.69; head.castShadow = true;
        const fig = new T.Group(); fig.add(body, head);
        const r = st.side * 0.36; fig.position.set(r * 0.7071, 0, -r * 0.7071); content.add(fig);
      }
      H = d.H;
      sky.visible = !maq; scene.background = maq ? new T.Color(0xeeeeec) : null;
      hemi.intensity = maq ? 0.9 : 0.55; sun.intensity = maq ? 2.0 : 2.8; renderer.toneMappingExposure = maq ? 1.05 : 0.95;
      const R = st.side * 1.4; Object.assign(sun.shadow.camera, { left: -R, bottom: -R, right: R, top: R, near: 1, far: 80 }); sun.shadow.camera.updateProjectionMatrix();
    }
    function render() {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(2, global.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width)), hh = Math.max(1, Math.round(r.height));
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) { renderer.setPixelRatio(dpr); renderer.setSize(w, hh, false); }
      camera.aspect = w / hh; camera.updateProjectionMatrix();
      camera.position.set(cam.target[0] + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw), cam.target[1] + cam.dist * Math.sin(cam.pitch), cam.target[2] + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw));
      camera.lookAt(cam.target[0], cam.target[1], cam.target[2]);
      const az = cam.yaw + 1.05, el = 0.78, dv = new T.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
      sun.position.copy(dv.clone().multiplyScalar(30)); sun.target.position.set(0, H * 0.3, 0); su.sunPosition.value.copy(dv);
      renderer.render(scene, camera);
    }
    return { update, render };
  }

  function setView(kind) {
    const D = st.side * 2.5;
    cam.target = [0, dome ? dome.H * 0.42 : 1.5, 0]; cam.dist = D;
    if (kind === 'front') { cam.yaw = Math.PI / 4 + Math.PI / 2; cam.pitch = 0.08; }
    else if (kind === 'top') { cam.yaw = 0; cam.pitch = 1.45; cam.dist = D * 1.15; }
    else { cam.yaw = 0.6; cam.pitch = 0.36; }
    dirty = true;
  }
  function frame() {
    if ($q('viewQuadri').style.display !== 'none' && eng && dirty) { eng.render(); dirty = false; }
    requestAnimationFrame(frame);
  }
  function bindCanvas(cv) {
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); cv.classList.add('dragging'); });
    cv.addEventListener('pointermove', e => { if (!drag) return; cam.yaw -= (e.clientX - drag.x) * 0.008; cam.pitch = Math.max(0.02, Math.min(1.5, cam.pitch + (e.clientY - drag.y) * 0.006)); drag = { x: e.clientX, y: e.clientY }; dirty = true; });
    const end = () => { drag = null; cv.classList.remove('dragging'); }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(st.side * 0.6, Math.min(st.side * 8, cam.dist * Math.exp(e.deltaY * 0.0012))); dirty = true; }, { passive: false });
    cv.addEventListener('dblclick', () => setView('iso'));
    cv.style.touchAction = 'none';
    new ResizeObserver(() => { dirty = true; }).observe(cv);
  }

  // ---------------- réglages ----------------
  function readInputs() {
    const num = (id, d) => { const v = parseFloat($q(id).value); return isFinite(v) ? v : d; };
    st.side = Math.min(10, Math.max(4, num('qdSide', 5))); st.nu = +$q('qdNu').value; st.arch = Math.max(0, Math.min(st.side * 0.5, num('qdArch', 1.6)));
    st.k = Math.min(2.5, Math.max(0.8, num('qdK', 1.5))); st.lintel = $q('qdLintel').checked;
    st.mode = $q('qdMode').value; st.b = Math.max(1, num('qdB', 140)); st.h = Math.max(0.5, num('qdH', 70)); st.hub = Math.max(0, num('qdHub', 120));
    st.style = $q('qdStyle').value; st.colors = $q('qdColors').checked; st.cover = $q('qdCover').checked; st.person = $q('qdPerson').checked;
  }
  function refresh(resetCam) {
    readInputs(); compute(); renderTables();
    if (eng) { eng.update(); if (resetCam) setView('iso'); dirty = true; }
  }
  function onMat() {
    const old = st.mat; memo[old] = { b: +$q('qdB').value, h: +$q('qdH').value, hub: +$q('qdHub').value };
    st.mat = $q('qdMat').value; const m = memo[st.mat];
    $q('qdB').value = m.b; $q('qdH').value = m.h; $q('qdHub').value = m.hub;
    $q('qdLblB').firstChild.textContent = st.mat === 'wood' ? 'Largeur (mm)' : 'Côté du tube (mm)';
    $q('qdLblH').firstChild.textContent = st.mat === 'wood' ? 'Épaisseur (mm)' : 'Paroi (mm)';
    $q('qdH').step = st.mat === 'wood' ? 5 : 0.5;
    refresh(false);
  }
  ['qdNu', 'qdMode', 'qdStyle', 'qdLintel', 'qdColors', 'qdCover', 'qdPerson'].forEach(id => $q(id).addEventListener('change', () => refresh(false)));
  ['qdSide'].forEach(id => $q(id).addEventListener('change', () => refresh(true)));
  ['qdArch', 'qdK', 'qdB', 'qdH', 'qdHub'].forEach(id => $q(id).addEventListener('change', () => refresh(false)));
  $q('qdMat').addEventListener('change', onMat);
  $q('qdViewIso').onclick = () => setView('iso'); $q('qdViewFront').onclick = () => setView('front'); $q('qdViewTop').onclick = () => setView('top');

  // ---------------- onglet ----------------
  let started = false;
  function show() {
    ['viewBase', 'viewCover', 'viewInfo', 'viewDesign'].forEach(id => { const el = $q(id); if (el) el.style.display = 'none'; });
    ['tabBase', 'tabCover', 'tabInfo', 'tabDesign'].forEach(id => { const el = $q(id); if (el) el.classList.remove('active'); });
    $q('viewQuadri').style.display = ''; $q('tabQuadri').classList.add('active');
    if (!started) {
      started = true;
      if (T) { eng = createEngine($q('qd3d')); if (eng) bindCanvas($q('qd3d')); }
      if (!eng) $q('qdInfo3d').textContent = 'vue 3D indisponible (WebGL manquant)';
      refresh(true); requestAnimationFrame(frame);
    }
    dirty = true;
  }
  function hide() { $q('viewQuadri').style.display = 'none'; $q('tabQuadri').classList.remove('active'); }
  $q('tabQuadri').addEventListener('click', show);
  ['tabBase', 'tabCover', 'tabInfo', 'tabDesign'].forEach(id => { const el = $q(id); if (el) el.addEventListener('click', hide); });
  global.CoverQuadri = { show, state: () => st, dome: () => dome };
})(typeof window !== 'undefined' ? window : globalThis);
