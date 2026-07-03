import { prisma } from "./prisma";
import type { Category, SortKey } from "@/lib/types";

// ---------------------------------------------------------------------------
// Lecture (utilisée par les routes API publiques et les pages Next.js)
// ---------------------------------------------------------------------------

export interface ListArticlesParams {
  category?: Category;
  sort?: SortKey;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Liste les articles avec leur source, filtrables par catégorie/recherche et triables.
 * @param params.category Filtre exact sur la catégorie ; omis = toutes catégories.
 * @param params.sort "popularity" (défaut) ou "date".
 * @param params.search Recherche texte simple sur le titre et le résumé (insensible à la casse).
 * @param params.limit Nombre maximum de résultats (défaut 50).
 * @param params.offset Décalage pour la pagination (défaut 0).
 * @returns Les articles correspondants, triés selon `sort`.
 */
export async function listArticles(params: ListArticlesParams = {}) {
  const { category, sort = "popularity", search, limit = 50, offset = 0 } = params;

  const articles = await prisma.article.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { summary: { contains: search } },
              { locationLabel: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: sort === "date" ? { publishedAt: "desc" } : [{ popularityScore: "desc" }, { publishedAt: "desc" }],
    take: limit,
    skip: offset,
    include: { source: true, eventCluster: { select: { breaking: true } } },
  });

  // Aplatit le flag breaking du cluster sur chaque article (contrat ArticleDTO, voir docs/api.md).
  return articles.map(({ eventCluster, ...article }) => ({
    ...article,
    breaking: eventCluster?.breaking ?? false,
  }));
}

/**
 * Récupère un article par id avec sa source et les articles "liés" (même cluster d'évènement).
 * @param id Identifiant de l'article.
 * @returns L'article enrichi, ou `null` s'il n'existe pas.
 */
export async function getArticleById(id: string) {
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      source: true,
      eventCluster: { include: { articles: { include: { source: true } } } },
    },
  });
  return article;
}

/** Nombre de buckets hebdomadaires retournés par défaut par `getWeeklyTrends`. */
const DEFAULT_TREND_WEEKS = 12;

/**
 * Agrège le nombre d'articles publiés par catégorie et par semaine, sur les N dernières semaines.
 * Utilisé par la page "Tendances" pour tracer les courbes d'activité par catégorie.
 * @param weeks Nombre de semaines à inclure (défaut 12).
 * @returns Une liste de points `{ weekStart, category, count }` triée par semaine croissante.
 */
export async function getWeeklyTrends(weeks: number = DEFAULT_TREND_WEEKS) {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const articles = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    select: { publishedAt: true, category: true },
  });

  const buckets = new Map<string, Map<string, number>>();
  for (const article of articles) {
    const weekStart = startOfIsoWeek(article.publishedAt).toISOString().slice(0, 10);
    if (!buckets.has(weekStart)) buckets.set(weekStart, new Map());
    const byCategory = buckets.get(weekStart)!;
    byCategory.set(article.category, (byCategory.get(article.category) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .flatMap(([weekStart, byCategory]) =>
      [...byCategory.entries()].map(([category, count]) => ({ weekStart, category, count }))
    );
}

/** Renvoie le lundi (00:00 UTC) de la semaine ISO contenant `date`. */
function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const isoDay = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (isoDay - 1));
  return d;
}

// ---------------------------------------------------------------------------
// Écriture (utilisée par le pipeline d'ingestion, scripts/ingest.ts)
// ---------------------------------------------------------------------------

/**
 * Crée ou retrouve une Source par son URL de flux RSS (clé d'unicité). Idempotent : peut être
 * appelé à chaque exécution d'ingestion sans dupliquer les sources.
 */
export async function upsertSource(feed: { name: string; homepage: string; rssUrl: string; country: string; language: string }) {
  return prisma.source.upsert({
    where: { rssUrl: feed.rssUrl },
    update: { name: feed.name, homepage: feed.homepage, country: feed.country, language: feed.language },
    create: feed,
  });
}

