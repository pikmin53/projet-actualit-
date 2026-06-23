import type { Category, Interpretation } from "@/lib/types";

/**
 * Contrat commun à toute implémentation de résumé.
 * Permet de changer de modèle (extractif, transformers.js, LLM externe...) via la variable
 * d'environnement SUMMARIZER_PROVIDER sans modifier le reste du pipeline.
 */
export interface SummarizerProvider {
  /** Identifiant unique utilisé dans SUMMARIZER_PROVIDER (ex: "extractive"). */
  name: string;
  /**
   * Produit un résumé court du texte fourni.
   * @param text Texte brut de l'article (titre + description/contenu).
   * @param opts.maxSentences Nombre maximum de phrases à conserver dans le résumé.
   * @returns Le résumé généré (chaîne vide si le texte est vide).
   */
  summarize(text: string, opts?: { maxSentences?: number }): Promise<string>;
}

/** Un article minimal tel que vu par l'interprétation d'un cluster d'évènement. */
export interface ClusterArticleInput {
  sourceName: string;
  title: string;
  rawContent: string;
}

/**
 * Contrat commun à toute implémentation d'interprétation neutre d'un cluster d'articles
 * (plusieurs sources parlant du même évènement). Sélectionnable via INTERPRETER_PROVIDER.
 */
export interface InterpreterProvider {
  /** Identifiant unique utilisé dans INTERPRETER_PROVIDER (ex: "heuristic"). */
  name: string;
  /**
   * Analyse un groupe d'articles décrivant le même évènement et produit une synthèse neutre.
   * @param cluster.label Titre représentatif du cluster.
   * @param cluster.category Catégorie du cluster (environnement, technologie, politique, economique, autre).
   * @param cluster.articles Articles du cluster, un par source.
   * @returns Une interprétation structurée (points communs, divergences, mots-clés, note d'impact).
   */
  interpret(cluster: { label: string; category: Category; articles: ClusterArticleInput[] }): Promise<Interpretation>;
}
