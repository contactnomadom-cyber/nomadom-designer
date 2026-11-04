# NOMAD-2026-008 Lot 1 : onglet Base — vue 3D fixe pendant le défilement des réglages,
# cadres réglables (poignée, repli), taille mémorisée, aucun chiffre changé.
import sys, os
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 900})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.evaluate("() => { try { localStorage.removeItem('nomadom.ui.split.base') } catch (e) {} }")
    pg.reload(); pg.wait_for_timeout(1500)
    pg.click('#tabBase'); pg.wait_for_timeout(1200)
    kpis0 = pg.inner_text('#baseKpis'); head0 = pg.inner_text('#headDome')
    check(len(kpis0.strip()) > 20, 'chiffres clés affichés')
    for i in ['paramDetail', 'paramMethod', 'paramPartial', 'paramDiameter', 'btnRegenerate', 'paramStructure',
              'paramSupportH', 'btnBaseOpen', 'baseWarn', 'domeStatus', 'base3d', 'baseTrace', 'baseKpis',
              'baseOpenings', 'baseFloor', 'baseStruts', 'baseTris']:
        check(pg.query_selector('#' + i) is not None, 'élément conservé : #' + i)

    def view_box(): return pg.evaluate("() => { const r = document.getElementById('base3d').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, r.width, r.height] }")
    vh = pg.evaluate('innerHeight')
    # 1. défiler jusqu'au plancher : la vue 3D reste entièrement visible
    pg.evaluate("() => document.getElementById('baseFloor').scrollIntoView({block: 'center'})")
    pg.wait_for_timeout(300)
    sy = pg.evaluate('scrollY'); v = view_box()
    check(sy > 100, 'la page a bien défilé jusqu\'au plancher (scrollY=%d)' % sy)
    check(v[1] >= 0 and v[3] <= vh and v[5] > 250, 'vue 3D entièrement visible pendant le défilement : %s' % [round(x) for x in v])
    pg.evaluate("() => document.getElementById('baseTris').scrollIntoView({block: 'end'})"); pg.wait_for_timeout(300)
    v = view_box(); check(v[1] >= 0 and v[3] <= vh, 'vue 3D encore visible tout en bas des réglages')
    pg.evaluate('scrollTo(0, 0)'); pg.wait_for_timeout(200)

    # 2. poignée : glisser vers la gauche réduit la vue
    w0 = view_box()[4]
    h = pg.eval_on_selector('#baseSplitHandle .split-grip', 'e => { const r = e.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2] }')
    sp = pg.eval_on_selector('#baseSplit', 'e => { const r = e.getBoundingClientRect(); return [r.left, r.width] }')
    pg.mouse.move(h[0], h[1]); pg.mouse.down(); pg.mouse.move(sp[0] + sp[1] * 0.40, h[1], steps=8); pg.mouse.up(); pg.wait_for_timeout(400)
    w1 = view_box()[4]
    check(w1 < w0 - 100, 'la poignée réduit la vue 3D (%d → %d px)' % (w0, w1))
    cw = pg.eval_on_selector('#base3d', 'e => e.width / e.getBoundingClientRect().width')
    check(0.9 < cw < 2.1, 'la vue 3D est redessinée à sa nouvelle taille (rapport %.2f)' % cw)
    saved = pg.evaluate("() => JSON.parse(localStorage.getItem('nomadom.ui.split.base'))")
    check(saved and abs(saved['ratio'] - 40) < 3, 'taille mémorisée : %s' % saved)

    # 3. repli du cadre des réglages, puis de la vue
    pg.click('#baseSplitHandle .split-fold[data-fold="opts"]'); pg.wait_for_timeout(300)
    check(not pg.is_visible('#baseSplitOpts') and view_box()[4] > 1000, 'réglages repliés : la vue prend toute la largeur')
    pg.click('#baseSplitHandle .split-fold:not([hidden])'); pg.wait_for_timeout(300)
    check(pg.is_visible('#baseSplitOpts') and pg.is_visible('#base3d'), 'réglages rouverts')
    pg.click('#baseSplitHandle .split-fold[data-fold="view"]'); pg.wait_for_timeout(300)
    check(not pg.is_visible('#base3d') and pg.is_visible('#paramDiameter'), 'vue repliée : seuls les réglages restent')

    # 4. rechargement : repli et taille retrouvés
    pg.reload(); pg.wait_for_timeout(1500); pg.click('#tabBase'); pg.wait_for_timeout(1000)
    check(not pg.is_visible('#base3d'), 'repli retrouvé après rechargement')
    pg.click('#baseSplitHandle .split-fold:not([hidden])'); pg.wait_for_timeout(400)
    w2 = view_box()[4]
    check(abs(w2 - w1) < 15, 'taille retrouvée après rechargement (%d ≈ %d px)' % (w2, w1))

    # 5. double-clic sur la poignée : taille par défaut
    pg.dblclick('#baseSplitHandle .split-grip'); pg.wait_for_timeout(300)
    check(abs(view_box()[4] - w0) < 15, 'double-clic : taille par défaut retrouvée')

    # 6. aucun chiffre changé
    check(pg.inner_text('#baseKpis') == kpis0 and pg.inner_text('#headDome') == head0, 'chiffres clés et en-tête identiques')

    # 7. mode tracé des ouvertures : la vue de tracé suit aussi le cadre
    pg.click('#btnBaseOpen'); pg.wait_for_timeout(400)
    pg.evaluate("() => document.getElementById('baseFloor').scrollIntoView({block: 'center'})"); pg.wait_for_timeout(200)
    r = pg.eval_on_selector('#baseTrace', 'e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, r.height] }')
    check(r[0] >= 0 and r[1] <= vh and r[2] > 250, 'vue de tracé visible pendant le défilement')
    pg.click('#btnBaseOpen'); pg.wait_for_timeout(300)

    # 8. Quadrisphère : mêmes cadres, mémoire séparée de Base
    pg.evaluate('scrollTo(0, 0)'); pg.click('#tabQuadri'); pg.wait_for_timeout(1500)
    for i in ['qd3d', 'qdKpis', 'qdCut', 'qdNodes']:
        check(pg.query_selector('#' + i) is not None, 'Quadrisphère : élément conservé #' + i)
    qk0 = pg.inner_text('#qdKpis')
    pg.evaluate("() => document.getElementById('qdNodes').scrollIntoView({block: 'end'})"); pg.wait_for_timeout(300)
    q = pg.eval_on_selector('#qd3d', 'e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, r.width, r.height] }')
    check(q[0] >= 0 and q[1] <= vh and q[3] > 250, 'Quadrisphère : vue 3D visible tout en bas des réglages %s' % [round(x) for x in q])
    pg.click('#qdSplitHandle .split-fold[data-fold="opts"]'); pg.wait_for_timeout(500)
    q2 = pg.eval_on_selector('#qd3d', 'e => [e.getBoundingClientRect().width, e.width / e.getBoundingClientRect().width]')
    check(q2[0] > q[2] + 200 and 0.9 < q2[1] < 2.1, 'Quadrisphère : réglages repliés, vue élargie et redessinée %s' % q2)
    check(pg.evaluate("() => JSON.parse(localStorage.getItem('nomadom.ui.split.quadri')).fold") == 'opts', 'Quadrisphère : repli mémorisé à part')
    pg.click('#qdSplitHandle .split-fold:not([hidden])'); pg.wait_for_timeout(300)
    check(pg.inner_text('#qdKpis') == qk0, 'Quadrisphère : chiffres identiques')

    # 9. Cover+ : dôme 3D et patron 2D empilés, fixes pendant le défilement
    pg.evaluate('scrollTo(0, 0)'); pg.click('#tabCover'); pg.wait_for_timeout(1200)
    pg.click('#btnDevelopEtages'); pg.wait_for_timeout(300)
    for _ in range(200):
        if 'morceaux' in pg.inner_text('#dev2dInfo'): break
        pg.wait_for_timeout(300)
    info0 = pg.inner_text('#dev2dInfo')
    check('morceaux' in info0, 'Cover+ : découpe par étages calculée (' + info0 + ')')
    pg.evaluate("() => document.getElementById('edgeClasses').scrollIntoView({block: 'end'})"); pg.wait_for_timeout(400)
    c3 = pg.eval_on_selector('#viewer3d', 'e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, r.height] }')
    c2 = pg.eval_on_selector('#viewer2d', 'e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, r.height] }')
    check(c3[0] >= 0 and c2[1] <= vh and c3[2] > 180 and c2[2] > 180 and c3[1] <= c2[0], 'Cover+ : 3D au-dessus, 2D en dessous, les deux visibles en bas des réglages %s %s' % ([round(x) for x in c3], [round(x) for x in c2]))
    pg.click('#coverSplitHandle .split-fold[data-fold="opts"]'); pg.wait_for_timeout(600)
    r2 = pg.eval_on_selector('#viewer2d', 'e => e.width / e.getBoundingClientRect().width')
    check(not pg.is_visible('#coverSplitOpts') and 0.9 < r2 < 2.1, 'Cover+ : réglages repliés, patron redessiné en grand (%.2f)' % r2)
    pg.click('#coverSplitHandle .split-fold:not([hidden])'); pg.wait_for_timeout(400)
    check(pg.inner_text('#dev2dInfo') == info0, 'Cover+ : même résultat de découpe')

    # 10. Design : plan et rendu 3D empilés, fixes pendant le défilement
    pg.evaluate('scrollTo(0, 0)'); pg.click('#tabDesign'); pg.wait_for_timeout(2000)
    for i in ['dsPlan', 'ds3d', 'dsProps', 'dsList', 'dsKumiko', 'dsPrint', 'dsLevel', 'dsMezzOn', 'dsKmPattern']:
        check(pg.query_selector('#' + i) is not None, 'Design : élément conservé #' + i)
    check(pg.query_selector('#dsSplitHandle .split-fold') is not None, 'Design : poignée en place')
    pg.evaluate("() => document.querySelector('#viewDesign .ds-actions').scrollIntoView({block: 'end'})"); pg.wait_for_timeout(400)
    d1 = pg.eval_on_selector('#dsPlan', 'e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, r.height] }')
    d2 = pg.eval_on_selector('#ds3d', 'e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, r.height] }')
    check(d1[0] >= 0 and d2[1] <= vh and d1[2] > 180 and d2[2] > 180, 'Design : plan et 3D visibles en bas des réglages %s %s' % ([round(x) for x in d1], [round(x) for x in d2]))
    pg.click('#dsSplitHandle .split-fold[data-fold="opts"]'); pg.wait_for_timeout(600)
    rp = pg.eval_on_selector('#dsPlan', 'e => e.width / e.getBoundingClientRect().width')
    check(not pg.is_visible('#dsSplitOpts') and 0.9 < rp < 2.1, 'Design : réglages repliés, plan redessiné en grand (%.2f)' % rp)
    pg.click('#dsSplitHandle .split-fold:not([hidden])'); pg.wait_for_timeout(300)

    check(not errs, 'aucune erreur JavaScript : ' + str(errs[:3]))
    b.close()
print('\n' + ('TOUT OK' if not fails else 'ÉCHECS : %d' % len(fails)))
sys.exit(1 if fails else 0)
