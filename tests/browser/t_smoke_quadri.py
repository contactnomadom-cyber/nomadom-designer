import sys, os
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1250}); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(APP); pg.wait_for_timeout(2000)
    pg.click('#tabQuadri'); pg.wait_for_timeout(2500)
    vis = pg.evaluate("[...document.querySelectorAll('main > section, main > div')].filter(e => e.offsetParent !== null).map(e => e.id + ':' + e.innerText.length)")
    pg.click('#tabDesign'); pg.wait_for_timeout(3000)
    d = pg.evaluate("document.getElementById('viewDesign').innerText.length")
    pg.click('#tabBase'); pg.wait_for_timeout(800)
    print('vues visibles Quadri', vis, '· Design texte', d, '· erreurs', errs[:3])
    print('RÉSULTAT :', 'OK' if not errs and d > 100 else 'ÉCHEC')
    b.close()
