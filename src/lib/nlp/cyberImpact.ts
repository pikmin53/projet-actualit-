import watchlist from "../../../data/sources/cyber-watchlist.json";

/**
 * Multiplicateurs appliqués au score de popularité d'un cluster "cybersecurite" selon les
 * signaux d'impact trouvés dans ses articles (voir data/sources/cyber-watchlist.json) :
 * - un service personnel de la liste de veille est cité → l'attaque peut toucher directement
 *   l'utilisateur ou ses comptes (signal le plus fort),
 * - des marqueurs de conséquences nationales (hôpitaux, réseau électrique, millions de comptes...),
 * - un pays majeur est cité.
 * Les signaux se cumulent (multiplication), plafonnés à MAX_BOOST.
 */
const BOOST_PERSONAL_SERVICE = 2;
const BOOST_CRITICAL_TERM = 1.5;
const BOOST_MAJOR_COUNTRY = 1.25;
const MAX_BOOST = 4;

interface CyberWatchlist {
  personalServices: string[];
  majorCountries: string[];
  criticalTerms: string[];
}

const { personalServices, majorCountries, criticalTerms } = watchlist as unknown as CyberWatchlist;

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

/**
 * Évalue l'impact d'une cyberattaque à partir des textes des articles d'un cluster.
 * @param texts Textes (titre + contenu brut) des articles du cluster.
 * @returns Un multiplicateur ≥ 1 à appliquer au score de popularité du cluster (1 = pas de
 *          signal d'impact particulier, MAX_BOOST = attaque majeure et/ou touchant l'utilisateur).
 */
export function computeCyberImpactBoost(texts: string[]): number {
  const haystack = ` ${texts.join(" ").toLowerCase()} `;

  let boost = 1;
  if (containsAny(haystack, personalServices)) boost *= BOOST_PERSONAL_SERVICE;
  if (containsAny(haystack, criticalTerms)) boost *= BOOST_CRITICAL_TERM;
  if (containsAny(haystack, majorCountries)) boost *= BOOST_MAJOR_COUNTRY;

  return Math.min(boost, MAX_BOOST);
}
