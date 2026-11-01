
// ---------------------------------------------------------
// design3d.js — petit moteur 3D WebGL2 intégré (aucune dépendance, marche
// sans internet) + modélisation des meubles + lecture des modèles .glb.
//
// Rendu : vraie profondeur (z-buffer), soleil avec ombres portées (shadow
// map + filtrage PCF), lumière du ciel (hémisphère), matériaux procéduraux
// (plancher en lames, bois, tissu, métal, céramique), verre et toile
// translucides, coupe du dôme côté caméra pour voir dedans.
// Deux styles : « réaliste » et « maquette » (blanc / bois clair).
// ---------------------------------------------------------
(function (global) {
  'use strict';

  // ---------------- maths ----------------
  const M4 = {
    mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; },
    persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
    ortho(l, r, b, t, n, f) { const o = new Float32Array(16); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; },
    look(e, c, u) {
      let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; let L = Math.hypot(...z); z = z.map(v => v / L);
      let x = [u[1] * z[2] - u[2] * z[1], u[2] * z[0] - u[0] * z[2], u[0] * z[1] - u[1] * z[0]]; L = Math.hypot(...x) || 1; x = x.map(v => v / L);
      const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
      return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1]);
    }
  };

  // ---------------- shaders ----------------
  const VS = `#version 300 es
  layout(location=0) in vec3 a_pos; layout(location=1) in vec3 a_nor; layout(location=2) in vec3 a_col;
  layout(location=3) in float a_mat; layout(location=4) in float a_clip; layout(location=5) in vec2 a_uv;
  uniform mat4 u_vp, u_lvp;
  out vec3 v_pos, v_nor, v_col; out float v_mat, v_clip; out vec4 v_lpos; out vec2 v_uv;
  void main(){ v_pos=a_pos; v_nor=a_nor; v_col=a_col; v_mat=a_mat; v_clip=a_clip; v_uv=a_uv; v_lpos=u_lvp*vec4(a_pos,1.0); gl_Position=u_vp*vec4(a_pos,1.0); }`;
  const FS = `#version 300 es
  precision highp float; precision highp sampler2DShadow;
  in vec3 v_pos, v_nor, v_col; in float v_mat, v_clip; in vec4 v_lpos; in vec2 v_uv;
  uniform vec3 u_sun, u_sunCol, u_sky, u_gnd, u_eye; uniform vec4 u_clip; uniform float u_alpha, u_maq;
  uniform sampler2DShadow u_sh; uniform sampler2D u_tex; uniform int u_useTex;
  out vec4 o;
  float h1(float n){ return fract(sin(n)*43758.5453); }
  float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float nz(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
  vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
  void main(){
    if (v_clip > 0.5 && dot(vec4(v_pos,1.0), u_clip) > 0.0) discard;
    vec3 n = normalize(v_nor); if (!gl_FrontFacing) n = -n;
    vec3 base = v_col; int m = int(v_mat + 0.5);
    if (u_useTex == 1) base *= texture(u_tex, v_uv).rgb;
    float spec = 0.0, rough = 1.0;
    if (m == 1) { // plancher en lames (le long de x)
      float w = 0.14, id = floor(v_pos.z / w), off = h1(id) * 3.0, L = 1.8;
      float seg = floor((v_pos.x + off) / L); float v = (h1(id * 7.3 + seg) - 0.5) * 0.16 * (1.0 - u_maq);
      float gz = smoothstep(0.0, 0.004, abs(fract(v_pos.z / w) * w - 0.0)) * smoothstep(0.0, 0.004, abs(fract(v_pos.z / w) * w - w));
      float gx = smoothstep(0.0, 0.004, abs(fract((v_pos.x + off) / L) * L)) ;
      float grain = (nz(vec2(v_pos.x * 3.0, v_pos.z * 60.0)) - 0.5) * 0.12 * (1.0 - u_maq);
      base *= (1.0 + v + grain) * mix(0.55, 1.0, min(gz, gx));
    } else if (m == 2) { // bois
      float g = nz(vec2((v_pos.x + v_pos.z) * 4.0, v_pos.y * 40.0)) - 0.5;
      base *= 1.0 + g * 0.16 * (1.0 - u_maq);
    } else if (m == 3) { // tissu
      base *= 1.0 + (nz(v_pos.xz * 140.0 + v_pos.y * 90.0) - 0.5) * 0.08 * (1.0 - u_maq);
    } else if (m == 6) { spec = 0.35; rough = 0.25; // métal
    } else if (m == 8) { spec = 0.25; rough = 0.15; // céramique / émail
    } else if (m == 7) { // sol extérieur
      base *= 1.0 + (nz(v_pos.xz * 3.0) - 0.5) * 0.25 * (1.0 - u_maq) + (nz(v_pos.xz * 30.0) - 0.5) * 0.1 * (1.0 - u_maq);
    }
    // ombre portée (PCF 3x3)
    vec3 lp = v_lpos.xyz / v_lpos.w * 0.5 + 0.5; float sh = 1.0;
    if (lp.x > 0.0 && lp.x < 1.0 && lp.y > 0.0 && lp.y < 1.0 && lp.z < 1.0) {
      float s = 0.0, t = 1.0 / 2048.0;
      for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += texture(u_sh, vec3(lp.xy + vec2(i, j) * t * 1.5, lp.z - 0.0015));
      sh = s / 9.0;
    }
    vec3 L = normalize(u_sun), V = normalize(u_eye - v_pos), H = normalize(L + V);
    float dif = max(dot(n, L), 0.0);
    if (m == 5) dif = abs(dot(n, L)) * 0.9; // toile : la lumière traverse
    vec3 hemi = mix(u_gnd, u_sky, n.y * 0.5 + 0.5);
    vec3 c = lin(base) * (hemi * 0.78 + u_sunCol * dif * sh * 1.15);
    c += u_sunCol * spec * pow(max(dot(n, H), 0.0), mix(8.0, 90.0, 1.0 - rough)) * sh;
    // légère occlusion au ras du sol
    if (v_pos.y > -0.03) c *= mix(0.8, 1.0, smoothstep(0.0, 0.2, v_pos.y));
    c = c / (c + vec3(0.85)) * 1.6;
    o = vec4(pow(c, vec3(1.0 / 2.2)), u_alpha);
  }`;
  const SVS = `#version 300 es
  layout(location=0) in vec3 a_pos; layout(location=4) in float a_clip; uniform mat4 u_lvp; uniform vec4 u_clip; out float v_cut;
  void main(){ v_cut = (a_clip > 0.5 && dot(vec4(a_pos,1.0), u_clip) > 0.0) ? 1.0 : 0.0; gl_Position = u_lvp * vec4(a_pos, 1.0); }`;
  const SFS = `#version 300 es
  precision mediump float; in float v_cut; out vec4 o; void main(){ if (v_cut > 0.5) discard; o = vec4(1.0); }`;

  // ---------------- géométrie ----------------
  // tampon : pos3 nor3 col3 mat1 clip1 uv2 = 13 flottants par sommet
  function Builder() { this.v = []; }
  Builder.prototype = {
    push(p, n, c, m, clip, uv) { this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], m, clip ? 1 : 0, uv ? uv[0] : 0, uv ? uv[1] : 0); },
    tri(a, b, c, col, m, clip, na, nb, nc) {
      if (!na) { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const L = Math.hypot(...n) || 1; n = n.map(x => x / L); na = nb = nc = n; }
      this.push(a, na, col, m, clip); this.push(b, nb, col, m, clip); this.push(c, nc, col, m, clip);
    },
    quad(a, b, c, d, col, m, clip) { this.tri(a, b, c, col, m, clip); this.tri(a, c, d, col, m, clip); }
  };
  // repère d'un élément : rotation autour de y + translation
  function Frame(x, y, z, rotDeg) { const a = (rotDeg || 0) * Math.PI / 180; this.x = x; this.y = y; this.z = z; this.c = Math.cos(a); this.s = Math.sin(a); }
  Frame.prototype.p = function (lx, ly, lz) { return [this.x + this.c * lx - this.s * lz, this.y + ly, this.z + this.s * lx + this.c * lz]; };
  Frame.prototype.n = function (nx, ny, nz) { return [this.c * nx - this.s * nz, ny, this.s * nx + this.c * nz]; };

  // boîte arrondie (coins sphériques de rayon r) : coussins, matelas, meubles
  function rbox(B, F, cx, cy, cz, w, h, d, r, col, m, seg) {
    seg = seg || 4; r = Math.min(r, w / 2, h / 2, d / 2);
    const hw = w / 2, hh = h / 2, hd = d / 2, iw = hw - r, ih = hh - r, id = hd - r;
    const vert = (x, y, z) => { const ix = Math.max(-iw, Math.min(iw, x)), iy = Math.max(-ih, Math.min(ih, y)), iz = Math.max(-id, Math.min(id, z));
      let nx = x - ix, ny = y - iy, nz = z - iz; const L = Math.hypot(nx, ny, nz);
      if (L < 1e-9) { return { p: F.p(cx + x, cy + y, cz + z), n: F.n(0, 1, 0) }; }
      nx /= L; ny /= L; nz /= L; return { p: F.p(cx + ix + nx * r, cy + iy + ny * r, cz + iz + nz * r), n: F.n(nx, ny, nz) }; };
    const faces = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
    const S = seg * 2 + 2;
    faces.forEach(([N, U, V]) => {
      const ext = v => Math.abs(v[0]) * hw + Math.abs(v[1]) * hh + Math.abs(v[2]) * hd;
      const eu = ext(U), ev = ext(V), en = ext(N);
      // grille plus fine près des bords (là où l'arrondi tourne)
      const tsU = [], tsV = [];
      const ticks = (e, out) => { out.push(-e); for (let k = 1; k <= seg; k++) out.push(-e + r * (1 - Math.cos(k / seg * Math.PI / 2))); for (let k = seg; k >= 1; k--) out.push(e - r * (1 - Math.cos(k / seg * Math.PI / 2))); out.push(e); };
      ticks(eu, tsU); ticks(ev, tsV);
      const P = (a, b) => { const x = N[0] * en + U[0] * a + V[0] * b, y = N[1] * en + U[1] * a + V[1] * b, z = N[2] * en + U[2] * a + V[2] * b; return vert(x, y, z); };
      for (let i = 0; i + 1 < tsU.length; i++) for (let j = 0; j + 1 < tsV.length; j++) {
        const a = P(tsU[i], tsV[j]), b = P(tsU[i + 1], tsV[j]), c = P(tsU[i + 1], tsV[j + 1]), dd = P(tsU[i], tsV[j + 1]);
        B.tri(a.p, b.p, c.p, col, m, false, a.n, b.n, c.n); B.tri(a.p, c.p, dd.p, col, m, false, a.n, c.n, dd.n);
      }
    });
  }
  function box(B, F, cx, cy, cz, w, h, d, col, m) { rbox(B, F, cx, cy, cz, w, h, d, 0.004, col, m, 1); }
  // cylindre entre deux points (repère local de F)
  function cyl(B, F, a, b, r, col, m, seg, clip, caps) {
    seg = seg || 14;
    const A = F.p(...a), Bp = F.p(...b), ax = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]], L = Math.hypot(...ax), u = ax.map(v => v / L);
    let t = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let p1 = [u[1] * t[2] - u[2] * t[1], u[2] * t[0] - u[0] * t[2], u[0] * t[1] - u[1] * t[0]]; const l1 = Math.hypot(...p1); p1 = p1.map(v => v / l1);
    const p2 = [u[1] * p1[2] - u[2] * p1[1], u[2] * p1[0] - u[0] * p1[2], u[0] * p1[1] - u[1] * p1[0]];
    const ring = (C, k) => { const t = k / seg * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t); const n = [p1[0] * c + p2[0] * s, p1[1] * c + p2[1] * s, p1[2] * c + p2[2] * s]; return { p: [C[0] + n[0] * r, C[1] + n[1] * r, C[2] + n[2] * r], n }; };
    for (let k = 0; k < seg; k++) {
      const a0 = ring(A, k), a1 = ring(A, k + 1), b0 = ring(Bp, k), b1 = ring(Bp, k + 1);
      B.tri(a0.p, b0.p, b1.p, col, m, clip, a0.n, b0.n, b1.n); B.tri(a0.p, b1.p, a1.p, col, m, clip, a0.n, b1.n, a1.n);
      if (caps !== false) { B.tri(Bp, b1.p, b0.p, col, m, clip, u, u, u); const nu = u.map(v => -v); B.tri(A, a0.p, a1.p, col, m, clip, nu, nu, nu); }
    }
  }
  // dalle : polygone horizontal extrudé (points {x,z} en coordonnées monde)
  function slab(B, poly, y0, y1, col, colSide, m, clip) {
    const c = poly.reduce((a, p) => [a[0] + p.x / poly.length, a[1] + p.z / poly.length], [0, 0]);
    let a2 = 0; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; a2 += p.x * q.z - q.x * p.z; });
    const P = a2 > 0 ? poly.slice().reverse() : poly; // sens pour que la normale du dessus monte
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[(i + 1) % P.length];
      B.tri([c[0], y1, c[1]], [q.x, y1, q.z], [p.x, y1, p.z], col, m, clip, [0, 1, 0], [0, 1, 0], [0, 1, 0]);
      B.tri([c[0], y0, c[1]], [p.x, y0, p.z], [q.x, y0, q.z], colSide, 0, clip, [0, -1, 0], [0, -1, 0], [0, -1, 0]);
      B.quad([p.x, y0, p.z], [q.x, y0, q.z], [q.x, y1, q.z], [p.x, y1, p.z], colSide, m === 1 ? 2 : m, clip);
    }
  }

  // ---------------- palettes ----------------
  const PAL = {
    real: { wood: [196, 152, 104], woodDark: [118, 82, 52], strut: [184, 140, 92], floor: [196, 156, 110], floorSide: [150, 112, 74], toile: [246, 240, 224],
      ground: [126, 152, 96], white: [238, 239, 236], ceramic: [246, 246, 244], metal: [58, 58, 62], steel: [176, 180, 184], glass: [200, 225, 235],
      sheet: [240, 236, 228], pillow: [248, 246, 240], cushion: null, sky: [0.58, 0.68, 0.82], gnd: [0.42, 0.40, 0.33], sun: [1.0, 0.95, 0.86], bg: [0.86, 0.9, 0.95] },
    maquette: { wood: [228, 214, 190], woodDark: [214, 198, 172], strut: [222, 206, 178], floor: [232, 218, 192], floorSide: [214, 198, 172], toile: [252, 252, 250],
      ground: [246, 246, 244], white: [244, 244, 242], ceramic: [248, 248, 247], metal: [205, 205, 205], steel: [222, 222, 222], glass: [225, 236, 242],
      sheet: [246, 246, 244], pillow: [250, 250, 249], cushion: [240, 238, 234], sky: [0.74, 0.76, 0.8], gnd: [0.62, 0.61, 0.58], sun: [1.0, 0.98, 0.95], bg: [0.94, 0.94, 0.93] }
  };
  const c255 = c => c.map(v => v / 255);

  // ---------------- meubles modélisés ----------------
  // repère local : x = largeur, z = profondeur (z négatif = dos, côté paroi), y = haut
  function buildItem(B, it, y0, pal, extra) {
    const F = new Frame(it.x, y0, it.z, it.rot), W = it.w, D = it.d, H = it.h, w2 = W / 2, d2 = D / 2;
    const C = k => c255(pal[k]);
    const own = c255(pal.cushion || (extra.libColor || [190, 190, 190]));
    const leg = (x, z, h, r) => cyl(B, F, [x, 0, z], [x, h, z], r || 0.022, C('woodDark'), 2, 10);
    switch (it.type) {
      case 'lit1': case 'lit2': case 'lit2xl': {
        const fh = 0.22, mh = 0.2;
        rbox(B, F, 0, fh / 2, 0, W, fh, D, 0.02, C('wood'), 2, 2);                                // cadre
        rbox(B, F, 0, 0.45, -d2 + 0.03, W + 0.02, 0.9, 0.06, 0.02, C('wood'), 2, 2);              // tête de lit
        rbox(B, F, 0, fh + mh / 2, 0.02, W - 0.04, mh, D - 0.08, 0.05, C('sheet'), 3, 3);          // matelas
        rbox(B, F, 0, fh + mh + 0.035, 0.28, W - 0.01, 0.08, D - 0.5, 0.04, own, 3, 3);            // couette
        rbox(B, F, 0, fh + mh + 0.05, -d2 + 0.62, W - 0.01, 0.1, 0.22, 0.05, own.map(v => Math.min(1, v * 1.08)), 3, 3); // revers
        const np = W > 1.1 ? 2 : 1, pw = (W - 0.16) / np - 0.04;
        for (let i = 0; i < np; i++) rbox(B, F, -w2 + 0.1 + pw / 2 + i * (pw + 0.04), fh + mh + 0.07, -d2 + 0.26, pw, 0.13, 0.36, 0.06, C('pillow'), 3, 3);
        break; }
      case 'canape': {
        const sh = 0.42, ah = 0.62, bh = H, aw = 0.18, bd = 0.2;
        rbox(B, F, 0, 0.14, 0, W, 0.16, D, 0.03, own.map(v => v * 0.85), 3, 2);                    // socle
        [-1, 1].forEach(s => rbox(B, F, s * (w2 - aw / 2), ah / 2, 0, aw, ah, D, 0.06, own, 3, 3)); // accoudoirs
        rbox(B, F, 0, (bh + 0.1) / 2, -d2 + bd / 2, W - 2 * aw + 0.02, bh - 0.1, bd, 0.07, own, 3, 3); // dossier
        const n = W > 1.6 ? 2 : 1, cw = (W - 2 * aw) / n;
        for (let i = 0; i < n; i++) {
          rbox(B, F, -w2 + aw + cw * (i + 0.5), sh - 0.06, bd / 2, cw - 0.015, 0.2, D - bd - 0.02, 0.06, own.map(v => Math.min(1, v * 1.05)), 3, 3);
          rbox(B, F, -w2 + aw + cw * (i + 0.5), sh + 0.2, -d2 + bd + 0.08, cw - 0.04, 0.42, 0.16, 0.07, own.map(v => Math.min(1, v * 1.03)), 3, 3);
        }
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => leg(i * (w2 - 0.06), j * (d2 - 0.06), 0.06, 0.02));
        break; }
      case 'table': case 'rect': {
        if (it.type === 'rect') { rbox(B, F, 0, H / 2, 0, W, H, D, 0.02, own, 2, 2); break; }
        rbox(B, F, 0, H - 0.02, 0, W, 0.04, D, 0.01, C('wood'), 2, 2);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => leg(i * (w2 - 0.05), j * (d2 - 0.05), H - 0.04, 0.025));
        break; }
      case 'tableR': case 'rond': {
        if (it.type === 'rond') { cylOval(B, F, W / 2, D / 2, 0, H, own, 2); break; }
        cylOval(B, F, W / 2, D / 2, H - 0.035, H, C('wood'), 2);
        cyl(B, F, [0, 0, 0], [0, H - 0.035, 0], 0.045, C('woodDark'), 2, 14);
        cylOval(B, F, W / 4, D / 4, 0, 0.03, C('woodDark'), 2);
        break; }
      case 'chaise': {
        const sh = 0.45;
        rbox(B, F, 0, sh, 0.01, W, 0.04, D - 0.02, 0.01, C('wood'), 2, 2);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => leg(i * (w2 - 0.03), j * (d2 - 0.03), sh - 0.02, 0.016));
        [-1, 1].forEach(i => cyl(B, F, [i * (w2 - 0.03), sh, -d2 + 0.03], [i * (w2 - 0.03), H, -d2 + 0.03], 0.016, C('woodDark'), 2, 8));
        rbox(B, F, 0, H - 0.08, -d2 + 0.03, W - 0.02, 0.14, 0.025, 0.01, C('wood'), 2, 2);
        break; }
      case 'poele': {
        const bh = Math.min(H, 0.85);
        rbox(B, F, 0, 0.05, 0, W + 0.1, 0.03, D + 0.25, 0.005, C('steel'), 6, 1);                  // plaque de sol
        rbox(B, F, 0, 0.12 + (bh - 0.12) / 2, 0, W, bh - 0.12, D, 0.03, C('metal'), 6, 2);
        rbox(B, F, 0, 0.1 + bh * 0.42, d2, W * 0.66, bh * 0.4, 0.012, 0.01, [0.95, 0.55, 0.25], 0, 1); // vitre (lueur)
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => cyl(B, F, [i * (w2 - 0.05), 0.06, j * (d2 - 0.05)], [i * (w2 - 0.05), 0.13, j * (d2 - 0.05)], 0.018, C('metal'), 6, 8));
        const top = extra.flueTop || bh + 1.2;
        cyl(B, F, [0, bh, -0.05], [0, top, -0.05], 0.075, C('metal'), 6, 16);                     // conduit jusqu'à la toile
        break; }
      case 'plan': case 'evier': case 'cuisson': {
        rbox(B, F, 0, 0.05, 0.02, W - 0.02, 0.1, D - 0.08, 0.005, C('woodDark'), 2, 1);           // plinthe
        rbox(B, F, 0, 0.1 + (H - 0.14) / 2, 0, W - 0.01, H - 0.14, D - 0.02, 0.008, C('white'), 0, 1); // caisson
        const nd = Math.max(1, Math.round(W / 0.6));
        for (let i = 1; i < nd; i++) box(B, F, -w2 + i * W / nd, 0.1 + (H - 0.14) / 2, d2 - 0.008, 0.004, H - 0.18, 0.004, c255([150, 150, 150]), 0);
        for (let i = 0; i < nd; i++) box(B, F, -w2 + (i + 0.5) * W / nd, H - 0.12, d2 + 0.004, 0.12, 0.012, 0.012, C('steel'), 6);
        rbox(B, F, 0, H - 0.02, 0, W, 0.04, D, 0.005, C('wood'), 2, 1);                          // plan
        if (it.type === 'evier') {
          rbox(B, F, 0, H - 0.005, 0.02, Math.min(W - 0.2, 0.5), 0.012, D - 0.22, 0.03, C('steel'), 6, 2);
          rbox(B, F, 0, H - 0.0, 0.02, Math.min(W - 0.24, 0.46), 0.014, D - 0.26, 0.03, c255([90, 92, 96]), 6, 2);
          cyl(B, F, [0, H, -d2 + 0.07], [0, H + 0.28, -d2 + 0.07], 0.014, C('steel'), 6, 10);
          cyl(B, F, [0, H + 0.28, -d2 + 0.07], [0, H + 0.28, -d2 + 0.24], 0.012, C('steel'), 6, 10);
        }
        if (it.type === 'cuisson') [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => { cylOval(B, F, 0.08, 0.08, H, H + 0.012, c255([40, 40, 42]), 6, i * W / 4.2, j * D / 4.2); cylOval(B, F, 0.045, 0.045, H + 0.012, H + 0.02, c255([70, 70, 72]), 6, i * W / 4.2, j * D / 4.2); });
        break; }
      case 'frigo': {
        rbox(B, F, 0, H / 2, 0, W, H, D, 0.025, C('white'), 8, 2);
        box(B, F, 0, H * 0.62, d2 + 0.002, W - 0.03, 0.006, 0.004, c255([170, 172, 174]), 0);
        [H * 0.8, H * 0.42].forEach(y => box(B, F, w2 - 0.06, y, d2 + 0.02, 0.02, 0.22, 0.025, C('steel'), 6));
        break; }
      case 'douche': {
        rbox(B, F, 0, 0.04, 0, W, 0.08, D, 0.02, C('ceramic'), 8, 2);
        cyl(B, F, [0, 0.081, 0], [0, 0.083, 0], 0.04, c255([150, 150, 150]), 6, 12);
        // parois vitrées (traitées en verre)
        extra.glass.push({ F, pts: [[w2 - 0.01, 0.08, -d2], [w2 - 0.01, 0.08, d2], [w2 - 0.01, Math.min(H, 2.0), d2], [w2 - 0.01, Math.min(H, 2.0), -d2]] });
        extra.glass.push({ F, pts: [[-w2, 0.08, d2 - 0.01], [w2 * 0.1, 0.08, d2 - 0.01], [w2 * 0.1, Math.min(H, 2.0), d2 - 0.01], [-w2, Math.min(H, 2.0), d2 - 0.01]] });
        cyl(B, F, [-w2 + 0.05, 0.9, -d2 + 0.03], [-w2 + 0.05, Math.min(H, 2.0) - 0.05, -d2 + 0.03], 0.012, C('steel'), 6, 8);
        cyl(B, F, [-w2 + 0.05, Math.min(H, 2.0) - 0.05, -d2 + 0.03], [-w2 + 0.25, Math.min(H, 2.0) - 0.05, -d2 + 0.12], 0.012, C('steel'), 6, 8);
        cylOval(B, F, 0.08, 0.08, Math.min(H, 2.0) - 0.08, Math.min(H, 2.0) - 0.05, C('steel'), 6, -w2 + 0.25, -d2 + 0.12);
        break; }
      case 'wc': {
        rbox(B, F, 0, 0.42, -d2 + 0.1, W * 0.9, 0.84, 0.2, 0.03, C('wood'), 2, 2);                   // caisson (toilette sèche)
        cylOval(B, F, W * 0.38, D * 0.32, 0, 0.42, C('wood'), 2, 0, 0.08);
        cylOval(B, F, W * 0.4, D * 0.34, 0.42, 0.45, C('woodDark'), 2, 0, 0.08);
        break; }
      case 'lavabo': {
        cyl(B, F, [0, 0, -d2 + 0.12], [0, H - 0.12, -d2 + 0.12], 0.07, C('ceramic'), 8, 16);
        rbox(B, F, 0, H - 0.07, 0, W, 0.14, D, 0.05, C('ceramic'), 8, 3);
        cyl(B, F, [0, H, -d2 + 0.06], [0, H + 0.18, -d2 + 0.06], 0.012, C('steel'), 6, 10);
        cyl(B, F, [0, H + 0.18, -d2 + 0.06], [0, H + 0.18, -d2 + 0.16], 0.011, C('steel'), 6, 10);
        break; }
      case 'escalier': {
        const top = extra.stairTop, n = Math.max(6, Math.round(top / 0.19)), run = D / n, th = 0.04;
        for (let k = 0; k < n; k++) { const y = top * (k + 1) / n, z = d2 - run * (k + 0.5); rbox(B, F, 0, y - th / 2, z, W - 0.08, th, run + 0.03, 0.006, C('wood'), 2, 1); }
        [-1, 1].forEach(s => { // limons inclinés
          const a = [s * (w2 - 0.02), 0.08, d2], b = [s * (w2 - 0.02), top, -d2]; cyl(B, F, a, b, 0.03, C('woodDark'), 2, 6);
          cyl(B, F, [a[0], a[1] + 0.9, a[2]], [b[0], b[1] + 0.9, b[2]], 0.018, C('woodDark'), 2, 8); // main courante
          cyl(B, F, [a[0], 0.08, a[2]], [a[0], 0.98, a[2]], 0.018, C('woodDark'), 2, 6);
        });
        break; }
      case 'echelle': {
        const top = extra.stairTop, n = Math.max(5, Math.round(top / 0.25));
        [-1, 1].forEach(s => cyl(B, F, [s * (w2 - 0.03), 0, d2], [s * (w2 - 0.03), top + 0.8, -d2], 0.028, C('wood'), 2, 8));
        for (let k = 1; k <= n; k++) { const t = k / (n + 1), y = (top + 0.8) * t, z = d2 - D * t; rbox(B, F, 0, y, z, W - 0.06, 0.03, 0.12, 0.005, C('wood'), 2, 1); }
        break; }
      default: rbox(B, F, 0, H / 2, 0, W, H, D, 0.02, own, 2, 2);
    }
  }
  // cylindre ovale vertical (local), centre (ox, oz)
  function cylOval(B, F, rx, rz, y0, y1, col, m, ox, oz) {
    ox = ox || 0; oz = oz || 0; const seg = 28;
    for (let k = 0; k < seg; k++) {
      const t0 = k / seg * 2 * Math.PI, t1 = (k + 1) / seg * 2 * Math.PI;
      const p = (t, y) => F.p(ox + rx * Math.cos(t), y, oz + rz * Math.sin(t)), n = t => { const v = [Math.cos(t) / rx, 0, Math.sin(t) / rz], L = Math.hypot(...v); return F.n(v[0] / L, 0, v[2] / L); };
      B.tri(p(t0, y0), p(t1, y1), p(t1, y0), col, m, false, n(t0), n(t1), n(t1)); B.tri(p(t0, y0), p(t0, y1), p(t1, y1), col, m, false, n(t0), n(t0), n(t1));
      B.tri(F.p(ox, y1, oz), p(t1, y1), p(t0, y1), col, m, false, [0, 1, 0], [0, 1, 0], [0, 1, 0]);
    }
  }

  // ---------------- lecture .glb (glTF 2.0 binaire) ----------------
  // gère : maillages triangulés, matrices / TRS des nœuds, couleur de base,
  // texture de couleur (PNG/JPEG intégrée). Pas de Draco ni d'animations.
  async function parseGLB(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('ce n\'est pas un fichier .glb (glTF binaire)');
    let off = 12, json = null, bin = null;
    while (off < buf.byteLength) { const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, len)));
      else if (type === 0x004E4942) bin = buf.slice(off + 8, off + 8 + len);
      off += 8 + len; }
    if (!json) throw new Error('fichier .glb sans contenu');
    if ((json.extensionsRequired || []).length) throw new Error('extensions non gérées : ' + json.extensionsRequired.join(', ') + ' (réexporter sans compression Draco)');
    const acc = i => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
      const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array, 5122: Int16Array, 5120: Int8Array }[a.componentType];
      const stride = bv.byteStride || n * T.BYTES_PER_ELEMENT, base = (bv.byteOffset || 0) + (a.byteOffset || 0), out = new Float32Array(a.count * n), d = new DataView(bin);
      const rd = { 5126: o => d.getFloat32(o, true), 5125: o => d.getUint32(o, true), 5123: o => d.getUint16(o, true), 5121: o => d.getUint8(o), 5122: o => d.getInt16(o, true), 5120: o => d.getInt8(o) }[a.componentType];
      const norm = a.normalized ? { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[a.componentType] || 1 : 1;
      for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) out[i * n + k] = rd(base + i * stride + k * T.BYTES_PER_ELEMENT) / norm;
      return out; };
    const images = await Promise.all((json.images || []).map(async im => {
      if (im.bufferView === undefined) return null;
      const bv = json.bufferViews[im.bufferView];
      const blob = new Blob([new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength)], { type: im.mimeType || 'image/png' });
      try { return await createImageBitmap(blob, { imageOrientation: 'none' }); } catch (e) { return null; }
    }));
    const prims = [];
    const mat4FromTRS = nd => {
      if (nd.matrix) return Float32Array.from(nd.matrix);
      const t = nd.translation || [0, 0, 0], q = nd.rotation || [0, 0, 0, 1], s = nd.scale || [1, 1, 1];
      const [x, y, z, w] = q;
      return new Float32Array([(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
        2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
        2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1]);
    };
    const visit = (ni, parent) => {
      const nd = json.nodes[ni], M = M4.mul(parent, mat4FromTRS(nd));
      if (nd.mesh !== undefined) json.meshes[nd.mesh].primitives.forEach(pr => {
        if (pr.mode !== undefined && pr.mode !== 4) return;
        const P = acc(pr.attributes.POSITION), N = pr.attributes.NORMAL !== undefined ? acc(pr.attributes.NORMAL) : null, UV = pr.attributes.TEXCOORD_0 !== undefined ? acc(pr.attributes.TEXCOORD_0) : null;
        const COL = pr.attributes.COLOR_0 !== undefined ? acc(pr.attributes.COLOR_0) : null, cn = COL ? COL.length / (P.length / 3) : 0;
        const I = pr.indices !== undefined ? acc(pr.indices) : null;
        const mat = pr.material !== undefined ? json.materials[pr.material] : {}, pbr = mat.pbrMetallicRoughness || {};
        const cf = pbr.baseColorFactor || [1, 1, 1, 1];
        let img = null; if (pbr.baseColorTexture) { const tx = json.textures[pbr.baseColorTexture.index]; img = tx && tx.source !== undefined ? images[tx.source] : null; }
        const n = I ? I.length : P.length / 3, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
        const tp = (i, o) => { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; for (let k = 0; k < 3; k++) o[k] = M[k] * x + M[4 + k] * y + M[8 + k] * z + M[12 + k]; };
        const tn = (i, o) => { const x = N[i * 3], y = N[i * 3 + 1], z = N[i * 3 + 2]; for (let k = 0; k < 3; k++) o[k] = M[k] * x + M[4 + k] * y + M[8 + k] * z; const L = Math.hypot(o[0], o[1], o[2]) || 1; o[0] /= L; o[1] /= L; o[2] /= L; };
        const a = [0, 0, 0], b = [0, 0, 0];
        for (let t = 0; t < n; t++) { const i = I ? I[t] : t; tp(i, a); pos.set(a, t * 3); if (N) { tn(i, b); nor.set(b, t * 3); }
          if (UV) { uv[t * 2] = UV[i * 2]; uv[t * 2 + 1] = UV[i * 2 + 1]; }
          for (let k = 0; k < 3; k++) col[t * 3 + k] = cf[k] * (COL ? COL[i * cn + k] : 1); }
        if (!N) for (let t = 0; t + 2 < n; t += 3) { const p0 = pos.subarray(t * 3, t * 3 + 3), p1 = pos.subarray(t * 3 + 3, t * 3 + 6), p2 = pos.subarray(t * 3 + 6, t * 3 + 9);
          const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]; let c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const L = Math.hypot(...c) || 1; c = c.map(x => x / L);
          for (let k = 0; k < 3; k++) nor.set(c, (t + k) * 3); }
        prims.push({ pos, nor, uv, col, img: UV ? img : null });
      });
      (nd.children || []).forEach(c => visit(c, M));
    };
    const I4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const sc = json.scenes ? json.scenes[json.scene || 0] : { nodes: json.nodes.map((_, i) => i) };
    sc.nodes.forEach(n => visit(n, I4));
    const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    prims.forEach(p => { for (let i = 0; i < p.pos.length; i += 3) for (let k = 0; k < 3; k++) { bb[k] = Math.min(bb[k], p.pos[i + k]); bb[k + 3] = Math.max(bb[k + 3], p.pos[i + k]); } });
    if (!prims.length) throw new Error('aucun maillage trouvé dans le fichier');
    return { prims, bbox: bb, size: [bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]] };
  }

  // ---------------- moteur ----------------
  function create(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true });
    if (!gl) return null;
    const prog = (vs, fs) => { const p = gl.createProgram(); [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([t, s]) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); }); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
    const P = prog(VS, FS), SP = prog(SVS, SFS);
    const U = n => gl.getUniformLocation(P, n), SU = n => gl.getUniformLocation(SP, n);
    const SM = 2048, shTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SM, SM, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shTex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const white = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, white); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    const texCache = new Map();
    const texOf = img => { if (!img) return white; if (texCache.has(img)) return texCache.get(img); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); texCache.set(img, t); return t; };
    const mkVao = data => { const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const S = 13 * 4; [[0, 3, 0], [1, 3, 3], [2, 3, 6], [3, 1, 9], [4, 1, 10], [5, 2, 11]].forEach(([l, n, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, S, o * 4); });
      gl.bindVertexArray(null); return { vao, buf: b, count: data.length / 13 }; };
    let draws = [], bounds = { c: [0, 1, 0], r: 4 }, pal = PAL.real, maq = 0, clipPlane = [0, 0, 0, -1e9];

    function setScene(sc) {
      draws.forEach(d => { gl.deleteBuffer(d.buf); gl.deleteVertexArray(d.vao); });
      draws = sc.draws.filter(d => d.data.length).map(d => Object.assign(mkVao(d.data), { tex: d.img ? texOf(d.img) : null, alpha: d.alpha || 1, shadow: d.shadow !== false }));
      bounds = sc.bounds; pal = sc.pal; maq = sc.maq ? 1 : 0;
    }
    function render(cam, cut) {
      const dpr = global.devicePixelRatio || 1, r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
      const eye = [cam.target[0] + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw), cam.target[1] + cam.dist * Math.sin(cam.pitch), cam.target[2] + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw)];
      const vp = M4.mul(M4.persp(0.7, canvas.width / canvas.height, 0.05, 200), M4.look(eye, cam.target, [0, 1, 0]));
      // plan de coupe : vertical, face à la caméra, passant un peu devant l'axe du dôme
      if (cut) { const hx = Math.sin(cam.yaw), hz = Math.cos(cam.yaw); clipPlane = [hx, 0, hz, -(0.15)]; } else clipPlane = [0, 0, 0, -1e9];
      // soleil
      const az = cam.yaw + 1.05, el = 0.72, sd = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)], R = bounds.r * 1.15;
      const le = [bounds.c[0] + sd[0] * 20, bounds.c[1] + sd[1] * 20, bounds.c[2] + sd[2] * 20];
      const lvp = M4.mul(M4.ortho(-R, R, -R, R, 1, 40), M4.look(le, bounds.c, [0, 1, 0]));
      // passe d'ombre
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, SM, SM); gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.useProgram(SP); gl.uniformMatrix4fv(SU('u_lvp'), false, lvp); gl.uniform4fv(SU('u_clip'), [0, 0, 0, -1e9]);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4);
      draws.forEach(d => { if (!d.shadow || d.alpha < 1) return; gl.bindVertexArray(d.vao); gl.drawArrays(gl.TRIANGLES, 0, d.count); });
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      const bg = pal.bg; gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(P);
      gl.uniformMatrix4fv(U('u_vp'), false, vp); gl.uniformMatrix4fv(U('u_lvp'), false, lvp);
      gl.uniform3fv(U('u_sun'), sd); gl.uniform3fv(U('u_sunCol'), pal.sun); gl.uniform3fv(U('u_sky'), pal.sky); gl.uniform3fv(U('u_gnd'), pal.gnd); gl.uniform3fv(U('u_eye'), eye);
      gl.uniform4fv(U('u_clip'), clipPlane); gl.uniform1f(U('u_maq'), maq);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.uniform1i(U('u_sh'), 0); gl.uniform1i(U('u_tex'), 1);
      const pass = transparent => draws.forEach(d => { if ((d.alpha < 1) !== transparent) return;
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, d.tex || white); gl.uniform1i(U('u_useTex'), d.tex ? 1 : 0);
        gl.uniform1f(U('u_alpha'), d.alpha); gl.bindVertexArray(d.vao); gl.drawArrays(gl.TRIANGLES, 0, d.count); });
      gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(true); pass(false);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); pass(true); gl.depthMask(true); gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    }
    return { setScene, render, gl };
  }

  // ---------------- scène complète du dôme meublé ----------------
  // model / state : design.js ; opts = { style:'real'|'maquette', toile:'coupe'|'verre'|'fil', models: Map(id -> glb) }
  function buildScene(Z, model, st, opts) {
    const pal = opts.style === 'maquette' ? PAL.maquette : PAL.real, C = k => c255(pal[k]);
    const opaque = new Builder(), glassB = new Builder(), toileB = new Builder(), draws = [];
    // sol extérieur
    const Rg = model.radius * 4, gp = []; for (let k = 0; k < 48; k++) { const t = k / 48 * 2 * Math.PI; gp.push({ x: Rg * Math.cos(t), z: Rg * Math.sin(t) }); }
    slab(opaque, gp, -0.08, -0.06, C('ground'), C('ground'), 7, false);
    // plancher
    const base = Z.section(model, 0);
    slab(opaque, base, -0.06, 0, C('floor'), C('floorSide'), 1, false);
    // structure : montants (bois) et nœuds
    const strutR = 0.022;
    const F0 = new Frame(0, 0, 0, 0);
    model.lines.forEach(l => cyl(opaque, F0, [l[0].x, l[0].y, l[0].z], [l[1].x, l[1].y, l[1].z], strutR, C('strut'), 2, 8, true, false));
    const nodes = new Map(); model.lines.forEach(l => l.forEach(p => nodes.set(p.x.toFixed(4) + ',' + p.y.toFixed(4) + ',' + p.z.toFixed(4), p)));
    nodes.forEach(p => { const n = Math.hypot(p.x, p.y + 0.5, p.z) || 1; cyl(opaque, F0, [p.x, p.y, p.z], [p.x + p.x / n * 0.02, p.y + (p.y + 0.5) / n * 0.02, p.z + p.z / n * 0.02], 0.04, C('metal'), 6, 10, true); });
    // toile (légèrement à l'extérieur des montants)
    if (opts.toile !== 'fil') (model.skinTris || model.tris).forEach(t => {
      const g = [(t[0].x + t[1].x + t[2].x) / 3, (t[0].y + t[1].y + t[2].y) / 3, (t[0].z + t[1].z + t[2].z) / 3];
      const u = [t[1].x - t[0].x, t[1].y - t[0].y, t[1].z - t[0].z], v = [t[2].x - t[0].x, t[2].y - t[0].y, t[2].z - t[0].z];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const L = Math.hypot(...n); n = n.map(x => x / L);
      if (n[0] * g[0] + n[1] * (g[1] + 0.5) + n[2] * g[2] < 0) n = n.map(x => -x);
      const off = p => [p.x + n[0] * (strutR + 0.004), p.y + n[1] * (strutR + 0.004), p.z + n[2] * (strutR + 0.004)];
      toileB.tri(off(t[0]), off(t[1]), off(t[2]), C('toile'), 5, opts.toile === 'coupe', n, n, n);
    });
    // panneaux Kumiko (NOMAD-2026-003, aperçu) : segments déjà posés par KumikoLayout, côté intérieur des montants
    (opts.kumiko || []).forEach(sg => cyl(opaque, F0, sg.a, sg.b, sg.kind === 'waku' ? 0.010 : (sg.kind === 'jigumi' ? 0.006 : 0.0045),
      C(sg.kind === 'waku' ? 'woodDark' : 'wood'), 2, 6, true, false));
    // mezzanine : plancher, solives de rive, garde-corps sur les bords libres
    const mp = Z.mezzPolygon(model, st.mezz);
    if (mp) {
      const h = st.mezz.h, th = st.mezz.thick;
      slab(opaque, mp, h - th, h, C('floor'), C('wood'), 1, false);
      const wallSec = Z.section(model, h);
      mp.forEach((p, i) => { const q = mp[(i + 1) % mp.length], m = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
        const onWall = wallSec && wallSec.some((a, j) => { const b = wallSec[(j + 1) % wallSec.length], L = Math.hypot(b.x - a.x, b.z - a.z); return Math.abs((b.x - a.x) * (m.z - a.z) - (b.z - a.z) * (m.x - a.x)) / L < 0.03; });
        if (onWall) return;
        const len = Math.hypot(q.x - p.x, q.z - p.z), n = Math.max(1, Math.round(len / 0.12));
        cyl(opaque, F0, [p.x, h + 0.95, p.z], [q.x, h + 0.95, q.z], 0.025, C('wood'), 2, 10);
        cyl(opaque, F0, [p.x, h + 0.1, p.z], [q.x, h + 0.1, q.z], 0.018, C('wood'), 2, 8);
        for (let k = 0; k <= n; k++) { const t = k / n, x = p.x + (q.x - p.x) * t, z = p.z + (q.z - p.z) * t; cyl(opaque, F0, [x, h, z], [x, h + 0.95, z], k % Math.max(1, Math.round(n / 3)) === 0 ? 0.03 : 0.011, C(k % Math.max(1, Math.round(n / 3)) === 0 ? 'woodDark' : 'wood'), 2, 8); }
      });
      // poteaux sous la mezzanine (aux angles libres)
      mp.forEach(p => { if (wallSec && Math.min(...wallSec.map(a => Math.hypot(a.x - p.x, a.z - p.z))) < 0.25) return;
        const ceil = Z.ceilingAt(model, p.x, p.z); if (ceil === null || ceil < h - th) return; cyl(opaque, F0, [p.x * 0.97, 0, p.z * 0.97], [p.x * 0.97, h - th, p.z * 0.97], 0.045, C('woodDark'), 2, 10); });
    }
    // ouvertures : cadre, porte ou vitrage
    (opts.openings || []).forEach(o => {
      const a = o.p0, b = o.p1, s0 = o.sill || 0, s1 = s0 + o.h, nx = o.nx, nz = o.nz, e = -0.05;
      const P = (pt, y, d) => [pt.x + nx * d, y, pt.z + nz * d];
      const Ff = new Frame(0, 0, 0, 0);
      const ck = opts.toile === 'coupe';
      [[a, a], [b, b]].forEach(([p]) => cyl(opaque, Ff, P(p, s0, e), P(p, s1, e), 0.035, C('woodDark'), 2, 6, ck));
      cyl(opaque, Ff, P(a, s1, e), P(b, s1, e), 0.035, C('woodDark'), 2, 6, ck);
      if (s0 > 0) cyl(opaque, Ff, P(a, s0, e), P(b, s0, e), 0.035, C('woodDark'), 2, 6, ck);
      if (o.type === 'porte') opaque.quad(P(a, s0, e), P(b, s0, e), P(b, s1, e), P(a, s1, e), C('woodDark'), 2, ck);
      else glassB.quad(P(a, s0, e), P(b, s0, e), P(b, s1, e), P(a, s1, e), C('glass'), 4, ck);
    });
    // meubles
    const glassList = [];
    st.items.forEach(it => {
      const L = Z.libOf(it.type), y0 = (it.level || 0) ? st.mezz.h : 0;
      const extra = { glass: glassList, libColor: L.color, stairTop: Math.min(it.h, st.mezz.on ? st.mezz.h : it.h) };
      if (it.type === 'poele') { const c = Z.ceilingAt(model, it.x, it.z - 0.05); extra.flueTop = c ? c + 0.4 : 2.5; }
      const glb = it.model && opts.models && opts.models.get(it.model);
      if (glb) {
        // modèle importé : mis aux dimensions de l'élément (largeur, hauteur, profondeur)
        const F = new Frame(it.x, y0, it.z, it.rot), bb = glb.bbox, sx = it.w / (glb.size[0] || 1), sy = it.h / (glb.size[1] || 1), sz = it.d / (glb.size[2] || 1);
        const cx = (bb[0] + bb[3]) / 2, cz = (bb[2] + bb[5]) / 2;
        glb.prims.forEach(pr => { const Bm = new Builder();
          for (let i = 0; i < pr.pos.length / 3; i++) { const p = F.p((pr.pos[i * 3] - cx) * sx, (pr.pos[i * 3 + 1] - bb[1]) * sy, (pr.pos[i * 3 + 2] - cz) * sz);
            let n = [pr.nor[i * 3] / sx, pr.nor[i * 3 + 1] / sy, pr.nor[i * 3 + 2] / sz]; const Ln = Math.hypot(...n) || 1; n = F.n(n[0] / Ln, n[1] / Ln, n[2] / Ln);
            Bm.push(p, n, [pr.col[i * 3], pr.col[i * 3 + 1], pr.col[i * 3 + 2]].map(v => opts.style === 'maquette' ? 0.93 : v), 0, false, [pr.uv[i * 2], pr.uv[i * 2 + 1]]); }
          draws.push({ data: new Float32Array(Bm.v), img: opts.style === 'maquette' ? null : pr.img }); });
      } else buildItem(opaque, it, y0, pal, extra);
    });
    glassList.forEach(g => { const pts = g.pts.map(p => g.F.p(...p)); glassB.quad(pts[0], pts[1], pts[2], pts[3], C('glass'), 4, false); });
    draws.push({ data: new Float32Array(opaque.v) });
    draws.push({ data: new Float32Array(glassB.v), alpha: 0.3, shadow: false });
    draws.push({ data: new Float32Array(toileB.v), alpha: opts.toile === 'verre' ? 0.22 : (opts.style === 'maquette' ? 0.5 : 0.62), shadow: false });
    return { draws, bounds: { c: [0, model.height * 0.45, 0], r: model.radius * 1.6 }, pal: { sky: pal.sky, gnd: pal.gnd, sun: pal.sun, bg: pal.bg }, maq: opts.style === 'maquette' };
  }

  const Design3D = { create, buildScene, parseGLB };
  global.Design3D = Design3D;
})(typeof window !== 'undefined' ? window : globalThis);
