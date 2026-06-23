/**
 * Limite de débit volontairement simple (en mémoire, par instance serverless) pour décourager
 * les abus sur l'API publique sans dépendance externe (Redis, etc.). Sur Vercel, chaque instance
 * serverless a son propre compteur : la limite réelle peut donc être plus haute que la valeur
 * configurée si plusieurs instances tournent en parallèle. Limitation connue, voir docs/api.md.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

const hits = new Map<string, { count: number; windowStart: number }>();

/**
 * Vérifie et enregistre une requête pour une IP donnée.
 * @param ip Identifiant du client (généralement l'adresse IP).
 * @returns `{ allowed: false, retryAfterSeconds }` si la limite est dépassée, sinon `{ allowed: true }`.
 */
export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
}

/** Extrait une IP client raisonnable depuis les en-têtes d'une requête Next.js. */
export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown";
}
