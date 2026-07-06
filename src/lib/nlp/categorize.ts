import type { Category } from "@/lib/types";

/**
 * Mots-clés (FR + EN) associés à chaque catégorie. Liste volontairement simple et extensible :
 * voir docs/strategie/categorisation.md pour la logique et les pistes d'amélioration.
 */
const CATEGORY_KEYWORDS: Record<Exclude<Category, "autre">, string[]> = {
  environnement: [
    "climat", "climate", "réchauffement", "warming", "carbone", "carbon", "biodiversité", "biodiversity",
    "pollution", "écologie", "ecology", "énergie renouvelable", "renewable energy", "ouragan", "hurricane",
    "inondation", "flood", "sécheresse", "drought", "déforestation", "deforestation", "cop28", "cop29", "cop30",
  ],
  technologie: [
    "intelligence artificielle", "artificial intelligence", " ia ", " ai ", "robot", "robotique", "robotics",
    "logiciel", "software", "application", "smartphone", "informatique",
    "startup", "puce", "chip", "semi-conducteur", "semiconductor", "satellite", "spatial", "space launch",
  ],
  science: [
    "étude scientifique", "study finds", "researchers", "chercheurs", "scientists", "scientifiques",
    "peer-reviewed", "arxiv", "préprint", "preprint", "découverte", "discovery", "expérience", "experiment",
    "laboratoire", "laboratory", "publication scientifique", "revue scientifique", "journal nature",
    "essai clinique", "clinical trial", "physicien", "physicist", "biologiste", "biologist", "astronome", "astronomer",
  ],
  cybersecurite: [
    "cyberattaque", "cyberattack", "cyber attack", "cybersécurité", "cybersecurity", "ransomware", "rançongiciel",
    "data breach", "fuite de données", "vol de données", "données volées", "stolen data", "données personnelles compromises",
    "ddos", "phishing", "hameçonnage", "zero-day", "zero day", "malware", "spyware", "botnet",
    "piratage", "piraté", "hacked", "hacker", "hackers", "exfiltration", "cve-", "vulnérabilité critique",
    "critical vulnerability", "threat actor", "cybercriminel", "cybercrime",
  ],
  politique: [
    "élection", "election", "président", "president", "gouvernement", "government", "parlement", "parliament",
    "ministre", "minister", "diplomatie", "diplomacy", "sommet", "summit", "vote", "loi", "law", "constitution",
    "opposition", "coalition", "sénat", "senate", "premier ministre", "prime minister",
  ],
  economique: [
    "économie", "economy", "inflation", "pib", "gdp", "marché", "market", "bourse", "stock", "banque centrale",
    "central bank", "emploi", "employment", "chômage", "unemployment", "commerce", "trade", "taux d'intérêt",
    "interest rate", "croissance", "growth", "récession", "recession", "entreprise", "company earnings",
  ],
};

/**
 * Catégorise un article par comptage de mots-clés présents dans son titre + contenu brut.
 * Heuristique simple et déterministe (pas de modèle ML), choisie pour rester gratuite et explicable.
 * @param text Texte à analyser (typiquement `${title} ${rawContent}`).
 * @returns La catégorie dont le score de mots-clés est le plus élevé, ou "autre" si aucun mot-clé ne correspond.
 */
export function categorize(text: string): Category {
  const haystack = ` ${text.toLowerCase()} `;
  let bestCategory: Category = "autre";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Exclude<Category, "autre">, string[]][]) {
    const score = keywords.reduce((count, keyword) => (haystack.includes(keyword) ? count + 1 : count), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}
