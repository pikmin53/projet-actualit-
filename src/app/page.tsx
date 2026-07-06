"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NewsGlobe, { type GlobePoint } from "@/components/globe/NewsGlobe";
import NewsList from "@/components/news/NewsList";
import FilterBar from "@/components/news/FilterBar";
import SearchBar from "@/components/news/SearchBar";
import BreakingTicker from "@/components/news/BreakingTicker";
import StatsBar from "@/components/news/StatsBar";
import type { ArticleDTO, Category, SortKey } from "@/lib/types";

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | "toutes">("toutes");
  const [sort, setSort] = useState<SortKey>("popularity");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ sort, limit: "100" });
    if (category !== "toutes") params.set("category", category);
    if (search.trim()) params.set("search", search.trim());

    setLoading(true);
    fetch(`/api/v1/articles?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setArticles(data.articles ?? []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [category, sort, search]);

  const globePoints: GlobePoint[] = useMemo(
    () =>
      articles
        .filter((a) => a.lat !== null && a.lng !== null)
        .map((a) => ({
          id: a.id,
          lat: a.lat as number,
          lng: a.lng as number,
          title: a.title,
          category: a.category,
          popularityScore: a.popularityScore,
          breaking: a.breaking,
        })),
    [articles]
  );

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  return (
    <div className="flex h-[calc(100vh-65px)] flex-col">
      <BreakingTicker articles={articles} />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="relative min-w-0">
          <NewsGlobe points={globePoints} selectedId={selectedId} onSelectPoint={handleSelect} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-l border-fg/10">
          <StatsBar articles={articles} />
          <div className="p-4 pb-0">
            <SearchBar onSearch={setSearch} />
          </div>
          <FilterBar category={category} sort={sort} onCategoryChange={setCategory} onSortChange={setSort} />
          <NewsList articles={articles} selectedId={selectedId} onSelect={handleSelect} loading={loading} />
        </div>
      </div>
    </div>
  );
}
