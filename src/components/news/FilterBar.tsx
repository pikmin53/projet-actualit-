"use client";

import type { Category, SortKey } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/categoryColors";

const CATEGORIES: { value: Category | "toutes"; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "environnement", label: "Environnement" },
  { value: "technologie", label: "Technologie" },
  { value: "politique", label: "Politique" },
  { value: "economique", label: "Économique" },
  { value: "cybersecurite", label: "Cyberattaques" },
];

interface FilterBarProps {
  category: Category | "toutes";
  sort: SortKey;
  onCategoryChange: (category: Category | "toutes") => void;
  onSortChange: (sort: SortKey) => void;
}

/** Barre de filtre par catégorie (boutons) et de tri (popularité/date) au-dessus de la liste. */
export default function FilterBar({ category, sort, onCategoryChange, onSortChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-4">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = c.value === category;
          const color = c.value === "toutes" ? "#ffffff" : CATEGORY_COLORS[c.value];
          return (
            <button
              key={c.value}
              onClick={() => onCategoryChange(c.value)}
              className="rounded-full border px-3 py-1 text-xs transition"
              style={{
                borderColor: active ? color : "rgba(255,255,255,0.15)",
                backgroundColor: active ? `${color}26` : "transparent",
                color: active ? color : "rgba(255,255,255,0.7)",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        className="ml-auto rounded border border-white/15 bg-transparent px-2 py-1 text-xs text-white/80"
      >
        <option value="popularity">Popularité</option>
        <option value="date">Date</option>
      </select>
    </div>
  );
}
