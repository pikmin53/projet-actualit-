# Géolocalisation des actualités

## Décision

Détection heuristique par mots-clés : recherche d'abord une ville connue, puis un pays connu,
dans le titre + contenu de l'article (`src/lib/nlp/geolocate.ts`), avec repli sur le pays
d'origine de la source si rien n'est trouvé.

## Pourquoi

- Une vraie reconnaissance d'entités nommées (NER) de qualité demande un modèle ML
  (souvent payant en hébergé, ou lourd en local) — hors budget pour ce projet
  (voir [resume-et-interpretation.md](./resume-et-interpretation.md) pour le même arbitrage
  appliqué au résumé/interprétation).
- Un gazetteer (listes `data/geo/countries.json` et `data/geo/cities.json`) reste
  **explicable et gratuit** : on sait toujours pourquoi un lieu a été détecté, et l'étendre
  ne demande qu'à ajouter des entrées JSON, pas de réentraîner un modèle.
- Les villes sont vérifiées avant les pays car elles sont plus spécifiques (un article
  mentionnant "Tokyo" doit pointer sur Tokyo, pas sur le centroïde du Japon).

## Limites connues

- **Ambiguïté** : certains noms de villes/pays sont aussi des mots communs ou des noms de
  personnes (non traité spécifiquement, source de faux positifs occasionnels).
- **Biais anglophone/francophone** : le gazetteer ne couvre qu'environ 65 pays et 90 villes
  majeures, avec des alias principalement en français et anglais. Un évènement très local
  dans une ville absente du gazetteer retombera sur le centroïde du pays (moins précis), ou
  sur le pays de la source si aucun lieu n'est détecté du tout.
- **Premier match gagne** : si un article mentionne plusieurs lieux, seul le premier trouvé
  dans les listes (pas dans le texte) est retenu — un article sur un sommet international
  cite souvent plusieurs pays, et celui qui "gagne" dépend de l'ordre du gazetteer, pas de
  l'importance réelle dans l'article.

## Piste d'évolution

Remplacer/compléter `geolocate()` par un vrai NER (ex. via un modèle local `transformers.js`)
serait un changement localisé à `src/lib/nlp/geolocate.ts`, sans impact sur le reste du
pipeline (même contrat de retour `GeoMatch`).
