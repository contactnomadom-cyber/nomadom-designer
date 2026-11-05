# NOMAD-2026-005 — Porte d'aplomb dans l'onglet Base : ajouter une porte sur une ouverture fermée par le sol,
# lire son calcul (passe / ne passe pas, potelets, fermeture), régler le recul, la retirer.
# Usage : python3 tests/browser/t_door.py dist/nomadom-designer.html
import sys, os
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1]); OUT = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), '..', 'build', 'check', 'door'); os.makedirs(OUT, exist_ok=True)
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
# contour de 9 triangles autour du nœud N40 (référence 3V Ø 5 m), même tracé que tests/node/door.test.js
SECTOR = """() => {
  const dome = CoverApp.dome(), L = CoverApp.labels(), id = [...L].find(([, l]) => l === 'N40')[0];
  const P = i => dome.pointById.get(i), yB = Math.min(...dome.points.map(p => p.y)), a0 = Math.atan2(P(id).z, P(id).x);
  const set = dome.faces.filter(f => { const q = f.pointIds.map(P), c = [0, 1, 2].map(() => 0);
    const cx = (q[0].x + q[1].x + q[2].x) / 3, cy = (q[0].y + q[1].y + q[2].y) / 3, cz = (q[0].z + q[1].z + q[2].z) / 3;
    const d = Math.atan2(cz, cx) - a0; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < 0.35 && cy - yB < 2.3; });
  const cnt = new Map(), ek = (a, b) => a < b ? a + '-' + b : b + '-' + a;
  set.forEach(f => [[0, 1], [1, 2], [2, 0]].forEach(([i, j]) => { const k = ek(f.pointIds[i], f.pointIds[j]); cnt.set(k, (cnt.get(k) || 0) + 1); }));
  const ground = k => k.split('-').every(i => Math.abs(P(+i).y - yB) < 1e-6);
  return [...cnt].filter(([k, c]) => c === 1 && !ground(k)).map(([k]) => k.split('-').map(i => L.get(+i)));
}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabBase'); pg.wait_for_timeout(800)
    pairs = pg.evaluate(SECTOR)
    pg.evaluate('pairs => CoverApp.setOpenings(pairs)', pairs); pg.wait_for_timeout(800)
    txt = lambda: pg.inner_text('#baseOpenings')
    check('1 ouverture' in txt() and '9 triangles retirés' in txt() and 'fermée par le sol' in txt(), 'ouverture de 9 triangles fermée par le sol (' + str(len(pairs)) + ' montants)')
    add = pg.query_selector('[data-door-add]')
    check(add is not None, 'bouton « Ajouter une porte d\'aplomb »')
    shot = lambda: pg.eval_on_selector('#base3d', 'c => c.toDataURL()')
    img0 = shot()
    add.click(); pg.wait_for_timeout(1500)
    check(shot() != img0, 'la structure de la porte apparaît dans la 3D de l\'onglet Base')
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    check(pg.evaluate('CoverApp.doorScenes().length') == 1 and pg.evaluate('CoverApp.doorScenes()[0].pieces.length') > 10, 'la structure de la porte est transmise au Design')
    # plancher sur pilotis : chaque poteau d'angle de l'avant-corps reçoit son propre pilotis
    pg.click('#tabBase'); pg.wait_for_timeout(1200)
    pg.click('[data-floor-on]'); pg.wait_for_timeout(1500)
    fl = pg.inner_text('#baseFloor')
    check('+ 2 sous les poteaux de porte' in fl and 'Avant-corps de porte' in fl, 'plancher sur pilotis : 2 pilotis sous les poteaux de porte, charge affichée')
    check(pg.evaluate("CoverApp.floorScene().boxes.filter(b => b.kind === 'bloc29').length") == 25, '3D : 23 + 2 blocs d\'assise')
    pg.screenshot(path=os.path.join(OUT, 'porte_pilotis.png'))
    pg.click('[data-floor-off]'); pg.wait_for_timeout(1200)
    dimg = pg.eval_on_selector('#ds3d', 'c => c.toDataURL()')
    pg.click('#tabBase'); pg.wait_for_timeout(1200)
    t3 = pg.inner_text('.door-3d')
    check('Pièces (dessinées en 3D)' in t3 and '45 × 70' in t3 and '🟠' in t3 and 'Chevêtre' in t3 and 'Potelets' in t3 and 'Chevrons' in t3 and 'Toit' in t3 and 'Poteaux d' in t3 and 'Lisses basses' in t3 and 'Moises' in t3, 'liste des pièces : poteaux, lisses et moises par défaut (aperçu 🟠, 45 × 70)')
    check('Aucune pièce volante' in txt(), 'contrôle des raccords : aucune pièce volante')
    # choix constructifs
    img1 = shot()
    pg.select_option('[data-door-f="support"]', 'parois'); pg.wait_for_timeout(1500)
    check('Traverses des parois' in txt() and 'Parois latérales' in txt() and 'Aucune pièce volante' in txt() and shot() != img1, 'parois latérales : traverses, panneaux, dessinés en 3D, rien de volant')
    pg.select_option('[data-door-f="support"]', 'porte-a-faux'); pg.wait_for_timeout(800)
    check('Déconseillé' in txt() and 'Poteaux d' not in pg.inner_text('.door-3d'), 'porte-à-faux : avertissement, pas de poteau')
    pg.select_option('[data-door-f="support"]', 'poteaux'); pg.wait_for_timeout(800)
    pg.select_option('[data-door-f="attachAppui"]', 'noeud'); pg.wait_for_timeout(800)
    check('Contrefiches' in txt() and 'Aucune pièce volante' in txt(), 'appuis sur nœud : contrefiches, rien de volant')
    pg.select_option('[data-door-f="attachAppui"]', 'montant'); pg.wait_for_timeout(800)
    pg.select_option('[data-door-f="joint:dome-montant"]', 'sabot'); pg.wait_for_timeout(800)
    check('Moises' not in pg.inner_text('.door-3d') and 'Sabot métallique' in pg.inner_text('.jfiche'), 'assemblage changé en sabot : plus de moises, sa fiche s\'ouvre')
    # sas d'entrée : prolongement de l'ouverture, deuxième porte
    pg.select_option('[data-door-f="joint:dome-montant"]', 'moise'); pg.wait_for_timeout(500)
    img2 = shot()
    pg.select_option('[data-door-f="sas"]', 'exterieur'); pg.wait_for_timeout(1500)
    t = txt()
    check('Pannes du sas' in t and 'Cadres de section' in t and 'Porte 2' in t and 'passe (900 mm × 2000 mm)' in t and 'Aucune pièce volante' in t and shot() != img2, 'sas extérieur : pannes, cadres, porte 2, rien de volant, dessiné en 3D')
    check('Tenue de l' not in t and 'Charges du sas' in t, 'sas : choix d\'avant-corps remplacés, charges du sas affichées')
    # le sas dans les autres onglets
    pg.click('#tabCover'); pg.wait_for_timeout(1500)
    tc = pg.inner_text('#openingsReadout')
    check('Toile du sas' in tc and 'S8' in tc and 'rabat' in tc and 'recouvre' in tc and 'Pignon' in tc, 'Cover+ : patrons de la toile du sas (8 pièces + pignon), rabat, recouvrements')
    check(pg.query_selector_all('#openingsReadout .sas-pieces svg').__len__() == 8, 'Cover+ : un dessin par pièce de toile')
    cov3 = pg.eval_on_selector('#viewer3d', 'c => c.toDataURL()')
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    plan = pg.eval_on_selector('#dsPlan', 'c => c.toDataURL()')
    check(pg.evaluate('CoverApp.doorScenes()[0].kind') == 'sas', 'Design : le sas est transmis (3D et plan)')
    pg.click('#tabInfo'); pg.wait_for_selector('section.info-card:has-text("Portes, sas et plancher")', timeout=15000)
    ti = pg.inner_text('section.info-card:has-text("Portes, sas et plancher")')
    check('Pannes du sas' in ti and 'aucune pièce volante' in ti and '1 sas' in ti and 'Toile du sas' in pg.inner_text('#viewInfo'), 'Informations : récapitulatif des pièces, du sas et de sa toile')
    pg.click('#tabBase'); pg.wait_for_timeout(1200)
    pg.click('[data-floor-on]'); pg.wait_for_timeout(1500)
    tf = pg.inner_text('#baseFloor')
    check('6 sous le sas' in tf and 'Sas d\'entrée' in tf and pg.evaluate('CoverApp.floorScene().boxes.filter(b => b.kind === "bloc29").length') == 29, 'plancher + sas : 6 pilotis sous le sas, sa charge comptée (29 assises)')
    pg.click('[data-floor-off]'); pg.wait_for_timeout(1200)
    pg.fill('[data-door-f="sas.door2.width"]', '1.3'); pg.dispatch_event('[data-door-f="sas.door2.width"]', 'change'); pg.wait_for_timeout(800)
    check('ne passe pas' in txt(), 'porte 2 trop large : refusée')
    pg.fill('[data-door-f="sas.door2.width"]', '0.8'); pg.dispatch_event('[data-door-f="sas.door2.width"]', 'change'); pg.wait_for_timeout(800)
    pg.select_option('[data-door-f="sas"]', 'interieur'); pg.wait_for_timeout(1200)
    check('passe (800 mm × 2000 mm)' in txt() and 'Aucune pièce volante' in txt() and pg.evaluate('CoverApp.doorScenes()[0].direction') == 'interieur', 'sas intérieur, porte 2 de 0,80 : passe, rien de volant')
    pg.select_option('[data-door-f="sas"]', 'aucun'); pg.wait_for_timeout(1200)
    pg.click('#tabCover'); pg.wait_for_timeout(1500)
    check(pg.eval_on_selector('#viewer3d', 'c => c.toDataURL()') != cov3 and 'Toile du sas' not in pg.inner_text('#openingsReadout'), 'Cover+ : le sas disparaît de la 3D et des patrons quand on le retire')
    pg.click('#tabBase'); pg.wait_for_timeout(1200)
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    check(pg.eval_on_selector('#dsPlan', 'c => c.toDataURL()') != plan, 'Design : le plan change quand le sas est retiré')
    pg.click('#tabBase'); pg.wait_for_timeout(1200)
    check('Tenue de l' in txt(), 'sans sas : retour à l\'avant-corps')
    pg.click('summary'); pg.wait_for_timeout(200)
    pg.click('.door-lib a:has-text("Embrèvement")'); pg.wait_for_timeout(500)
    fj = pg.inner_text('.jfiche')
    check('Embrèvement' in fj and 'Quand' in fj and 'Limites' in fj and 'Outillage' in fj and pg.query_selector('.jfiche svg') is not None, 'bibliothèque : fiche didactique avec schéma, usage, limites, outillage')
    check('14 fiches' in pg.inner_text('.door-lib summary'), 'bibliothèque : 14 fiches')

    t = txt()
    check('La porte passe' in t and '🟡' in t, 'porte 0,90 × 2,00 : elle passe (🟡)')
    check('Potelet gauche' in t and 'Potelet du milieu' in t and 'Potelet droit' in t and 'recule de' in t, 'potelets : montée puis retrait vers le dôme')
    check('2 montants de 2000 mm' in t and 'linteau et seuil de 900 mm' in t, 'huisserie : 2 × 2000 mm, linteau et seuil 900 mm')
    check('🟠' in t and 'avant-corps' in t and 'sas intérieur' in t, 'explication didactique et réserve 🟠')
    # trop haute → refusée, avec les maxima
    pg.fill('[data-door-f="height"]', '2.45'); pg.dispatch_event('[data-door-f="height"]', 'change'); pg.wait_for_timeout(400)
    t = txt()
    check('🔴' in t and 'ne passe pas' in t and 'Maxi' in t, 'porte de 2,45 m : refusée, maxima donnés')
    pg.fill('[data-door-f="height"]', '2'); pg.dispatch_event('[data-door-f="height"]', 'change'); pg.wait_for_timeout(400)
    # recul : le retrait du potelet diminue
    mid = lambda: int(pg.inner_text('#baseOpenings').split('Potelet du milieu')[1].split('recule de ')[1].split(' mm')[0])
    r0 = mid()
    pg.eval_on_selector('[data-door-f="setback"]', 'e => { e.value = "0.5"; e.dispatchEvent(new Event("change", { bubbles: true })); }'); pg.wait_for_timeout(400)
    check(r0 - mid() == 500 or abs(r0 - mid() - 500) <= 1, 'recul de 500 mm : le potelet du milieu recule de 500 mm de moins (' + str(r0) + ' → ' + str(mid()) + ')')
    # autre diamètre : même ouverture, la porte reste
    pg.eval_on_selector('#paramDiameter', 'e => { e.value = "6.20"; e.dispatchEvent(new Event("change")); }'); pg.wait_for_timeout(1200)
    check(pg.query_selector('[data-door-del]') is not None, 'Ø 6,20 m : la porte est gardée')
    pg.click('[data-door-del]'); pg.wait_for_timeout(400)
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    check(pg.eval_on_selector('#ds3d', 'c => c.toDataURL()') != dimg, 'Design : la porte disparaît de la 3D quand on la retire')
    pg.click('#tabBase'); pg.wait_for_timeout(1200)
    check(pg.query_selector('[data-door-add]') is not None and 'Potelet' not in txt(), 'porte retirée')
    pg.click('#opClear'); pg.wait_for_timeout(600)
    check('Aucune' in txt() or 'Tracer les ouvertures' in txt() or 'Cliquez' in txt(), 'ouvertures effacées')
    check(not errs, 'aucune erreur JavaScript' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
