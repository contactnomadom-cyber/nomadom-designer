
// ---------------------------------------------------------
// design3d-three.js — rendu de l'onglet Design avec Three.js (intégré au
// fichier, marche sans internet). Reprend la modélisation de design3d.js
// (meubles, structure, toile, mezzanine, ouvertures) et l'affiche avec :
//  - matériaux physiques (PBR) : bois, tissu, métal, céramique, verre ;
//  - textures procédurales (lames de plancher, veinage, herbe) ;
//  - éclairage d'ambiance (RoomEnvironment) + ciel physique (Sky) ;
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
      // ambiance selon le style
      sky.visible = !maq;
      scene.background = maq ? new T.Color(0xeeeeec) : null;
      hemi.intensity = maq ? 0.9 : 0.55; sun.intensity = maq ? 2.0 : 2.8;
      renderer.toneMappingExposure = maq ? 1.05 : 0.95;
      sun.shadow.camera.left = sun.shadow.camera.bottom = -model.radius * 1.8; sun.shadow.camera.right = sun.shadow.camera.top = model.radius * 1.8;
      sun.shadow.camera.near = 1; sun.shadow.camera.far = 60; sun.shadow.camera.updateProjectionMatrix();
    }

    function render(cam, cut) {
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
      // soleil de trois quarts par la gauche de la caméra, à 41°
      const az = cam.yaw + 1.05, el = 0.72, d = new T.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
      sun.position.copy(d.clone().multiplyScalar(25)).add(new T.Vector3(0, bounds.h * 0.4, 0)); sun.target.position.set(0, bounds.h * 0.4, 0);
      su.sunPosition.value.copy(d);
      renderer.render(scene, camera);
    }
    return { isThree: true, update, render, setQuality(v) { hiQ = v; sun.castShadow = v; renderer.shadowMap.type = v ? T.PCFSoftShadowMap : T.BasicShadowMap; renderer.shadowMap.needsUpdate = true; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); canvas.width = 0; }, renderer };
  }

  global.Design3DThree = { create };
})(typeof window !== 'undefined' ? window : globalThis);
