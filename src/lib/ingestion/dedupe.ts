import type { RawArticle } from "@/lib/types";
import { normalizeUrl } from "./normalize";

/**
 * Déduplique un lot d'articles bruts par URL normalisée et par titre identique (insensible à la
 * casse). Ne déduplique que dans le lot fourni ; la déduplication contre les articles déjà en
 * base se fait séparément via la contrainte d'unicité sur `Article.url` (voir scripts/ingest.ts).
 * @param articles Lot d'articles bruts, potentiellement issu de plusieurs sources/flux.
 * @returns Le même lot, sans doublons, en conservant la première occurrence rencontrée.
 */
export function dedupeArticles(articles: RawArticle[]): RawArticle[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const result: RawArticle[] = [];

  for (const article of articles) {
    const normalizedUrl = normalizeUrl(article.url);
    const normalizedTitle = article.title.toLowerCase().trim();

    if (seenUrls.has(normalizedUrl) || seenTitles.has(normalizedTitle)) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    seenTitles.add(normalizedTitle);
    result.push(article);
  }

  return result;
}
