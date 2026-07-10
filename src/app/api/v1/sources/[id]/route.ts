import { NextRequest, NextResponse } from "next/server";
import { withPublicApi, publicApiOptionsHandler } from "@/lib/api/withPublicApi";
import { deleteCustomSource, setCustomSourceEnabled } from "@/lib/db/queries";

// Promise depuis Next 15 : les paramètres de route se résolvent de façon asynchrone.
type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/v1/sources/:id
 * Active/désactive une source personnalisée (une source désactivée n'est plus interrogée à
 * l'ingestion, ses articles déjà ingérés restent visibles). Body JSON : { enabled: boolean }.
 */
export const PATCH = withPublicApi<RouteContext>(async (req: NextRequest, { params }) => {
  const body = (await req.json().catch(() => null)) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Body attendu : { enabled: boolean }." }, { status: 400 });
  }

  const { id } = await params;
  const source = await setCustomSourceEnabled(id, body.enabled);
  if (!source) {
    return NextResponse.json({ error: "Source personnalisée introuvable." }, { status: 404 });
  }
  return NextResponse.json({ source: { id: source.id, enabled: source.enabled } });
});

/**
 * DELETE /api/v1/sources/:id
 * Supprime une source personnalisée. Si des articles lui sont déjà rattachés, elle est
 * désactivée au lieu d'être supprimée (les articles ingérés sont conservés).
 * Réponse : { outcome: "deleted" | "disabled" }.
 */
export const DELETE = withPublicApi<RouteContext>(async (_req: NextRequest, { params }) => {
  const { id } = await params;
  const outcome = await deleteCustomSource(id);
  if (!outcome) {
    return NextResponse.json({ error: "Source personnalisée introuvable." }, { status: 404 });
  }
  return NextResponse.json({ outcome });
});

export const OPTIONS = publicApiOptionsHandler;
