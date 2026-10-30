# ADR-0002 — Priorités de conception : la toile doit tenir l'eau avant d'être pratique (30/10/2026)

## Contexte
Le 30/10/2026, une découpe « Gabarits alignés sur les axes » a été développée pour que la pelure d'orange à 5 fentes droites (axe des arêtes d'origine) ne casse aucun morceau. Elle était équivalente sur le papier : même nombre de morceaux, mêmes largeurs, même longueur de couture.
Le comptage nœud par nœud (3V Kruschke Ø 5 m) a montré l'écart réel :
- découpe « Moins de gabarits » : coutures montantes **décalées** d'un étage à l'autre (quinconce, comme des ardoises) → 30 jonctions en T, une seule couture montante par croisement ;
- découpe alignée : coutures montantes **en ligne** du sommet au sol → 5 chemins d'eau continus, 15 croisements à 4 morceaux (plus épais, plus durs à étancher).
Nathan a retenu la découpe décalée (effet tuile) et la pelure « 5 fentes — suivant les gabarits (zigzag) » pour présenter la toile sur la structure.

## Décision (Nathan, 30/10/2026)
Pour **tout** le développement de l'application, chaque choix (découpe, couture, ouverture, structure, nouveau produit) est jugé dans cet ordre :
1. **Faisabilité technique** — réalisable en atelier avec les moyens réels (laize, machine, manipulation des morceaux).
2. **Performance** — tenue mécanique, durabilité, résistance (vent, tension, usure des coutures).
3. **Écoulement des eaux** — le morceau du dessus recouvre celui du dessous (côté A sur côté B), joints décalés, aucun chemin d'eau continu.
4. **Étanchéité** — le moins possible de croisements épais ou de points difficiles à étancher.
Seulement ensuite : facilité de présentation, esthétique, économie de toile, nombre de gabarits.

## Conséquences pour toute session
- Une option qui améliore la présentation ou l'économie **au détriment** des points 1 à 4 n'est pas proposée par défaut. Si Nathan la demande, elle est marquée d'un avertissement explicite dans l'interface et l'aide.
- Toute nouvelle découpe ou couture est accompagnée d'un comptage objectif : jonctions (T / croix), coutures continues, croisements, épaisseurs. Le résultat est présenté à Nathan **avant** de l'implémenter.
- Statuts : ce qui relève de la couture ou de l'étanchéité reste 🟠 tant qu'il n'est pas vérifié en atelier.
