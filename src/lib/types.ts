/** Catégories de classification supportées par le pipeline. Voir docs/strategie/categorisation.md. */
export type Category = "environnement" | "technologie" | "politique" | "economique" | "autre";

/** Tri disponible pour la liste d'actualités. */
export type SortKey = "popularity" | "date";

/** Un article brut tel que récupéré depuis un flux RSS ou une API, avant tout traitement NLP. */
export interface RawArticle {
  sourceId: string;
  sourceName: string;
  sourceCountry: string;
  title: string;
  url: string;
  rawContent: string;
  publishedAt: Date;
}

/** Résultat d'une géolocalisation heuristique sur un texte d'article. */
export interface GeoMatch {
  countryCode: string;
  locationLabel: string;
  lat: number;
  lng: number;
}

/** Forme JSON d'un article telle que renvoyée par l'API publique `/api/v1/articles`. */
export interface ArticleDTO {
  id: string;
  title: string;
  url: string;
  summary: string;
  category: Category;
  countryCode: string | null;
  locationLabel: string | null;
  lat: number | null;
  lng: number | null;
  popularityScore: number;
  publishedAt: string;
  source: { id: string; name: string; homepage: string; country: string; language: string };
}

/** Interprétation neutre générée pour un cluster d'évènement (plusieurs sources). */
export interface Interpretation {
  /** Affirmations/angles partagés par la majorité des sources du cluster. */
  commonPoints: string[];
  /** Angles ou éléments qui diffèrent d'une source à l'autre. */
  divergences: string[];
  /** Mots-clés dominants par source, pour matérialiser les angles éditoriaux. */
  dominantKeywordsBySource: Record<string, string[]>;
  /** Note courte sur les domaines d'impact probables (déduite de la catégorie + des entités). */
  impactNote: string;
  /** Identifiant du provider qui a produit cette interprétation (ex: "heuristic"). */
  generatedBy: string;
}
