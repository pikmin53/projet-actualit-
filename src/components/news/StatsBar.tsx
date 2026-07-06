"use client";

import type { ArticleDTO } from "@/lib/types";

/** Une statistique compacte du tableau de bord. */
function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-fg/10 bg-fg/[0.03] px-3 py-2">
      <span className={`text-lg font-semibold leading-tight ${accent ? "text-red-400" : "text-accent"}`}>{value}</span>
      <span className="text-[0.65rem] uppercase tracking-wide text-fg/40">{label}</span>
    </div>
  );
}

/**
 * Barre de statistiques au-dessus de la liste : donne une lecture immédiate de l'activité
 * (volume, évènements en cours, couverture géographique et fraîcheur des données affichées).
 */
export default function StatsBar({ articles }: { articles: ArticleDTO[] }) {
  if (articles.length === 0) return null;

  const breakingCount = new Set(articles.filter((a) => a.breaking).map((a) => a.title)).size;
  const sourceCount = new Set(articles.map((a) => a.source.id)).size;
  const countryCount = new Set(articles.map((a) => a.countryCode).filter(Boolean)).size;
  const mostRecent = articles.reduce(
    (latest, a) => (a.publishedAt > latest ? a.publishedAt : latest),
    articles[0].publishedAt
  );
  const lastUpdate = new Date(mostRecent).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="grid grid-cols-5 gap-2 px-4 pt-4">
      <Stat value={String(articles.length)} label="Actus" />
      <Stat value={String(breakingCount)} label="Breaking" accent={breakingCount > 0} />
      <Stat value={String(sourceCount)} label="Sources" />
      <Stat value={String(countryCount)} label="Pays" />
      <Stat value={lastUpdate} label="Dernière actu" />
    </div>
  );
}
