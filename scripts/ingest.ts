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
import { fetchApiArticles, type ExternalArticle } from "@/lib/ingestion/fetchNewsApi";
import { fetchGoogleNewsArticles } from "@/lib/ingestion/fetchGoogleNews";
import { fetchGdeltArticles } from "@/lib/ingestion/fetchGdelt";
import { fetchAlertArticles } from "@/lib/ingestion/fetchAlerts";
import { fetchSocialPosts, socialConfig } from "@/lib/ingestion/fetchSocial";
import { fetchScienceArticles } from "@/lib/ingestion/fetchScience";
import { fetchArticleBody, ENRICH_MIN_CONTENT_LENGTH } from "@/lib/ingestion/enrichContent";
import { normalizeArticle } from "@/lib/ingestion/normalize";
import { dedupeArticles } from "@/lib/ingestion/dedupe";
import { categorize } from "@/lib/nlp/categorize";
import { geolocate, countryCentroid } from "@/lib/nlp/geolocate";
import { findBestCluster, CLUSTER_TIME_WINDOW_HOURS } from "@/lib/nlp/cluster";
import { computePopularity } from "@/lib/nlp/popularity";
import { computeCyberImpactBoost } from "@/lib/nlp/cyberImpact";
import { computeScienceImpactBoost } from "@/lib/nlp/scienceImpact";
import { computeSourceVelocity, isBreaking, VELOCITY_WINDOW_HOURS } from "@/lib/nlp/breaking";
import { getSummarizer, getInterpreter } from "@/lib/nlp/providers/registry";
import type { Category, RawArticle } from "@/lib/types";
import {
  upsertSource,
  getEnabledCustomSources,
  findRecentClusters,
  createCluster,
  updateClusterInterpretation,
  articleExists,
  createArticle,
  countDistinctSourcesInCluster,
  updateClusterSignals,
  clearStaleBreakingClusters,
  getClusterArticles,
  getClusterSocialConfirmations,
  socialSignalExists,
  createSocialSignal,
  getActiveSocialSignals,
  confirmSocialSignal,
  purgeExpiredSocialSignals,
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

/** Convertit des articles externes (API, Google News, GDELT) en RawArticle avec Source en base. */
async function externalToRaw(externalArticles: ExternalArticle[]): Promise<RawArticle[]> {
  const raw: RawArticle[] = [];
  for (const ext of externalArticles) {
    const source = await upsertSource(syntheticFeedFor(ext.sourceName, ext.sourceHomepage));
    raw.push({
      sourceId: source.id,
      sourceName: source.name,
      sourceCountry: source.country,
      title: ext.title,
      url: ext.url,
      rawContent: ext.rawContent,
      publishedAt: ext.publishedAt,
      lat: ext.lat,
      lng: ext.lng,
      locationLabel: ext.locationLabel,
      countryCode: ext.countryCode,
      categoryHint: ext.categoryHint,
    });
  }
  return raw;
}

/**
 * Récupère tous les articles bruts : flux RSS connus, Google News RSS, GDELT, et complément
 * API optionnel (NewsAPI/GNews). Voir docs/strategie/extension-sources.md pour les couches.
 */
async function collectRawArticles(): Promise<RawArticle[]> {
  const feeds = rssFeeds as RssFeedDefinition[];
  // Sources ajoutées par l'utilisateur via la page Paramètres (POST /api/v1/sources) : déjà en
  // base avec le flag `custom`, elles s'ajoutent aux flux RSS "connus" de data/sources/.
  const customSources = await getEnabledCustomSources();

  const [rssResults, customResults, googleNewsArticles, gdeltArticles, alertArticles, scienceArticles, apiArticles] = await Promise.all([
    Promise.all(
      feeds.map(async (feed) => {
        const source = await upsertSource(feed);
        const feedSource: FeedSource = { id: source.id, name: source.name, rssUrl: source.rssUrl, country: source.country };
        return fetchRssArticles(feedSource);
      })
    ),
    Promise.all(
      customSources.map((source) =>
        fetchRssArticles({ id: source.id, name: source.name, rssUrl: source.rssUrl, country: source.country })
      )
    ),
    fetchGoogleNewsArticles(),
    fetchGdeltArticles(),
    fetchAlertArticles(),
    fetchScienceArticles(),
    fetchApiArticles(),
  ]);

  console.log(
    `[ingest] Répartition brute : ${rssResults.flat().length} RSS, ${customResults.flat().length} sources personnalisées ` +
      `(${customSources.length} flux), ${googleNewsArticles.length} Google News, ` +
      `${gdeltArticles.length} GDELT, ${alertArticles.length} alertes, ${scienceArticles.length} science, ` +
      `${apiArticles.length} API.`
  );

  const externalAsRaw = await externalToRaw([
    ...googleNewsArticles,
    ...gdeltArticles,
    ...alertArticles,
    ...scienceArticles,
    ...apiArticles,
  ]);
  return [...rssResults.flat(), ...customResults.flat(), ...externalAsRaw];
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
  // Boosts d'impact par catégorie : cyberattaques à fort impact (services personnels,
  // conséquences nationales...) et publications scientifiques des sujets suivis (IA en tête) —
  // voir cyberImpact.ts / scienceImpact.ts et les watchlists correspondantes dans data/sources/.
  const clusterTexts = articles.map((a) => `${a.title} ${a.rawContent}`);
  const impactBoost =
    category === "cybersecurite"
      ? computeCyberImpactBoost(clusterTexts)
      : category === "science"
        ? computeScienceImpactBoost(clusterTexts)
        : 1;
  const popularityScore = computePopularity(distinctSourceCount, mostRecent, new Date(), impactBoost);

  // Vélocité = sources distinctes sur la fenêtre récente : détecte l'emballement en cours
  // ("breaking"), indépendamment du total cumulé. Une confirmation sociale (couche 3) abaisse
  // le seuil d'une source. Voir src/lib/nlp/breaking.ts.
  const sourceVelocity = computeSourceVelocity(
    articles.map((a) => ({ sourceId: a.sourceId, publishedAt: a.publishedAt }))
  );
  const socialConfirmations = await getClusterSocialConfirmations(clusterId);
  await updateClusterSignals(clusterId, {
    popularityScore,
    breaking: isBreaking(sourceVelocity, socialConfirmations),
    sourceVelocity,
  });
}

/** Nombre maximal de pages d'articles récupérées pour enrichissement par passe (borne le temps). */
const MAX_ENRICHMENTS_PER_RUN = 40;

/**
 * Couche sociale (phase 3) : enregistre les nouveaux posts Reddit comme "évènements candidats",
 * confirme ceux qui recoupent un cluster de presse récent (même heuristique de similarité que le
 * clustering d'articles), et purge les candidats expirés jamais confirmés. Un signal social seul
 * n'est jamais publié — voir docs/strategie/extension-sources.md.
 */
async function processSocialSignals() {
  const posts = await fetchSocialPosts();
  const expiresAt = new Date(Date.now() + socialConfig.confirmationWindowHours * 60 * 60 * 1000);

  let newSignals = 0;
  for (const post of posts) {
    if (await socialSignalExists(post.url)) continue;
    await createSocialSignal({
      platform: post.platform,
      community: post.community,
      title: post.title,
      url: post.url,
      externalUrl: post.externalUrl ?? null,
      postedAt: post.postedAt,
      expiresAt,
    });
    newSignals += 1;
  }

  let confirmed = 0;
  for (const signal of await getActiveSocialSignals()) {
    const category = categorize(signal.title);
    const candidates = await findRecentClusters(category, CLUSTER_TIME_WINDOW_HOURS);
    const clusterId = findBestCluster(signal.title, category, candidates);
    if (!clusterId) continue;

    await confirmSocialSignal(signal.id, clusterId);
    confirmed += 1;
    // La confirmation peut faire basculer le cluster en "breaking" : on recalcule ses signaux.
    await refreshCluster(clusterId, category as Category);
  }

  const purged = await purgeExpiredSocialSignals();
  console.log(
    `[ingest] Social : ${posts.length} posts relevés, ${newSignals} nouveaux candidats, ` +
      `${confirmed} confirmés par la presse, ${purged} expirés purgés.`
  );
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
  let enriched = 0;

  for (const article of deduped) {
    if (await articleExists(article.url)) {
      skipped += 1;
      continue;
    }

    // Contenu trop maigre (titre + chapeau) → on va chercher les paragraphes de la page pour
    // donner de la matière au résumé et à l'interprétation. Voir enrichContent.ts.
    if (article.rawContent.length < ENRICH_MIN_CONTENT_LENGTH && enriched < MAX_ENRICHMENTS_PER_RUN) {
      const body = await fetchArticleBody(article.url);
      if (body) {
        article.rawContent = `${article.rawContent} ${body}`.slice(0, 4000);
        enriched += 1;
      }
    }

    const fullText = `${article.title} ${article.rawContent}`;
    // Les alertes structurées imposent leur catégorie et leur position (fiables à la source) ;
    // pour tout le reste, on garde les heuristiques par texte.
    const category = article.categoryHint ?? categorize(fullText);
    const geo =
      article.lat != null && article.lng != null
        ? {
            countryCode: article.countryCode ?? null,
            locationLabel: article.locationLabel ?? null,
            lat: article.lat,
            lng: article.lng,
          }
        : geolocate(fullText) ?? countryCentroid(article.sourceCountry);
    const summary = await summarizer.summarize(article.rawContent, { maxSentences: 4 });
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

  await processSocialSignals();

  const clearedBreaking = await clearStaleBreakingClusters(VELOCITY_WINDOW_HOURS);
  console.log(
    `[ingest] Terminé : ${created} nouveaux articles (${enriched} enrichis depuis leur page), ` +
      `${skipped} doublons ignorés, ${clearedBreaking} clusters "breaking" retombés.`
  );
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
