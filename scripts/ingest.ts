/**
 * Point d'entrée de l'ingestion d'actualités. Lancé en local via `npm run ingest`, ou en
 * planifié via .github/workflows/ingest.yml (toutes les 15-30 min, voir ce fichier).
 *
 * Étapes : récupération (RSS + API optionnelle) → normalisation/dédoublonnage → géolocalisation
 * → catégorisation → clustering d'évènements → résumé → interprétation → calcul de popularité
 * → écriture en base. Voir docs/architecture.md pour le schéma complet et docs/strategie/ pour
 * la justification de chaque étape.
 */
import "dotenv/config";
import rssFeeds from "../data/sources/rss-feeds.json";
import { fetchRssArticles, type FeedSource } from "@/lib/ingestion/fetchRss";
import { fetchApiArticles } from "@/lib/ingestion/fetchNewsApi";
import { normalizeArticle } from "@/lib/ingestion/normalize";
import { dedupeArticles } from "@/lib/ingestion/dedupe";
import { categorize } from "@/lib/nlp/categorize";
import { geolocate, countryCentroid } from "@/lib/nlp/geolocate";
import { findBestCluster, CLUSTER_TIME_WINDOW_HOURS } from "@/lib/nlp/cluster";
import { computePopularity } from "@/lib/nlp/popularity";
import { getSummarizer, getInterpreter } from "@/lib/nlp/providers/registry";
import type { Category, RawArticle } from "@/lib/types";
import {
  upsertSource,
  findRecentClusters,
  createCluster,
  updateClusterInterpretation,
  articleExists,
  createArticle,
  countDistinctSourcesInCluster,
  updateClusterPopularity,
  getClusterArticles,
} from "@/lib/db/queries";

interface RssFeedDefinition {
  name: string;
  homepage: string;
  rssUrl: string;
  country: string;
  language: string;
}

/** Construit une "source API" synthétique pour les articles récupérés via NewsAPI/GNews. */
function syntheticFeedFor(sourceName: string, homepage: string): RssFeedDefinition {
  let host = homepage;
  try {
    host = new URL(homepage).hostname;
  } catch {
    // homepage déjà sous forme de host ou invalide : on la garde telle quelle.
  }
  return {
    name: sourceName,
    homepage,
    rssUrl: `api:${host}`,
    country: "ZZ", // pays d'origine inconnu pour les articles agrégés par API, voir docs/strategie/sources-donnees.md
    language: "en",
  };
}

/** Récupère tous les articles bruts : flux RSS connus + complément API optionnel. */
async function collectRawArticles(): Promise<RawArticle[]> {
  const feeds = rssFeeds as RssFeedDefinition[];

  const rssResults = await Promise.all(
    feeds.map(async (feed) => {
      const source = await upsertSource(feed);
      const feedSource: FeedSource = { id: source.id, name: source.name, rssUrl: source.rssUrl, country: source.country };
      return fetchRssArticles(feedSource);
    })
  );

  const externalArticles = await fetchApiArticles();
  const externalAsRaw: RawArticle[] = [];
  for (const ext of externalArticles) {
    const source = await upsertSource(syntheticFeedFor(ext.sourceName, ext.sourceHomepage));
    externalAsRaw.push({
      sourceId: source.id,
      sourceName: source.name,
      sourceCountry: source.country,
      title: ext.title,
      url: ext.url,
      rawContent: ext.rawContent,
      publishedAt: ext.publishedAt,
    });
  }

  return [...rssResults.flat(), ...externalAsRaw];
}

/** Rattache un article à un cluster d'évènement existant, ou en crée un nouveau. */
async function resolveCluster(title: string, category: Category): Promise<string> {
  const candidates = await findRecentClusters(category, CLUSTER_TIME_WINDOW_HOURS);
  const existingId = findBestCluster(title, category, candidates);
  if (existingId) return existingId;

  const cluster = await createCluster({
    label: title,
    category,
    interpretationRaw: JSON.stringify({
      commonPoints: [],
      divergences: [],
      dominantKeywordsBySource: {},
      impactNote: "",
      generatedBy: "pending",
    }),
  });
  return cluster.id;
}

/** Recalcule et persiste l'interprétation + la popularité d'un cluster après ajout d'un article. */
async function refreshCluster(clusterId: string, category: Category) {
  const articles = await getClusterArticles(clusterId);
  if (articles.length === 0) return;

  const interpreter = getInterpreter();
  const interpretation = await interpreter.interpret({
    label: articles[0].title,
    category,
    articles: articles.map((a) => ({ sourceName: a.source.name, title: a.title, rawContent: a.rawContent })),
  });
  await updateClusterInterpretation(clusterId, JSON.stringify(interpretation));

  const distinctSourceCount = await countDistinctSourcesInCluster(clusterId);
  const mostRecent = articles.reduce((latest, a) => (a.publishedAt > latest ? a.publishedAt : latest), articles[0].publishedAt);
  const popularityScore = computePopularity(distinctSourceCount, mostRecent);
  await updateClusterPopularity(clusterId, popularityScore);
}

async function run() {
  console.log("[ingest] Récupération des articles bruts...");
  const raw = await collectRawArticles();
  console.log(`[ingest] ${raw.length} articles récupérés avant dédoublonnage.`);

  const deduped = dedupeArticles(raw.map(normalizeArticle));
  console.log(`[ingest] ${deduped.length} articles après dédoublonnage.`);

  const summarizer = getSummarizer();
  let created = 0;
  let skipped = 0;

  for (const article of deduped) {
    if (await articleExists(article.url)) {
      skipped += 1;
      continue;
    }

    const fullText = `${article.title} ${article.rawContent}`;
    const category = categorize(fullText);
    const geo = geolocate(fullText) ?? countryCentroid(article.sourceCountry);
    const summary = await summarizer.summarize(article.rawContent, { maxSentences: 3 });
    const clusterId = await resolveCluster(article.title, category);

    await createArticle({
      sourceId: article.sourceId,
      title: article.title,
      url: article.url,
      rawContent: article.rawContent,
      summary,
      category,
      countryCode: geo?.countryCode ?? null,
      locationLabel: geo?.locationLabel ?? null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      popularityScore: 0,
      publishedAt: article.publishedAt,
      eventClusterId: clusterId,
    });

    await refreshCluster(clusterId, category);
    created += 1;
  }

  console.log(`[ingest] Terminé : ${created} nouveaux articles, ${skipped} doublons ignorés.`);
}

run()
  .catch((error) => {
    console.error("[ingest] Échec de l'ingestion:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.$disconnect();
    // rss-parser laisse parfois des sockets keep-alive ouverts, ce qui empêche le process de
    // se terminer naturellement : on force la sortie une fois le travail (et la déconnexion DB) fait.
    process.exit(process.exitCode ?? 0);
  });
