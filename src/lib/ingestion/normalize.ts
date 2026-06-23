import type { RawArticle } from "@/lib/types";

const MAX_RAW_CONTENT_LENGTH = 4000;

/**
 * Nettoie un article brut avant traitement NLP : espaces superflus supprimés, contenu tronqué
 * à une longueur raisonnable, et repli sur la date courante si la date de publication est invalide.
 * @param raw Article brut tel que produit par `fetchRssArticles`/`fetchApiArticles`.
 * @returns Une copie normalisée du même article.
 */
export function normalizeArticle(raw: RawArticle): RawArticle {
  const rawContent = raw.rawContent.replace(/\s+/g, " ").trim().slice(0, MAX_RAW_CONTENT_LENGTH);
  const publishedAt = Number.isNaN(raw.publishedAt.getTime()) ? new Date() : raw.publishedAt;

  return {
    ...raw,
    title: raw.title.replace(/\s+/g, " ").trim(),
    rawContent,
    publishedAt,
  };
}

/**
 * Normalise une URL d'article pour les comparaisons de déduplication : retire les paramètres
 * de tracking usuels (utm_*, fbclid...) et le slash final, met le host en minuscules.
 * @param url URL brute d'un article.
 * @returns L'URL normalisée, ou la valeur d'origine si elle n'est pas parsable.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    [...parsed.searchParams.keys()]
      .filter((key) => key.startsWith("utm_") || ["fbclid", "gclid", "ref"].includes(key))
      .forEach((key) => parsed.searchParams.delete(key));
    parsed.hash = "";
    let normalized = parsed.toString();
    if (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
    return normalized;
  } catch {
    return url;
  }
}
