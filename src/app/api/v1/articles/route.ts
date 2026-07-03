import { NextRequest, NextResponse } from "next/server";
import { withPublicApi, publicApiOptionsHandler } from "@/lib/api/withPublicApi";
import { listArticles } from "@/lib/db/queries";
import type { Category, SortKey } from "@/lib/types";

const VALID_CATEGORIES: Category[] = ["environnement", "technologie", "politique", "economique", "cybersecurite", "autre"];
const VALID_SORTS: SortKey[] = ["popularity", "date"];

/**
 * GET /api/v1/articles
 * Query params : category (optionnel), sort=popularity|date (défaut popularity),
 * search (optionnel), limit (défaut 50, max 200), offset (défaut 0).
 * Voir docs/api.md pour le contrat complet.
 */
export const GET = withPublicApi(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const categoryParam = params.get("category");
  const sortParam = params.get("sort");

  if (categoryParam && !VALID_CATEGORIES.includes(categoryParam as Category)) {
    return NextResponse.json(
      { error: `category invalide. Valeurs possibles: ${VALID_CATEGORIES.join(", ")}.` },
      { status: 400 }
    );
  }
  if (sortParam && !VALID_SORTS.includes(sortParam as SortKey)) {
    return NextResponse.json({ error: `sort invalide. Valeurs possibles: ${VALID_SORTS.join(", ")}.` }, { status: 400 });
  }

  const limit = Math.min(Number(params.get("limit") ?? 50) || 50, 200);
  const offset = Math.max(Number(params.get("offset") ?? 0) || 0, 0);

  const articles = await listArticles({
    category: (categoryParam as Category) || undefined,
    sort: (sortParam as SortKey) || undefined,
    search: params.get("search") || undefined,
    limit,
    offset,
  });

  return NextResponse.json({ articles });
});

export const OPTIONS = publicApiOptionsHandler;
