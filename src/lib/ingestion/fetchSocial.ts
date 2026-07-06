import Parser from "rss-parser";
import socialSources from "../../../data/sources/social-sources.json";

/**
 * Un post détecté sur un réseau social (couche 3 de docs/strategie/extension-sources.md).
 * Contrairement aux ExternalArticle, ces posts n'entrent PAS dans le pipeline d'articles :
 * ils deviennent des SocialSignal en base, confirmés (ou non) par la presse ensuite —
 * voir processSocialSignals dans scripts/ingest.ts.
 */
export interface SocialPost {
  platform: string;
  community: string;
  title: string;
  /** Permalien du post sur la plateforme (clé d'unicité). */
  url: string;
  /** URL de l'article externe pointé par le post, si présent. */
  externalUrl?: string;
  postedAt: Date;
}

interface SocialSourcesConfig {
  confirmationWindowHours: number;
  reddit: {
    enabled: boolean;
    listing: "new" | "rising" | "hot";
    limitPerSubreddit: number;
    subreddits: string[];
  };
}

export const socialConfig = socialSources as unknown as SocialSourcesConfig;

interface RedditAtomItem {
  title?: string;
  link?: string;
  isoDate?: string;
  content?: string;
}

/**
 * L'API JSON de Reddit refuse les clients non authentifiés depuis les IP de datacenters,
 * mais les flux RSS/Atom restent ouverts : on passe par eux (pas de score d'upvotes, mais le
 * listing "rising" est déjà un filtre de qualité côté Reddit).
 */
const redditParser: Parser<object, RedditAtomItem> = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "GlobeActu/0.1 (open source news aggregator)" },
});

/** Extrait l'URL de l'article externe depuis le HTML du post Reddit (lien "[link]"). */
function externalUrlFrom(content: string | undefined): string | undefined {
  const match = content?.match(/href="([^"]+)">\s*\[link\]/);
  if (!match) return undefined;
  const url = match[1];
  // Les posts "self" pointent vers Reddit lui-même : pas un article externe.
  return url.includes("reddit.com") ? undefined : url;
}

async function fetchSubreddit(subreddit: string): Promise<SocialPost[]> {
  const { listing, limitPerSubreddit } = socialConfig.reddit;
  const feed = await redditParser.parseURL(
    `https://www.reddit.com/r/${subreddit}/${listing}.rss?limit=${limitPerSubreddit}`
  );

  return (feed.items ?? [])
    .filter((item) => item.title && item.link)
    .map((item) => ({
      platform: "reddit",
      community: `r/${subreddit}`,
      title: item.title!.trim(),
      url: item.link!.trim(),
      externalUrl: externalUrlFrom(item.content),
      postedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
    }));
}

/**
 * Récupère les posts des subreddits configurés (data/sources/social-sources.json),
 * séquentiellement avec une courte pause pour rester sous les limites de Reddit.
 * @returns Les posts collectés ; un subreddit en échec est ignoré sans bloquer les autres.
 */
export async function fetchSocialPosts(): Promise<SocialPost[]> {
  if (!socialConfig.reddit.enabled) return [];

  const posts: SocialPost[] = [];
  for (const [index, subreddit] of socialConfig.reddit.subreddits.entries()) {
    // Reddit rate-limite vite les IP non authentifiées sur les flux RSS : 5 s entre subreddits.
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      posts.push(...(await fetchSubreddit(subreddit)));
    } catch (error) {
      console.error(`[fetchSocialPosts] échec pour r/${subreddit}:`, error);
    }
  }
  return posts;
}
