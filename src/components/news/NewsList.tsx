"use client";

import type { ArticleDTO } from "@/lib/types";
import NewsCard from "./NewsCard";

interface NewsListProps {
  articles: ArticleDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

/** Liste verticale scrollable des actualités, déjà filtrées/triées par le parent. */
export default function NewsList({ articles, selectedId, onSelect, loading }: NewsListProps) {
  if (loading) {
    return <p className="p-4 text-sm text-white/50">Chargement des actualités...</p>;
  }

  if (articles.length === 0) {
    return <p className="p-4 text-sm text-white/50">Aucune actualité ne correspond à ces filtres.</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} selected={article.id === selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}
