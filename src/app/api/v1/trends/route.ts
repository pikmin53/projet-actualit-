import { NextRequest, NextResponse } from "next/server";
import { withPublicApi, publicApiOptionsHandler } from "@/lib/api/withPublicApi";
import { getWeeklyTrends } from "@/lib/db/queries";

/**
 * GET /api/v1/trends
 * Query params : weeks (défaut 12, max 52) — nombre de semaines à inclure.
 * Renvoie le nombre d'articles par catégorie et par semaine (ISO, lundi 00:00 UTC).
 * Voir docs/api.md.
 */
export const GET = withPublicApi(async (req: NextRequest) => {
  const weeksParam = Number(req.nextUrl.searchParams.get("weeks") ?? 12) || 12;
  const weeks = Math.min(Math.max(weeksParam, 1), 52);

  const trends = await getWeeklyTrends(weeks);
  return NextResponse.json({ weeks, trends });
});

export const OPTIONS = publicApiOptionsHandler;
