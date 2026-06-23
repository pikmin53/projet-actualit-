# Référence des fonctions du pipeline

Documentation textuelle des fonctions clés (rôle, paramètres, valeur de retour). Le code
porte aussi des commentaires JSDoc équivalents ; ce document sert de référence consultable
sans ouvrir chaque fichier. Pour le "pourquoi" de chaque choix, voir `docs/strategie/`.

## `src/lib/nlp/categorize.ts`

### `categorize(text: string): Category`
Catégorise un texte par comptage de mots-clés (FR+EN) par catégorie.
- **`text`** : texte à analyser, typiquement `${title} ${rawContent}` d'un article.
- **Retour** : la catégorie (`environnement` | `technologie` | `politique` | `economique`)
  dont le score de mots-clés est le plus élevé, ou `"autre"` si aucun mot-clé ne correspond.

## `src/lib/nlp/geolocate.ts`

### `geolocate(text: string): GeoMatch | null`
Recherche un lieu connu (ville puis pays) dans un texte, par correspondance de mots entiers.
- **`text`** : texte à analyser.
- **Retour** : `{ countryCode, locationLabel, lat, lng }` du premier lieu trouvé (ville
  prioritaire sur pays), ou `null` si aucun lieu du gazetteer n'apparaît dans le texte.

### `countryCentroid(code: string): GeoMatch | null`
Renvoie le centroïde d'un pays, utilisé en repli quand `geolocate` ne trouve rien.
- **`code`** : code pays ISO 3166-1 alpha-2 (ex: `"FR"`).
- **Retour** : le lieu correspondant, ou `null` si le code est absent du gazetteer
  (`data/geo/countries.json`).

## `src/lib/nlp/cluster.ts`

### `jaccardSimilarity(wordsA: string[], wordsB: string[]): number`
Coefficient de Jaccard entre deux ensembles de mots : taille de l'intersection / taille de
l'union. `0` si l'un des ensembles est vide.

### `findBestCluster(articleTitle: string, category: string, candidates: ClusterCandidate[]): string | null`
Cherche, parmi des clusters candidats, celui dont le libellé recouvre le plus le titre donné.
- **`articleTitle`** : titre du nouvel article à rattacher.
- **`category`** : catégorie du nouvel article ; seuls les candidats de même catégorie sont
  considérés.
- **`candidates`** : clusters récents `{ id, label, category, ageHours }` (typiquement les
  clusters créés dans les `CLUSTER_TIME_WINDOW_HOURS` dernières heures, même catégorie).
- **Retour** : l'id du meilleur cluster si sa similarité dépasse
  `CLUSTER_SIMILARITY_THRESHOLD` (0.3), sinon `null` (il faut alors créer un nouveau cluster).

## `src/lib/nlp/popularity.ts`

### `computePopularity(distinctSourceCount: number, mostRecentPublishedAt: Date, now?: Date): number`
Calcule le score de popularité d'un cluster d'évènement.
- **`distinctSourceCount`** : nombre de sources distinctes couvrant l'évènement.
- **`mostRecentPublishedAt`** : date de publication la plus récente dans le cluster.
- **`now`** : horodatage de référence (défaut : maintenant), surtout utile pour les tests.
- **Retour** : `distinctSourceCount × facteur de récence` (le facteur décroît linéairement de
  1 à 0.1 sur `RECENCY_HORIZON_HOURS` = 72h), arrondi à 2 décimales.

## `src/lib/nlp/keywords.ts`

### `splitSentences(text: string): string[]`
Découpe un texte en phrases (gère la ponctuation FR/EN courante).

### `extractWords(text: string): string[]`
Extrait les mots significatifs d'un texte : minuscules, hors mots vides (FR+EN), longueur > 2.

### `topKeywords(text: string, limit?: number): string[]`
Mots-clés dominants d'un texte par fréquence brute.
- **`limit`** : nombre maximum de mots-clés renvoyés (défaut 5).

## `src/lib/nlp/providers/` (résumé et interprétation interchangeables)

### `SummarizerProvider.summarize(text: string, opts?: { maxSentences?: number }): Promise<string>`
Contrat commun à tout résumeur. `extractiveSummarizer` (défaut) score les phrases par
fréquence de mots et garde les `maxSentences` (défaut 3) les mieux notées, dans leur ordre
d'origine. `transformersSummarizer` (optionnel, nécessite `@xenova/transformers`) utilise un
modèle local abstractif (`Xenova/distilbart-cnn-6-6`).

### `InterpreterProvider.interpret(cluster: { label, category, articles }): Promise<Interpretation>`
Contrat commun à toute interprétation de cluster. `heuristicInterpreter` (défaut) calcule les
mots-clés dominants de chaque source (`topKeywords`), puis :
- **`commonPoints`** : mots-clés présents chez une majorité de sources (≥ moitié, mini 2).
- **`divergences`** : mots-clés présents chez une seule source (si le cluster a plus d'une
  source).
- **`dominantKeywordsBySource`** : mots-clés dominants par nom de source.
- **`impactNote`** : phrase générique déduite de la catégorie du cluster.

