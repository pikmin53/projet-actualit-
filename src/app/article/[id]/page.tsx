import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/db/queries";
import Summary from "@/components/article/Summary";
import InterpretationPanel from "@/components/article/InterpretationPanel";
import SourcesList from "@/components/article/SourcesList";
import { CATEGORY_COLORS } from "@/lib/categoryColors";
import type { Interpretation } from "@/lib/types";

interface ArticlePageProps {
  params: { id: string };
}

/** Page de détail d'un article : résumé, interprétation IA neutre, et liste des sources du cluster. */
export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getArticleById(params.id);
  if (!article) notFound();

  const interpretation: Interpretation | null = article.eventCluster
    ? JSON.parse(article.eventCluster.interpretationRaw)
    : null;
  const relatedArticles = article.eventCluster?.articles.filter((a) => a.id !== article.id) ?? [];
  const color = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.autre;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-white/50 hover:text-white">
        ← Retour au globe
      </Link>

      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="rounded px-2 py-0.5 font-medium" style={{ backgroundColor: `${color}33`, color }}>
          {article.category}
        </span>
        {article.locationLabel && <span className="text-white/50">📍 {article.locationLabel}</span>}
      </div>

      <h1 className="mt-3 text-2xl font-semibold leading-tight">{article.title}</h1>
      <p className="mt-1 text-sm text-white/50">
        {article.source.name} · {new Date(article.publishedAt).toLocaleString("fr-FR")}
      </p>

      <Summary text={article.summary} />
      {interpretation && <InterpretationPanel interpretation={interpretation} />}
      <SourcesList mainArticle={article} relatedArticles={relatedArticles} />
    </div>
  );
}
