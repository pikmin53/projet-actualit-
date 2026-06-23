interface SummaryProps {
  text: string;
}

/** Bloc affichant le résumé généré par le SummarizerProvider actif. */
export default function Summary({ text }: SummaryProps) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">Résumé</h2>
      <p className="leading-relaxed text-white/90">{text}</p>
    </section>
  );
}
