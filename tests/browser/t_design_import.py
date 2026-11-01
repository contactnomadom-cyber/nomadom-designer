# M1 — Données sûres dans l'aménagement Design : imports JSON et GLB, injection HTML,
# aucune corruption de l'aménagement en cours ni de la sauvegarde du navigateur après un échec.
# Usage : python3 tests/browser/t_design_import.py dist/nomadom-designer.html
import sys, os, json, struct, tempfile, base64
from playwright.sync_api import sync_playwright
APP = 'file://' + os.path.abspath(sys.argv[1])
TMP = tempfile.mkdtemp(prefix='m1-')
STORE = 'coverplus-design-v1'
fails = []
def check(c, m):
    print(('OK   ' if c else 'ÉCHEC ') + m)
    if not c: fails.append(m)
def write(name, data, mode='w'):
    p = os.path.join(TMP, name)
    with open(p, mode) as f: f.write(data)
    return p
def item(i, name, **kw):
    d = {"id": "i" + str(i), "type": "lit1", "name": name, "x": 0.4 * i, "z": 0, "rot": 0, "w": 0.9, "d": 1.9, "h": 0.5, "level": 0}
    d.update(kw); return d
def state(items, **kw):
    s = {"version": 1, "items": items, "openings": [], "mezz": {"on": False, "h": 2.2, "thick": 0.15, "shape": "demi", "depth": 2.0, "angle": 140, "width": 3.0, "orient": 90}, "style": "nb"}
    s.update(kw); return s
def glb(json_obj, extra=b''):
    js = json.dumps(json_obj).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    body = struct.pack('<II', len(js), 0x4E4F534A) + js + extra
    return struct.pack('<III', 0x46546C67, 2, 12 + len(body)) + body

TAG = 'Lit <img id="m1-tag" src="x"><b id="m1-b">gras</b>'
valid = write('valide.json', json.dumps(state([item(1, 'Lit A'), item(2, 'Canapé B', type='canape', w=2.0, d=0.9, h=0.85)])))
tagged = write('balise.json', json.dumps(state([item(1, TAG), item(2, 'Évier', type='evier', w=0.8, d=0.6, h=0.9)])))
trapped = write('champs-pieges.json', json.dumps(state([item(1, 'Lit'), item(2, 'Évier', type='evier', id='i2"><b id="m1-id">x</b>', rot='0<b id="m1-rot">r</b>')])))
notjson = write('casse.json', '{ "version": 1, "items": [ { "name": "Lit"')
badtype = write('mauvais-type.json', json.dumps(state("pas une liste")))
badnum = write('mauvais-nombre.json', json.dumps(state([item(1, 'Lit', w='large')])))
badver = write('version-inconnue.json', json.dumps(state([item(1, 'Lit')], version=99)))
partial = write('incomplet.json', json.dumps({"version": 1, "items": [{"type": "canape", "name": "Canapé seul"}]}))
big = os.path.join(TMP, 'trop-gros.json')
with open(big, 'wb') as f: f.seek(51 * 1024 * 1024); f.write(b' ')
# GLB valide minimal : un triangle de 1,20 × 0,80 m (deux sommets à z = 0,40 m pour une profondeur non nulle)
pos = struct.pack('<9f', 0, 0, 0, 1.2, 0, 0.4, 0, 0.8, 0.4)
pos += b'\0' * ((4 - len(pos) % 4) % 4)
glb_ok = write('triangle.glb', glb({"asset": {"version": "2.0"}, "buffers": [{"byteLength": len(pos)}],
  "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": len(pos)}],
  "accessors": [{"bufferView": 0, "componentType": 5126, "count": 3, "type": "VEC3"}],
  "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}], "nodes": [{"mesh": 0}]},
  struct.pack('<II', len(pos), 0x004E4942) + pos), 'wb')
