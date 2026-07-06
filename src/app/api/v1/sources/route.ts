import { NextRequest, NextResponse } from "next/server";
import { withPublicApi, publicApiOptionsHandler } from "@/lib/api/withPublicApi";
import { discoverFeed, isHttpUrl } from "@/lib/ingestion/discoverFeed";
import { createCustomSource, findSourceByRssUrl, listCustomSources } from "@/lib/db/queries";

/**
 * GET /api/v1/sources
 * Liste les sources personnalisées (ajoutées via la page Paramètres), actives ou non,
 * avec leur nombre d'articles ingérés. Voir docs/api.md.
 */
export const GET = withPublicApi(async () => {
  const sources = await listCustomSources();
  return NextResponse.json({
    sources: sources.map((s) => ({
      id: s.id,
      name: s.name,
      homepage: s.homepage,
      rssUrl: s.rssUrl,
      country: s.country,
      language: s.language,
      enabled: s.enabled,
      articleCount: s._count.articles,
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

/**
 * POST /api/v1/sources
 * Ajoute une source personnalisée à partir d'une URL : soit l'URL d'un flux RSS/Atom, soit la
 * page d'accueil d'un média (le flux est alors autodécouvert dans le HTML). La source sera
 * interrogée à chaque passe d'ingestion suivante — les articles n'apparaissent donc pas
 * immédiatement.
 * Body JSON : { url: string, name?: string, country?: string ("FR"...), language?: string ("fr"...) }.
 */
export const POST = withPublicApi(async (req: NextRequest) => {
  const body = (await req.json().catch(() => null)) as {
    url?: unknown;
    name?: unknown;
    country?: unknown;
    language?: unknown;
  } | null;

  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url || !isHttpUrl(url)) {
    return NextResponse.json({ error: "url manquante ou invalide (http/https attendu)." }, { status: 400 });
  }

  const discovered = await discoverFeed(url);
  if (!discovered) {
    return NextResponse.json(
      {
        error:
          "Aucun flux RSS/Atom exploitable trouvé à cette adresse. Collez l'URL directe du flux " +
          "du média (souvent /rss, /feed ou rss.xml). Les API propriétaires ne sont pas prises en " +
          "charge par ce formulaire : elles demandent un fetcher dédié (voir docs/strategie/extension-sources.md).",
      },
      { status: 422 }
    );
  }

  const existing = await findSourceByRssUrl(discovered.rssUrl);
  if (existing) {
    return NextResponse.json(
      { error: `Ce flux est déjà suivi par la source "${existing.name}".` },
      { status: 409 }
    );
  }

  const name =
    (typeof body?.name === "string" && body.name.trim().slice(0, 80)) ||
    discovered.title ||
    new URL(discovered.rssUrl).hostname;
  const country =
    typeof body?.country === "string" && /^[A-Za-z]{2}$/.test(body.country.trim())
      ? body.country.trim().toUpperCase()
      : "ZZ";
  const language =
    (typeof body?.language === "string" && /^[A-Za-z]{2}$/.test(body.language.trim())
      ? body.language.trim().toLowerCase()
      : null) ??
    discovered.language?.slice(0, 2).toLowerCase() ??
    "fr";

  const source = await createCustomSource({
    name,
    homepage: discovered.homepage ?? new URL(discovered.rssUrl).origin,
    rssUrl: discovered.rssUrl,
    country,
    language,
  });

  return NextResponse.json(
    {
      source: {
        id: source.id,
        name: source.name,
        homepage: source.homepage,
        rssUrl: source.rssUrl,
        country: source.country,
        language: source.language,
        enabled: source.enabled,
        articleCount: 0,
        createdAt: source.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
});

export const OPTIONS = publicApiOptionsHandler;
