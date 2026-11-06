# Mode tuilage (Cover+) : sens de l'eau et bords DESSUS (bleu) / DESSOUS (orange)
# sur le dôme 3D, les patrons 2D (morceau, vue aplatie) et les fiches de traçage imprimées.
# Usage : python3 tests/browser/t_tuilage.py dist/nomadom-designer.html [dossier_images]
import sys, os, time
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
OUT = sys.argv[2] if len(sys.argv) > 2 else None
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
# pixels proches du bleu DESSUS, de l'orange DESSOUS et du bleu « eau »
COUNT = '''(id) => { const c = document.getElementById(id), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const near = (i, r, g, b) => Math.abs(d[i]-r) + Math.abs(d[i+1]-g) + Math.abs(d[i+2]-b) < 40;
  let A = 0, B = 0, W = 0; for (let i = 0; i < d.length; i += 4) { if (near(i, 31, 111, 209)) A++; else if (near(i, 217, 112, 10)) B++; else if (near(i, 42, 143, 191)) W++; }
  return { A, B, W }; }'''
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    # fiches : on capte la page imprimable au lieu d'ouvrir une fenêtre
    pg.add_init_script("window.open = () => ({ document: { open(){}, write(h){ window.__fiches = h; }, close(){} }, focus(){}, print(){} })")
    pg.goto(APP); pg.wait_for_timeout(1500)
    def wait_info():
        t0 = time.time()
        while time.time() - t0 < 120:
            i = pg.inner_text('#dev2dInfo')
            if 'calcul' not in i and i.strip(): return i
            pg.wait_for_timeout(300)
        return 'TIMEOUT'
    shot = lambda: pg.eval_on_selector('#viewer3d', 'c => c.toDataURL()')
    cnt = lambda cid: pg.evaluate(COUNT, cid)
    pg.click('#tabCover'); pg.wait_for_timeout(800)
    check(pg.is_visible('#btnTuilage') and 'on' not in (pg.get_attribute('#btnTuilage', 'class') or ''), 'bouton « 💧 Tuilage » visible, éteint au départ')
    # 1. dôme 3D, mode Triangle : flèches d'eau seulement
    i0 = shot(); pg.click('#btnTuilage'); pg.wait_for_timeout(600)
    check('on' in pg.get_attribute('#btnTuilage', 'class') and shot() != i0, 'tuilage allumé : le dôme 3D change')
    c3 = cnt('viewer3d')
    check(c3['W'] > 200, 'mode Triangle : flèches « l\'eau descend » dessinées (' + str(c3['W']) + ' px)')
    # 2. Étages : liserés DESSUS / DESSOUS le long des coutures
    pg.click('#btnDevelopEtages'); info = wait_info()
    check(info.startswith('18 morceaux'), 'référence : 18 morceaux (' + info[:40] + ')')
    pg.wait_for_timeout(500); c3 = cnt('viewer3d')
    check(c3['A'] > 300 and c3['B'] > 300, 'dôme 3D en Étages : liserés bleus DESSUS (' + str(c3['A']) + ' px) et orange DESSOUS (' + str(c3['B']) + ' px)')
    if OUT: os.makedirs(OUT, exist_ok=True); pg.locator('#viewer3d').screenshot(path=os.path.join(OUT, 'tuilage-3d.png'))
    # 3. patron d'un morceau
    pg.click('.piece-chip[data-piece]'); pg.wait_for_timeout(800)
    c2 = cnt('viewer2d')
    check(c2['A'] + c2['B'] > 300 and c2['W'] > 100, 'patron d\'un morceau : bords colorés (' + str(c2['A']) + ' / ' + str(c2['B']) + ' px) et flèches d\'eau (' + str(c2['W']) + ' px)')
    if OUT: pg.locator('#viewer2d').screenshot(path=os.path.join(OUT, 'tuilage-morceau.png'))
    # 4. vue aplatie
    pg.click('#btnFlat'); wait_info(); pg.wait_for_timeout(800)
    cf = cnt('viewer2d')
    check(cf['A'] > 300 and cf['B'] > 300 and cf['W'] > 100, 'vue aplatie : DESSUS ' + str(cf['A']) + ' px, DESSOUS ' + str(cf['B']) + ' px, eau ' + str(cf['W']) + ' px')
    if OUT: pg.locator('#viewer2d').screenshot(path=os.path.join(OUT, 'tuilage-aplatie.png'))
    pg.click('#btnTuilage'); pg.wait_for_timeout(800)
    co = cnt('viewer2d')
    check(co['A'] < cf['A'] / 3 and co['B'] < cf['B'] / 3, 'tuilage éteint : la vue aplatie revient sans couleurs de tuilage')
    pg.click('#btnTuilage'); pg.wait_for_timeout(500)
    # 5. fiches de traçage imprimées
    pg.click('#btnDevelopEtages'); wait_info()
    pg.click('#btnPrintAll'); pg.wait_for_timeout(1500)
    h = pg.evaluate('window.__fiches || ""')
    check(h.count('>DESSUS<') >= 18 and h.count('>DESSOUS<') >= 18, 'fiches : mots DESSUS / DESSOUS sur les bords (' + str(h.count('>DESSUS<')) + ' / ' + str(h.count('>DESSOUS<')) + ')')
    check('sens de l\'eau' in h and '#1f6fd1' in h and '#d9700a' in h and 'DESSUS — A (recouvrant)' in h, 'fiches : légende sens de l\'eau, couleurs bleu / orange, tableau des marges')
    ntri, narr = h.count('fill="#eef2f6"'), h.count('fill="#2a8fbf"/>')
    check(ntri > 0 and narr == ntri, 'fiches : une flèche d\'eau par triangle tracé (' + str(narr) + ' / ' + str(ntri) + ')')
    # 6. le choix reste après rechargement
    pg.reload(); pg.wait_for_timeout(1500); pg.click('#tabCover'); pg.wait_for_timeout(500)
    check('on' in (pg.get_attribute('#btnTuilage', 'class') or ''), 'tuilage gardé après rechargement')
    check(not errs, 'aucune erreur JavaScript' + ('' if not errs else ' : ' + errs[0]))
    b.close()
print('\n' + ('TOUT PASSE' if not fails else str(len(fails)) + ' échec(s)'))
sys.exit(1 if fails else 0)
