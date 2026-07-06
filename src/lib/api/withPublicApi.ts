import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "./auth";
import { buildCorsHeaders } from "./cors";
import { checkRateLimit, getClientIp } from "./rateLimit";

/**
 * Enveloppe un handler de route `/api/v1/*` pour lui appliquer de façon uniforme : CORS,
 * authentification optionnelle par clé API, limite de débit, et gestion d'erreur générique.
 * Évite de dupliquer cette logique dans chaque fichier `route.ts`.
 * @param handler Le handler réel de la route, qui peut se concentrer sur la logique métier.
 *                Reçoit aussi le contexte Next.js (`{ params }` des routes dynamiques).
 * @returns Un handler Next.js prêt à être exporté comme `GET`/`POST`/... depuis un `route.ts`.
 */
export function withPublicApi<Context = unknown>(
  handler: (req: NextRequest, context: Context) => Promise<NextResponse>
) {
  return async function (req: NextRequest, context: Context) {
    const cors = buildCorsHeaders(req.headers.get("origin"));

    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: "Unauthorized: header x-api-key manquant ou invalide." },
        { status: 401, headers: cors }
      );
    }

    const ip = getClientIp(req.headers);
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { ...cors, "Retry-After": String(rate.retryAfterSeconds ?? 60) } }
      );
    }

    try {
      const response = await handler(req, context);
      for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
      return response;
    } catch (error) {
      console.error("[withPublicApi] erreur non gérée:", error);
      return NextResponse.json({ error: "Internal server error." }, { status: 500, headers: cors });
    }
  };
}

/** Réponse standard à une requête `OPTIONS` (préflight CORS) pour une route `/api/v1/*`. */
export function publicApiOptionsHandler(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req.headers.get("origin")) });
}
