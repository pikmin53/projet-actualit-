"use client";

import Link from "next/link";
import type { ArticleDTO } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/categoryColors";

interface NewsCardProps {
  article: ArticleDTO;
  selected: boolean;
  onSelect: (id: string) => void;
}

/** Une carte d'actualité dans la liste : sélectionne l'article (fait voler le globe) au clic,
 * et permet de naviguer vers la page de détail via le titre. */
export default function NewsCard({ article, selected, onSelect }: NewsCardProps) {
  const color = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.autre;
  const publishedDate = new Date(article.publishedAt).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      onClick={() => onSelect(article.id)}
      className={`cursor-pointer rounded-lg border p-4 transition ${
        selected ? "border-white/40 bg-white/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <div className="mb-1 flex items-center gap-2 text-xs">
        {article.breaking && (
          <span className="animate-pulse rounded bg-red-500/20 px-2 py-0.5 font-semibold text-red-400">
            ⚡ BREAKING
          </span>
        )}
        <span className="rounded px-2 py-0.5 font-medium" style={{ backgroundColor: `${color}33`, color }}>
          {article.category}
        </span>
        {article.locationLabel && <span className="text-white/50">📍 {article.locationLabel}</span>}
        <span className="ml-auto text-white/40">{publishedDate}</span>
      </div>
      <Link href={`/article/${article.id}`} className="font-medium leading-snug hover:underline">
        {article.title}
      </Link>
      <p className="mt-1 line-clamp-2 text-sm text-white/60">{article.summary}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-white/40">
        <span>{article.source.name}</span>
        <span>★ {article.popularityScore.toFixed(1)}</span>
      </div>
    </div>
  );
}
