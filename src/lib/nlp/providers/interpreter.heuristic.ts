import { topKeywords } from "../keywords";
import type { Category, Interpretation } from "@/lib/types";
import type { InterpreterProvider } from "./types";

/** Notes d'impact générique par catégorie, utilisées comme point de départ de l'interprétation. */
const IMPACT_NOTES: Record<Category, string> = {
  environnement: "Impact potentiel sur les écosystèmes, les politiques climatiques et l'opinion publique liée à l'environnement.",
  technologie: "Impact potentiel sur l'innovation, la régulation numérique et les usages grand public.",
  politique: "Impact potentiel sur les rapports de force institutionnels, les relations internationales et l'opinion publique.",
  economique: "Impact potentiel sur les marchés, l'emploi et les politiques économiques nationales ou internationales.",
  cybersecurite: "Impact potentiel sur la sécurité des données, la continuité de services (entreprises, administrations, infrastructures) et les utilisateurs des services touchés.",
  autre: "Impact difficile à catégoriser automatiquement ; à interpréter au cas par cas.",
};

/**
 * Interprète heuristique (sans LLM génératif) : compare les mots-clés dominants de chaque source
 * d'un même cluster d'évènement pour faire émerger points communs et divergences. Reste neutre
 * en ne reformulant pas le contenu des sources, seulement en le comparant.
 * Voir docs/strategie/resume-et-interpretation.md et docs/strategie/neutralite-et-limites.md.
 */
export const heuristicInterpreter: InterpreterProvider = {
  name: "heuristic",
  async interpret(cluster) {
    const keywordsBySource: Record<string, string[]> = {};
    for (const article of cluster.articles) {
      keywordsBySource[article.sourceName] = topKeywords(`${article.title} ${article.rawContent}`, 6);
    }

    const allKeywordLists = Object.values(keywordsBySource);
    const sourceCount = allKeywordLists.length;
    const occurrences = new Map<string, number>();
    for (const list of allKeywordLists) {
      for (const word of new Set(list)) {
        occurrences.set(word, (occurrences.get(word) ?? 0) + 1);
      }
    }

    const majorityThreshold = Math.max(2, Math.ceil(sourceCount / 2));
    const commonPoints: string[] = [];
    const divergences: string[] = [];

    for (const [word, count] of occurrences) {
      if (count >= majorityThreshold) {
        commonPoints.push(word);
      } else if (count === 1 && sourceCount > 1) {
        divergences.push(word);
      }
    }

    const result: Interpretation = {
      commonPoints: commonPoints.slice(0, 8),
      divergences: divergences.slice(0, 8),
      dominantKeywordsBySource: keywordsBySource,
      impactNote: IMPACT_NOTES[cluster.category] ?? IMPACT_NOTES.autre,
      generatedBy: "heuristic",
    };

    return result;
  },
};
