"use client";

import Link from "next/link";
import type { ArticleDTO } from "@/lib/types";

/**
 * Bandeau défilant des évènements "breaking" (clusters en emballement médiatique), affiché
 * au-dessus du globe quand il y en a. Le contenu est dupliqué pour un défilement en boucle
 * continue (animation CSS "animate-ticker", en pause au survol).
 */
export default function BreakingTicker({ articles }: { articles: ArticleDTO[] }) {
  // Un seul article par cluster suffit dans le bandeau : dédoublonnage par titre.
  const seen = new Set<string>();
  const breaking = articles.filter((a) => {
    if (!a.breaking || seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  if (breaking.length === 0) return null;

  const items = breaking.map((a) => (
    <Link
      key={a.id}
      href={`/article/${a.id}`}
      className="mx-6 inline-flex items-center gap-2 text-sm hover:underline"
    >
      <span className="font-semibold text-red-400">⚡</span>
      {a.title}
      {a.locationLabel && <span className="text-fg/40">— {a.locationLabel}</span>}
    </Link>
  ));

  return (
    <div className="flex items-center overflow-hidden border-b border-red-500/30 bg-red-500/10">
      <span className="z-10 shrink-0 border-r border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400">
        Breaking
      </span>
      <div className="animate-ticker whitespace-nowrap py-1.5">
        {items}
        {items}
      </div>
    </div>
  );
}
