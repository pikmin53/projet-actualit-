import { extractiveSummarizer } from "./summarizer.extractive";
import { transformersSummarizer } from "./summarizer.transformers";
import { heuristicInterpreter } from "./interpreter.heuristic";
import type { InterpreterProvider, SummarizerProvider } from "./types";

/**
 * Registre des providers de résumé disponibles, indexés par le nom utilisé dans
 * la variable d'environnement SUMMARIZER_PROVIDER.
 * Pour ajouter un nouveau provider : créer un fichier `summarizer.<nom>.ts` qui implémente
 * `SummarizerProvider`, puis l'enregistrer ici.
 */
const summarizerProviders: Record<string, SummarizerProvider> = {
  [extractiveSummarizer.name]: extractiveSummarizer,
  [transformersSummarizer.name]: transformersSummarizer,
};

/**
 * Registre des providers d'interprétation disponibles, indexés par le nom utilisé dans
 * la variable d'environnement INTERPRETER_PROVIDER.
 * Pour ajouter un nouveau provider : créer un fichier `interpreter.<nom>.ts` qui implémente
 * `InterpreterProvider`, puis l'enregistrer ici.
 */
const interpreterProviders: Record<string, InterpreterProvider> = {
  [heuristicInterpreter.name]: heuristicInterpreter,
};

/**
 * Résout le SummarizerProvider actif à partir de SUMMARIZER_PROVIDER (défaut: "extractive").
 * @param providerName Nom explicite à utiliser ; sinon lu depuis process.env.SUMMARIZER_PROVIDER.
 * @throws Si le nom ne correspond à aucun provider enregistré.
 */
export function getSummarizer(providerName?: string): SummarizerProvider {
  const name = providerName ?? process.env.SUMMARIZER_PROVIDER ?? extractiveSummarizer.name;
  const provider = summarizerProviders[name];
  if (!provider) {
    throw new Error(
      `SummarizerProvider inconnu: "${name}". Providers disponibles: ${Object.keys(summarizerProviders).join(", ")}.`
    );
  }
  return provider;
}

/**
 * Résout l'InterpreterProvider actif à partir de INTERPRETER_PROVIDER (défaut: "heuristic").
 * @param providerName Nom explicite à utiliser ; sinon lu depuis process.env.INTERPRETER_PROVIDER.
 * @throws Si le nom ne correspond à aucun provider enregistré.
 */
export function getInterpreter(providerName?: string): InterpreterProvider {
  const name = providerName ?? process.env.INTERPRETER_PROVIDER ?? heuristicInterpreter.name;
  const provider = interpreterProviders[name];
  if (!provider) {
    throw new Error(
      `InterpreterProvider inconnu: "${name}". Providers disponibles: ${Object.keys(interpreterProviders).join(", ")}.`
    );
  }
  return provider;
}
