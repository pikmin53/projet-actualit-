import Parser from "rss-parser";
import type { RawArticle } from "@/lib/types";

// User-Agent identifié : le défaut de rss-parser ("rss-parser") est bloqué par certains WAF.
const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; GlobeActu/0.1; +https://github.com/pikmin53/projet-actualit-)" },
});

/** Description minimale d'une source nécessaire pour récupérer et rattacher ses articles. */
export interface FeedSource {
  id: string;
  name: string;
  rssUrl: string;
  country: string;
}

/**
 * Récupère et normalise les articles d'un flux RSS.
 * @param source Source à interroger (id en base, nom, URL du flux, pays d'origine).
 * @returns Les articles du flux convertis en `RawArticle`. Tableau vide en cas d'échec réseau/parsing
 *          (une source en panne ne doit pas interrompre l'ingestion des autres sources).
 */
export async function fetchRssArticles(source: FeedSource): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(source.rssUrl);
    return (feed.items ?? [])
      .filter((item) => item.link && item.title)
      .map((item) => ({
        sourceId: source.id,
        sourceName: source.name,
        sourceCountry: source.country,
        title: item.title!.trim(),
        url: item.link!.trim(),
        rawContent: `${item.title ?? ""} ${item.contentSnippet ?? item.content ?? ""}`.trim(),
        publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
      }));
  } catch (error) {
    console.error(`[fetchRssArticles] échec pour la source "${source.name}" (${source.rssUrl}):`, error);
    return [];
  }
}
