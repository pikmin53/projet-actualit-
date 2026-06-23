import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "./auth";
import { buildCorsHeaders } from "./cors";
import { checkRateLimit, getClientIp } from "./rateLimit";

/**
 * Enveloppe un handler de route `/api/v1/*` pour lui appliquer de façon uniforme : CORS,
 * authentification optionnelle par clé API, limite de débit, et gestion d'erreur générique.
 * Évite de dupliquer cette logique dans chaque fichier `route.ts`.
 * @param handler Le handler GET réel de la route, qui peut se concentrer sur la logique métier.
 * @returns Un handler Next.js prêt à être exporté comme `GET` depuis un `route.ts`.
 */
export function withPublicApi(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async function (req: NextRequest) {
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
      const response = await handler(req);
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
