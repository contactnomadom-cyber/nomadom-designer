# ADR-0001 — Dépôt Git, assemblage automatique et conventions (30/10/2026)

## Contexte
Jusqu'à la bêta 0.9.11, l'application était modifiée directement dans le fichier HTML (extraction des scripts, réinjection, scripts de patch par remplacement de texte). Le 30/10/2026, deux sessions ont publié en parallèle ; une fusion à la main a évité la perte de travail. Deux revues d'architecture externes (docs/audits/) recommandent de sécuriser la production du fichier avant toute restructuration.

## Décisions (Nathan, 30/10/2026)
1. **Dépôt Git** `nomadom-designer` (GitHub, privé). Les sources font foi ; `dist/nomadom-designer.html` est **généré**, jamais modifié à la main, et versionné pour tracer le fichier livré.
2. **Assemblage** : `src/index.html` (gabarit avec marqueurs `{{MODULE:id}}`) + `build/manifest.json` → `scripts/build.mjs`. Critère de départ : le build redonne la 0.9.11 publiée **octet pour octet** (vérifié).
3. **Contrôle** : `node scripts/test-all.mjs` teste l'artefact assemblé (modules extraits du HTML, pas des sources). `scripts/release.mjs` refuse la publication si ce HTML exact n'a pas passé le contrôle complet.
4. **Langue** : code en anglais, interface en français, glossaire dans `docs/glossary.md`. Renommages progressifs.
5. **Cover+** reste le nom du module toile dans l'interface.
6. **Une seule session intégratrice** fusionne et publie ; chaque chantier sur sa branche. Plus de scripts de patch.
7. **Unités** : le moteur calcule en mètres ; les millimètres sont pour l'affichage et la saisie. Aucun changement d'unité interne sans chantier dédié.
8. **Dossiers produits** créés seulement quand le produit arrive (pas de dossiers vides « pour plus tard »).

## Suite prévue
- Chantier B : statut de confiance sorti de l'interface vers un service de validation ; références (Domerama, Antiprism, atelier) en données dans `data/references/`.
- Chantier C : `FabricSpec` puis `FabricPiece` en adaptateurs autour de l'existant, sans changer les résultats.
- Découpage progressif de `src/app/app.js` (2 588 lignes), un bloc à la fois, batterie verte à chaque étape.
