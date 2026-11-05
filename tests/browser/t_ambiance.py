# Ambiances du rendu 3D (onglet Design) : menu visible en réaliste, caché en maquette ;
# chaque ambiance change l'image ; « Plein jour » redonne l'image d'origine ; pas d'erreur.
# Usage : python3 tests/browser/t_ambiance.py dist/nomadom-designer.html [dossier_images]
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
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    shot = lambda: pg.eval_on_selector('#ds3d', 'c => c.toDataURL()')
    three = pg.evaluate('!!(window.Design3DThree && Design3DThree.AMBIANCES)')
    check(three, 'le moteur Three.js expose les 5 ambiances')
    check(pg.is_visible('#ds3dAmb'), 'menu « Ambiance » visible en rendu réaliste')
    opts = pg.eval_on_selector_all('#ds3dAmb option', 'os => os.map(o => o.value)')
    check(opts == ['jour', 'matin', 'couchant', 'couvert', 'nuit'], 'ambiances proposées : ' + ', '.join(opts))
    if OUT: os.makedirs(OUT, exist_ok=True)
    base = shot(); imgs = {'jour': base}
    if OUT: pg.locator('#ds3d').screenshot(path=os.path.join(OUT, 'jour.png'))
    for a in ['matin', 'couchant', 'couvert', 'nuit']:
        pg.select_option('#ds3dAmb', a); pg.wait_for_timeout(1200)
        imgs[a] = shot()
        if OUT: pg.locator('#ds3d').screenshot(path=os.path.join(OUT, a + '.png'))
        check(imgs[a] != base, 'ambiance « ' + a + ' » : l\'image change')
    check(len(set(imgs.values())) == 5, 'les 5 ambiances donnent 5 images différentes')
    pg.select_option('#ds3dAmb', 'jour'); pg.wait_for_timeout(1200)
    check(shot() == base, '« Plein jour » redonne exactement l\'image de départ (pas de régression)')
    pg.select_option('#ds3dStyle', 'maquette'); pg.wait_for_timeout(1200)
    check(not pg.is_visible('#ds3dAmb'), 'menu caché en « Maquette d\'architecte »')
    pg.select_option('#ds3dStyle', 'real'); pg.wait_for_timeout(800)
    check(pg.is_visible('#ds3dAmb'), 'menu de retour en « Réaliste »')
    check(not errs, 'aucune erreur JavaScript' + ('' if not errs else ' : ' + errs[0]))
    b.close()
print('\n' + ('TOUT PASSE' if not fails else str(len(fails)) + ' échec(s)'))
sys.exit(1 if fails else 0)
