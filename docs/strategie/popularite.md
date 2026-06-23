# Score de popularité

## Décision

`popularité = nombre de sources distinctes du cluster × facteur de récence`, où le facteur de
récence décroît linéairement de 1 (évènement très récent) à 0.1 (plancher, ne tombe jamais à
0) sur une fenêtre de 72h (`src/lib/nlp/popularity.ts`). Le score est partagé par tous les
articles d'un même cluster, recalculé à chaque nouvel article qui y est rattaché.

## Pourquoi

- Le projet n'a pas accès à de vraies métriques d'audience (vues, partages...) : le nombre
  de sources distinctes couvrant un évènement est le meilleur proxy disponible sans service
  tiers payant — un évènement couvert par 8 médias différents est raisonnablement plus
  "important" qu'un fait divers couvert par une seule source.
- La décroissance par récence évite qu'un évènement ancien mais très couvert reste indéfiniment
  en tête de liste : l'actualité "en direct" doit privilégier ce qui se passe maintenant.
- Le score est partagé par tous les articles du cluster (plutôt que recalculé par article)
  car ils décrivent le même évènement : il serait incohérent d'afficher des popularités
  différentes pour des articles qui parlent de la même chose.

## Limites connues

- Biaisé par la couverture du gazetteer de sources (`data/sources/rss-feeds.json`) : un
  évènement réellement majeur mais sous-couvert par les ~20 médias suivis aura un score
  artificiellement bas.
- Le clustering imparfait (voir [clustering-evenements.md](./clustering-evenements.md)) peut
  sous-compter les sources d'un évènement si des articles qui en parlent ne sont pas
  rattachés au même cluster.
