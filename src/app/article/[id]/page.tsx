import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/db/queries";
import Summary from "@/components/article/Summary";
import InterpretationPanel from "@/components/article/InterpretationPanel";
import SourcesList from "@/components/article/SourcesList";
import { CATEGORY_COLORS } from "@/lib/categoryColors";
import { topKeywords } from "@/lib/nlp/keywords";
import type { Interpretation } from "@/lib/types";

interface ArticlePageProps {
  // Promise depuis Next 15 : les paramètres de route se résolvent de façon asynchrone.
  params: Promise<{ id: string }>;
}

/** Page de détail d'un article : résumé, interprétation IA neutre, et liste des sources du cluster. */
export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  const interpretation: Interpretation | null = article.eventCluster
    ? JSON.parse(article.eventCluster.interpretationRaw)
    : null;
  const relatedArticles = article.eventCluster?.articles.filter((a) => a.id !== article.id) ?? [];
  const color = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.autre;
  const keywords = topKeywords(`${article.title} ${article.rawContent}`, 8);
  // Un résumé à peine plus long que le titre signale un contenu source trop maigre pour être résumé.
  const thinSummary = article.summary.length < article.title.length + 60;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-fg/50 hover:text-fg">
        ← Retour au globe
      </Link>

      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="rounded px-2 py-0.5 font-medium" style={{ backgroundColor: `${color}33`, color }}>
          {article.category}
        </span>
        {article.locationLabel && <span className="text-fg/50">📍 {article.locationLabel}</span>}
      </div>

      <h1 className="mt-3 text-2xl font-semibold leading-tight">{article.title}</h1>
      <p className="mt-1 text-sm text-fg/50">
        {article.source.name} · {new Date(article.publishedAt).toLocaleString("fr-FR")}
      </p>

      <Summary text={article.summary} />
      {thinSummary && (
        <p className="mt-2 text-xs text-fg/40">
          La source ne fournit qu’un extrait très court pour cet article — le résumé s’en tient à
          ce qui est vérifiable. L’article original contient davantage de détails.
        </p>
      )}

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block rounded border border-accent/40 px-4 py-2 text-sm text-accent transition hover:bg-accent/10"
      >
        Lire l’article original sur {article.source.name} ↗
      </a>

      {keywords.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg/50">Mots-clés</h2>
          <div className="flex flex-wrap gap-2">
            {keywords.map((word) => (
              <span key={word} className="rounded-full border border-fg/15 px-3 py-1 text-xs text-fg/70">
                {word}
              </span>
            ))}
          </div>
        </section>
      )}

      {interpretation && <InterpretationPanel interpretation={interpretation} />}
      <SourcesList mainArticle={article} relatedArticles={relatedArticles} />
    </div>
  );
}
