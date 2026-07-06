/**
 * Enrichissement du contenu des articles : les flux RSS/API ne fournissent souvent qu'un titre
 * et un chapeau de 1-2 phrases, ce qui donne des résumés très pauvres. Pour les articles trop
 * courts, on va chercher la page de l'article et on en extrait les paragraphes textuels
 * (heuristique sans dépendance : balises <p> nettoyées), afin que le résumé extractif et
 * l'interprétation aient une vraie matière à travailler.
 */

/** En-dessous de cette longueur de contenu brut, on tente d'enrichir depuis la page. */
export const ENRICH_MIN_CONTENT_LENGTH = 500;
/** Longueur maximale du texte extrait (aligné sur MAX_RAW_CONTENT_LENGTH de normalize.ts). */
const MAX_EXTRACTED_LENGTH = 4000;
/** Un paragraphe plus court que cela est ignoré (menus, mentions légales, boutons...). */
const MIN_PARAGRAPH_LENGTH = 80;
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "Mozilla/5.0 (compatible; GlobeActu/0.1; open source news aggregator)";

/** Décode les entités HTML courantes d'un texte extrait. */
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&rsquo;|&#8217;/g, "'")
    .replace(/&laquo;|&#171;/g, "«")
    .replace(/&raquo;|&#187;/g, "»")
    .replace(/&[a-z]+;|&#\d+;/g, " ");
}

/** Extrait les paragraphes texte d'une page HTML (sans scripts/styles), concaténés et bornés. */
export function extractParagraphs(html: string): string {
  let withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Si la page balise son contenu principal (<article>), on s'y restreint : cela écarte les
  // menus, pieds de page et encarts "à lire aussi" qui pollueraient le résumé.
  const articleBlock = withoutNoise.match(/<article[\s\S]*?<\/article>/i);
  if (articleBlock && articleBlock[0].length > 500) {
    withoutNoise = articleBlock[0];
  }

  const paragraphs: string[] = [];
  let total = 0;
  for (const match of withoutNoise.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = decodeEntities(match[1].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < MIN_PARAGRAPH_LENGTH) continue;
    paragraphs.push(text);
    total += text.length;
    if (total >= MAX_EXTRACTED_LENGTH) break;
  }
  return paragraphs.join(" ").slice(0, MAX_EXTRACTED_LENGTH);
}

/**
 * Récupère le corps textuel d'un article depuis sa page web.
 * @param url URL de l'article.
 * @returns Le texte extrait (paragraphes concaténés), ou `null` si la page est inaccessible,
 *          non-HTML, ou sans contenu textuel exploitable.
 */
export async function fetchArticleBody(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const html = await response.text();
    const body = extractParagraphs(html);
    return body.length >= MIN_PARAGRAPH_LENGTH * 2 ? body : null;
  } catch {
    // Paywall, timeout, TLS exotique... l'enrichissement est un bonus, jamais bloquant.
    return null;
  }
}
