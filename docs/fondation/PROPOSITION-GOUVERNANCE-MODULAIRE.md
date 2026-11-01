# Proposition — gouvernance multi-IA modulaire (indépendante des fournisseurs)

> **Statut : PROPOSITION, NON ADOPTÉE.** Les règles en vigueur restent celles d'ADR-0003 et de `docs/equipe-ia/`. Ce document ne les modifie pas. S'il est accepté, il deviendra un ADR-0004 qui amende ADR-0003 (§ 6), après accord explicite de Nathan.
> Mission NOMAD-2026-004, 01/11/2026.

Image : sur un chantier, on distingue le **poste** (chef d'équipe, contrôleur, métreur) et l'**entreprise** qui l'occupe. Le poste est écrit dans le cahier des charges ; l'entreprise peut changer sans réécrire le cahier. Ici, les postes sont des **rôles**, les entreprises sont les **IA**.

## 1. Ce qui ne change pas

- **Nathan décide en dernier ressort.** Ce rôle n'est attribuable à aucune IA.
- Ordre d'autorité d'ADR-0003 : Nathan → ADR et `CLAUDE.md` → fiche de mission validée → exécutant → conseillers.
- GitHub reste la source de vérité ; le dépôt reste public (aucun secret).
- Une seule session écrit et publie à la fois (« intégrateur unique », ADR-0001 § 6).
- Une recommandation n'est pas un ordre ; une décision s'écrit (fiche ou ADR).
- `CLAUDE.md`, les ADR et `docs/equipe-ia/` ne changent qu'avec l'accord explicite de Nathan.

## 2. Ce qui change : quatre notions séparées

| Notion | Question | Exemple |
|---|---|---|
| **Rôle** | Quelle fonction ? | Intégrateur, spécificateur, relecteur… |
| **Affectation** | Qui tient ce rôle, pour quelle mission ? | « Intégrateur : Claude Code » |
| **Capacités** | Que sait faire cet outil ? | Lire le dépôt, lancer des tests, voir une image |
| **Droits techniques** | À quoi a-t-il accès ? | Écriture sur GitHub, accès à l'ordinateur de Nathan |

Règle clé : **recevoir un rôle ne donne aucun droit**. Un rôle d'intégrateur confié à une IA sans accès en écriture au dépôt ne lui permet pas d'écrire ; il faut d'abord que Nathan lui donne l'accès (exemple réel : le connecteur GitHub de ChatGPT a reçu un refus 403 [BRIEF]).

## 3. Les rôles (définis par fonction)

| Rôle | Fait | Ne fait pas | Capacités nécessaires |
|---|---|---|---|
| **Décideur** (Nathan, non délégable) | Priorités, autorisations, validation, fusion, publication, ADR | — | — |
| **Spécificateur** | Transforme un besoin en fiche : objectif, périmètre, critères vérifiables, risques | Décider ; affirmer ce que fait le code sans l'avoir lu | Lire `docs/` et le contexte court |
| **Intégrateur** (un seul à la fois) | Lit le code, implémente dans le périmètre, teste, documente, prépare la livraison, fusionne et publie après accord | Élargir le périmètre ; changer une référence ; affaiblir un test | Écriture sur le dépôt, exécution de Node, Python, Playwright |
| **Relecteur technique** | Relit un travail qu'il n'a pas produit : code, chiffres, critères cochés | Corriger lui-même dans le dépôt | Lire le dépôt ; idéalement lancer les tests |
| **Relecteur visuel** | Revue d'écrans, ergonomie, rendu 3D (`FICHE-REVUE.md`) | Modifier code ou documents | Voir des images |
| **Chercheur de références** | Trouve et cite des sources indépendantes (Domerama, Antiprism, normes, fiches matériaux) | Les déclarer « validées » | Recherche web, lecture de PDF |

QA reste une fonction transversale (ADR-0003) : tests automatiques par l'intégrateur, relecture par un autre rôle selon le risque, validation métier par Nathan.

## 4. Cumul, partage, remplacement

- **Cumul** : une IA peut tenir plusieurs rôles. Une seule IA peut même tenir tous les rôles sauf Décideur, si Nathan le décide.
- **Une incompatibilité** : sur une mission à fort risque (géométrie, cotes, étanchéité, publication), le **relecteur technique n'est pas l'intégrateur** de la même mission. Le travail ne se note pas lui-même. Si une seule IA est disponible, la relecture se fait dans une **session séparée**, qui ne reçoit que le résultat et la fiche, pas le raisonnement de l'intégrateur.
- **Partage** : plusieurs IA peuvent tenir un même rôle consultatif (deux relecteurs visuels, par exemple). **Jamais** pour l'intégrateur.
- **Remplacement** (IA indisponible, quota épuisé, outil inadapté) :
  1. l'IA active, ou Nathan, constate l'indisponibilité ;
  2. elle peut proposer un remplaçant, avec la raison ;
  3. **Nathan choisit** ;
  4. passation écrite (§ 6) ;
  5. le registre (§ 5) est mis à jour.

## 5. Registre d'affectation

Un tableau unique, tenu à jour par l'intégrateur sur décision de Nathan. État proposé au départ, identique à ADR-0003 :

| Rôle | Affecté à | Depuis | Droits techniques accordés |
|---|---|---|---|
| Décideur | Nathan | — | Tout |
| Intégrateur | Claude Code | 30/10/2026 | Écriture sur le dépôt GitHub (session Claude Code) |
| Spécificateur | ChatGPT (principal), Claude (secours) | 30/10/2026 | Lecture du dépôt public |
| Relecteur technique | ChatGPT ou une session Claude séparée | à décider | Lecture |
| Relecteur visuel | Gemini | 30/10/2026 | Aucun (captures fournies) |
| Chercheur de références | à décider | — | Web |

Emplacement proposé : `docs/equipe-ia/REGISTRE.md` (à créer seulement si la proposition est adoptée).

## 6. Passation : ce que reçoit une IA qui prend un rôle

Courte et autonome, en s'appuyant sur le dépôt plutôt que sur l'historique des conversations :

1. `docs/equipe-ia/CONTEXTE-COURT.md` (à rendre neutre vis-à-vis des fournisseurs, § 7) ;
2. la fiche de mission en cours, avec son statut ;
3. la branche et le dernier commit concernés ;
4. ce qui est fait, ce qui reste à faire, ce qui est bloqué, et les décisions en attente de Nathan ;
5. les documents à lire, et seulement ceux-là.

Critère : une IA qui ne connaît pas le projet doit pouvoir reprendre sans poser de question sur le contexte.

## 7. Ce qu'il faudrait modifier si la proposition est adoptée

Aucune de ces modifications n'est faite ; chacune demande l'accord de Nathan.

| Fichier | Modification |
|---|---|
| `docs/architecture/ADR-0004-gouvernance-modulaire.md` (nouveau) | Décision : rôles par fonction, registre, règles de cumul et de remplacement ; amende ADR-0003 § 3 à 6 |
| `docs/equipe-ia/ROLES-ET-REGLES.md` | Tableau « Qui fait quoi » remplacé par rôles + renvoi au registre |
| `docs/equipe-ia/CONTEXTE-COURT.md` | « Claude Code / ChatGPT / Gemini » remplacés par les rôles ; le registre dit qui |
| `docs/equipe-ia/CIRCUIT.md` | Étapes nommées par rôle ; ajout de la passation |
| `docs/equipe-ia/REGISTRE.md` (nouveau) | Tableau du § 5 |
| `CLAUDE.md` § « Équipe IA » | Une ligne : « rôles et affectations : `docs/equipe-ia/REGISTRE.md` » |

## 8. Points à trancher par Nathan

Voir `DECISIONS-A-PRENDRE.md`, D8 à D10 : adopter ou non ; relecteur technique ; emplacement des fiches de mission.