glb_bad = write('pas-un-glb.glb', b'\x00\x01\x02\x03' * 64, 'wb')
glb_tag = write('balise.glb', glb({"asset": {"version": "2.0"}, "extensionsRequired": ['<b id="m1-glb">x</b>']}), 'wb')
glb_trunc = write('tronque.glb', struct.pack('<III', 0x46546C67, 2, 4000) + struct.pack('<II', 5000, 0x4E4F534A) + b'{"a', 'wb')
glb_big = os.path.join(TMP, 'trop-gros.glb')
with open(glb_big, 'wb') as f: f.write(struct.pack('<III', 0x46546C67, 2, 16 * 1024 * 1024)); f.seek(16 * 1024 * 1024); f.write(b'\0')

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: d.dismiss())
    pg.goto(APP); pg.wait_for_timeout(1500)
    pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    stored = lambda: pg.evaluate("localStorage.getItem('%s')" % STORE)
    names = lambda: pg.evaluate("(() => { try { return window.CoverDesign.state().items.map(i => i.name); } catch (e) { return 'ÉTAT CASSÉ : ' + e.message; } })()")
    tags = lambda: pg.evaluate("['m1-tag','m1-b','m1-id','m1-rot','m1-glb'].filter(id => document.getElementById(id))")
    def imp(path):
        pg.set_input_files('#dsImport', path); pg.wait_for_timeout(1200)

    # 1. import valide
    imp(valid)
    check(names() == ['Lit A', 'Canapé B'], 'import valide : 2 éléments (' + str(names()) + ')')
    ref_store, ref_names = stored(), names()

    # 2. fichiers refusés : l'aménagement en cours ET la sauvegarde restent identiques
    for path, what in [(notjson, 'JSON cassé'), (badtype, 'liste d\'éléments du mauvais type'), (badnum, 'dimension non numérique'),
                       (trapped, 'identifiant et rotation piégés'),
                       (badver, 'version de format inconnue'), (big, 'fichier de plus de 50 Mo')]:
        n0 = len(errs); imp(path)
        msg = pg.inner_text('#dsProps')
        check(names() == ref_names and stored() == ref_store, what + ' : aménagement et sauvegarde intacts')
        check('Import refusé' in msg, what + ' : message clair (« ' + msg.strip()[:90] + ' »)')
        check(len(errs) == n0, what + ' : aucune erreur JavaScript')

    # 3. fichier incomplet : complété par les valeurs de la bibliothèque
    imp(partial)
    st = pg.evaluate("window.CoverDesign.state()")
    it = st['items'][0] if st['items'] else {}
    check(len(st['items']) == 1 and it.get('w') == 2.0 and it.get('d') == 0.9 and isinstance(it.get('id'), str) and it.get('level') == 0,
          'fichier incomplet : élément complété (largeur, profondeur, identifiant, niveau)')

    # 4. injection : le nom balisé reste du texte, partout où il est affiché
    imp(tagged)
    check(names()[0] == TAG, 'nom balisé conservé tel quel dans les données')
    check(TAG in pg.inner_text('#dsList'), 'nom balisé affiché comme texte dans la liste')
    row = pg.query_selector('#dsList tr[data-sel^="item:"]')
    if row: row.click(); pg.wait_for_timeout(500)
    fld = pg.query_selector('#dsProps input[data-k="name"]')
    check(bool(fld) and fld.input_value() == TAG, 'nom balisé intact dans le champ « Nom »')
    check(tags() == [], 'aucun élément HTML créé à partir du fichier (' + str(tags()) + ')')

    # 5. GLB : refusés proprement, message en texte, l'élément garde ses dimensions
    first = lambda k: pg.evaluate("(() => { try { return window.CoverDesign.state().items[0]['%s']; } catch (e) { return 'ÉTAT CASSÉ'; } })()" % k)
    w0 = first('w')
    for path, what in [(glb_bad, 'GLB illisible'), (glb_tag, 'GLB avec texte balisé'), (glb_trunc, 'GLB tronqué'), (glb_big, 'GLB de plus de 15 Mo')]:
        n0 = len(errs)
        inp = pg.query_selector('#dsProps input[data-act="glb"]')
        if not inp: check(False, what + ' : champ d\'import GLB introuvable'); continue
        inp.set_input_files(path); pg.wait_for_timeout(1500)
        check('Import impossible' in pg.inner_text('#dsProps'), what + ' : message « Import impossible »')
        check(len(errs) == n0 and tags() == [], what + ' : ni erreur JavaScript ni élément HTML injecté')
        check(first('w') == w0 and not first('model'),
              what + ' : élément inchangé')
        if not pg.query_selector('#dsProps input[data-act="glb"]') and pg.query_selector('#dsList tr[data-sel^="item:"]'):
            pg.click('#dsList tr[data-sel^="item:"]'); pg.wait_for_timeout(400)

    # 5 bis. un vrai GLB s'importe toujours, aux dimensions du modèle
    inp = pg.query_selector('#dsProps input[data-act="glb"]')
    if not inp and pg.query_selector('#dsList tr[data-sel^="item:"]'):
        pg.click('#dsList tr[data-sel^="item:"]'); pg.wait_for_timeout(400); inp = pg.query_selector('#dsProps input[data-act="glb"]')
    if inp: inp.set_input_files(glb_ok); pg.wait_for_timeout(2000)
    it0 = pg.evaluate("window.CoverDesign.state().items[0]")
    check(bool(it0.get('model')) and it0.get('w') == 1.2 and it0.get('h') == 0.8 and it0.get('d') == 0.4,
          'GLB valide : importé, élément mis aux dimensions du modèle (' + str({k: it0.get(k) for k in ('model', 'w', 'h', 'd')}) + ')')
    check(len(pg.evaluate("window.CoverDesign.state().models")) == 1, 'GLB valide : modèle gardé dans l\'aménagement')
    pg.reload(); pg.wait_for_timeout(1500); pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    st2 = pg.evaluate("window.CoverDesign.state()")
    check(len(st2.get('models') or []) == 1 and st2['items'][0].get('model') == it0.get('model') and len(st2['items']) == 2,
          'après rechargement : aménagement et modèle 3D retrouvés (sauvegarde relue et acceptée)')

    # 6. sauvegarde déjà piégée dans le navigateur (ancienne version) : rien d'injecté au rechargement
    pg.evaluate("s => localStorage.setItem('%s', s)" % STORE, json.dumps(state([item(1, TAG)])))
    pg.reload(); pg.wait_for_timeout(1500); pg.click('#tabDesign'); pg.wait_for_timeout(2500)
    check(tags() == [] and TAG in pg.inner_text('#dsList'), 'sauvegarde piégée : nom affiché en texte, rien d\'injecté')

    # 7. sauvegarde illisible : pas effacée, mise de côté
    pg.evaluate("localStorage.setItem('%s', '{ cassé')" % STORE)
    pg.reload(); pg.wait_for_timeout(1500); pg.click('#tabDesign'); pg.wait_for_timeout(2000)
    kept = pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('%s.') && localStorage.getItem(k) === '{ cassé')" % STORE)
    check(len(kept) == 1, 'sauvegarde illisible gardée de côté (' + str(kept) + ')')

    # 8. export puis réimport à l'identique
    pg.set_input_files('#dsImport', valid); pg.wait_for_timeout(1200)
    with pg.expect_download() as dl:
        pg.click('#dsExport')
    exported = dl.value.path()
    before = pg.evaluate("JSON.stringify(window.CoverDesign.state().items)")
    imp(exported)
    check(pg.evaluate("JSON.stringify(window.CoverDesign.state().items)") == before, 'export puis réimport : éléments identiques')

    check(not errs, 'aucune erreur JavaScript au total' + (' : ' + '; '.join(errs[:3]) if errs else ''))
    b.close()
print('RÉSULTAT :', 'OK' if not fails else 'ÉCHEC (' + str(len(fails)) + ')')
sys.exit(1 if fails else 0)
