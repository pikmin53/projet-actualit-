/** Mots vides (FR + EN) ignorés par les heuristiques de mots-clés. Volontairement non exhaustif. */
const STOPWORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "à", "au", "aux", "ce", "ces", "cette",
  "il", "elle", "ils", "elles", "on", "nous", "vous", "je", "tu", "qui", "que", "quoi", "dont", "pour",
  "par", "sur", "dans", "en", "est", "sont", "été", "être", "avoir", "a", "ont", "se", "sa", "son", "ses",
  "leur", "leurs", "mais", "donc", "or", "ni", "car", "comme", "plus", "moins", "très", "selon", "après", "avant",
  "the", "a", "an", "of", "and", "or", "to", "in", "on", "for", "with", "by", "is", "are", "was", "were",
  "be", "been", "it", "its", "this", "that", "these", "those", "as", "at", "from", "but", "not", "has", "have",
]);

/**
 * Découpe un texte en phrases en gérant la ponctuation française/anglaise courante.
 * @param text Texte brut à découper.
 * @returns Liste de phrases non vides, dans l'ordre d'origine.
 */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Extrait les mots significatifs d'un texte (minuscule, hors mots vides, hors ponctuation, longueur > 2).
 * @param text Texte source (phrase, titre, article entier...).
 * @returns Liste de mots normalisés en minuscules.
 */
export function extractWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-zà-öø-ÿ0-9]+/gi) ?? []).filter(
    (w) => w.length > 2 && !STOPWORDS.has(w)
  );
}

/**
 * Calcule les mots-clés dominants d'un texte par fréquence brute.
 * @param text Texte source.
 * @param limit Nombre maximum de mots-clés à retourner (défaut 5).
 * @returns Mots-clés triés du plus fréquent au moins fréquent.
 */
export function topKeywords(text: string, limit = 5): string[] {
  const frequency = new Map<string, number>();
  for (const word of extractWords(text)) {
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }
  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}
