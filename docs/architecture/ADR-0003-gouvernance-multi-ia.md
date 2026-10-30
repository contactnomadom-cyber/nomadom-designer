# ADR-0003 — Gouvernance multi-IA et circuit de validation (30/10/2026)

## Contexte
Le développement est fait par des IA. Jusqu'ici, une seule (Claude Code) travaillait sur le dépôt, encadrée par `CLAUDE.md` et les ADR-0001 et ADR-0002. Nathan souhaite faire travailler trois IA complémentaires — ChatGPT, Claude Code, Gemini — sans ambiguïté sur qui décide, qui modifie le dépôt et qui conseille. L'audit du 30/10/2026 (commit `4f6074e`) a montré que les règles de sécurité existaient déjà, mais pas les rôles ni le circuit d'une mission.

## Décisions (Nathan, 30/10/2026)
1. **Organisation multi-IA semi-automatique** : les missions circulent entre Nathan, ChatGPT, Claude Code et Gemini selon le circuit de `docs/equipe-ia/CIRCUIT.md`.
2. **Nathan garde l'autorité finale** : priorités, périmètres, autorisations, décisions fonctionnelles et architecturales, approbation des ADR, validation, fusion et publication.
3. **Claude Code** est le développeur principal et la **session intégratrice unique** (ADR-0001 §6).
4. **ChatGPT est consultatif** : spécification, analyse, critères d'acceptation, recommandations. Il ne modifie pas le dépôt.
5. **Gemini est consultatif** : revue visuelle, ergonomie, rendu 3D. Il ne modifie jamais le dépôt.
6. **GitHub est la source de vérité commune** : ce qui n'est pas dans le dépôt n'est pas acquis.
7. **Le dépôt est volontairement public.** Ce n'est pas une anomalie à corriger. Cette décision remplace la mention « privé » de l'ADR-0001 §1. Conséquences : aucun secret, identifiant, mot de passe, clé, donnée personnelle (client, adresse, prix d'achat) ni fichier de configuration sensible dans le dépôt. La visibilité du dépôt est distincte de la publication des versions : une version n'est publiée qu'après validation de Nathan (règles Git de `CLAUDE.md`).
8. **Toute mission passe par une fiche** (`docs/equipe-ia/FICHE-TACHE.md`), validée par Nathan avant le travail.
9. **Les décisions architecturales sont des ADR** dans `docs/architecture/`, approuvés par Nathan. Pas de journal de décisions parallèle.
10. **Les règles existantes restent prioritaires** : `CLAUDE.md` (tokens, tests, Git, publication), ADR-0001 et ADR-0002. Ce document ne les affaiblit pas.

Ordre d'autorité : Nathan → ADR et règles du projet → fiche de mission validée → Claude Code (exécution) → ChatGPT et Gemini (recommandations). Aucune IA ne modifie seule cet ordre, ces documents ni `CLAUDE.md`.

## Décision différée — références géométriques
**Statut : VERIFY — décision technique différée.**
- Les formulations « 3V Kruschke 7/12 Ø 5 m » (`CLAUDE.md`, `README.md`) et « découpe 5/9 » (instructions du projet Claude « Acidome Cover+ ») coexistent.
- `docs/glossary.md` (ligne « Coupe / découpage ») indique qu'elles désigneraient le même dôme en notation Acidome et Domerama. Cette piste n'est **pas** validée par cet ADR.
- Aucune formulation n'est désignée comme officielle ici. Les références, fichiers de validation et calculs restent inchangés.
- « 2V Chords 1/2 Ø 5,30 m » est une configuration **distincte**, à garder identifiable.
- Résolution : vérification sur les données de `data/references/` et les sources géométriques, puis décision documentée par un ADR ou un complément signé par Nathan.

## Documents de gouvernance
- `docs/equipe-ia/ROLES-ET-REGLES.md` — rôles, droits, limites, ordre d'autorité.
- `docs/equipe-ia/CIRCUIT.md` — déroulé d'une mission, niveaux, désaccords, arrêts.
- `docs/equipe-ia/FICHE-TACHE.md` — modèle de fiche de mission.
- `docs/equipe-ia/FICHE-REVUE.md` — modèle de revue visuelle (Gemini).
- `docs/equipe-ia/CONTEXTE-COURT.md` — contexte à coller au début d'une conversation ChatGPT ou Gemini.

## Conséquences pour toute session
- Claude Code ne travaille que dans le périmètre d'une fiche autorisée ; une recommandation de ChatGPT ou de Gemini n'est pas un ordre.
- Tout changement de ces documents, de `CLAUDE.md` ou de l'ordre d'autorité demande l'accord explicite de Nathan.
- Historique : décision du 30/10/2026 (mission NOMAD-2026-001).
