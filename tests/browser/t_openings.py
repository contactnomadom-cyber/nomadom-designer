# Ouvertures (onglet Base) : tracer un contour fermé autour d'un triangle, puis l'effacer.
# Vérifie la chaîne complète : tracé → analyse → dôme toile/structure → affichage Base et Cover+.
import sys, os, re
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabBase'); pg.wait_for_timeout(600)
    faces0 = int(pg.inner_text('#statFaces'))
    pg.click('#btnBaseOpen'); pg.wait_for_timeout(600)
    # repérage des montants sous la souris : étiquettes « Nx–Ny » affichées au survol
    box = pg.query_selector('#baseTrace').bounding_box()
    found = {}
    for y in range(int(box['y'] + 0.25 * box['height']), int(box['y'] + 0.75 * box['height']), 9):
        for x in range(int(box['x'] + 0.3 * box['width']), int(box['x'] + 0.7 * box['width']), 9):
            pg.mouse.move(x, y)
            m = re.match(r'(N\d+)–(N\d+) · ', pg.inner_text('#baseInfo3d'))
            if m and tuple(sorted(m.groups())) not in found: found[tuple(sorted(m.groups()))] = (x, y)
    # un triangle = trois montants deux à deux reliés (a-b, b-c, a-c)
    tri = None
    for (a, c1) in found:
        for (b2, c2) in found:
            if a == b2 and c1 < c2 and (c1, c2) in found: tri = [(a, c1), (a, c2), (c1, c2)]; break
        if tri: break
    check(tri is not None, 'triangle repéré sous la souris (' + str(len(found)) + ' montants survolés)')
    if tri:
        for k in tri: pg.mouse.click(*found[k]); pg.wait_for_timeout(300)
        txt = pg.inner_text('#baseOpenings')
        check('Contour tracé (3 montants)' in txt, 'contour de 3 montants mémorisé')
        check('1 ouverture' in txt and '1 triangle retiré' in txt, 'contour fermé : 1 ouverture, 1 triangle retiré')
        pg.click('#btnBaseOpen'); pg.wait_for_timeout(300)
        pg.click('#tabCover'); pg.wait_for_timeout(800)
        check(int(pg.inner_text('#statFaces')) == faces0 - 1, 'Cover+ : ' + str(faces0 - 1) + ' faces (une retirée)')
        check(('(' + str(faces0 - 1) + ' △)') in pg.inner_text('#openingsReadout'), 'Cover+ : ouverture affichée en lecture seule')
        pg.click('#tabBase'); pg.wait_for_timeout(500)
        pg.click('#opClear'); pg.wait_for_timeout(500)
        check('Aucune' in pg.inner_text('#baseOpenings') or 'Cliquez' in pg.inner_text('#baseOpenings'), 'ouvertures effacées')
        check(int(pg.inner_text('#statFaces')) == faces0, 'dôme plein retrouvé (' + str(faces0) + ' faces)')
    check(not errs, 'aucune erreur JavaScript' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
