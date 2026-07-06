"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_COLORS } from "@/lib/categoryColors";

/** Une ligne de données pour le graphique : une semaine + un compte par catégorie. */
export type TrendRow = Record<string, string | number> & { weekStart: string };

interface CategoryTrendChartProps {
  data: TrendRow[];
  categories: string[];
}

/** Courbes hebdomadaires du nombre d'articles par catégorie, pour repérer les pics d'activité. */
export default function CategoryTrendChart({ data, categories }: CategoryTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--fg) / 0.08)" />
        <XAxis dataKey="weekStart" stroke="rgb(var(--fg) / 0.4)" fontSize={12} />
        <YAxis stroke="rgb(var(--fg) / 0.4)" fontSize={12} allowDecimals={false} />
        <Tooltip contentStyle={{ background: "rgb(var(--bg))", border: "1px solid rgb(var(--fg) / 0.1)" }} />
        <Legend />
        {categories.map((category) => (
          <Line
            key={category}
            type="monotone"
            dataKey={category}
            stroke={CATEGORY_COLORS[category] ?? CATEGORY_COLORS.autre}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
