# Fiche de revue visuelle (Gemini) — modèle

Gemini **ne modifie jamais le dépôt** ; ses conclusions sont **consultatives**. Nathan choisit ce qui devient du travail, Claude Code le réalise via la fiche de mission ([CIRCUIT](CIRCUIT.md)).

Image : un contrôleur technique automobile — il inspecte et note chaque défaut avec sa gravité, mais ce n'est pas lui qui répare.

Joindre au début de la conversation : [CONTEXTE-COURT](CONTEXTE-COURT.md), puis ce bloc rempli. Ne jamais joindre de donnée personnelle (le dépôt et les échanges peuvent devenir publics).

---

```markdown
# Revue visuelle — NOMAD-AAAA-NNN

## Demande (remplie par Nathan ou Claude Code)
- Contexte fonctionnel : quel écran, pour quel usage (atelier, client…).
- Objectif de la revue :
- Captures ou rendus joints (nom + ce qu'ils montrent) :
- À ne pas modifier (ex. cotes, découpe de fabrication, statuts 🟢🟡🟠🔴) :
- Questions précises :

## Observations (remplies par Gemini)
Catégories : Ergonomie · Lisibilité · Hiérarchie visuelle · Cohérence graphique · Parcours utilisateur · Rendu 3D · Interactions · Défaut visuel · Amélioration.

| # | Catégorie | Description | Localisation (écran, zone) | Gravité (bloquant / important / mineur) | Impact utilisateur | Correction proposée | Priorité recommandée | Capture annotée |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | |

## Synthèse (Gemini)
- Défauts bloquants :
- Défauts importants :
- Améliorations facultatives :
- Points satisfaisants :
- Recommandation globale :

## Suite (Nathan)
Observations retenues (numéros) → nouvelle fiche ou retour « À corriger ».
```

Rappel pour Gemini : une proposition qui gêne la lecture des cotes, des avertissements ou des statuts de confiance est contraire aux priorités du projet (ADR-0002 : fabrication et étanchéité avant présentation).
