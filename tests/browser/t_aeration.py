# Aération (onglet Design) : porte + coupole zénitale tracées dans la Base, effet cheminée,
# renouvellements d'air, dimensionnement, alerte d'équilibre, pluie, flèches d'air en 3D.
# Usage : python3 tests/browser/t_aeration.py dist/nomadom-designer.html [dossier_images]
import sys, os
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
OUT = sys.argv[2] if len(sys.argv) > 2 else None
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
# contours (étiquettes de nœuds) : porte de 9 triangles autour de N40 (comme t_door) + pentagone du sommet
CONTOURS = """() => {
  const dome = CoverApp.dome(), L = CoverApp.labels(), P = i => dome.pointById.get(i);
  const ys = dome.points.map(p => p.y), yB = Math.min(...ys), yT = Math.max(...ys);
  const id40 = [...L].find(([, l]) => l === 'N40')[0], a0 = Math.atan2(P(id40).z, P(id40).x);
  const top = dome.points.find(p => p.y === yT)._id;
  const cen = f => { const q = f.pointIds.map(P); return { x: (q[0].x + q[1].x + q[2].x) / 3, y: (q[0].y + q[1].y + q[2].y) / 3, z: (q[0].z + q[1].z + q[2].z) / 3 }; };
  const door = dome.faces.filter(f => { const c = cen(f), d = Math.atan2(c.z, c.x) - a0; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < 0.35 && c.y - yB < 2.3; });
  const cap = dome.faces.filter(f => f.pointIds.includes(top));
  // fenêtre : un triangle bas, hors du sol, à l'opposé de la porte
  const win = dome.faces.filter(f => f.pointIds.every(i => P(i).y - yB > 0.05) && cen(f).y - yB < 1.6)
    .map(f => { const c = cen(f), d = Math.atan2(c.z, c.x) - a0 - Math.PI; return { f, d: Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) }; }).sort((a, b) => a.d - b.d)[0].f;
  const ek = (a, b) => a < b ? a + '-' + b : b + '-' + a, ground = k => k.split('-').every(i => Math.abs(P(+i).y - yB) < 1e-6);
  const border = set => { const cnt = new Map(); set.forEach(f => [[0, 1], [1, 2], [2, 0]].forEach(([i, j]) => { const k = ek(f.pointIds[i], f.pointIds[j]); cnt.set(k, (cnt.get(k) || 0) + 1); }));
    return [...cnt].filter(([k, c]) => c === 1 && !ground(k)).map(([k]) => k.split('-').map(i => L.get(+i))); };
  return { door: border(door), cap: border(cap), win: border([win]), capFaces: cap.length };
}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    info = lambda: pg.inner_text('#dsVentInfo')
    shot3 = lambda: pg.eval_on_selector('#ds3d', 'c => c.toDataURL()')
    check(pg.is_visible('#dsVentBar') and 'folded' in pg.get_attribute('#dsVentBar', 'class') and 'aucune ouverture' in pg.inner_text('#dsVentSum'), 'barre « Aération » repliée par défaut, résumé sur une ligne')
    pg.click('#dsVentBar .group-title'); pg.wait_for_timeout(300)
    check(pg.is_visible('#dsVentTarget') and pg.input_value('#dsVentTarget') == '5', 'barre « Aération » ouverte, objectif 5/h par défaut')
    check('Aucune ouverture' in pg.inner_text('#dsVentList') and 'pas d\'aération' in info(), 'dôme fermé : aucune aération, invitation à tracer porte et coupole')
    img0 = shot3()
    # porte seule
    pg.click('#tabBase'); pg.wait_for_timeout(800)
    C = pg.evaluate(CONTOURS)
    check(C['capFaces'] == 5, 'coupole = pentagone du sommet (5 triangles)')
    pg.evaluate('pairs => CoverApp.setOpenings(pairs)', C['door']); pg.wait_for_timeout(800)
    pg.click('#tabDesign'); pg.wait_for_timeout(2000)
    R = pg.evaluate('CoverDesign._vent()')
    check(len(R['ops']) == 1 and R['ops'][0]['kind'] == 'porte' and R['ops'][0]['open'], 'porte tracée : reconnue, ouvrable par défaut')
    check('sans coupole' in info() and 'pas de coupole ouvrable' in info(), 'porte seule : aération simple, dimensionnement impossible sans coupole')
    ach_door = R['cases'][0]['ach']
    # porte + coupole
    pg.click('#tabBase'); pg.wait_for_timeout(600)
    pg.evaluate('pairs => CoverApp.setOpenings(pairs)', C['door'] + C['cap']); pg.wait_for_timeout(800)
    pg.click('#tabDesign'); pg.wait_for_timeout(2000)
    R = pg.evaluate('CoverDesign._vent()')
    kinds = sorted(o['kind'] for o in R['ops'])
    check(kinds == ['coupole', 'porte'], 'porte + coupole zénitale reconnues')
    e = R['cases'][0]
    check(e['mode'] == 'cheminee' and e['height'] > 1 and e['ach'] > ach_door, 'effet cheminée : ' + str(round(e['ach'])) + '/h en été contre ' + str(round(ach_door, 1)) + '/h porte seule')
    t = info()
    check('🟢' in t and 'renouvellements/h' in t and 'tirage sur' in t, 'résultat lisible : renouvellements/h, tirage, objectif atteint 🟢')
    check('☂' in t and 'pluie' in t, 'coupole ouverte : rappel pluie (étanchéité)')
    check('🟡' in t, 'statut 🟡 calculé affiché')
    check(R['cases'][1]['ach'] > R['cases'][0]['ach'], 'mi-saison (écart 10 °C) : plus de tirage qu\'en été')
    # part ouvrante : coupole à charnière ouverte à moitié → moins d'air, gardé dans l'aménagement
    cap_key = [o['key'] for o in R['ops'] if o['kind'] == 'coupole'][0]
    check(pg.input_value('[data-vent-part="' + cap_key + '"]') == '100', 'part ouvrante de la coupole : 100 % par défaut')
    pg.fill('[data-vent-part="' + cap_key + '"]', '50'); pg.dispatch_event('[data-vent-part="' + cap_key + '"]', 'change'); pg.wait_for_timeout(800)
    R50 = pg.evaluate('CoverDesign._vent()')
    cap50 = [o for o in R50['ops'] if o['kind'] == 'coupole'][0]
    check(abs(cap50['area'] - cap50['areaFull'] / 2) < 1e-9 and R50['cases'][0]['ach'] < e['ach'], 'coupole ouverte à 50 % : surface ouverte divisée par 2, ' + str(round(R50['cases'][0]['ach'])) + '/h au lieu de ' + str(round(e['ach'])))
    check(pg.evaluate('CoverDesign.state().vent.part')[cap_key] == 50, 'part ouvrante gardée dans l\'aménagement')
    pg.fill('[data-vent-part="' + cap_key + '"]', '100'); pg.dispatch_event('[data-vent-part="' + cap_key + '"]', 'change'); pg.wait_for_timeout(800)
    check(abs(pg.evaluate('CoverDesign._vent()')['cases'][0]['ach'] - e['ach']) < 1e-9, 'retour à 100 % : résultat de départ')
    # alerte d'équilibre : porte décochée → seule la coupole reste, puis objectif élevé
    pg.locator('[data-vent^="b"]').nth(0).wait_for()
    keys = [o['key'] for o in R['ops'] if o['kind'] == 'porte']
    pg.check('[data-vent="' + keys[0] + '"]'); pg.uncheck('[data-vent="' + keys[0] + '"]'); pg.wait_for_timeout(800)
    check('il faut au moins une entrée basse' in info(), 'porte fermée : il faut une entrée basse')
    check(pg.evaluate('CoverDesign.state().vent.open')[keys[0]] is False, 'case décochée gardée dans l\'aménagement')
    # petite fenêtre (un triangle) comme seule entrée basse → déséquilibre
    pg.click('#tabBase'); pg.wait_for_timeout(600)
    pg.evaluate('pairs => CoverApp.setOpenings(pairs)', C['door'] + C['cap'] + C['win']); pg.wait_for_timeout(800)
    pg.click('#tabDesign'); pg.wait_for_timeout(2000)
    R = pg.evaluate('CoverDesign._vent()')
    check(pg.evaluate('CoverDesign.state().vent.open')[keys[0]] is False and not [o for o in R['ops'] if o['kind'] == 'porte'][0]['open'], 'porte toujours fermée après un nouveau tracé')
    win = [o for o in R['ops'] if o['kind'] == 'fenetre'][0]
    check(not win['open'], 'fenêtre ajoutée : fixe par défaut')
    pg.check('[data-vent="' + win['key'] + '"]'); pg.wait_for_timeout(800)
    t = info()
    check('⚠' in t and 'entrées basses trop petites' in t, 'fenêtre d\'un triangle face à la coupole : alerte d\'équilibre')
    pg.fill('#dsVentTarget', '40'); pg.dispatch_event('#dsVentTarget', 'change'); pg.wait_for_timeout(800)
    t = info()
    check('🟠' in t and 'il faut' in t and 'd\'entrées basses ouvrables' in t, 'objectif 40/h : surface d\'entrées basses à prévoir (' + [l for l in t.split('\n') if 'Objectif' in l][0] + ')')
    # flèches d'air en 3D
    pg.uncheck('[data-vent="' + win['key'] + '"]'); pg.check('[data-vent="' + keys[0] + '"]'); pg.wait_for_timeout(600)
    before = shot3()
    pg.check('#dsVentArrows'); pg.wait_for_timeout(1200)
    check(shot3() != before, 'flèches d\'air dessinées en 3D')
    if OUT:
        os.makedirs(OUT, exist_ok=True); pg.locator('#ds3d').screenshot(path=os.path.join(OUT, 'aeration-fleches.png'))
        pg.locator('#dsVentBar').screenshot(path=os.path.join(OUT, 'aeration-barre.png'))
    pg.uncheck('#dsVentArrows'); pg.wait_for_timeout(800)
    check(shot3() == before, 'flèches retirées : rendu identique')
    # retour à un dôme fermé
    pg.click('#tabBase'); pg.wait_for_timeout(600)
    pg.evaluate('() => CoverApp.setOpenings([])'); pg.wait_for_timeout(800)
    pg.click('#tabDesign'); pg.wait_for_timeout(2000)
    check(not errs, 'aucune erreur JavaScript' + ('' if not errs else ' : ' + errs[0]))
    b.close()
print('\n' + ('TOUT PASSE' if not fails else str(len(fails)) + ' échec(s)'))
sys.exit(1 if fails else 0)
