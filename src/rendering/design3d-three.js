
// ---------------------------------------------------------
// design3d-three.js — rendu de l'onglet Design avec Three.js (intégré au
// fichier, marche sans internet). Reprend la modélisation de design3d.js
// (meubles, structure, toile, mezzanine, ouvertures) et l'affiche avec :
//  - matériaux physiques (PBR) : bois, tissu, métal, céramique, verre ;
//  - textures procédurales (lames de plancher, veinage, herbe) ;
//  - éclairage d'ambiance (RoomEnvironment) + ciel physique (Sky) ;
//  - ambiances au choix (jour, matin, coucher de soleil, couvert, nuit), sans fichier à charger ;
//  - ombres douces (PCF), tons ACES ;
//  - modèles .glb lus par le GLTFLoader officiel (matériaux et textures).
// Si WebGL2 / Three.js manque, designui.js garde le moteur maison.
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const K = global.THREEKIT;
  if (!K) return;
  const T = K.THREE;

  // ---------------- textures procédurales ----------------
  function canvasTex(size, draw, repeat) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    if (repeat) t.repeat.set(repeat, repeat);
    return t;
  }
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(12345);
  function planks(maq) { // 2 m × 2 m, lames de 14 cm dans le sens x
    return canvasTex(1024, (g, S) => {
      const n = 14, h = S / n;
      for (let r = 0; r < n; r++) {
        let x = -rnd() * S;
        while (x < S) {
          const L = S * (0.45 + rnd() * 0.5), v = maq ? 0.97 + rnd() * 0.04 : 0.8 + rnd() * 0.3;
          g.fillStyle = `rgb(${Math.round(255 * v)},${Math.round(255 * v * 0.97)},${Math.round(255 * v * 0.93)})`;
          g.fillRect(x, r * h, L, h);
          if (!maq) for (let k = 0; k < 26; k++) { g.strokeStyle = `rgba(90,60,30,${0.04 + rnd() * 0.07})`; g.lineWidth = 0.6 + rnd() * 1.6; const y = r * h + rnd() * h;
            g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + L * 0.3, y + (rnd() - 0.5) * 6, x + L * 0.7, y + (rnd() - 0.5) * 6, x + L, y + (rnd() - 0.5) * 4); g.stroke(); }
          g.fillStyle = maq ? 'rgba(0,0,0,0.12)' : 'rgba(40,25,10,0.55)'; g.fillRect(x, r * h, 2, h);
          x += L;
        }
        g.fillStyle = maq ? 'rgba(0,0,0,0.12)' : 'rgba(40,25,10,0.6)'; g.fillRect(0, r * h, S, 2);
      }
    });
  }
  function grain(maq) {
    return canvasTex(512, (g, S) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
      if (maq) return;
      for (let k = 0; k < 160; k++) { const y = rnd() * S; g.strokeStyle = `rgba(110,70,35,${0.03 + rnd() * 0.08})`; g.lineWidth = 0.5 + rnd() * 2.5;
        g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= S; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + k) * 3 + (rnd() - 0.5) * 2); g.stroke(); }
    });
  }
  function fabric() {
    return canvasTex(256, (g, S) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 2) { g.fillStyle = `rgba(0,0,0,${0.025 + rnd() * 0.03})`; g.fillRect(0, y, S, 1); }
      for (let x = 0; x < S; x += 2) { g.fillStyle = `rgba(0,0,0,${0.015 + rnd() * 0.025})`; g.fillRect(x, 0, 1, S); }
    });
  }
  function grass() {
    return canvasTex(512, (g, S) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
      for (let k = 0; k < 9000; k++) { const v = 0.75 + rnd() * 0.35; g.fillStyle = `rgba(${Math.round(120 * v)},${Math.round(150 * v)},${Math.round(80 * v)},0.35)`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 2 + rnd() * 5); }
    });
  }

  // ---------------- ambiances (rendu réaliste) ----------------
  // Tout est calculé : aucun fichier d'image à charger, le rendu reste hors ligne.
  // pz = ciel du rendu photo (zénith, horizon, sol) ; el = hauteur du soleil (radians) ; env = part de l'éclairage d'ambiance ; lamp = lampe intérieure.
  const AMBIANCES = {
    jour:     { label: 'Plein jour',        pz: [[0.20, 0.40, 0.85], [0.80, 0.86, 0.95], [0.25, 0.22, 0.17]], el: 0.72, sky: true,  turbidity: 2.2, rayleigh: 2.6,              sun: 2.0,  sunColor: 0xfff1dc, hemi: 0.3,  env: 0.45, exposure: 0.88, lamp: 0 },
    matin:    { label: 'Matin',             pz: [[0.32, 0.50, 0.85], [0.98, 0.84, 0.70], [0.24, 0.21, 0.16]], el: 0.22, sky: true,  turbidity: 3.5, rayleigh: 2.0,              sun: 2.0,  sunColor: 0xffe0b8, hemi: 0.25, env: 0.38, exposure: 0.88, lamp: 0 },
    couchant: { label: 'Coucher de soleil', pz: [[0.22, 0.24, 0.52], [1.00, 0.56, 0.30], [0.18, 0.13, 0.10]], el: 0.05, sky: true,  turbidity: 10,  rayleigh: 3.5, mie: 0.012, sun: 2.2,  sunColor: 0xff8c42, hemi: 0.2,  hemiSky: 0xffc9a0, env: 0.25, exposure: 0.85, lamp: 3 },
    couvert:  { label: 'Ciel couvert',      pz: [[0.62, 0.64, 0.67], [0.76, 0.78, 0.80], [0.22, 0.20, 0.17]], el: 1.1,  sky: false, bg: 0xc4c8cc,                           sun: 0.4,  sunColor: 0xe8eef5, hemi: 0.6,  env: 0.7,  exposure: 0.9,  lamp: 0 },
    nuit:     { label: 'Nuit',              pz: [[0.006, 0.010, 0.030], [0.025, 0.035, 0.070], [0.010, 0.010, 0.010]], el: 0.6,  sky: false, bg: 0x0d1424,                           sun: 0.15, sunColor: 0x9fb4ff, hemi: 0.06, hemiSky: 0x7a8cc0, env: 0.05, exposure: 1.0,  lamp: 10 }
  };

  // ---------------- moteur ----------------
  function create(canvas) {
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); } catch (e) { return null; }
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.localClippingEnabled = true;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1, 0.05, 300);
    const pmrem = new T.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new K.RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    const hemi = new T.HemisphereLight(0xdfe9f5, 0x6b5a40, 0.6); scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff1dc, 2.6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
    scene.add(sun); scene.add(sun.target);
    const sky = new K.Sky(); sky.scale.setScalar(400); scene.add(sky);
    const su = sky.material.uniforms; su.turbidity.value = 2.2; su.rayleigh.value = 2.6; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
    // lampe intérieure (ambiance nuit) : lumière chaude au centre du dôme, sans ombre portée (rapide)
    const lamp = new T.PointLight(0xffc27a, 0, 12, 1.6); lamp.visible = false; scene.add(lamp);
    let amb = null;
    // course du soleil (sun.js) : arcs du 21 décembre et du 21 juin, soleil réel, carte des faces
    let sunGroup = new T.Group(); scene.add(sunGroup);
    let sunOv = null, sunBase = 2.6;
    // aération (vent.js) : flèches d'air, entrées en bleu, sortie par la coupole en orange
    let ventGroup = new T.Group(); scene.add(ventGroup);
    const clip = new T.Plane(new T.Vector3(0, 0, -1), 1e6);
    let hiQ = true;
    const tex = { real: null, maq: null };
    const texSet = maq => (tex[maq ? 'maq' : 'real'] = tex[maq ? 'maq' : 'real'] || { planks: planks(maq), grain: grain(maq), fabric: fabric(), grass: grass() });
    const glbCache = new Map(); // id -> Promise(gltf)
    let content = new T.Group(); scene.add(content);
    let bounds = { r: 4, h: 3 }, style = 'real';

    // matériau selon le code matière de design3d.js
    function material(code, clipOn, maq, alpha) {
      const tx = texSet(maq), cp = clipOn ? [clip] : null;
      const base = { vertexColors: true, clippingPlanes: cp, side: T.DoubleSide };
      switch (code) {
        case 1: return new T.MeshStandardMaterial(Object.assign(base, { map: tx.planks, roughness: 0.62, metalness: 0 }));
        case 2: return new T.MeshStandardMaterial(Object.assign(base, { map: tx.grain, roughness: 0.58, metalness: 0 }));
        case 3: return new T.MeshStandardMaterial(Object.assign(base, { map: tx.fabric, roughness: 0.95, metalness: 0 }));
        case 4: return new T.MeshPhysicalMaterial(Object.assign(base, { transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0, envMapIntensity: 1.4, depthWrite: false }));
        case 5: return new T.MeshStandardMaterial(Object.assign(base, { transparent: true, opacity: alpha, roughness: 0.9, metalness: 0, emissive: maq ? 0x202020 : 0x3a3428, depthWrite: false }));
        case 6: return new T.MeshStandardMaterial(Object.assign(base, { roughness: 0.35, metalness: 0.75 }));
        case 7: return new T.MeshStandardMaterial(Object.assign(base, { map: maq ? null : tx.grass, roughness: 1, metalness: 0 }));
        case 8: return new T.MeshPhysicalMaterial(Object.assign(base, { roughness: 0.12, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.1 }));
        default: return new T.MeshStandardMaterial(Object.assign(base, { roughness: 0.7, metalness: 0 }));
      }
    }
    // un tampon design3d (13 flottants / sommet) -> maillages Three groupés par matière et coupe
    function meshesFrom(data, maq, alpha, castShadow) {
      const groups = new Map(), N = data.length / 13;
      for (let i = 0; i < N; i++) { const o = i * 13, key = Math.round(data[o + 9]) * 2 + (data[o + 10] > 0.5 ? 1 : 0); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i); }
      const out = [];
      groups.forEach((idx, key) => {
        const code = key >> 1, clipOn = (key & 1) === 1, n = idx.length;
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
        idx.forEach((i, j) => { const o = i * 13;
          pos.set([data[o], data[o + 1], data[o + 2]], j * 3); nor.set([data[o + 3], data[o + 4], data[o + 5]], j * 3);
          for (let k = 0; k < 3; k++) col[j * 3 + k] = Math.pow(data[o + 6 + k], 2.2); // couleurs sRGB -> linéaire
          // coordonnées de texture « monde » : plancher et sol à plat, bois le long de la pièce
          const ax = Math.abs(data[o + 3]), ay = Math.abs(data[o + 4]);
          if (code === 1 || code === 7) { uv[j * 2] = data[o] / 2; uv[j * 2 + 1] = data[o + 2] / 2; if (code === 7) { uv[j * 2] *= 2; uv[j * 2 + 1] *= 2; } }
          else if (ay > 0.7) { uv[j * 2] = data[o] * 1.2; uv[j * 2 + 1] = data[o + 2] * 1.2; }
          else if (ax > 0.7) { uv[j * 2] = data[o + 2] * 1.2; uv[j * 2 + 1] = data[o + 1] * 1.2; }
          else { uv[j * 2] = data[o] * 1.2; uv[j * 2 + 1] = data[o + 1] * 1.2; }
        });
        // sens des triangles accordé à leur normale : Three.js retourne la normale d'une face vue
        // « de dos » ; une face mal orientée (ex. dessus du plancher) n'était éclairée que par-dessous
        for (let t = 0; t + 2 < n; t += 3) {
          const a = t * 3, b = a + 3, c = a + 6;
          const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
          const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
          const dot = (uy * vz - uz * vy) * (nor[a] + nor[b] + nor[c]) + (uz * vx - ux * vz) * (nor[a + 1] + nor[b + 1] + nor[c + 1]) + (ux * vy - uy * vx) * (nor[a + 2] + nor[b + 2] + nor[c + 2]);
          if (dot < 0) {
            for (const A of [pos, nor, col]) for (let k = 0; k < 3; k++) { const x = A[b + k]; A[b + k] = A[c + k]; A[c + k] = x; }
            const b2 = (t + 1) * 2, c2 = (t + 2) * 2; for (let k = 0; k < 2; k++) { const x = uv[b2 + k]; uv[b2 + k] = uv[c2 + k]; uv[c2 + k] = x; }
          }
        }
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3));
        g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
        const m = new T.Mesh(g, material(code, clipOn, maq, alpha));
        m.castShadow = castShadow && code !== 4 && code !== 5 && code !== 7; m.receiveShadow = true;
        if (code === 4 || code === 5) m.renderOrder = 2;
        out.push(m);
      });
      return out;
    }
    function dispose(obj) { obj.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.userData.keepMat) [].concat(o.material).forEach(m => m.dispose()); }); }

    function loadGLB(id, b64) {
      if (glbCache.has(id)) return glbCache.get(id);
      const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const p = new Promise((res, rej) => new K.GLTFLoader().parse(u.buffer, '', res, rej));
      glbCache.set(id, p); return p;
    }

    // construit toute la scène à partir de l'aménagement
    function update(Z, model, st, opts, onAsync) {
      photoStop();
      style = opts.style;
      const maq = opts.style === 'maquette';
      scene.remove(content); dispose(content); content = new T.Group(); scene.add(content);
      // géométrie modélisée (sans les .glb : ils sont chargés par le GLTFLoader)
      const desc = global.Design3D.buildScene(Z, model, st, Object.assign({}, opts, { models: new Map() }));
      const glbItems = new Set(st.items.filter(it => it.model && (st.models || []).some(m => m.id === it.model)).map(it => it.id));
      // retirer des meubles modélisés ceux qui seront remplacés par un .glb
      let draws = desc.draws;
      if (glbItems.size) {
        const st2 = Object.assign({}, st, { items: st.items.filter(it => !glbItems.has(it.id)) });
        draws = global.Design3D.buildScene(Z, model, st2, Object.assign({}, opts, { models: new Map() })).draws;
      }
      draws.forEach(d => meshesFrom(d.data, maq, d.alpha || 1, d.shadow !== false).forEach(m => content.add(m)));
      // modèles .glb : posés à leur place, aux dimensions de l'élément
      st.items.filter(it => glbItems.has(it.id)).forEach(it => {
        const m = st.models.find(x => x.id === it.model);
        loadGLB(m.id, m.data).then(gltf => {
          const obj = gltf.scene.clone(true), box = new T.Box3().setFromObject(obj), size = box.getSize(new T.Vector3());
          const holder = new T.Group(); holder.add(obj);
          obj.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
          holder.scale.set(it.w / (size.x || 1), it.h / (size.y || 1), it.d / (size.z || 1));
          const wrap = new T.Group(); wrap.add(holder);
          wrap.position.set(it.x, (it.level || 0) ? st.mezz.h : 0, it.z); wrap.rotation.y = -(it.rot || 0) * Math.PI / 180;
          obj.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true;
            if (maq) { o.material = new T.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.85 }); } else o.userData.keepMat = true; } });
          content.add(wrap); if (onAsync) onAsync();
        }).catch(() => {});
      });
      bounds = { r: model.radius, h: model.height };
      // ambiance : la maquette garde son fond neutre ; le rendu réaliste suit l'ambiance choisie
      amb = maq ? null : (AMBIANCES[opts.ambiance] || AMBIANCES.jour);
      const a = amb;
      sky.visible = !maq && a.sky;
      scene.background = maq ? new T.Color(0xeeeeec) : (a.sky ? null : new T.Color(a.bg));
      hemi.intensity = maq ? 0.9 : a.hemi; sun.intensity = maq ? 2.0 : a.sun;
      sun.color.setHex(maq ? 0xfff1dc : a.sunColor);
      renderer.toneMappingExposure = maq ? 1.05 : a.exposure;
      scene.environmentIntensity = maq ? 1 : a.env;
      if (!maq && a.sky) { su.turbidity.value = a.turbidity; su.rayleigh.value = a.rayleigh; su.mieCoefficient.value = a.mie || 0.004; }
      hemi.color.setHex(!maq && a.hemiSky ? a.hemiSky : 0xdfe9f5);
      lamp.visible = !maq && a.lamp > 0; lamp.intensity = maq ? 0 : a.lamp;
      lamp.position.set(0, model.height * 0.55, 0); lamp.distance = model.radius * 2.2;
      sun.shadow.camera.left = sun.shadow.camera.bottom = -model.radius * 1.8; sun.shadow.camera.right = sun.shadow.camera.top = model.radius * 1.8;
      sun.shadow.camera.near = 1; sun.shadow.camera.far = 60; sun.shadow.camera.updateProjectionMatrix();
      sunBase = sun.intensity;
    }

    // arrows = [{ from: {x,y,z}, to: {x,y,z}, color }]
    function setVent(arrows) {
      scene.remove(ventGroup); dispose(ventGroup); ventGroup = new T.Group(); scene.add(ventGroup);
      (arrows || []).forEach(a => {
        const A = new T.Vector3(a.from.x, a.from.y, a.from.z), B = new T.Vector3(a.to.x, a.to.y, a.to.z), d = B.clone().sub(A), L = d.length();
        if (L < 1e-3) return;
        const mat = new T.MeshBasicMaterial({ color: a.color, transparent: true, opacity: 0.9, depthTest: false, toneMapped: false }), head = Math.min(0.25, L * 0.35);
        const shaft = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, L - head, 10), mat), cone = new T.Mesh(new T.ConeGeometry(0.075, head, 14), mat);
        shaft.position.y = (L - head) / 2; cone.position.y = L - head / 2;
        const g = new T.Group(); g.add(shaft); g.add(cone); g.position.copy(A);
        g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
        g.renderOrder = 5; shaft.renderOrder = cone.renderOrder = 5; ventGroup.add(g);
      });
    }

    // s = { arcs: [{ kind, pts: [{x,y,z}] }], radius, now: { dir, elevation }, faces: [{ pts, normal, color }] } ou null
    function setSun(s) {
      scene.remove(sunGroup); dispose(sunGroup); sunGroup = new T.Group(); scene.add(sunGroup);
      sunOv = s && s.now ? s.now : null;
      if (!s) return;
      const R = s.radius;
      (s.arcs || []).forEach(a => {
        if (a.pts.length < 2) return;
        const g = new T.BufferGeometry().setFromPoints(a.pts.map(p => new T.Vector3(p.x * R, p.y * R, p.z * R)));
        const line = new T.Line(g, new T.LineBasicMaterial({ color: a.kind === 'hiver' ? 0x2f6fd6 : 0xe0702a, transparent: true, opacity: 0.9, depthWrite: false }));
        line.renderOrder = 3; sunGroup.add(line);
        // petites billes aux heures pleines
        a.pts.filter(p => Math.abs(p.hour - Math.round(p.hour)) < 1e-6).forEach(p => {
          const m = new T.Mesh(new T.SphereGeometry(R * 0.012, 8, 6), new T.MeshBasicMaterial({ color: a.kind === 'hiver' ? 0x2f6fd6 : 0xe0702a }));
          m.position.set(p.x * R, p.y * R, p.z * R); sunGroup.add(m);
        });
      });
      if (s.now && s.now.elevation > 0) {
        const d = s.now.dir, m = new T.Mesh(new T.SphereGeometry(R * 0.04, 20, 14), new T.MeshBasicMaterial({ color: 0xffd23a }));
        m.position.set(d.x * R, d.y * R, d.z * R); sunGroup.add(m);
      }
      if (s.faces && s.faces.length) {
        const n = s.faces.length, pos = new Float32Array(n * 9), col = new Float32Array(n * 9);
        s.faces.forEach((f, i) => f.pts.forEach((p, k) => {
          pos.set([p.x + f.normal.x * 0.012, p.y + f.normal.y * 0.012, p.z + f.normal.z * 0.012], i * 9 + k * 3);
          col.set(f.color.map(c => Math.pow(c, 2.2)), i * 9 + k * 3);
        }));
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
        const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.78, side: T.DoubleSide, depthWrite: false, toneMapped: false }));
        // pas de coupe : la carte montre toute la coque, côté soleil compris
        m.renderOrder = 3; sunGroup.add(m);
      }
    }

    // ---------------- rendu photo (lancer de rayons, three-gpu-pathtracer) ----------------
    // Calcule l'image progressivement (échantillons successifs) sur la même scène.
    // Limites : le plan de coupe n'est pas pris en compte (toile vue entière),
    // le ciel physique (shader) est remplacé par un ciel en dégradé.
    let pt = null, ptRaf = 0, photo = null;
    const envTexs = {};
    function photoEnv(maq) {
      const A = amb || AMBIANCES.jour, key = maq ? 'maq' : A.label;
      return envTexs[key] || (envTexs[key] = photoSky(K, A, maq));
    }
    // Les tampons de design3d ont des normales justes mais un sens de rotation des
    // triangles parfois inversé. Le rendu 3D (double face) s'en accommode, pas le lancer
    // de rayons (surfaces noires) : copie corrigée, utilisée seulement pendant la photo.
    function fixWinding(g) {
      const P = g.attributes.position, N = g.attributes.normal;
      if (g.index || !P || !N) return null;
      const p = P.array, n = N.array, flip = [];
      for (let t = 0; t < P.count / 3; t++) {
        const a = t * 9, ux = p[a + 3] - p[a], uy = p[a + 4] - p[a + 1], uz = p[a + 5] - p[a + 2], vx = p[a + 6] - p[a], vy = p[a + 7] - p[a + 1], vz = p[a + 8] - p[a + 2];
        const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
        if (cx * (n[a] + n[a + 3] + n[a + 6]) + cy * (n[a + 1] + n[a + 4] + n[a + 7]) + cz * (n[a + 2] + n[a + 5] + n[a + 8]) < 0) flip.push(t);
      }
      if (!flip.length) return null;
      const c = g.clone();
      Object.values(c.attributes).forEach(at => { const s = at.itemSize, arr = at.array;
        flip.forEach(t => { const i1 = (t * 3 + 1) * s, i2 = (t * 3 + 2) * s; for (let k = 0; k < s; k++) { const x = arr[i1 + k]; arr[i1 + k] = arr[i2 + k]; arr[i2 + k] = x; } }); });
      return c;
    }
    function photoStop() {
      if (ptRaf) cancelAnimationFrame(ptRaf); ptRaf = 0;
      if (photo) { scene.background = photo.bg; scene.environment = photo.env; sky.visible = photo.sky; hemi.visible = true;
        if (photo.lampS) { [lamp.intensity, lamp.distance, lamp.decay] = photo.lampS; scene.environmentIntensity = photo.envI; }
        photo.swaps.forEach(([m, g]) => { m.geometry.dispose(); m.geometry = g; }); photo = null; }
    }
    // cb : { samples, onProgress(n, total), onDone(), onError(err) }
    function photoStart(cam, cut, cb) {
      cb = cb || {};
      photoStop();
      draw(cam, cut); // place caméra, soleil et taille du canevas
      try {
        if (!pt) {
          pt = new K.WebGLPathTracer(renderer);
          pt.tiles.set(2, 2); pt.minSamples = 1; pt.renderDelay = 0; pt.fadeDuration = 400;
          pt.bounces = 6; pt.transmissiveBounces = 6; pt.filterGlossyFactor = 0.5;
        }
        const maq = style === 'maquette';
        photo = { bg: scene.background, env: scene.environment, sky: sky.visible, swaps: [] };
        content.traverse(o => { if (o.isMesh && !o.userData.keepMat) { const g = fixWinding(o.geometry); if (g) { photo.swaps.push([o, o.geometry]); o.geometry = g; } } });
        sky.visible = false; hemi.visible = false; // non gérés par le lancer de rayons
        // le ciel du rendu photo porte déjà l'éclairage d'ambiance ; la lampe de nuit passe
        // en lumière physique (décroissance en 1/d², sans portée limite) pour le lancer de rayons
        photo.envI = scene.environmentIntensity; scene.environmentIntensity = 1;
        photo.lampS = [lamp.intensity, lamp.distance, lamp.decay];
        if (lamp.visible) { lamp.intensity = 0.7 * lamp.intensity * bounds.r * bounds.r; lamp.distance = 0; lamp.decay = 2; }
        const env = photoEnv(maq);
        scene.environment = env; scene.background = maq ? new T.Color(0xeeeeec) : env;
        pt.setScene(scene, camera);
      } catch (err) { photoStop(); if (cb.onError) cb.onError(err); return false; }
      const total = cb.samples || 256;
      const tick = () => {
        if (!photo) return;
        try { pt.renderSample(); } catch (err) { photoStop(); if (cb.onError) cb.onError(err); return; }
        const n = Math.floor(pt.samples);
        if (cb.onProgress) cb.onProgress(Math.min(n, total), total);
        if (n >= total) { ptRaf = 0; if (cb.onDone) cb.onDone(); return; }
        ptRaf = requestAnimationFrame(tick);
      };
      ptRaf = requestAnimationFrame(tick);
      return true;
    }
    // image PNG du canevas (le rendu photo reste affiché tant qu'on ne bouge pas la vue)
    function snapshot() { return canvas.toDataURL('image/png'); }

    function render(cam, cut) { photoStop(); draw(cam, cut); }
    function draw(cam, cut) {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(2, global.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        renderer.setPixelRatio(hiQ ? dpr : 1); renderer.setSize(w, h, false);
      }
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const eye = new T.Vector3(cam.target[0] + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw), cam.target[1] + cam.dist * Math.sin(cam.pitch), cam.target[2] + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw));
      camera.position.copy(eye); camera.lookAt(cam.target[0], cam.target[1], cam.target[2]);
      // coupe : on garde ce qui est derrière un plan vertical passant à 15 cm devant l'axe
      const hx = Math.sin(cam.yaw), hz = Math.cos(cam.yaw);
      if (cut) { clip.normal.set(-hx, 0, -hz); clip.constant = 0.15; } else { clip.normal.set(0, 0, -1); clip.constant = 1e6; }
      // soleil (ou lune) de trois quarts par la gauche de la caméra ; hauteur selon l'ambiance (jour : 41°)
      const az = cam.yaw + 1.05, el = amb ? amb.el : 0.72;
      let d = new T.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
      sun.intensity = sunBase;
      if (sunOv) {   // soleil réel : direction calculée ; il faiblit près de l'horizon et s'éteint une fois couché
        d = new T.Vector3(sunOv.dir.x, sunOv.dir.y, sunOv.dir.z);
        sun.intensity = sunBase * Math.max(0, Math.min(1, Math.sin(sunOv.elevation) / Math.sin(0.17)));
      }
      sun.position.copy(d.clone().multiplyScalar(25)).add(new T.Vector3(0, bounds.h * 0.4, 0)); sun.target.position.set(0, bounds.h * 0.4, 0);
      su.sunPosition.value.copy(d);
      renderer.render(scene, camera);
    }
    return { isThree: true, update, render, setSun, setVent, photoStart, photoStop, snapshot, photoBusy: () => !!ptRaf, canPhoto: !!K.WebGLPathTracer, setQuality(v) { hiQ = v; sun.castShadow = v; renderer.shadowMap.type = v ? T.PCFSoftShadowMap : T.BasicShadowMap; renderer.shadowMap.needsUpdate = true; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); canvas.width = 0; }, renderer };
  }

  // ciel du rendu photo (lancer de rayons) : dégradé zénith / horizon / sol de l'ambiance ; gris clair en maquette
  // (partagé avec la Quadrisphère)
  function photoSky(K, A, maq) {
    const T = K.THREE, t = new K.ProceduralEquirectTexture(512, 256);
    const zen = new T.Color(...A.pz[0]), hor = new T.Color(...A.pz[1]), gnd = new T.Color(...A.pz[2]);
    const white = new T.Color(0.93, 0.93, 0.92), grey = new T.Color(0.55, 0.55, 0.54);
    t.generationCallback = (polar, uv, coord, c) => {
      const y = -Math.cos(polar.phi); // 1 = zénith, -1 = nadir (convention du path tracer)
      if (maq) c.lerpColors(grey, white, Math.min(1, (y + 1) * 0.8));
      else if (y >= 0) c.lerpColors(hor, zen, Math.pow(y, 0.6));
      else c.lerpColors(hor, gnd, Math.min(1, -y * 5));
    };
    t.update();
    return t;
  }
  global.Design3DThree = { create, AMBIANCES, photoSky };
})(typeof window !== 'undefined' ? window : globalThis);
