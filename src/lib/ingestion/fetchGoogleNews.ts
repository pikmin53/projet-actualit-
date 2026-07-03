import Parser from "rss-parser";
import type { ExternalArticle } from "./fetchNewsApi";
import googleNewsFeeds from "../../../data/sources/google-news-feeds.json";

/**
 * Un flux Google News RSS à interroger : soit une édition ("À la une" d'un pays), soit une
 * rubrique thématique, soit une recherche par mots-clés. Configuré dans
 * data/sources/google-news-feeds.json — gratuit et sans clé API.
 */
interface GoogleNewsFeedDefinition {
  id: string;
  label: string;
  kind: "edition" | "topic" | "search";
  hl: string;
  gl: string;
  ceid: string;
  topic?: string;
  query?: string;
}

/** Item Google News : le tag <source url="...">Nom du média</source> identifie le vrai éditeur. */
interface GoogleNewsItem {
  title?: string;
  link?: string;
  isoDate?: string;
  contentSnippet?: string;
  source?: string | { _?: string; $?: { url?: string } };
}

const parser: Parser<object, GoogleNewsItem> = new Parser({
  timeout: 15000,
  customFields: { item: ["source"] },
});

function feedUrl(feed: GoogleNewsFeedDefinition): string {
  const locale = `hl=${encodeURIComponent(feed.hl)}&gl=${encodeURIComponent(feed.gl)}&ceid=${encodeURIComponent(feed.ceid)}`;
  if (feed.kind === "search" && feed.query) {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(feed.query)}&${locale}`;
  }
  if (feed.kind === "topic" && feed.topic) {
    return `https://news.google.com/rss/headlines/section/topic/${encodeURIComponent(feed.topic)}?${locale}`;
  }
  return `https://news.google.com/rss?${locale}`;
}

/** Extrait le nom et la homepage du média d'origine depuis le tag <source> de l'item. */
function publisherOf(item: GoogleNewsItem): { name: string; homepage: string } {
  if (typeof item.source === "object" && item.source !== null) {
    return {
      name: item.source._ ?? "Google News",
      homepage: item.source.$?.url ?? item.link ?? "https://news.google.com",
    };
  }
  if (typeof item.source === "string" && item.source.trim()) {
    return { name: item.source.trim(), homepage: item.link ?? "https://news.google.com" };
  }
  return { name: "Google News", homepage: item.link ?? "https://news.google.com" };
}

/** Retire le suffixe " - Nom du média" que Google News ajoute aux titres. */
function cleanTitle(title: string, publisherName: string): string {
  const suffix = ` - ${publisherName}`;
  if (title.toLowerCase().endsWith(suffix.toLowerCase())) {
    return title.slice(0, title.length - suffix.length).trim();
  }
  // Le nom dans le suffixe diffère parfois du tag <source> (ex: "Le Monde.fr" vs "Le Monde") :
  // on retire le dernier segment " - ..." si ce qui précède reste un titre plausible.
  const lastSeparator = title.lastIndexOf(" - ");
  if (lastSeparator > 20) return title.slice(0, lastSeparator).trim();
  return title.trim();
}

/**
 * Récupère les articles des flux Google News RSS configurés. Chaque item est rattaché à son
 * média d'origine (tag <source>), pas à "Google News". Les URLs étant des redirections Google,
 * le dédoublonnage face aux flux RSS directs repose sur le titre (voir dedupe.ts).
 * @returns Les articles de tous les flux configurés ; un flux en échec est ignoré sans bloquer les autres.
 */
export async function fetchGoogleNewsArticles(): Promise<ExternalArticle[]> {
  const feeds = googleNewsFeeds as GoogleNewsFeedDefinition[];

  const results = await Promise.all(
    feeds.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feedUrl(feed));
        return (parsed.items ?? [])
          .filter((item) => item.title && item.link)
          .map((item) => {
            const publisher = publisherOf(item);
            const title = cleanTitle(item.title!, publisher.name);
            return {
              sourceName: publisher.name,
              sourceHomepage: publisher.homepage,
              title,
              url: item.link!.trim(),
              rawContent: `${title} ${item.contentSnippet ?? ""}`.trim(),
              publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
            };
          });
      } catch (error) {
        console.error(`[fetchGoogleNewsArticles] échec pour le flux "${feed.label}":`, error);
        return [];
      }
    })
  );

  return results.flat();
}
