import { extractWords, splitSentences } from "../keywords";
import type { SummarizerProvider } from "./types";

/**
 * Résumeur extractif basé sur un scoring de phrases par fréquence de mots (proche de Luhn/TextRank simplifié).
 * Aucune dépendance ML : rapide, déterministe, gratuit. C'est le provider par défaut du projet
 * (voir docs/strategie/resume-et-interpretation.md pour le compromis qualité/coût).
 */
export const extractiveSummarizer: SummarizerProvider = {
  name: "extractive",
  async summarize(text, opts) {
    const maxSentences = opts?.maxSentences ?? 3;
    const sentences = splitSentences(text);
    if (sentences.length <= maxSentences) {
      return sentences.join(" ");
    }

    const frequency = new Map<string, number>();
    for (const sentence of sentences) {
      for (const word of extractWords(sentence)) {
        frequency.set(word, (frequency.get(word) ?? 0) + 1);
      }
    }

    const scored = sentences.map((sentence, index) => {
      const words = extractWords(sentence);
      const score = words.length === 0 ? 0 : words.reduce((sum, w) => sum + (frequency.get(w) ?? 0), 0) / words.length;
      return { sentence, index, score };
    });

    const top = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => a.index - b.index);

    return top.map((s) => s.sentence).join(" ");
  },
};
