# Clustering d'évènements

## Décision

Un nouvel article est rattaché à un cluster existant si : même catégorie + similarité de
Jaccard sur les mots du titre ≥ 0.3, parmi les clusters créés dans les 48 dernières heures
(`src/lib/nlp/cluster.ts`). Sinon, un nouveau cluster est créé.

## Pourquoi

- Un vrai clustering sémantique (embeddings + similarité cosinus) donnerait de meilleurs
  résultats sur des titres formulés différemment, mais demande un modèle d'embeddings
  (coût/poids supplémentaire) — écarté pour la V1 au profit d'une heuristique lexicale,
  gratuite et rapide à calculer pour chaque nouvel article.
- La fenêtre de 48h évite de comparer un article à des clusters trop anciens (et donc
  probablement sur un évènement différent même si le vocabulaire se recoupe), et limite le
  nombre de candidats à comparer à chaque ingestion.
- Le clustering est ce qui permet l'interprétation multi-sources demandée (comparer
  plusieurs articles sur le même évènement) sans dépendre d'un identifiant d'évènement
  fourni par une source externe.

## Limites connues

- Deux titres très différents sur le même évènement (formulations très différentes d'un
  média à l'autre) peuvent ne pas être rattachés au même cluster — le score de popularité et
  l'interprétation seront alors moins riches (moins de sources détectées) pour cet
  évènement.
- À l'inverse, des articles différents mais au vocabulaire proche (ex. deux articles
  "élection" dans des pays différents) peuvent occasionnellement être regroupés à tort. Le
  seuil de 0.3 est un compromis empirique, pas calibré sur un jeu de données réel.

## Piste d'évolution

Remplacer le score de Jaccard par une similarité d'embeddings (ex. modèle local
`Xenova/all-MiniLM-L6-v2`) améliorerait la précision sans changer le contrat de
`findBestCluster()` (toujours : titre + catégorie + candidats → id de cluster ou `null`).
