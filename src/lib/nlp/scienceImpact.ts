import watchlist from "../../../data/sources/science-watchlist.json";

/**
 * Veille scientifique par tiers de priorité (data/sources/science-watchlist.json) :
 * IA > quantique & spatial > climat > santé. Double usage :
 * - filtrer les flux à fort volume (arXiv publie des centaines de papiers/jour, on ne garde
 *   que ceux qui matchent la veille — voir fetchScience.ts) ;
 * - booster la popularité des clusters "science" selon le tier le plus prioritaire touché,
 *   comme cyberImpact.ts le fait pour les cyberattaques.
 */
interface ScienceTier {
  id: string;
  boost: number;
  keywords: string[];
}

const tiers = (watchlist as unknown as { tiers: ScienceTier[] }).tiers;

/**
 * Cherche le tier de veille le plus prioritaire (premier de la liste) présent dans un texte.
 * @param text Texte à examiner (titre + description/abstract).
 * @returns Le tier correspondant, ou `null` si le texte ne touche aucun sujet suivi.
 */
export function matchScienceTier(text: string): ScienceTier | null {
  const haystack = ` ${text.toLowerCase()} `;
  for (const tier of tiers) {
    if (tier.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return tier;
    }
  }
  return null;
}

/**
 * Multiplicateur de popularité d'un cluster "science" : le boost du tier le plus prioritaire
 * trouvé dans les textes de ses articles, ou 1 si aucun sujet suivi n'est présent.
 * @param texts Textes (titre + contenu brut) des articles du cluster.
 */
export function computeScienceImpactBoost(texts: string[]): number {
  let best = 1;
  for (const text of texts) {
    const tier = matchScienceTier(text);
    if (tier && tier.boost > best) best = tier.boost;
  }
  return best;
}
