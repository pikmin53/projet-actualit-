import Parser from "rss-parser";
import type { ExternalArticle } from "./fetchNewsApi";
import alertFeeds from "../../../data/sources/alert-feeds.json";

/**
 * Alertes structurées quasi temps réel (couche 2 de docs/strategie/extension-sources.md) :
 * séismes USGS, catastrophes GDACS, évènements naturels NASA EONET. Contrairement à la presse,
 * ces flux fournissent une position (lat/lng) et une nature d'évènement fiables — les articles
 * produits portent donc une géolocalisation native et la catégorie "environnement" imposée,
 * sans passer par les heuristiques de texte.
 */
interface AlertFeedsConfig {
  usgs: { enabled: boolean; feed: string };
  gdacs: { enabled: boolean; minAlertLevel: "Green" | "Orange" | "Red" };
  eonet: { enabled: boolean; days: number };
}

const config = alertFeeds as unknown as AlertFeedsConfig;
const FETCH_TIMEOUT_MS = 20_000;

// --- USGS (séismes) ---------------------------------------------------------

interface UsgsFeature {
  properties?: { mag?: number; place?: string; time?: number; url?: string; title?: string; tsunami?: number };
  geometry?: { coordinates?: number[] };
}

async function fetchUsgs(): Promise<ExternalArticle[]> {
  const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${config.usgs.feed}.geojson`;
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`USGS a répondu ${response.status}`);
  const data = (await response.json()) as { features?: UsgsFeature[] };

  return (data.features ?? [])
    .filter((f) => f.properties?.title && f.properties.url && f.geometry?.coordinates?.length)
    .map((f) => {
      const [lng, lat] = f.geometry!.coordinates!;
      const tsunamiNote = f.properties!.tsunami ? " Alerte tsunami émise." : "";
      return {
        sourceName: "USGS Séismes",
        sourceHomepage: "https://earthquake.usgs.gov",
        title: f.properties!.title!,
        url: f.properties!.url!,
        rawContent: `${f.properties!.title!} Séisme de magnitude ${f.properties!.mag ?? "?"} près de ${f.properties!.place ?? "?"}.${tsunamiNote}`,
        publishedAt: f.properties!.time ? new Date(f.properties!.time) : new Date(),
        lat,
        lng,
        locationLabel: f.properties!.place,
        categoryHint: "environnement" as const,
      };
    });
}

// --- GDACS (catastrophes à impact humanitaire) ------------------------------

interface GdacsItem {
  title?: string;
  link?: string;
  isoDate?: string;
  contentSnippet?: string;
  "georss:point"?: string;
  "gdacs:alertlevel"?: string;
  "gdacs:country"?: string;
}

const gdacsParser: Parser<object, GdacsItem> = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  // GDACS répond 406 au User-Agent par défaut de rss-parser, et 403 si l'en-tête contient des
  // caractères non-ASCII : on s'identifie explicitement, en ASCII strict.
  headers: {
    "User-Agent": "GlobeActu/0.1 (open source news aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
  customFields: { item: ["georss:point", "gdacs:alertlevel", "gdacs:country"] },
});

const GDACS_LEVELS = ["Green", "Orange", "Red"] as const;

async function fetchGdacs(): Promise<ExternalArticle[]> {
  const feed = await gdacsParser.parseURL("https://www.gdacs.org/xml/rss.xml");
  const minLevelIndex = GDACS_LEVELS.indexOf(config.gdacs.minAlertLevel);

  return (feed.items ?? [])
    .filter((item) => {
      if (!item.title || !item.link || !item["georss:point"]) return false;
      const levelIndex = GDACS_LEVELS.indexOf((item["gdacs:alertlevel"] ?? "") as (typeof GDACS_LEVELS)[number]);
      return levelIndex >= minLevelIndex;
    })
    .map((item) => {
      const [lat, lng] = item["georss:point"]!.trim().split(/\s+/).map(Number);
      return {
        sourceName: "GDACS",
        sourceHomepage: "https://www.gdacs.org",
        title: item.title!.trim(),
        url: item.link!.trim(),
        rawContent: `${item.title} ${item.contentSnippet ?? ""}`.trim(),
        publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
        lat,
        lng,
        locationLabel: item["gdacs:country"] || undefined,
        categoryHint: "environnement" as const,
      };
    })
    .filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lng));
}

// --- NASA EONET (évènements naturels observés) ------------------------------

interface EonetEvent {
  id?: string;
  title?: string;
  link?: string;
  categories?: Array<{ title?: string }>;
  geometry?: Array<{ type?: string; coordinates?: unknown; date?: string }>;
}

async function fetchEonet(): Promise<ExternalArticle[]> {
  const url = `https://eonet.gsfc.nasa.gov/api/v3/events?days=${config.eonet.days}&status=open`;
  // Réponse potentiellement volumineuse (tous les évènements ouverts) : timeout doublé.
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS * 2) });
  if (!response.ok) throw new Error(`EONET a répondu ${response.status}`);
  const data = (await response.json()) as { events?: EonetEvent[] };

  const articles: ExternalArticle[] = [];
  for (const event of data.events ?? []) {
    if (!event.title || !event.link) continue;
    // Dernier relevé de position de l'évènement ; seuls les points simples sont exploités.
    const lastPoint = [...(event.geometry ?? [])].reverse().find((g) => g.type === "Point" && Array.isArray(g.coordinates));
    if (!lastPoint) continue;
    const [lng, lat] = lastPoint.coordinates as number[];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const categoryLabel = event.categories?.[0]?.title;
    articles.push({
      sourceName: "NASA EONET",
      sourceHomepage: "https://eonet.gsfc.nasa.gov",
      title: event.title,
      url: event.link,
      rawContent: `${event.title}${categoryLabel ? ` (${categoryLabel})` : ""}`,
      publishedAt: lastPoint.date ? new Date(lastPoint.date) : new Date(),
      lat,
      lng,
      categoryHint: "environnement" as const,
    });
  }
  return articles;
}

// -----------------------------------------------------------------------------

/**
 * Récupère toutes les alertes structurées activées dans data/sources/alert-feeds.json.
 * Chaque source en échec est ignorée sans bloquer les autres (même politique que les flux RSS).
 * @returns Des articles avec position native et catégorie imposée, prêts pour le pipeline commun.
 */
export async function fetchAlertArticles(): Promise<ExternalArticle[]> {
  const enabled: Array<[string, () => Promise<ExternalArticle[]>]> = [];
  if (config.usgs.enabled) enabled.push(["USGS", fetchUsgs]);
  if (config.gdacs.enabled) enabled.push(["GDACS", fetchGdacs]);
  if (config.eonet.enabled) enabled.push(["EONET", fetchEonet]);

  const results = await Promise.all(
    enabled.map(async ([name, fetcher]) => {
      try {
        return await fetcher();
      } catch (error) {
        console.error(`[fetchAlertArticles] échec pour ${name}:`, error);
        return [];
      }
    })
  );
  return results.flat();
}
