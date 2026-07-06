/** Fenêtre (heures) sur laquelle la vélocité d'un cluster est mesurée. */
export const VELOCITY_WINDOW_HOURS = 3;
/** Nombre de sources distinctes dans la fenêtre à partir duquel un cluster est "breaking". */
export const BREAKING_MIN_DISTINCT_SOURCES = 3;

/**
 * Vélocité d'un cluster = nombre de sources distinctes ayant publié dans la fenêtre récente
 * (VELOCITY_WINDOW_HOURS). Contrairement au score de popularité (sources cumulées depuis le
 * début), la vélocité mesure l'emballement en cours : un évènement couvert par 5 sources en
 * 3 heures est "breaking", le même total étalé sur 3 jours ne l'est pas.
 * Voir docs/strategie/extension-sources.md ("Détection du marquant").
 * @param articles Articles du cluster (source + date de publication).
 * @param now Horodatage de référence (par défaut: maintenant).
 * @returns Le nombre de sources distinctes ayant publié dans la fenêtre.
 */
export function computeSourceVelocity(
  articles: Array<{ sourceId: string; publishedAt: Date }>,
  now: Date = new Date()
): number {
  const windowStart = now.getTime() - VELOCITY_WINDOW_HOURS * 60 * 60 * 1000;
  const recentSources = new Set(
    articles.filter((a) => a.publishedAt.getTime() >= windowStart).map((a) => a.sourceId)
  );
  return recentSources.size;
}

/**
 * Vrai si le cluster est "breaking" : soit la vélocité seule dépasse le seuil, soit une
 * confirmation croisée abaisse le seuil d'une source — un évènement repéré à la fois par la
 * presse ET par les réseaux sociaux est plus significatif qu'un simple pic de reprises
 * (voir docs/strategie/extension-sources.md, "Détection du marquant").
 * @param sourceVelocity Sources distinctes dans la fenêtre récente.
 * @param socialConfirmations Signaux sociaux confirmés rattachés au cluster.
 */
export function isBreaking(sourceVelocity: number, socialConfirmations = 0): boolean {
  if (sourceVelocity >= BREAKING_MIN_DISTINCT_SOURCES) return true;
  return socialConfirmations >= 1 && sourceVelocity >= BREAKING_MIN_DISTINCT_SOURCES - 1;
}
