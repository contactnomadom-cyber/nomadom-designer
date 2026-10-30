# Circuit d'une mission

Rôles : [ROLES-ET-REGLES](ROLES-ET-REGLES.md). Décision : [ADR-0003](../architecture/ADR-0003-gouvernance-multi-ia.md).

Image : un relais où le témoin est la **fiche de mission**. Elle passe de main en main, et c'est toujours Nathan qui donne le départ et franchit la ligne d'arrivée.

## Circuit complet
1. **Nathan** exprime un besoin (ou le prend dans [`IDEES-A-TRAITER.md`](../IDEES-A-TRAITER.md)).
2. **ChatGPT** aide à le transformer en fiche ([FICHE-TACHE](FICHE-TACHE.md)), statut « À valider ».
3. **Nathan** valide la fiche → « Autorisée ».
4. **Claude Code** inspecte le code et confirme la faisabilité, ou signale un écart avec la fiche (fonction absente, règle contredite) → retour à Nathan.
5. **Claude Code** implémente sur sa branche (`feature/…`, `fix/…`), dans le périmètre → « En cours ».
6. **QA** : tests ciblés puis contrôle selon `CLAUDE.md`.
7. **Gemini** relit les captures si la mission est visuelle ([FICHE-REVUE](FICHE-REVUE.md)) → « En revue ».
8. **ChatGPT** peut analyser rapports et revues, puis recommander.
9. **Claude Code** intègre les corrections **autorisées par Nathan** → « À corriger » puis retour à 6.
10. **Nathan** valide → « Validée ».
11. **Claude Code** fusionne et publie selon les règles Git de `CLAUDE.md`, rédige le compte rendu et met à jour la documentation concernée (`CHANGELOG.md`, `IDEES-A-TRAITER.md`).

## Trois niveaux — toutes les IA n'interviennent pas toujours

| Niveau | Quand | Circuit |
|---|---|---|
| Simple | Petite correction, périmètre évident | Nathan → Claude Code → tests → validation Nathan |
| Technique | Nouvelle logique, plusieurs modules, choix d'architecture | Nathan → ChatGPT → Claude Code → tests → revue (ChatGPT) → validation Nathan |
| Visuelle | Interface, ergonomie, rendu 3D | Nathan → ChatGPT → Claude Code → Gemini → corrections → validation Nathan |

Le niveau est écrit dans la fiche ; Nathan peut le changer.

## Situations particulières
- **Retours** : chaque retour (revue, test, remarque) est noté dans la fiche ; seuls ceux retenus par Nathan deviennent du travail.
- **Désaccord entre IA** : chaque IA expose son option en quelques lignes (avantage, risque, effet sur l'étanchéité) ; ChatGPT peut recommander ; **Nathan tranche**. Le code réel, constaté par Claude Code, prime sur une hypothèse.
- **Demande hors périmètre** : ne pas la réaliser ; la noter dans le compte rendu ou dans `IDEES-A-TRAITER.md` ; une nouvelle fiche si Nathan le veut.
- **Anomalie découverte en cours** : la signaler, sans la corriger hors périmètre ; si elle touche la justesse (géométrie, cotes, étanchéité), mettre la mission « En attente de Nathan ».
- **Arrêt d'une mission** : test qui ne peut passer qu'en l'affaiblissant ; référence géométrique qui devrait changer ; règle de `CLAUDE.md` ou d'un ADR contredite ; périmètre impossible à tenir ; décision irréversible non prévue. Statut « En attente de Nathan » ou « Abandonnée ».
- **Changement de périmètre** : toujours une validation explicite de Nathan, écrite dans la fiche.

## Traçabilité
- La fiche (identifiant `NOMAD-AAAA-NNN`) est citée dans le nom de branche ou le message de commit et dans le compte rendu.
- Décision durable → ADR dans `docs/architecture/` ; version → `CHANGELOG.md` ; idée → `IDEES-A-TRAITER.md`.
- Où ranger les fiches dans le dépôt : à décider par Nathan (voir la note dans [FICHE-TACHE](FICHE-TACHE.md)).
