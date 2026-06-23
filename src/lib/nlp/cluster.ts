import { extractWords } from "./keywords";

/** Fenêtre de temps (heures) au-delà de laquelle un cluster existant n'est plus considéré comme candidat. */
export const CLUSTER_TIME_WINDOW_HOURS = 48;

/** Seuil de similarité (Jaccard sur les mots du titre) au-delà duquel deux articles sont jugés liés. */
export const CLUSTER_SIMILARITY_THRESHOLD = 0.3;

/** Coefficient de Jaccard entre deux ensembles de mots (taille de l'intersection / taille de l'union). */
export function jaccardSimilarity(wordsA: string[], wordsB: string[]): number {
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface ClusterCandidate {
  id: string;
  label: string;
  category: string;
  ageHours: number;
}

/**
 * Cherche, parmi les clusters candidats (même catégorie, créés dans la fenêtre temporelle),
 * celui dont le libellé recouvre le plus le titre du nouvel article. Heuristique simple
 * remplaçant un vrai clustering par embeddings — voir docs/strategie/clustering-evenements.md.
 * @param articleTitle Titre du nouvel article à rattacher (ou non) à un cluster existant.
 * @param category Catégorie du nouvel article (seuls les clusters de même catégorie sont candidats).
 * @param candidates Clusters récents (généralement: même catégorie, créés depuis moins de 48h).
 * @returns L'identifiant du meilleur cluster si la similarité dépasse le seuil, sinon `null`
 *          (signe qu'il faut créer un nouveau cluster pour cet article).
 */
export function findBestCluster(
  articleTitle: string,
  category: string,
  candidates: ClusterCandidate[]
): string | null {
  const titleWords = extractWords(articleTitle);
  let bestId: string | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    if (candidate.category !== category) continue;
    if (candidate.ageHours > CLUSTER_TIME_WINDOW_HOURS) continue;

    const score = jaccardSimilarity(titleWords, extractWords(candidate.label));
    if (score > bestScore) {
      bestScore = score;
      bestId = candidate.id;
    }
  }

  return bestScore >= CLUSTER_SIMILARITY_THRESHOLD ? bestId : null;
}
