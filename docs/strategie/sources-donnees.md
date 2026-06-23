# Sources de données

## Décision

Flux RSS d'une vingtaine de médias internationaux reconnus (`data/sources/rss-feeds.json`)
comme source principale, complétés optionnellement par une API d'actualité gratuite (GNews
ou NewsAPI) si une clé est fournie.

## Pourquoi

- Les flux RSS sont **gratuits, illimités, sans clé API**, et couvrent déjà plusieurs
  régions/langues (France, Royaume-Uni, États-Unis, Allemagne, Qatar, Japon...) et plusieurs
  catégories (généraliste, environnement, technologie, politique, économie). Ils suffisent à
  faire fonctionner le projet "out of the box".
- L'API gratuite est **optionnelle** (`GNEWS_KEY` / `NEWSAPI_KEY` dans `.env`) car les
  niveaux gratuits sont limités en volume (souvent ~100 requêtes/jour) et nécessitent un
  compte tiers — on ne veut pas bloquer la prise en main du projet sur cette étape.
- Les articles venant de l'API sans flux RSS correspondant reçoivent une `Source`
  synthétique (`rssUrl: "api:<host>"`, `country: "ZZ"`) car leur pays d'origine n'est pas
  toujours fiable à déduire du nom de domaine — limite connue, le pays réel de l'article est
  de toute façon recalculé par géolocalisation du texte (voir
  [geolocalisation.md](./geolocalisation.md)).

## Limites connues

- La liste de flux RSS est curatée à la main et n'est pas exhaustive : elle privilégie des
  médias anglophones et francophones largement reconnus. Étendre la couverture (autres
  langues/régions) consiste simplement à ajouter des entrées à
  `data/sources/rss-feeds.json` — aucun changement de code nécessaire.
- Certains flux RSS changent d'URL ou disparaissent sans préavis ; `fetchRssArticles`
  avale silencieusement les échecs par source pour ne pas bloquer l'ingestion globale, mais
  cela peut masquer une source cassée pendant un moment (à surveiller dans les logs
  `[fetchRssArticles] échec...`).
