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

## Extension : vélocité et flag "breaking" (phase 2)

En plus du score cumulé ci-dessus, chaque cluster porte une **vélocité** (`sourceVelocity`) :
le nombre de sources distinctes ayant publié dans les 3 dernières heures (voir
`src/lib/nlp/breaking.ts`). Au-delà de 3 sources dans la fenêtre, le cluster est marqué
`breaking: true` — exposé dans l'API (`ArticleDTO.breaking`), affiché en badge dans la liste
et en anneau rouge pulsant sur le globe. Le flag retombe automatiquement : recalculé à chaque
article ajouté, et éteint en fin de passe d'ingestion pour les clusters sans activité depuis
la fenêtre. Les clusters "cybersecurite" reçoivent par ailleurs un multiplicateur d'impact
(voir `src/lib/nlp/cyberImpact.ts`).
