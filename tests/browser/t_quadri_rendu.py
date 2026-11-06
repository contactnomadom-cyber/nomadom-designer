# Rendu 3D de la Quadrisphère : ambiances (comme l'onglet Design) et rendu photo (lancer de rayons).
# Usage : python3 tests/browser/t_quadri_rendu.py dist/nomadom-designer.html [dossier_images]
import sys, os
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
OUT = sys.argv[2] if len(sys.argv) > 2 else None
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1300, 'height': 900}); pg.set_default_timeout(120000)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script('window.COVER_PHOTO_SAMPLES=8')   # SwiftShader est lent : 8 échantillons suffisent pour contrôler
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabQuadri'); pg.wait_for_timeout(2500)
    shot = lambda: pg.eval_on_selector('#qd3d', 'c => c.toDataURL()')
    opts = pg.eval_on_selector_all('#qdAmb option', 'os => os.map(o => o.value)')
    check(opts == ['jour', 'matin', 'couchant', 'couvert', 'nuit'], 'ambiances proposées : ' + ', '.join(opts))
    base = shot(); imgs = {'jour': base}
    for a in ['matin', 'couchant', 'couvert', 'nuit']:
        pg.select_option('#qdAmb', a); pg.wait_for_timeout(1200); imgs[a] = shot()
        if OUT: os.makedirs(OUT, exist_ok=True); pg.locator('#qd3d').screenshot(path=os.path.join(OUT, 'quadri-' + a + '.png'))
    check(len(set(imgs.values())) == 5, 'les 5 ambiances donnent 5 images différentes')
    pg.select_option('#qdAmb', 'jour'); pg.wait_for_timeout(1200)
    check(shot() == base, '« Plein jour » redonne l\'image de départ (lumière d\'origine de la Quadrisphère)')
    pg.select_option('#qdStyle', 'maquette'); pg.wait_for_timeout(1000)
    check(not pg.is_visible('#qdAmb'), 'style Maquette : choix d\'ambiance caché')
    pg.select_option('#qdStyle', 'real'); pg.wait_for_timeout(1000)
    check(pg.is_visible('#qdAmb') and pg.evaluate('CoverQuadri.state().amb') == 'jour', 'retour en Réaliste : ambiance gardée')
    # rendu photo
    check(pg.is_visible('#qdPhoto'), 'bouton « Rendu photo » visible')
    pg.select_option('#qdAmb', 'couchant'); pg.wait_for_timeout(1000)
    pg.click('#qdPhoto'); hints = []
    for _ in range(90):
        pg.wait_for_timeout(2000); h = pg.inner_text('#qdHint'); hints.append(h)
        if 'terminé' in h or 'impossible' in h: break
    check(any('%' in h for h in hints), 'rendu photo : la progression s\'affiche')
    check('terminé' in hints[-1] and pg.is_visible('#qdPhotoSave'), 'rendu photo terminé, bouton ⬇ PNG proposé')
    if OUT: pg.locator('#qd3d').screenshot(path=os.path.join(OUT, 'quadri-photo.png'))
    png = pg.evaluate('(() => document.getElementById("qd3d").toDataURL("image/png").length)()')
    check(png > 10000, 'image photo non vide')
    pg.locator('#qd3d').dispatch_event('wheel', {'deltaY': 1}); pg.wait_for_timeout(800)
    check(not pg.is_visible('#qdPhotoSave') and 'glisser' in pg.inner_text('#qdHint'), 'bouger la vue : retour à la 3D, bouton PNG retiré')
    check(not errs, 'aucune erreur JavaScript' + ('' if not errs else ' : ' + errs[0]))
    b.close()
print('\n' + ('TOUT PASSE' if not fails else str(len(fails)) + ' échec(s)'))
sys.exit(1 if fails else 0)
