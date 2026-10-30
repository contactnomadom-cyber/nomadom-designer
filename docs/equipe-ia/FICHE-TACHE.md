# Fiche de mission — modèle

Copier le bloc ci-dessous, le remplir, le faire valider par Nathan avant tout travail. Circuit : [CIRCUIT](CIRCUIT.md). Rester court : une ligne suffit souvent par rubrique.

Statuts : Brouillon · À valider · Autorisée · En cours · En revue · À corriger · En attente de Nathan · Validée · Abandonnée.

> Rangement des fiches remplies : non décidé (Nathan). En attendant, la fiche vit dans la conversation et son identifiant est cité dans la branche, le commit et le compte rendu.

---

```markdown
# NOMAD-AAAA-NNN — <titre court>

| Rubrique | Contenu |
|---|---|
| Date | JJ/MM/AAAA |
| Demandeur | Nathan |
| Exécutant | Claude Code |
| Niveau | Simple / Technique / Visuelle |
| Statut | Brouillon |

## Objectif
Ce qui doit être vrai à la fin, en une phrase.

## Contexte et problème
Pourquoi maintenant ; ce qui ne va pas aujourd'hui.

## Résultat attendu
Ce que Nathan voit ou obtient (écran, fichier, comportement).

## Périmètre autorisé
- Fichiers ou modules concernés (si connus) :
- Exclus explicitement :

## Contraintes
Règles de `CLAUDE.md`, ADR concernés (ex. ADR-0002 étanchéité), références géométriques intouchables.

## Critères d'acceptation (vérifiables)
- [ ] …
- [ ] Les deux dômes de référence restent identiques.

## Tests attendus
Suites `--only` selon le tableau « Quels tests selon les fichiers modifiés » de `CLAUDE.md` ; nouveaux tests pour toute nouvelle fonction. Ne citer que des commandes qui existent.

## Revue Gemini
Non / Oui : écrans à examiner.

## Risques
Ce qui pourrait casser ; effet possible sur l'écoulement des eaux ou l'étanchéité.

## Autorisation de Nathan
« Autorisée » + date.

## Compte rendu (Claude Code)
Format de `CLAUDE.md` : ce qui change pour Nathan · fichiers touchés · tests et résultat · reste à faire. Plus : critères d'acceptation cochés un par un.

## Décision finale de Nathan
Validée / À corriger / Abandonnée + date.
```
