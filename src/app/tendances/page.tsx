"use client";

import { useEffect, useMemo, useState } from "react";
import CategoryTrendChart, { type TrendRow } from "@/components/charts/CategoryTrendChart";

interface TrendPoint {
  weekStart: string;
  category: string;
  count: number;
}

const WEEK_OPTIONS = [4, 8, 12, 26, 52];

/** Page "Tendances" : évolution hebdomadaire du nombre d'articles par catégorie. */
export default function TendancesPage() {
  const [weeks, setWeeks] = useState(12);
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/trends?weeks=${weeks}`)
      .then((res) => res.json())
      .then((data) => setPoints(data.trends ?? []))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [weeks]);

  const categories = useMemo(() => [...new Set(points.map((p) => p.category))].sort(), [points]);

  const rows: TrendRow[] = useMemo(() => {
    const byWeek = new Map<string, TrendRow>();
    for (const point of points) {
      const row = byWeek.get(point.weekStart) ?? { weekStart: point.weekStart };
      row[point.category] = point.count;
      byWeek.set(point.weekStart, row);
    }
    return [...byWeek.values()].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
  }, [points]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tendances par catégorie</h1>
        <select
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
          className="rounded border border-white/15 bg-transparent px-2 py-1 text-sm"
        >
          {WEEK_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w} semaines
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-white/50">Chargement des tendances...</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-white/50">
          Pas encore de données. Lancez une ingestion (`npm run ingest`) pour peupler la base.
        </p>
      )}
      {!loading && rows.length > 0 && <CategoryTrendChart data={rows} categories={categories} />}
    </div>
  );
}
