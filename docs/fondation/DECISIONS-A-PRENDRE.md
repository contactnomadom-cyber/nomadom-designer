# Décisions à prendre par Nathan

> Mission NOMAD-2026-004, 01/11/2026. Rien de ce qui suit n'est appliqué. Pour chaque point : les options, ma recommandation, et ce que ça change. Nathan tranche ; la décision s'écrit ensuite (fiche ou ADR).

## Mission et documents

**D1 — Numéro de cette mission.** Le carnet d'idées réserve déjà NOMAD-2026-002 et 003 au moteur Kumiko.
- Options : (a) cette mission devient **004** et Kumiko garde 002 / 003 ; (b) cette mission garde 002 et Kumiko passe en 003 / 004.
- Recommandation : **(a)**, puisqu'elle ne touche à rien de déjà écrit.

**D2 — Notation de la référence 3V (« 7/12 » ou « 5/9 »), statut VERIFY d'ADR-0003.**
- Fait nouveau [TESTÉ] : dans le moteur, `7/12` et `5/9` donnent exactement le même dôme (61 / 165 / 105, 30 A / 35 B / 80 C / 20 D). Les deux noms désignent donc le même objet : 7/12 en notation Acidome, 5/9 en notation Domerama. Il n'y a pas de formule de conversion générale (Domerama « 3V 4/9 » = Acidome 5/12).
- Options : (a) formulation officielle « 3V Kruschke 7/12 (Domerama 5/9), Ø 5,00 m », partout ; (b) garder le statut VERIFY et chercher une autre preuve (page Domerama).
- Recommandation : **(a)**, avec une note dans un complément à ADR-0003 ; c'est déjà ce qu'affichent l'appli et `docs/glossary.md`.

**D3 — Document fondateur V1.**
- Options : adopter tel quel / adopter avec corrections / garder comme document de travail.
- Recommandation : le relire, puis l'adopter avec tes corrections. Il ne change aucune règle existante.

**D4 — Corrections documentaires mineures** (`AUDIT-2026-11-01.md` § 5) : README (dossiers `data/references/` absents), en-tête du moteur, renvoi ADR-0001 → ADR-0003 pour « public », historique de validation 0.9.12–0.9.13.
- Recommandation : une petite fiche (niveau Simple), sans aucun code touché.

## Feuille de route

**D5 — Intercaler les étapes de socle M1 (données sûres dans Design) et M2 (tests chiffrés manquants)** entre le kit d'essai et la vue éclatée.
- Options : (a) oui, dans l'ordre proposé ; (b) après le comparateur ; (c) seulement M2.
- Recommandation : **(a)**. Les deux sont petites, ne changent aucun résultat visible, et protègent les étapes suivantes.

**D6 — Périmètre d'une preuve d'atelier.** Quand tu auras cousu et mesuré la première toile, que doit-elle faire passer au 🟢 ?
- Options : (a) seulement les morceaux cousus et mesurés ; (b) tous les morceaux du même gabarit sur ce dôme exact ; (c) le dôme entier, pour ce Ø, cette toile et ces réglages ; (d) une méthode de découpe pour tous les dômes.
- Recommandation : **(c)** au plus, jamais (d) sur un seul essai. Il faut aussi fixer la tolérance acceptée (exemple à discuter : ± 3 mm par bord).

**D7 — Calcul de structure (neige, vent).**
- Options : (a) hors de l'appli, confié à un ingénieur ou à un fournisseur ; (b) étude préalable M9, puis décision ; (c) intégrer un calcul simplifié.
- Recommandation : **(b)**. Ne rien afficher en attendant, et ajouter « structure : non évalué » au statut (M4).

**D7 bis — Débit bois du dôme (M7).** Quels systèmes de connecteur couvrir d'abord (GoodKarma, connecteur acier, autre) et quelles cotes d'atelier (angle de coupe, chanfrein) ?
- À répondre avant M7 ; aucune recommandation sans tes cotes d'atelier.

## Gouvernance

**D8 — Gouvernance modulaire** (`PROPOSITION-GOUVERNANCE-MODULAIRE.md`).
- Options : (a) adopter → ADR-0004 et mise à jour de `docs/equipe-ia/` ; (b) adopter seulement la séparation rôle / droits et le registre ; (c) garder ADR-0003 tel quel.
- Recommandation : **(a)**. Elle reprend ADR-0003 à l'identique et ajoute le remplacement d'une IA indisponible.

**D9 — Relecteur technique** des missions à fort risque (géométrie, cotes, étanchéité, publication).
- Options : ChatGPT, une session Claude séparée qui ne voit que le résultat, ou toi seul.
- Recommandation : une session séparée pour les chiffres, plus ta vérification de 5 minutes du README.

**D10 — Rangement des fiches de mission remplies** (non décidé, `FICHE-TACHE.md`).
- Options : (a) `docs/equipe-ia/fiches/NOMAD-AAAA-NNN.md` ; (b) dans le dossier du livrable (comme ici, `docs/fondation/`) ; (c) dans la conversation seulement.
- Recommandation : **(a)** pour les retrouver toutes au même endroit.

**D11 — Tests automatiques sur GitHub** (intégration continue, gratuite pour un dépôt public).
- Options : (a) lancer le contrôle complet à chaque envoi sur GitHub ; (b) seulement les tests Node (rapides) ; (c) rester comme aujourd'hui (tests lancés par les sessions).
- Recommandation : **(b)** d'abord. Image : un second contrôleur qui repasse derrière chaque livraison, même quand la session a oublié.

## Cette branche

**D12 — Fusion de `docs/NOMAD-2026-004-fondation` dans `main`.** Documentation seulement : aucun fichier de code, aucune version publiée. À fusionner après ta relecture.
