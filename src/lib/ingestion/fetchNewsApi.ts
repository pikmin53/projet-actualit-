/**
 * Article récupéré depuis une API d'actualité gratuite (GNews ou NewsAPI), avant qu'une `Source`
 * ne soit créée/retrouvée en base pour son média d'origine.
 */
export interface ExternalArticle {
  sourceName: string;
  sourceHomepage: string;
  title: string;
  url: string;
  rawContent: string;
  publishedAt: Date;
}

interface GNewsResponse {
  articles?: Array<{
    title?: string;
    description?: string;
    content?: string;
    url?: string;
    publishedAt?: string;
    source?: { name?: string; url?: string };
  }>;
}

interface NewsApiResponse {
  articles?: Array<{
    title?: string;
    description?: string;
    content?: string;
    url?: string;
    publishedAt?: string;
    source?: { name?: string };
  }>;
}

async function fetchFromGNews(apiKey: string): Promise<ExternalArticle[]> {
  const url = `https://gnews.io/api/v4/top-headlines?lang=en&max=20&token=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GNews a répondu ${response.status}`);
  const data = (await response.json()) as GNewsResponse;

  return (data.articles ?? [])
    .filter((a) => a.title && a.url)
    .map((a) => ({
      sourceName: a.source?.name ?? "GNews (source inconnue)",
      sourceHomepage: a.source?.url ?? a.url!,
      title: a.title!.trim(),
      url: a.url!.trim(),
      rawContent: `${a.title ?? ""} ${a.description ?? a.content ?? ""}`.trim(),
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
    }));
}

async function fetchFromNewsApi(apiKey: string): Promise<ExternalArticle[]> {
  const url = `https://newsapi.org/v2/top-headlines?language=en&pageSize=20&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`NewsAPI a répondu ${response.status}`);
  const data = (await response.json()) as NewsApiResponse;

  return (data.articles ?? [])
    .filter((a) => a.title && a.url)
    .map((a) => ({
      sourceName: a.source?.name ?? "NewsAPI (source inconnue)",
      sourceHomepage: a.url!,
      title: a.title!.trim(),
      url: a.url!.trim(),
      rawContent: `${a.title ?? ""} ${a.description ?? a.content ?? ""}`.trim(),
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
    }));
}

/**
 * Récupère un complément d'articles via une API gratuite d'actualité, en plus des flux RSS.
 * Utilise GNEWS_KEY si défini, sinon NEWSAPI_KEY, sinon ne fait rien (l'ingestion RSS seule
 * suffit à faire fonctionner le projet sans clé API). Voir docs/strategie/sources-donnees.md.
 * @returns Les articles récupérés, ou un tableau vide si aucune clé n'est configurée ou en cas d'erreur.
 */
export async function fetchApiArticles(): Promise<ExternalArticle[]> {
  const gnewsKey = process.env.GNEWS_KEY;
  const newsApiKey = process.env.NEWSAPI_KEY;

  try {
    if (gnewsKey) return await fetchFromGNews(gnewsKey);
    if (newsApiKey) return await fetchFromNewsApi(newsApiKey);
    return [];
  } catch (error) {
    console.error("[fetchApiArticles] échec de l'enrichissement par API d'actualité:", error);
    return [];
  }
}
