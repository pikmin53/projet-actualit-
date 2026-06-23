/**
 * Construit les en-têtes CORS à appliquer aux réponses de l'API publique `/api/v1/*`, pour
 * permettre à une autre application (autre domaine) de l'interroger directement depuis un
 * navigateur. Contrôlé par ALLOWED_ORIGINS ("*" par défaut). Voir docs/api.md.
 * @param requestOrigin En-tête `Origin` de la requête entrante, si présent.
 * @returns Un objet d'en-têtes à fusionner dans la réponse.
 */
export function buildCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "*").split(",").map((o) => o.trim());

  const allowOrigin =
    allowedOrigins.includes("*") ? "*" : requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : "";

  return {
    ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}
