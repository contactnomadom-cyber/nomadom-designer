// ---------------------------------------------------------
// sun.js — course du soleil et ensoleillement des faces du dôme
// (aide au placement des ouvertures, idée n° 8, étape 2).
//
// - Position du soleil : formules simplifiées de l'almanach (NOAA),
//   précision ≈ 0,5° entre 1950 et 2050, largement assez pour l'atelier.
// - Lieu : liste de villes intégrée (le fichier reste hors ligne).
// - Heure : heure légale belge (UTC+1 l'hiver, UTC+2 l'été, règle européenne).
// - Repère du plan Design : x vers la droite, z vers le bas de l'écran ;
//   « north » = angle du nord, en degrés, compté dans le sens des aiguilles
//   d'une montre depuis le haut du plan (0 = nord en haut, comme avant).
// - Ensoleillement : rayonnement direct par ciel clair seulement (pas de
//   nuages, pas d'ombre du terrain ni des arbres) → statut 🟡 calculé.
// ---------------------------------------------------------
(function (global) {
  'use strict';
  const RAD = Math.PI / 180;

  // villes proposées (latitude, longitude en degrés) — fuseau de l'heure belge
  const CITIES = [
    { id: 'beauraing', name: 'Beauraing', lat: 50.110, lon: 4.957 },
    { id: 'bruxelles', name: 'Bruxelles', lat: 50.847, lon: 4.357 },
    { id: 'namur', name: 'Namur', lat: 50.467, lon: 4.867 },
    { id: 'dinant', name: 'Dinant', lat: 50.261, lon: 4.912 },
    { id: 'ciney', name: 'Ciney', lat: 50.294, lon: 5.100 },
    { id: 'marche', name: 'Marche-en-Famenne', lat: 50.227, lon: 5.344 },
    { id: 'liege', name: 'Liège', lat: 50.633, lon: 5.567 },
    { id: 'dalhem', name: 'Dalhem', lat: 50.713, lon: 5.725 },
    { id: 'verviers', name: 'Verviers', lat: 50.589, lon: 5.866 },
    { id: 'charleroi', name: 'Charleroi', lat: 50.411, lon: 4.444 },
    { id: 'mons', name: 'Mons', lat: 50.454, lon: 3.952 },
    { id: 'tournai', name: 'Tournai', lat: 50.606, lon: 3.388 },
    { id: 'wavre', name: 'Wavre', lat: 50.717, lon: 4.601 },
    { id: 'lln', name: 'Louvain-la-Neuve', lat: 50.668, lon: 4.612 },
    { id: 'arlon', name: 'Arlon', lat: 49.683, lon: 5.817 },
    { id: 'bastogne', name: 'Bastogne', lat: 50.003, lon: 5.719 },
    { id: 'libramont', name: 'Libramont', lat: 49.920, lon: 5.379 },
    { id: 'bouillon', name: 'Bouillon', lat: 49.794, lon: 5.067 },
    { id: 'zaventem', name: 'Zaventem', lat: 50.884, lon: 4.472 },
    { id: 'louvain', name: 'Louvain', lat: 50.879, lon: 4.701 },
    { id: 'hasselt', name: 'Hasselt', lat: 50.930, lon: 5.338 },
    { id: 'anvers', name: 'Anvers', lat: 51.219, lon: 4.402 },
    { id: 'gand', name: 'Gand', lat: 51.054, lon: 3.717 },
    { id: 'bruges', name: 'Bruges', lat: 51.209, lon: 3.225 },
    { id: 'ostende', name: 'Ostende', lat: 51.226, lon: 2.919 },
    { id: 'givet', name: 'Givet (FR)', lat: 50.138, lon: 4.826 },
    { id: 'charleville', name: 'Charleville-Mézières (FR)', lat: 49.762, lon: 4.726 },
    { id: 'lille', name: 'Lille (FR)', lat: 50.629, lon: 3.057 },
    { id: 'reims', name: 'Reims (FR)', lat: 49.258, lon: 4.032 },
    { id: 'metz', name: 'Metz (FR)', lat: 49.119, lon: 6.176 },
    { id: 'paris', name: 'Paris (FR)', lat: 48.857, lon: 2.352 },
    { id: 'lyon', name: 'Lyon (FR)', lat: 45.764, lon: 4.836 },
    { id: 'bordeaux', name: 'Bordeaux (FR)', lat: 44.838, lon: -0.579 },
    { id: 'marseille', name: 'Marseille (FR)', lat: 43.296, lon: 5.370 },
    { id: 'luxembourg', name: 'Luxembourg (LU)', lat: 49.611, lon: 6.131 },
    { id: 'maastricht', name: 'Maastricht (NL)', lat: 50.851, lon: 5.691 },
    { id: 'amsterdam', name: 'Amsterdam (NL)', lat: 52.370, lon: 4.895 },
    { id: 'aachen', name: 'Aix-la-Chapelle (DE)', lat: 50.776, lon: 6.084 },
    { id: 'cologne', name: 'Cologne (DE)', lat: 50.938, lon: 6.960 }
  ];
  const DEFAULT_SITE = { city: 'beauraing', north: 0 };
  const cityOf = id => CITIES.find(c => c.id === id) || CITIES[0];

  // dernier dimanche du mois (mois 1..12) en jour du mois
  function lastSunday(y, m) { const d = new Date(Date.UTC(y, m, 0)); return d.getUTCDate() - d.getUTCDay(); }
  // heure légale belge → instant UTC (ms). Été : du dernier dimanche de mars 01:00 UTC
  // au dernier dimanche d'octobre 01:00 UTC.
  function belgianToUtc(y, mo, d, hours) {
    const asWinter = Date.UTC(y, mo - 1, d) + (hours - 1) * 3600e3;
    const start = Date.UTC(y, 2, lastSunday(y, 3), 1), end = Date.UTC(y, 9, lastSunday(y, 10), 1);
    return asWinter >= start - 3600e3 && asWinter < end - 3600e3 ? asWinter - 3600e3 : asWinter;
  }

  // position du soleil : azimut depuis le nord vers l'est, hauteur au-dessus de l'horizon (radians)
  function position(utcMs, lat, lon) {
    const d = utcMs / 86400e3 + 2440587.5 - 2451545.0;
    const g = (357.529 + 0.98560028 * d) * RAD, q = 280.459 + 0.98564736 * d;
    const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
    const e = (23.439 - 0.00000036 * d) * RAD;
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
    const gmst = 18.697374558 + 24.06570982441908 * d;
    const H = ((gmst * 15 + lon) * RAD - ra), la = lat * RAD;
    const el = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
    let az = Math.atan2(-Math.cos(dec) * Math.sin(H), Math.sin(dec) * Math.cos(la) - Math.cos(dec) * Math.cos(H) * Math.sin(la));
    if (az < 0) az += 2 * Math.PI;
    return { azimuth: az, elevation: el, declination: dec };
  }

  // direction vers le soleil dans le repère du plan (x, y vers le haut, z)
  function direction(azimuth, elevation, northDeg) {
    const t = (northDeg || 0) * RAD, N = [Math.sin(t), -Math.cos(t)], E = [Math.cos(t), Math.sin(t)];
    const h = [N[0] * Math.cos(azimuth) + E[0] * Math.sin(azimuth), N[1] * Math.cos(azimuth) + E[1] * Math.sin(azimuth)];
    return { x: h[0] * Math.cos(elevation), y: Math.sin(elevation), z: h[1] * Math.cos(elevation) };
  }
  // direction d'un point cardinal (azimut en degrés) dans le plan
  function compass(azDeg, northDeg) { const v = direction(azDeg * RAD, 0, northDeg); return { x: v.x, z: v.z }; }

  // rayonnement direct normal par ciel clair (W/m²), modèle de Meinel
  function dni(elevation) {
    if (elevation <= 0.01) return 0;
    const am = 1 / Math.sin(elevation);
    return 1361 * Math.pow(0.7, Math.pow(am, 0.678));
  }

  // course d'une journée : points toutes les `stepMin` minutes où le soleil est levé
  function dayPath(site, y, mo, d, stepMin) {
    const c = cityOf(site.city), out = [];
    for (let m = 0; m <= 24 * 60; m += stepMin || 20) {
      const p = position(belgianToUtc(y, mo, d, m / 60), c.lat, c.lon);
      if (p.elevation > 0) out.push(Object.assign({ hour: m / 60 }, p, direction(p.azimuth, p.elevation, site.north)));
    }
    return out;
  }

  // normale extérieure d'un triangle du dôme (orientée à l'opposé de l'axe intérieur)
  function outwardNormal(t, axisY) {
    const u = [t[1].x - t[0].x, t[1].y - t[0].y, t[1].z - t[0].z], v = [t[2].x - t[0].x, t[2].y - t[0].y, t[2].z - t[0].z];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const L = Math.hypot(n[0], n[1], n[2]) || 1; n = n.map(a => a / L);
    const c = [(t[0].x + t[1].x + t[2].x) / 3, (t[0].y + t[1].y + t[2].y) / 3, (t[0].z + t[1].z + t[2].z) / 3];
    if (n[0] * c[0] + n[1] * (c[1] - axisY) + n[2] * c[2] < 0) n = n.map(a => -a);
    return { x: n[0], y: n[1], z: n[2] };
  }

  // ensoleillement direct d'une liste de triangles, en kWh/m² sur une journée de ciel clair,
  // le 21 décembre (hiver) et le 21 juin (été) ; « balance » entre -1 (à protéger) et +1 (conseillé)
  function faceExposure(tris, height, site, year) {
    const y = year || 2026, axisY = height * 0.35;
    const days = { hiver: dayPath(site, y, 12, 21, 10), ete: dayPath(site, y, 6, 21, 10) };
    const out = tris.map(t => {
      const n = outwardNormal(t, axisY), r = {};
      for (const k in days) r[k] = days[k].reduce((s, p) => s + Math.max(0, n.x * p.x + n.y * p.y + n.z * p.z) * dni(p.elevation) * (10 / 60), 0) / 1000;
      return { normal: n, hiver: r.hiver, ete: r.ete };
    });
    const maxW = Math.max(1e-9, ...out.map(f => f.hiver)), maxS = Math.max(1e-9, ...out.map(f => f.ete));
    out.forEach(f => {
      f.balance = Math.max(-1, Math.min(1, f.hiver / maxW - f.ete / maxS));
      f.verdict = f.balance > 0.15 ? 'conseille' : f.balance < -0.15 ? 'proteger' : 'neutre';
    });
    return out;
  }

  // nom du point cardinal (16 directions) d'un azimut en degrés
  const CARD = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  const cardinal = azDeg => CARD[Math.round(((azDeg % 360) + 360) % 360 / 22.5) % 16];
  // azimut (degrés depuis le nord) d'une direction horizontale du plan
  function azimuthOf(v, northDeg) {
    const t = (northDeg || 0) * RAD, N = [Math.sin(t), -Math.cos(t)], E = [Math.cos(t), Math.sin(t)];
    const a = Math.atan2(v.x * E[0] + v.z * E[1], v.x * N[0] + v.z * N[1]) / RAD;
    return (a + 360) % 360;
  }

  const Sun = { CITIES, DEFAULT_SITE, cityOf, belgianToUtc, position, direction, compass, dni, dayPath, outwardNormal, faceExposure, cardinal, azimuthOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = Sun;
  else global.Sun = Sun;
})(typeof window !== 'undefined' ? window : globalThis);
