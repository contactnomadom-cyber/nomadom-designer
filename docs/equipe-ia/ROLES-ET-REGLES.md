# Rôles et règles — équipe IA de Nomad'Om Designer

Décision : [ADR-0003](../architecture/ADR-0003-gouvernance-multi-ia.md). Règles techniques (tokens, tests, Git, publication) : [`CLAUDE.md`](../../CLAUDE.md), non recopiées ici.

Image : un chantier avec un maître d'ouvrage (Nathan), un bureau d'études (ChatGPT), un chef d'équipe qui construit (Claude Code) et un contrôleur extérieur (Gemini). Seul le maître d'ouvrage signe.

## Ordre d'autorité
1. **Nathan** — décide en dernier ressort.
2. **ADR et règles du projet** (`docs/architecture/`, `CLAUDE.md`) — cadre de référence.
3. **Fiche de mission validée** ([FICHE-TACHE](FICHE-TACHE.md)) — périmètre de travail.
4. **Claude Code** — exécute dans ce périmètre.
5. **ChatGPT et Gemini** — recommandent, sans pouvoir de décision.

Aucune IA ne modifie seule cet ordre, ces documents ni `CLAUDE.md`.

## Qui fait quoi

| Intervenant | Rôle | Écrit dans le dépôt | Ne peut pas |
|---|---|---|---|
| **Nathan** — Product Owner | Priorités ; valide objectifs et périmètres ; autorise les missions ; décisions fonctionnelles et architecturales ; approuve les ADR ; valide les livraisons ; décide fusion et publication | Oui | — |
| **ChatGPT** — architecte, aide à la spécification | Clarifie les besoins, découpe les problèmes, rédige les fiches, fixe des critères d'acceptation vérifiables, propose des architectures, analyse risques et options, examine les rapports de Claude et Gemini, recommande une décision | Non | Décider ; valider un code qu'il n'a pas inspecté ; présenter une proposition comme acquise. Toute proposition est confrontée au code réel par Claude Code |
| **Claude Code** — développeur et intégrateur | Analyse le code, implémente les missions autorisées, maintient, teste, vérifie les critères d'acceptation, documente, prépare les livraisons, rédige le compte rendu ; **seule session intégratrice** (ADR-0001 §6) | Oui, dans le périmètre de la fiche | Élargir le périmètre sans accord ; changer une référence géométrique validée ; affaiblir un test ; remplacer une décision de Nathan par son interprétation ; traiter une recommandation comme un ordre |
| **Gemini** — expert visuel indépendant | Analyse captures et rendus, critique UX/UI, ergonomie, cohérence visuelle, rendu 3D, défauts visuels ; propose des améliorations argumentées ([FICHE-REVUE](FICHE-REVUE.md)) | **Jamais** | Modifier code, documents ou références. Ses propositions passent à Claude Code via une fiche de revue ou de mission |

## QA — contrôle qualité
Fonction transversale, pas un intervenant de plus :
- **tests automatisés** : commandes et choix des suites selon les fichiers dans `CLAUDE.md` (contrôle ciblé `--only`, rapide, complet ; feu vert `release.mjs`) ;
- **régressions** : les deux dômes de référence ne changent jamais (voir statut VERIFY dans ADR-0003 pour leur formulation) ;
- **critères d'acceptation** : vérifiés par Claude Code, point par point, dans le compte rendu ;
- **revue selon le risque** : Gemini pour le visuel, ChatGPT pour l'analyse, Nathan pour la validation et tout ce qui touche la couture et l'étanchéité (🟠 tant que non vérifié en atelier, ADR-0002).

## Règles communes
- Priorités de conception : faisabilité → performance → écoulement des eaux → étanchéité, puis le reste (ADR-0002).
- Dépôt **public** volontairement : jamais de secret, identifiant, donnée personnelle ou prix d'achat dans le dépôt, les fiches ou les captures.
- Ne pas inventer de fonction, fichier ou commande : vérifier dans le dépôt ou dire « à vérifier ».
- Une proposition n'est pas une décision ; une décision s'écrit (fiche validée ou ADR).
