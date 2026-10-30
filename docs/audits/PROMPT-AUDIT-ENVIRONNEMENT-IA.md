# AUDIT DE L'ENVIRONNEMENT DE TRAVAIL IA — Nomad'Om Designer

**But :** vérifier que l'environnement permet aux IA de développer Nomad'Om Designer en consommant le moins de tokens, de temps et de crédits possible, **sans** baisser la qualité, la sécurité ni la fiabilité.

**Règle fondamentale :** ne modifier aucun fichier pendant l'audit. Observer, mesurer, identifier les gaspillages, proposer un plan. Mise en œuvre seulement après accord de Nathan.

> Version adaptée le 30/10/2026 à l'état réel du dépôt (section 1 bis). Ne reproposez pas ce qui y est décrit comme existant : vérifiez son état et jugez-le.

---

## 1. Contexte du projet

Nomad'Om Designer conçoit des dômes géodésiques et d'autres structures (toile Cover+, aménagement, pavillon Quadrisphère). Il est écrit en JavaScript et livré en **un seul fichier HTML autonome**.

Contraintes :
- le produit final reste un HTML unique ;
- il fonctionne en local, et bientôt hors ligne sur tablette ;
- le développement est fait principalement par des IA, parfois plusieurs sessions sur le même dépôt ;
- le propriétaire, Nathan, n'est pas développeur et n'exécute pas de commandes techniques ;
- règle n° 1 du projet : justesse avant fonctionnalités.

---

## 1 bis. État connu au 30/10/2026 (à vérifier, pas à recréer)

