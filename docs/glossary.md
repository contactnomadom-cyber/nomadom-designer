# Glossaire métier — Nomad'Om Designer

| Terme | Sens |
|---|---|
| Dôme géodésique | Sphère découpée en triangles, obtenue en subdivisant un polyèdre (ici l'icosaèdre). |
| Fréquence (1V…8V) | Nombre de subdivisions de chaque arête du polyèdre. Plus V est grand, plus il y a de petits triangles. |
| Classe I | Façon de subdiviser (la seule gérée). |
| Méthode | Façon de placer les points : **Chords** (cordes égales), **Arcs** (arcs égaux), **Kruschke** (Chords corrigé pour que la base soit plate, 3V et 4V), **Mexican** (retirée des menus). |
| Symétrie | Ce qui est au sommet : **Pentad** (un nœud à 5 branches), **Triad** (une face), **Cross** (une arête). |
| Coupe / découpage | La part de sphère gardée. Acidome l'écrit en p / 4V (ex. 7/12). Domerama nomme le même dôme autrement (7/12 Kruschke = « 3V 5/9 »). L'appli affiche les deux. |
| Base alignée / plate | Les nœuds du bord sont ramenés dans un même plan horizontal. |
| Montant (strut) | Barre de la structure entre deux nœuds. Les montants de même longueur forment une classe (A, B, C…). |
| Structure avec connecteur / GoodKarma | Avec connecteur : la toile passe au niveau des nœuds. GoodKarma (sans connecteur) : la toile repose sur la face extérieure des montants, donc le patron est agrandi. |
| Laize | Largeur du rouleau de toile (1 500 mm). **Lisière** : bord inutilisable. **Largeur utile** = laize − 2 × lisière. |
| Marge A / marge B | Surplus de couture de chaque côté d'une couture (A recouvre B, pour que l'eau ruisselle). **Ourlet** : bord bas du dôme. |
| Étage | Rangée de triangles entre deux anneaux de nœuds. La toile est découpée étage par étage. |
| Morceau / gabarit | Un morceau = une pièce de toile à couper. Un gabarit = une forme tracée une fois et réutilisée pour tous les morceaux identiques. |
| Sans vague | Le morceau se pose à plat sans déformation : longueurs conservées et aucun nœud intérieur (critère calculé). |
| Fiche patron / fiche de traçage | Fiche d'un morceau avec toutes les cotes, imprimable pour tracer à la main en atelier. |
| Plan de coupe / rouleau | Placement des morceaux sur le rouleau (nesting) pour minimiser le métrage. |
| Stratégies de découpe | Moins de morceaux / moins de gabarits / moins de toile (optimisation) / triangle par triangle. |
| Acidome (ACIDOME CALC 221027) | Ancien logiciel de calcul de dômes dont le moteur a été porté. Le portage est identique à Acidome sur 571 combinaisons. |

---


## Règle de nommage (décision du 30/10/2026)

- **Code en anglais** (fichiers, fonctions, variables, objets), **interface en français**.
- Les **termes d'atelier** gardent leur nom français dans l'interface et les commentaires : laize, lisière, marge A/B, ourlet, étage, morceau, gabarit, fiche patron, base alignée.
- **Cover+** reste le nom du module toile dans l'interface.
- Vocabulaire Kumiko conservé tel quel : kumiko, waku (cadre), jigumi (grille), tsukeko (pièces du motif).
- Les renommages se font **progressivement**, seulement quand un chantier touche déjà le fichier (jamais de renommage global).

| Terme d'atelier | Nom dans le code (cible) |
|---|---|
| laize | fabricWidth |
| lisière | selvage |
| largeur utile | usableWidth |
| marge A / marge B | seamAllowance.A / seamAllowance.B |
| ourlet | hem |
| étage | tier (module actuel : `etages`) |
| morceau | piece |
| gabarit | template |
| fiche patron | pieceSheet |
| plan de coupe / rouleau | nesting / roll |
| montant | strut |
| nœud | hub (structure) / vertex (géométrie) |
| coupe / découpage | partial (cut) |
| base alignée | alignTheBase |
| sans vague | flat (check.flat) |
