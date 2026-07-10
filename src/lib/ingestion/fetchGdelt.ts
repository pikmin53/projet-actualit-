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
  /** Nombre maximal d'articles renvoyés (max GDELT : 250). Défaut : 50. */
  maxrecords?: number;
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
/**
 * Pauses avant de retenter une requête rate-limitée. Les IPs des runners GitHub Actions étant
 * partagées entre de nombreux utilisateurs, un 429 peut survenir même en respectant
 * REQUEST_SPACING_MS. Constaté en prod (runs 140-142) : 45 s ne suffisent pas toujours,
 * d'où un second essai après une attente doublée. Un jitter de ±20 % désynchronise les clients
 * qui partagent la même IP (et donc la même fenêtre de rate-limit).
 */
const RATE_LIMIT_RETRY_DELAYS_MS = [45_000, 90_000];
/** Pause avant l'unique retry d'un échec réseau transitoire (ConnectTimeout des runners, runs 141-142). */
const NETWORK_RETRY_DELAY_MS = 5_000;
// ASCII strict : certains WAF (GDACS, potentiellement GDELT) rejettent les en-têtes accentués.
const USER_AGENT = "GlobeActu/0.1 (open source news aggregator)";

/** Dépassement du rate-limit GDELT (429 explicite ou message texte avec statut 200). */
class RateLimitError extends Error {
  /** Délai demandé par le serveur via Retry-After, si fourni. */
  constructor(message: string, readonly retryAfterMs?: number) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withJitter(ms: number): number {
  return Math.round(ms * (0.8 + Math.random() * 0.4));
}

/** Échec réseau transitoire : timeout de connexion/lecture ou coupure TLS, sans réponse HTTP. */
function isTransientNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "TimeoutError") return true;
  return error instanceof TypeError && error.message === "fetch failed";
}

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
    maxrecords: String(definition.maxrecords ?? 50),
    timespan: definition.timespan ?? "2h",
  });

  const response = await fetch(`${GDELT_ENDPOINT}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 429) {
    const retryAfterSeconds = Number(response.headers.get("retry-after"));
    throw new RateLimitError(
      `GDELT a répondu 429`,
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : undefined,
    );
  }
  if (!response.ok) throw new Error(`GDELT a répondu ${response.status}`);

  const body = await response.text();
  // En cas de dépassement du rate-limit, GDELT renvoie un message texte avec un statut 200.
  if (!body.trimStart().startsWith("{")) {
    throw new RateLimitError(`réponse non-JSON (rate-limit probable): ${body.slice(0, 120)}...`);
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
 * Exécute une requête avec retries : les 429 attendent la fin de la fenêtre de rate-limit
 * (délai Retry-After du serveur si fourni, sinon backoff avec jitter), les échecs réseau
 * transitoires sont retentés une fois rapidement.
 */
async function runQueryWithRetries(definition: GdeltQueryDefinition): Promise<ExternalArticle[]> {
  let rateLimitRetries = 0;
  let networkRetries = 0;
  for (;;) {
    try {
      return await runQuery(definition);
    } catch (error) {
      if (error instanceof RateLimitError && rateLimitRetries < RATE_LIMIT_RETRY_DELAYS_MS.length) {
        const delayMs = error.retryAfterMs ?? withJitter(RATE_LIMIT_RETRY_DELAYS_MS[rateLimitRetries]);
        rateLimitRetries += 1;
        await sleep(delayMs);
        continue;
      }
      if (isTransientNetworkError(error) && networkRetries < 1) {
        networkRetries += 1;
        await sleep(NETWORK_RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }
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
      articles.push(...(await runQueryWithRetries(definition)));
    } catch (error) {
      const suffix = error instanceof RateLimitError ? " (après retries rate-limit)" : "";
      console.error(`[fetchGdeltArticles] échec pour la requête "${definition.label}"${suffix}:`, error);
    }
  }

  return articles;
}
