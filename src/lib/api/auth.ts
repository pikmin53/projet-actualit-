import type { NextRequest } from "next/server";

/**
 * Vérifie l'authentification d'une requête vers l'API publique `/api/v1/*`.
 * Si la variable d'environnement PUBLIC_API_KEY est définie, le header `x-api-key` doit
 * correspondre exactement. Si elle n'est pas définie, l'API reste ouverte (pratique en dev,
 * sécurisable en production sans changer le code). Voir docs/api.md.
 * @param request Requête entrante.
 * @returns `true` si la requête est autorisée à continuer.
 */
export function isAuthorized(request: NextRequest): boolean {
  const requiredKey = process.env.PUBLIC_API_KEY;
  if (!requiredKey) return true;
  return request.headers.get("x-api-key") === requiredKey;
}
