import Parser from "rss-parser";

/**
 * Découverte et validation d'un flux RSS/Atom à partir d'une URL fournie par l'utilisateur
 * (fonctionnalité "ajouter une source" de la page Paramètres, via POST /api/v1/sources).
 *
 * Deux cas acceptés :
 * 1. L'URL pointe directement vers un flux RSS/Atom → validée telle quelle.
 * 2. L'URL pointe vers une page HTML (ex: la page d'accueil du média) → on cherche la balise
 *    `<link rel="alternate" type="application/rss+xml">` déclarée dans le HTML (autodécouverte
 *    standard) et on valide le flux qu'elle référence.
 *
 * Les API propriétaires (NewsAPI-like, JSON maison...) ne sont pas gérées ici : chacune exige
 * un fetcher dédié (voir docs/strategie/extension-sources.md, registre de fetchers).
 */

const parser = new Parser({ timeout: 15000 });

/** Délai maximal accordé à chaque requête HTTP de découverte. */
const FETCH_TIMEOUT_MS = 15000;

/** Certains médias (Le Parisien...) refusent les clients sans User-Agent de navigateur. */
const USER_AGENT = "Mozilla/5.0 (compatible; GlobeActu/1.0; +ingestion RSS)";

export interface DiscoveredFeed {
  /** URL finale du flux RSS/Atom validé (peut différer de l'URL saisie si autodécouverte). */
  rssUrl: string;
  /** Titre déclaré par le flux, utilisable comme nom de source par défaut. */
  title: string | null;
  /** Page d'accueil déclarée par le flux (`<link>` du channel). */
  homepage: string | null;
  /** Langue déclarée par le flux (ex: "fr-fr"), si présente. */
  language: string | null;
}

/** Vrai si l'URL est absolue et en http(s) — seuls schémas autorisés pour la découverte. */
export function isHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Récupère le corps texte d'une URL avec timeout et User-Agent, ou `null` en cas d'échec. */
async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, text/html, */*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/** Tente de parser un corps comme flux RSS/Atom ; renvoie le flux validé ou `null`. */
async function tryParseFeed(body: string, url: string): Promise<DiscoveredFeed | null> {
  try {
    const feed = await parser.parseString(body);
    // rss-parser est laxiste : sans items ni titre, ce n'est probablement pas un vrai flux.
    if (!feed.items || feed.items.length === 0) return null;
    return {
      rssUrl: url,
      title: feed.title?.trim() || null,
      homepage: feed.link?.trim() || null,
      language: (feed as { language?: string }).language?.trim() || null,
    };
  } catch {
    return null;
  }
}

/**
 * Extrait du HTML l'URL du premier flux déclaré par `<link rel="alternate" type="application/rss+xml">`
 * (ou variante Atom), résolue en URL absolue par rapport à la page.
 */
export function extractFeedLinkFromHtml(html: string, pageUrl: string): string | null {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const rel = tag.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1]?.toLowerCase();
    const type = tag.match(/\btype\s*=\s*["']([^"']*)["']/i)?.[1]?.toLowerCase();
    const href = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
    if (!rel?.split(/\s+/).includes("alternate") || !href) continue;
    if (type !== "application/rss+xml" && type !== "application/atom+xml") continue;
    try {
      return new URL(href, pageUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Valide l'URL comme flux RSS/Atom, directement ou par autodécouverte depuis la page HTML.
 * @param rawUrl URL saisie par l'utilisateur (flux ou page d'accueil du média).
 * @returns Le flux découvert et validé, ou `null` si aucun flux exploitable n'a été trouvé.
 */
export async function discoverFeed(rawUrl: string): Promise<DiscoveredFeed | null> {
  if (!isHttpUrl(rawUrl)) return null;

  const body = await fetchText(rawUrl);
  if (!body) return null;

  const direct = await tryParseFeed(body, rawUrl);
  if (direct) return direct;

  const feedUrl = extractFeedLinkFromHtml(body, rawUrl);
  if (!feedUrl || feedUrl === rawUrl) return null;

  const feedBody = await fetchText(feedUrl);
  if (!feedBody) return null;
  return tryParseFeed(feedBody, feedUrl);
}