### `getSummarizer(providerName?: string): SummarizerProvider` / `getInterpreter(providerName?: string): InterpreterProvider`
Résolvent le provider actif. Si `providerName` est omis, lisent respectivement
`process.env.SUMMARIZER_PROVIDER` (défaut `"extractive"`) et
`process.env.INTERPRETER_PROVIDER` (défaut `"heuristic"`). Lèvent une erreur explicite si le
nom ne correspond à aucun provider enregistré dans `registry.ts`.

## `src/lib/ingestion/`

### `fetchRssArticles(source: FeedSource): Promise<RawArticle[]>`
Récupère et normalise les articles d'un flux RSS via `rss-parser`.
- **`source`** : `{ id, name, rssUrl, country }` (id = identifiant en base de la `Source`).
- **Retour** : tableau de `RawArticle` ; tableau **vide** (pas d'exception) si le flux est
  injoignable ou invalide, pour ne pas interrompre l'ingestion des autres sources.

### `fetchApiArticles(): Promise<ExternalArticle[]>`
Complète les flux RSS via une API gratuite. Utilise `GNEWS_KEY` si défini, sinon
`NEWSAPI_KEY`, sinon ne fait rien. Retourne un tableau vide en cas d'erreur réseau/API.

### `normalizeArticle(raw: RawArticle): RawArticle`
Nettoie un article brut : espaces superflus supprimés, `rawContent` tronqué à 4000
caractères, date de publication invalide remplacée par la date courante.

### `normalizeUrl(url: string): string`
Normalise une URL pour la déduplication : host en minuscules, paramètres de tracking
(`utm_*`, `fbclid`, `gclid`, `ref`) et fragment supprimés, slash final retiré.

### `dedupeArticles(articles: RawArticle[]): RawArticle[]`
Supprime les doublons d'un même lot par URL normalisée ou titre identique (insensible à la
casse). Ne déduplique pas contre la base existante (géré séparément par la contrainte
d'unicité sur `Article.url`).

## `src/lib/db/queries.ts`

### `listArticles(params?: ListArticlesParams)`
Liste les articles avec leur source.
- **`category`** : filtre exact ; omis = toutes catégories.
- **`sort`** : `"popularity"` (défaut, puis date décroissante en cas d'égalité) ou `"date"`.
- **`search`** : recherche insensible à la casse sur titre, résumé, lieu.
- **`limit`** / **`offset`** : pagination (défauts 50 / 0).

### `getArticleById(id: string)`
Renvoie un article avec sa source et son `eventCluster` (incluant tous les articles du
cluster et leurs sources), ou `null` si l'id est inconnu.

### `getWeeklyTrends(weeks?: number)`
Agrège le nombre d'articles par catégorie et par semaine ISO (lundi 00:00 UTC), sur les
`weeks` dernières semaines (défaut 12). Retourne une liste plate `{ weekStart, category, count }`.

### `upsertSource(feed)`
Crée ou met à jour une `Source` par son `rssUrl` (clé d'unicité) — idempotent, donc rappelable
à chaque exécution d'ingestion sans dupliquer.

### `findRecentClusters(category: string, sinceHours: number)`
Renvoie les clusters d'une catégorie créés dans les `sinceHours` dernières heures, avec leur
âge en heures (`ageHours`) — entrée de `findBestCluster`.

### `createCluster(data)` / `updateClusterInterpretation(id, interpretationRaw)` / `updateClusterPopularity(clusterId, popularityScore)`
Créent/mettent à jour un `EventCluster`. `interpretationRaw` est l'`Interpretation`
sérialisée en JSON (`JSON.stringify`).

### `articleExists(url: string): Promise<boolean>`
Vrai si un article avec cette URL exacte existe déjà — utilisé pour ignorer les doublons
inter-exécutions de l'ingestion.

### `createArticle(data)`
Crée un nouvel article. Suppose que l'appelant a déjà vérifié `articleExists`.

### `countDistinctSourcesInCluster(clusterId)` / `getClusterArticles(clusterId)` / `getClusterById(id)`
Utilitaires de lecture sur les clusters, utilisés pour recalculer popularité/interprétation
après ajout d'un article, et pour la route `GET /api/v1/clusters/:id`.

## `src/lib/api/` (transport de l'API publique)

### `isAuthorized(request): boolean`
Vrai si `PUBLIC_API_KEY` n'est pas défini, ou si le header `x-api-key` de la requête
correspond exactement à sa valeur.

### `buildCorsHeaders(requestOrigin: string | null): Record<string, string>`
Construit les headers CORS selon `ALLOWED_ORIGINS` (`"*"` ou liste séparée par des virgules).

### `checkRateLimit(ip: string)` / `getClientIp(headers: Headers): string`
Limite de débit en mémoire (60 req/min/IP par instance serverless — voir limite connue dans
`docs/strategie/api-publique.md`). `getClientIp` lit `x-forwarded-for` puis `x-real-ip`.

### `withPublicApi(handler)` / `publicApiOptionsHandler(req)`
Enveloppe un handler de route pour lui appliquer CORS, authentification, rate limiting et
gestion d'erreur générique de façon uniforme ; évite de dupliquer cette logique dans chaque
`route.ts`.
