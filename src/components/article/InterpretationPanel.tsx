import type { Interpretation } from "@/lib/types";

interface InterpretationPanelProps {
  interpretation: Interpretation;
}

/**
 * Bloc "Interprétation IA" : synthèse neutre comparant les sources d'un même cluster d'évènement.
 * Affiche explicitement un disclaimer de neutralité (voir docs/strategie/neutralite-et-limites.md) :
 * il s'agit d'une comparaison algorithmique de mots-clés, pas d'une opinion générée.
 */
export default function InterpretationPanel({ interpretation }: InterpretationPanelProps) {
  const sources = Object.entries(interpretation.dominantKeywordsBySource);

  return (
    <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-white/50">Interprétation IA</h2>
      <p className="mb-4 text-xs text-white/40">
        Analyse automatique et neutre, générée par comparaison des mots-clés entre sources (provider:{" "}
        {interpretation.generatedBy}). Ce n&apos;est pas une opinion : elle ne fait que comparer la couverture
        des différentes sources de cet évènement.
      </p>

      {interpretation.commonPoints.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-medium text-white/60">Points communs entre les sources</h3>
          <p className="text-sm text-white/80">{interpretation.commonPoints.join(", ")}</p>
        </div>
      )}

      {interpretation.divergences.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-medium text-white/60">Angles divergents</h3>
          <p className="text-sm text-white/80">{interpretation.divergences.join(", ")}</p>
        </div>
      )}

      {sources.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-medium text-white/60">Mots-clés dominants par source</h3>
          <ul className="mt-1 space-y-1 text-sm text-white/80">
            {sources.map(([sourceName, keywords]) => (
              <li key={sourceName}>
                <span className="text-white/50">{sourceName} :</span> {keywords.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-xs font-medium text-white/60">Impact potentiel</h3>
        <p className="text-sm text-white/80">{interpretation.impactNote}</p>
      </div>
    </section>
  );
}
