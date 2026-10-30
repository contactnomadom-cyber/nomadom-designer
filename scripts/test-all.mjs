// Contrôle complet : assemble le HTML, puis lance TOUTE la batterie sur cet artefact.
// Usage : node scripts/test-all.mjs [--quick] [--no-browser] [--only engine,arcs,textile,t_names,…]
//   --quick      : moteur + Arcs + toile 2V/3V + 3 tests navigateur (≈ 3 min)
//   (par défaut) : tout (≈ 10 min)
// Code de sortie 0 seulement si tout passe. Écrit build/check/report.md et, si tout passe,
// build/check/PASS (empreinte du HTML contrôlé), que scripts/release.mjs exige avant publication.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick'), noBrowser = process.argv.includes('--no-browser');
const oi = process.argv.indexOf('--only'), only = oi > 0 ? process.argv[oi + 1].split(',').map(x => x.trim().replace(/\.py$/, '')) : null;
const man = JSON.parse(fs.readFileSync(path.join(root, 'build/manifest.json'), 'utf8'));
const CHECK = path.join(root, 'build/check'); fs.rmSync(CHECK, { recursive: true, force: true }); fs.mkdirSync(CHECK, { recursive: true });

// 1. assemblage
execFileSync('node', [path.join(root, 'scripts/build.mjs')], { stdio: 'inherit' });
const html = path.join(root, man.output), sha = crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex');

// 2. modules extraits DE L'ARTEFACT (on teste ce qui sera livré, pas les sources)
const MODS = path.join(CHECK, 'modules'); fs.mkdirSync(MODS);
const txt = fs.readFileSync(html, 'utf8'), re = /<script(?: id="([^"]+)")?>([\s\S]*?)<\/script>/g; let m;
while ((m = re.exec(txt))) fs.writeFileSync(path.join(MODS, (m[1] ? m[1].replace(/-src$/, '') : 'app') + '.js'), m[2]);

// 3. suites
const N = f => path.join(root, 'tests/node', f), W = f => path.join(root, 'tests/browser', f);
const suites = [
  { key: 'engine', name: 'Moteur (2 références, 867 combinaisons)', cmd: ['node', [N('engine.test.js'), MODS]] },
  { key: 'arcs', name: 'Arcs contre Antiprism', cmd: ['node', [N('arcs.test.js'), MODS]] },
  { key: 'textile', name: 'Toile ' + (quick ? '2V–3V' : '1V–3V'), cmd: ['node', [N('textile.test.js'), MODS, '--v=' + (quick ? '2,3' : '1,2,3')]] },
  { key: 'peel', name: 'Pelure d\'orange (fentes suivant les gabarits)', cmd: ['node', [N('peel.test.js'), MODS]] },
  { key: 'state', name: 'Objet dôme (clé et toile)', cmd: ['node', [N('dome-state.test.js'), MODS]] },
  { key: 'unfold', name: 'Développement 2D (triangles de base, dépliage)', cmd: ['node', [N('unfold.test.js'), MODS]] },
  { key: 'status', name: 'Statuts 🟢🟡🟠🔴', cmd: ['node', [N('status.test.js'), MODS]] },
  { key: 'plan', name: 'Règles du plan de coupe (laize, rangée du bas, comparatif, CSV)', cmd: ['node', [N('plan-rules.test.js'), MODS]] },
  { key: 'design', name: 'Aménagement Design : contrôle des imports (M1)', cmd: ['node', [N('design-import.test.js'), MODS]] },
  // Kumiko n'est pas encore dans le HTML assemblé : testé depuis les sources (NOMAD-2026-002).
  // Le jour où « kumiko-src » entre dans build/manifest.json, remplacer le dossier par MODS.
  { key: 'kumiko', name: 'Panneaux Kumiko (sources, hors HTML)', cmd: ['node', [N('kumiko.test.js'), path.join(root, 'src/products/habitat')]] }
];
const browser = quick ? ['t_beta.py', 't_status.py', 't_names.py']
  : ['t_beta.py', 't_status.py', 't_names.py', 't_cleanup.py', 't_laize.py', 't_bottom.py', 't_kruschke_align.py', 't_stale_optim.py', 't_smoke_quadri.py', 't_axes_block.py', 't_openings.py', 't_diameter.py', 't_design_import.py'];
if (!noBrowser) browser.forEach(b => suites.push({ key: b.replace(/\.py$/, ''), name: 'Navigateur · ' + b, browser: true,
  cmd: ['python3', b === 't_beta.py' ? [W(b), html, path.join(CHECK, 'beta')] : [W(b), html]] }));

// --only : ne garder que les suites demandées (contrôle ciblé, ne vaut jamais feu vert)
if (only) { const unknown = only.filter(k => !suites.some(s => s.key === k));
  if (unknown.length) { console.error('Suite inconnue : ' + unknown.join(', ') + ' · connues : ' + suites.map(s => s.key).join(', ')); process.exit(2); }
  suites.splice(0, suites.length, ...suites.filter(s => only.includes(s.key))); }
const run = s => new Promise(res => {
  const t0 = Date.now(), p = spawn(s.cmd[0], s.cmd[1], { cwd: root }); let out = '';
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  const kill = setTimeout(() => { p.kill('SIGKILL'); out += '\nDÉLAI DÉPASSÉ'; }, 15 * 60 * 1000);
  p.on('close', code => { clearTimeout(kill);
    // t_beta.py n'a pas de code de sortie : il échoue si une ligne ne commence pas par OK
    let ok = code === 0;
    if (s.cmd[1][0].endsWith('t_beta.py')) ok = code === 0 && out.trim().split('\n').filter(Boolean).every(l => l.startsWith('OK'));
    res(Object.assign(s, { ok, secs: Math.round((Date.now() - t0) / 1000), out }));
    console.log((ok ? 'OK     ' : 'ÉCHEC  ') + s.name + ' (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  });
});
// Node en série ; navigateur 3 à la fois (au-delà, Chromium ne charge plus la page à temps)
for (const s of suites.filter(s => !s.browser)) await run(s);
const queue = suites.filter(s => s.browser);
await Promise.all([0, 1, 2].map(async () => { while (queue.length) await run(queue.shift()); }));

// 4. rapport
const bad = suites.filter(s => !s.ok);
let rep = '# Contrôle ' + (quick ? 'rapide' : 'complet') + ' — ' + new Date().toISOString() + '\n\nHTML contrôlé : `' + path.relative(root, html) + '` · sha256 `' + sha + '`\n\n| Suite | Résultat | Durée |\n|---|---|---|\n' +
  suites.map(s => '| ' + s.name + ' | ' + (s.ok ? 'OK' : '**ÉCHEC**') + ' | ' + s.secs + ' s |').join('\n') + '\n';
bad.forEach(s => { rep += '\n## ' + s.name + '\n\n```\n' + s.out.trim().split('\n').slice(-40).join('\n') + '\n```\n'; });
fs.writeFileSync(path.join(CHECK, 'report.md'), rep);
if (!bad.length && !quick && !noBrowser && !only) fs.writeFileSync(path.join(CHECK, 'PASS'), sha + '\n');
console.log('\n' + (bad.length ? bad.length + ' suite(s) en échec — voir build/check/report.md' : 'TOUT PASSE (' + suites.length + ' suites)') +
  (quick || noBrowser || only ? ' · contrôle partiel : ne vaut pas feu vert de publication' : ''));
process.exit(bad.length ? 1 : 0);
