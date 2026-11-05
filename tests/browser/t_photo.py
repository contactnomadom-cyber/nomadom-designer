# Test du rendu photo (lancer de rayons) — onglet Design
# Usage : python3 t_photo.py <app.html> [dossier_sortie] [nb_echantillons]
import sys, os, json
from playwright.sync_api import sync_playwright
from PIL import Image

APP = 'file://' + os.path.abspath(sys.argv[1]); OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), '..', 'build', 'check', 'photo'); os.makedirs(OUT, exist_ok=True)
SPP = int(sys.argv[3]) if len(sys.argv) > 3 else 8  # SwiftShader est lent : 8 suffit pour contrôler
res = {'checks': []}
def ok(n, c, i=''): res['checks'].append({'test': n, 'ok': bool(c), 'info': i})

def luminance(path):
    im = Image.open(path).convert('L'); w, h = im.size
    # zone centrale (le dôme), hors ciel et hors légende
    box = im.crop((w // 4, h // 4, 3 * w // 4, int(h * 0.85)))
    px = list(box.get_flattened_data() if hasattr(box, 'get_flattened_data') else box.getdata()); return sum(px) / len(px)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1000, 'height': 800}); pg.set_default_timeout(180000); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.add_init_script('window.COVER_PHOTO_SAMPLES=%d' % SPP)
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    ok('bouton visible', pg.is_visible('#dsPhoto'))
    opts = pg.eval_on_selector_all('#ds3dAmb option', 'o=>o.map(x=>x.value)')
    ok('ambiances proposées', opts == ['jour', 'matin', 'couchant', 'couvert', 'nuit'], str(opts))
    pg.select_option('#ds3dAmb', 'couchant'); pg.wait_for_timeout(1500)  # la photo suit l'ambiance choisie
    pg.select_option('#dsToile', 'verre'); pg.wait_for_timeout(800)
    pg.locator('#ds3d').screenshot(path=f'{OUT}/avant.png')
    pg.click('#dsPhoto')
    hints = []
    for _ in range(120):
        pg.wait_for_timeout(2000); h = pg.inner_text('#ds3dHint'); hints.append(h)
        if 'terminé' in h or 'impossible' in h: break
    ok('rendu avance', any('%' in h for h in hints), hints[-1])
    ok('rendu terminé', 'terminé' in hints[-1], hints[-1])
    pg.locator('#ds3d').screenshot(path=f'{OUT}/photo.png')
    ok('PNG visible', pg.is_visible('#dsPhotoSave'))
    l0, l1 = luminance(f'{OUT}/avant.png'), luminance(f'{OUT}/photo.png')
    res['luminance'] = {'avant': round(l0, 1), 'photo': round(l1, 1)}
    ok('image pas noire', l1 > 0.5 * l0, f'avant {l0:.0f} / photo {l1:.0f}')
    box = pg.locator('#ds3d').bounding_box()
    pg.mouse.move(box['x'] + 300, box['y'] + 200); pg.mouse.wheel(0, -100); pg.wait_for_timeout(800)
    ok('retour 3D', pg.inner_text('#dsPhoto') == '📷 Rendu photo' and not pg.is_visible('#dsPhotoSave'), pg.inner_text('#ds3dHint'))
    pg.locator('#ds3d').screenshot(path=f'{OUT}/apres.png')
    ok('3D intacte après photo', abs(luminance(f'{OUT}/apres.png') - l0) < 0.25 * l0)
    ok('pas d\'erreur', not errs, '; '.join(errs[-4:]))
    res['errs'] = errs[-10:]; b.close()

json.dump(res, open(f'{OUT}/photo.json', 'w'), ensure_ascii=False, indent=1)
for c in res['checks']: print(('OK  ' if c['ok'] else 'ÉCHEC ') + c['test'] + ('' if c['ok'] else '  → ' + c['info']))
print(res['luminance'])
bad = [c for c in res['checks'] if not c['ok']]
print('RÉSULTAT :', 'OK' if not bad else 'ÉCHEC')
sys.exit(1 if bad else 0)
