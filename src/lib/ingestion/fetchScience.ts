import Parser from "rss-parser";
import type { ExternalArticle } from "./fetchNewsApi";
import { matchScienceTier } from "@/lib/nlp/scienceImpact";
import scienceFeeds from "../../../data/sources/science-feeds.json";

/**
 * Couche publications scientifiques (couche 4 de docs/strategie/extension-sources.md) :
 * blogs officiels des labos d'IA, agences spatiales, revues, agrégateurs de communiqués
 * institutionnels et préprints (arXiv, medRxiv). Deux régimes selon le flux :
 * - "announcement" : flux curatés à faible volume, tous les items sont gardés ;
 * - "filtered" : flux à fort volume, seuls les items correspondant à la veille
 *   (data/sources/science-watchlist.json) sont gardés.
 * Tous les articles produits portent la catégorie imposée "science".
 */
interface ScienceFeedDefinition {
  name: string;
  homepage: string;
  rssUrl: string;
  kind: "announcement" | "filtered";
}

const feeds = (scienceFeeds as unknown as { feeds: ScienceFeedDefinition[] }).feeds;

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "GlobeActu/0.1 (open source news aggregator)" },
});

/**
 * Plafond d'items conservés par flux et par passe : arXiv publie des centaines de papiers/jour
 * et même filtrée, la couche science ne doit pas noyer l'actualité générale.
 */
const MAX_ITEMS_PER_FEED = 20;

/** Nettoie un titre arXiv ("Titre. (arXiv:2507.01234v1 [cs.AI])" → "Titre"). */
function cleanScienceTitle(title: string): string {
  return title.replace(/\s*\(arXiv:[^)]+\)\s*$/i, "").trim();
}

async function fetchFeed(feed: ScienceFeedDefinition): Promise<ExternalArticle[]> {
  const parsed = await parser.parseURL(feed.rssUrl);

  return (parsed.items ?? [])
    .filter((item) => item.title && item.link)
    .map((item) => ({
      sourceName: feed.name,
      sourceHomepage: feed.homepage,
      title: cleanScienceTitle(item.title!),
      url: item.link!.trim(),
      rawContent: `${cleanScienceTitle(item.title!)} ${item.contentSnippet ?? item.content ?? ""}`.trim(),
      publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
      categoryHint: "science" as const,
    }))
    // Flux filtrés : la veille doit matcher le TITRE (l'abstract d'un papier arXiv mentionne
    // presque toujours "machine learning" ou similaire, ce qui rendrait le filtre inopérant).
    .filter((article) => feed.kind === "announcement" || matchScienceTier(article.title) !== null)
    .slice(0, MAX_ITEMS_PER_FEED);
}

/**
 * Récupère les publications/annonces scientifiques de tous les flux configurés
 * (data/sources/science-feeds.json). Un flux en échec est ignoré sans bloquer les autres.
 * @returns Des articles avec catégorie imposée "science", prêts pour le pipeline commun.
 */
export async function fetchScienceArticles(): Promise<ExternalArticle[]> {
  const results = await Promise.all(
    feeds.map(async (feed) => {
      try {
        return await fetchFeed(feed);
      } catch (error) {
        console.error(`[fetchScienceArticles] échec pour "${feed.name}":`, error);
        return [];
      }
    })
  );
  return results.flat();
}