| Élément | État déclaré | Où vérifier |
|---|---|---|
| Dépôt | GitHub privé `contactnomadom-cyber/nomadom-designer`, branche `main` | `git log`, `git status` |
| Sources | `src/index.html` (gabarit avec marqueurs `{{MODULE:id}}`) + 17 modules ; correspondance dans `build/manifest.json` | `build/manifest.json` |
| Assemblage | `node scripts/build.mjs` → `dist/nomadom-designer.html`, identique octet pour octet à la bêta 0.9.11 publiée (sha256 commençant par `02cd700121779a0c`) | relancer le build, comparer l'empreinte |
| Contrôle complet | `node scripts/test-all.mjs` : assemble, extrait les modules **de l'artefact**, lance 3 suites Node et 9 tests navigateur (Playwright, 3 en parallèle au plus), rapport `build/check/report.md` ; environ 10 min | lire le script ; ne pas relancer sans raison |
| Contrôle rapide | `node scripts/test-all.mjs --quick` (environ 3 min), ne vaut pas feu vert | — |
| Feu vert de publication | `node scripts/release.mjs` refuse si le HTML de `dist/` n'est pas exactement celui qui a passé le contrôle complet (fichier `build/check/PASS`) | lire le script |
| Essais déjà faits | 12 suites sur 12 OK ; une erreur volontaire de 1 mm sur le dôme de référence fait échouer le contrôle ; un contrôle partiel bloque la publication | `docs/validation/` |
| Règles des sessions | Dans `README.md` (branche par chantier, une seule session intégratrice, `dist/` jamais modifié à la main, aucun test affaibli) | `README.md` |
| Décisions | `docs/architecture/ADR-0001-depot-et-assemblage.md` : code en anglais, interface en français, Cover+ gardé, unités internes en mètres | ADR |
| Glossaire | `docs/glossary.md` | — |
| Versions | Les étiquettes Git **ne peuvent pas** être poussées depuis les sessions (refus HTTP 403 du proxy) ; une version = un commit « Version X.Y.Z » + `CHANGELOG.md` | `README.md` |
| Fichier d'instructions IA | **Aucun** `CLAUDE.md` ni `AGENTS.md` pour l'instant | arborescence |
| Machines de travail | Les sessions tournent dans des machines temporaires : clone à chaque session (environ 3 Mo d'historique) | — |
| Copies anciennes | Le projet Claude « Acidome Cover+ » contient d'anciennes copies de modules, de tests et du HTML, plus des scripts de patch (Kumiko, Nomad Vision) ; marquées historiques dans `claude/DEPOT-GITHUB.md` | projet Claude |
| Taille des fichiers | `src/app/app.js` : 2 588 lignes ; `vendor/three/threekit-r169.js` : 733 ko (une ligne de 130 ko) ; `dist/` : 1,26 Mo | `wc -lc` |

---

## 2. Règles de l'audit

1. Inspecte l'environnement réel avant de recommander quoi que ce soit.
2. Ne modifie, ne supprime et ne déplace aucun fichier.
3. Opérations réseau autorisées : **lecture seule** du dépôt (clone, fetch). Aucune installation, mise à jour, ni écriture (push) sans accord.
4. Aucune commande destructive.
5. Ne lis **jamais en entier** `vendor/three/`, `dist/` ni les gros fichiers : recherche ciblée (`git grep -n`, `grep -n`, `wc`) à la place.
6. Ne recopie pas de fichiers entiers dans ton rapport.
7. N'ouvre que les fichiers nécessaires à une question précise.
8. Réutilise les résultats déjà obtenus (section 1 bis, rapports existants) au lieu de refaire les mêmes analyses.
9. Distingue les faits observés des hypothèses.
10. Ne recommande une optimisation que si son gain est plausible et vérifiable.

**Priorité absolue :** minimiser le **coût total** du travail, pas seulement la longueur des réponses. Une mauvaise modification qui coûte trois heures de débogage revient plus cher que quelques centaines de tokens de vérification.

---

## 3. Points à auditer

### A. Dépôt et Git
- État de `main`, modifications non validées, `.gitignore`.
- Clarté des règles de branches et de fusion ; mécanisme qui empêche deux sessions de publier en même temps (aujourd'hui : une règle écrite, rien d'automatique — est-ce suffisant ?).
- Versions identifiables sans étiquettes Git ; possibilité de revenir à une version stable.
- `dist/` versionné (1,26 Mo par version) : utile pour la traçabilité ou gênant (taille du dépôt, lectures accidentelles par les IA) ?
- Situations où une IA pourrait écraser le travail d'une autre.

### B. Assemblage du HTML
- Reproductibilité réelle : relancer le build et comparer l'empreinte (opération courte et sans risque).
- Séparation sources / fichier publié ; ordre d'inclusion (fixé par le gabarit) ; Three.js empaqueté dans `vendor/`.
- Identification du commit qui a produit un fichier publié : aujourd'hui, seule la version est dans le pied de page. Faut-il y ajouter l'identifiant court du commit ?
- Étapes manuelles qui restent (numéro de version à changer à plusieurs endroits ?).

### C. Tests et validation
- Organisation (`tests/node`, `tests/browser`), exécution en une commande, test sur l'artefact assemblé, résultat clair, blocage de publication.
- **Tests ciblés** : existe-t-il un moyen simple de lancer seulement les tests utiles selon le module modifié (exemple : un changement dans `src/products/habitat/` ne demande pas les 780 découpes de toile) ? Proposer une table « module modifié → tests à lancer ».
- Dépendances (Node, Python, Playwright, Chromium) et leur disponibilité dans une machine neuve.
- Durées mesurées (rapport de contrôle) et goulots (les tests navigateur les plus longs).
- Ne relance pas toute la batterie : lis les scripts et le dernier rapport ; au plus un contrôle `--quick` si une vérification est nécessaire.

### D. Documentation destinée aux IA
- Point d'entrée : **`CLAUDE.md` à la racine**. Les sessions Claude Code le chargent automatiquement à l'ouverture du dépôt (pas de lecture à demander). Si d'autres IA doivent travailler sur le dépôt, `AGENTS.md` peut simplement renvoyer à `CLAUDE.md` : un seul contenu, pas de doublon.
- Les règles des sessions sont aujourd'hui dans `README.md`, qui sert aussi à Nathan. Faut-il les déplacer dans `CLAUDE.md` et garder dans le README la partie pour Nathan ?
- Une nouvelle session trouve-t-elle vite : l'état du projet, les commandes, les fichiers sensibles, les conventions, les critères de publication, les décisions, les travaux en cours ?
- Combien de fichiers une IA doit-elle lire pour une tâche courante ? Une **carte du code** (quel module fait quoi, où chercher une fonction) éviterait-elle de lire `app.js` en entier ?

### E. Sources de consommation inutile

| Source | À vérifier ici |
|---|---|
| Contexte trop volumineux | Documents longs relus à chaque session ; gros rapports d'audit dans `docs/audits/` |
| Instructions répétées | Mêmes règles dans README, ADR, projet Claude, prompts |
| Fichiers trop gros | `app.js` (2 588 lignes) : découpage prévu ; `vendor/` et `dist/` à ne jamais lire |
| Recherches trop larges | Commandes types pour trouver une fonction (`git grep -n "function nom"`) |
| Tâches mal définies | Format de demande qui fixe périmètre, fichiers et critère de réussite |
| Vérifications répétées | Contrôle complet relancé sans changement pertinent |
| Sessions mal coordonnées | Copies anciennes du projet Claude encore lues ; scripts de patch hors dépôt |
| Réponses trop longues | Comptes rendus avec code recopié |
| Erreurs évitables | Pièges connus non écrits : `"type": "module"` interdit dans `package.json` (casse les `require`), 3 navigateurs en parallèle au plus, étiquettes Git refusées, une ligne de 130 ko dans `vendor/` |
| Modifications trop larges | Refactorisations hors périmètre |
| Machines temporaires | Réinstallation de Playwright et Chromium à chaque session ? Déjà présents ? |

Pour chaque problème : fréquence probable, coût actuel, gain attendu, coût de mise en place. Pas de chiffre de tokens sans mesure ou hypothèse explicite.

### F. Outils
Versions réellement disponibles (Node, Python, Playwright, git), dépendances, commandes simples de recherche et de contrôle. Aucun outil ajouté sans bénéfice démontré.

### G. Plusieurs IA en même temps
Séparation des branches, attribution des fichiers par tâche, règles de fusion, protection de `dist/`, modifications concurrentes, identification de la session qui publie. Règle de base : **une seule autorité de fusion et de publication**, sauf mécanisme automatique qui garantit l'absence de conflit.

---

## 4. Méthode à faible coût
1. Arborescence (`git ls-files`, `wc -l`) et configuration (`package.json`, `build/manifest.json`, `.gitignore`).
2. Instructions existantes (`README.md`, ADR) : en-têtes d'abord.
3. Commandes officielles : lire `scripts/*.mjs` (courts).
4. État Git.
5. Contrôles ciblés et sans risque : build + empreinte ; `--quick` seulement si utile.
6. Regrouper les constats, supprimer les doublons, rédiger.

Si une information manque, nommer le fichier ou la commande qui permettrait de la vérifier, sans exploration générale supplémentaire.

---

## 5. Format du rapport

1. **Verdict** : note de 0 à 5, justifiée par un fait observé, pour : efficacité en tokens, qualité des instructions IA, fiabilité de Git, reproductibilité de l'assemblage, automatisation des tests, sécurité des publications, gestion des sessions simultanées, facilité de reprise par une nouvelle session.
2. **Tableau des constats** : Priorité | Constat | Preuve | Coût actuel | Solution | Gain attendu. P0 = risque de perte de travail ou de publication incorrecte ; P1 = gaspillage important et récurrent ; P2 = utile, pas urgent ; P3 = facultatif.
3. **Top 5 des optimisations** : problème, modification, coût (petit, moyen ou gros), risque de régression, gain, comment vérifier le gain.
4. **Texte proposé pour `CLAUDE.md`**, **60 lignes au plus**. Il permet à une nouvelle session de :
   - comprendre le projet en 5 lignes ;
   - connaître les commandes officielles ;
   - savoir quoi ne jamais lire en entier ;
   - choisir les tests selon les fichiers modifiés ;
   - respecter les conventions et le périmètre ;
   - livrer un compte rendu court et vérifiable (format imposé : ce qui a changé, fichiers touchés, tests lancés avec leur résultat, ce qui reste à faire).

   Il renvoie aux documents détaillés au lieu de les recopier.
5. **Plan d'action en 3 phases** : sécurisation, efficacité, optimisation avancée. Pour chaque action : dépendances, coût, critère de réussite.
6. **Ce qu'il ne faut pas faire**, notamment :
   - réécrire l'application ;
   - installer des outils sans besoin ;
   - multiplier les documents d'instructions ;
   - ajouter des abstractions prématurées ;
   - lancer toute la batterie après chaque petite modification ;
   - confondre réduction des tokens et baisse de qualité.

---

## 6. Règles de preuve
[OBSERVÉ] vu dans les fichiers · [TESTÉ] commande réellement exécutée · [DÉCLARÉ] fourni par Nathan ou par la section 1 bis, non vérifié · [RECOMMANDATION] proposition · [À CONFIRMER] non accessible ou non exécuté.
Ne jamais présenter une recommandation comme un fait. Ne pas dire qu'un test fonctionne après avoir seulement lu son code.

---

## 7. Critère de réussite
Une nouvelle session doit pouvoir répondre vite à cinq questions :
1. Quel est l'état actuel du projet ?
2. Quels fichiers modifier pour ma tâche ?
3. Quelle commande assemble le HTML ?
4. Quels tests lancer avant de livrer ?
5. Comment vérifier que je n'ai ni écrasé le travail d'une autre session, ni publié une version incorrecte ?

Livrable : un diagnostic factuel et court, puis un plan priorisé. Ne modifie aucun fichier. Termine en demandant à Nathan l'autorisation de mettre en œuvre **uniquement** les optimisations prioritaires qu'il retient.
