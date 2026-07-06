interface ArticleRef {
  id: string;
  title: string;
  url: string;
  publishedAt: Date;
  source: { name: string };
}

interface SourcesListProps {
  mainArticle: ArticleRef;
  relatedArticles: ArticleRef[];
}

/** Liste les sources d'un évènement : l'article principal puis les articles liés des autres médias. */
export default function SourcesList({ mainArticle, relatedArticles }: SourcesListProps) {
  const all = [mainArticle, ...relatedArticles];

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg/50">
        Sources ({all.length})
      </h2>
      <ul className="space-y-2">
        {all.map((article) => (
          <li key={article.id} className="flex items-center justify-between gap-3 text-sm">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-fg/80 hover:text-fg hover:underline"
            >
              {article.source.name} — {article.title}
            </a>
            <span className="shrink-0 text-xs text-fg/40">
              {new Date(article.publishedAt).toLocaleDateString("fr-FR")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
