import type { SummarizerProvider } from "./types";

/**
 * Résumeur basé sur un modèle local gratuit via `transformers.js` (Xenova/distilbart-cnn-6-6),
 * exécuté entièrement en local (aucune clé API, aucun coût récurrent), plus précis mais plus
 * lourd/lent que le provider "extractive" par défaut.
 *
 * Optionnel : ce provider n'est PAS installé par défaut (pour garder le projet léger).
 * Pour l'activer :
 *   1. `npm install @xenova/transformers`
 *   2. Mettre `SUMMARIZER_PROVIDER="transformers-distilbart"` dans `.env`
 * Voir docs/strategie/resume-et-interpretation.md pour le détail du compromis et la procédure
 * pour brancher un autre modèle local (il suffit de changer le nom de modèle ci-dessous).
 */

 
let pipelinePromise: Promise<any> | null = null;

async function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = import("@xenova/transformers")
      .catch(() => {
        throw new Error(
          "Le provider 'transformers-distilbart' nécessite la dépendance optionnelle " +
            "'@xenova/transformers'. Installez-la avec `npm install @xenova/transformers`."
        );
      })
      .then(({ pipeline }) => pipeline("summarization", "Xenova/distilbart-cnn-6-6"));
  }
  return pipelinePromise;
}

export const transformersSummarizer: SummarizerProvider = {
  name: "transformers-distilbart",
  async summarize(text, opts) {
    if (!text.trim()) return "";
    const summarizer = await getPipeline();
    const maxSentences = opts?.maxSentences ?? 3;
    const output = await summarizer(text, { max_new_tokens: 40 * maxSentences });
    return Array.isArray(output) ? output[0]?.summary_text ?? "" : String(output);
  },
};