/**
 * Renvoie les clusters d'évènements récents d'une catégorie donnée, candidats pour le rattachement
 * d'un nouvel article (voir `lib/nlp/cluster.ts`).
 * @param category Catégorie à filtrer.
 * @param sinceHours Ancienneté maximale des clusters à considérer, en heures.
 */
export async function findRecentClusters(category: string, sinceHours: number) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const clusters = await prisma.eventCluster.findMany({
    where: { category, createdAt: { gte: since } },
    select: { id: true, label: true, category: true, createdAt: true },
  });
  return clusters.map((c) => ({
    id: c.id,
    label: c.label,
    category: c.category,
    ageHours: (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60),
  }));
}

/** Crée un nouveau cluster d'évènement avec son interprétation initiale. */
export async function createCluster(data: { label: string; category: string; interpretationRaw: string }) {
  return prisma.eventCluster.create({ data });
}

/** Met à jour l'interprétation stockée d'un cluster existant (après ajout d'un nouvel article). */
export async function updateClusterInterpretation(id: string, interpretationRaw: string) {
  return prisma.eventCluster.update({ where: { id }, data: { interpretationRaw } });
}

/** Vrai si un article avec cette URL existe déjà en base (utilisé pour éviter les doublons). */
export async function articleExists(url: string): Promise<boolean> {
  const existing = await prisma.article.findUnique({ where: { url }, select: { id: true } });
  return existing !== null;
}

/** Crée un nouvel article. Suppose que `articleExists` a déjà été vérifié par l'appelant. */
export async function createArticle(data: {
  sourceId: string;
  title: string;
  url: string;
  rawContent: string;
  summary: string;
  category: string;
  countryCode?: string | null;
  locationLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
  popularityScore: number;
  publishedAt: Date;
  eventClusterId?: string | null;
}) {
  return prisma.article.create({ data });
}

/** Nombre de sources distinctes ayant un article dans un cluster donné (sert au score de popularité). */
export async function countDistinctSourcesInCluster(clusterId: string): Promise<number> {
  const articles = await prisma.article.findMany({ where: { eventClusterId: clusterId }, select: { sourceId: true } });
  return new Set(articles.map((a) => a.sourceId)).size;
}

/**
 * Met à jour les signaux calculés d'un cluster après ajout d'un article : score de popularité
 * (recopié sur tous ses articles) et état "breaking" + vélocité (portés par le cluster).
 */
export async function updateClusterSignals(
  clusterId: string,
  signals: { popularityScore: number; breaking: boolean; sourceVelocity: number }
) {
  return prisma.$transaction([
    prisma.article.updateMany({
      where: { eventClusterId: clusterId },
      data: { popularityScore: signals.popularityScore },
    }),
    prisma.eventCluster.update({
      where: { id: clusterId },
      data: { breaking: signals.breaking, sourceVelocity: signals.sourceVelocity },
    }),
  ]);
}

/**
 * Éteint le flag "breaking" des clusters qui n'ont reçu aucune mise à jour depuis la fenêtre de
 * vélocité : l'emballement est retombé mais aucun nouvel article n'a déclenché de recalcul.
 * Appelé en fin de chaque passe d'ingestion.
 * @returns Le nombre de clusters désactivés.
 */
export async function clearStaleBreakingClusters(olderThanHours: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const result = await prisma.eventCluster.updateMany({
    where: { breaking: true, updatedAt: { lt: cutoff } },
    data: { breaking: false, sourceVelocity: 0 },
  });
  return result.count;
}

/** Articles d'un cluster, utilisés pour reconstruire l'interprétation à jour. */
export async function getClusterArticles(clusterId: string) {
  return prisma.article.findMany({ where: { eventClusterId: clusterId }, include: { source: true } });
}

/**
 * Récupère un cluster d'évènement par id avec tous ses articles (et leurs sources).
 * @param id Identifiant du cluster.
 * @returns Le cluster enrichi, ou `null` s'il n'existe pas.
 */
export async function getClusterById(id: string) {
  return prisma.eventCluster.findUnique({
    where: { id },
    include: { articles: { include: { source: true } } },
  });
}
