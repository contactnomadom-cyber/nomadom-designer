# NOMAD-2026-004 — Audit complet, document fondateur V1, gouvernance modulaire

| Rubrique | Contenu |
|---|---|
| Date | 01/11/2026 |
| Demandeur | Nathan |
| Exécutant | Claude Code |
| Niveau | Technique (documentaire seulement) |
| Statut | En revue |

> Numéro : Nathan a accepté « NOMAD-2026-002 » le 01/11/2026, mais `docs/IDEES-A-TRAITER.md` réserve déjà 002 et 003 au moteur Kumiko. Pour éviter un doublon, cette mission prend le premier numéro libre, **004** — à confirmer par Nathan (voir `DECISIONS-A-PRENDRE.md`, D1).

## Objectif
Comprendre précisément l'existant et préparer la suite, sans modifier le code : audit qualifié du dépôt, document fondateur V1, proposition de gouvernance multi-IA indépendante des fournisseurs, décisions à prendre, feuille de route de migration.

## Contexte et problème
Dossier « NomadOm_Dossier_Preparation_Claude_Code_V1-3 » (préparé avec ChatGPT, remis par Nathan le 01/11/2026). Il demande une mission de lecture et de préparation documentaire avant toute évolution structurante.

## Résultat attendu
Des fichiers Markdown dans `docs/fondation/`, sur la branche `docs/NOMAD-2026-004-fondation`, que Nathan relit avant fusion.

## Périmètre autorisé
- Lecture : « LECTURE APPROFONDIE AUTORISÉE » pour `src/`, `tests/`, `scripts/`, `docs/` (Nathan, 01/11/2026). `vendor/` et `dist/` exclus.
- Écriture : seulement le nouveau dossier `docs/fondation/`.
- Exclus explicitement : tout le code (`src/`, `tests/`, `scripts/`), `CLAUDE.md`, les ADR, `docs/equipe-ia/`, les références géométriques.

## Contraintes
`CLAUDE.md`, ADR-0001, ADR-0002, ADR-0003. Aucune règle existante remplacée : la gouvernance modulaire est une **proposition**.

## Critères d'acceptation (vérifiables)
- [x] Aucune fonctionnalité ni aucun fichier de code modifié (`git diff --stat` ne touche que `docs/fondation/`).
- [x] Chaque affirmation de l'audit est qualifiée : [CODE], [TESTÉ], [BRIEF], [HYPOTHÈSE], [RECOMMANDATION], [À CONFIRMER].
- [x] Résultats de tests limités à ce qui a été réellement exécuté le 01/11/2026.
- [x] Architecture cible comparée à l'existant, module par module.
- [x] Frontières géométrie / mécanique / validation / fabrication explicites.
- [x] Gouvernance actuelle (ADR-0003) intacte ; proposition séparée et marquée « non adoptée ».
- [x] Décisions réservées à Nathan isolées dans un seul fichier.
- [x] Les deux dômes de référence restent identiques (batterie complète).

## Tests attendus
Contrôle complet `node scripts/test-all.mjs` (état des lieux, aucun code modifié).

## Revue Gemini
Non.

## Risques
Aucun sur l'application (rien de code n'est touché). Risque documentaire : qu'une proposition soit lue comme une décision — chaque document porte son statut en tête.

## Autorisation de Nathan
« Autorisée » — 01/11/2026 (réponses : lecture de tout le dépôt, dossier V1-3 valant fiche, livrables dans le dépôt).

## Compte rendu (Claude Code)
Voir le message de fin de mission et `AUDIT-2026-11-01.md` § 9 (état des tests).

## Décision finale de Nathan
À venir.
