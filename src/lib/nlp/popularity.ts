/** Durée (heures) au-delà de laquelle la décroissance par récence atteint son plancher. */
const RECENCY_HORIZON_HOURS = 72;
/** Score minimal de récence conservé même pour un article ancien (évite un score à 0). */
const RECENCY_FLOOR = 0.1;

/**
 * Calcule un score de popularité = nombre de sources distinctes couvrant l'évènement, pondéré par
 * la fraîcheur de l'article le plus récent du cluster. Aucune donnée de trafic réel n'étant
 * disponible, ce score sert de proxy explicable — voir docs/strategie/popularite.md.
 * @param distinctSourceCount Nombre de sources distinctes ayant publié sur le même cluster d'évènement.
 * @param mostRecentPublishedAt Date de publication la plus récente du cluster.
 * @param now Horodatage de référence pour le calcul de récence (par défaut: maintenant).
 * @param impactBoost Multiplicateur d'impact ≥ 1 (ex: cyberattaque majeure, voir cyberImpact.ts). Défaut: 1.
 * @returns Un score positif, plus élevé pour les évènements couverts par plus de sources et plus récents.
 */
export function computePopularity(
  distinctSourceCount: number,
  mostRecentPublishedAt: Date,
  now: Date = new Date(),
  impactBoost = 1
): number {
  const ageHours = Math.max(0, (now.getTime() - mostRecentPublishedAt.getTime()) / (1000 * 60 * 60));
  const recencyFactor = Math.max(RECENCY_FLOOR, 1 - ageHours / RECENCY_HORIZON_HOURS);
  return Math.round(distinctSourceCount * recencyFactor * impactBoost * 100) / 100;
}
