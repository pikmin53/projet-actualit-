import type { ExternalArticle } from "./fetchNewsApi";
import gdeltQueries from "../../../data/sources/gdelt-queries.json";

/**
 * Une requête GDELT DOC 2.0 à exécuter à chaque passe d'ingestion. Configurée dans
 * data/sources/gdelt-queries.json. GDELT est gratuit, sans clé, mis à jour toutes les 15 min,
 * et couvre la presse mondiale — voir docs/strategie/extension-sources.md (couche 2).
 */
interface GdeltQueryDefinition {
  id: string;
  label: string;
  /** Syntaxe DOC 2.0, ex: '(cyberattack OR ransomware) sourcelang:eng'. */
  query: string;
  /** Fenêtre temporelle GDELT, ex: "2h", "1d". Défaut: "2h". */
  timespan?: string;
}

interface GdeltArticle {
  url?: string;
  title?: string;
  /** Format "20260703T012000Z". */
  seendate?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

const GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
/**
 * GDELT demande officiellement 1 requête / 5 s, mais bloque en pratique les clients plus
 * rapides ou sans User-Agent (vérifié empiriquement) : on espace largement et on s'identifie.
 */
const REQUEST_SPACING_MS = 10_000;
// ASCII strict : certains WAF (GDACS, potentiellement GDELT) rejettent les en-têtes accentués.
const USER_AGENT = "GlobeActu/0.1 (open source news aggregator)";

/** Convertit un seendate GDELT ("20260703T012000Z") en Date. */
function parseSeenDate(seendate: string | undefined): Date {
  if (seendate) {
    const match = seendate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (match) {
      const [, y, mo, d, h, mi, s] = match;
      return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
    }
  }
  return new Date();
}

async function runQuery(definition: GdeltQueryDefinition): Promise<ExternalArticle[]> {
  const params = new URLSearchParams({
    query: definition.query,
    mode: "ArtList",
    format: "json",
    maxrecords: "50",
    timespan: definition.timespan ?? "2h",
  });

  const response = await fetch(`${GDELT_ENDPOINT}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`GDELT a répondu ${response.status}`);

  const body = await response.text();
  // En cas de dépassement du rate-limit, GDELT renvoie un message texte avec un statut 200.
  if (!body.trimStart().startsWith("{")) {
    throw new Error(`réponse non-JSON (rate-limit probable): ${body.slice(0, 120)}...`);
  }

  const data = JSON.parse(body) as { articles?: GdeltArticle[] };
  return (data.articles ?? [])
    .filter((a) => a.title && a.url && a.domain)
    .map((a) => ({
      sourceName: a.domain!,
      sourceHomepage: `https://${a.domain}`,
      title: a.title!.trim(),
      url: a.url!.trim(),
      // GDELT ne fournit pas de description : le titre seul alimente le pipeline NLP.
      rawContent: a.title!.trim(),
      publishedAt: parseSeenDate(a.seendate),
    }));
}

/**
 * Exécute séquentiellement les requêtes GDELT configurées, en respectant le rate-limit
 * (une requête toutes les REQUEST_SPACING_MS). Une requête en échec n'interrompt pas les autres.
 * @returns Les articles de toutes les requêtes, dédoublonnés ensuite par le pipeline commun.
 */
export async function fetchGdeltArticles(): Promise<ExternalArticle[]> {
  const queries = gdeltQueries as GdeltQueryDefinition[];
  const articles: ExternalArticle[] = [];

  for (const [index, definition] of queries.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, REQUEST_SPACING_MS));
    try {
      articles.push(...(await runQuery(definition)));
    } catch (error) {
      console.error(`[fetchGdeltArticles] échec pour la requête "${definition.label}":`, error);
    }
  }

  return articles;
}
