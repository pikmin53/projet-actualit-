"use client";

import { FormEvent, useEffect, useState } from "react";

/** Forme JSON d'une source personnalisée renvoyée par /api/v1/sources. */
interface CustomSourceDTO {
  id: string;
  name: string;
  homepage: string;
  rssUrl: string;
  country: string;
  language: string;
  enabled: boolean;
  articleCount: number;
  createdAt: string;
}

/**
 * Section "Sources personnalisées" de la page Paramètres : permet d'ajouter un média en collant
 * l'URL de son flux RSS/Atom (ou de sa page d'accueil, le flux est alors autodécouvert), et de
 * gérer les sources déjà ajoutées. Les articles arrivent à la passe d'ingestion suivante.
 */
export default function CustomSourcesManager() {
  const [sources, setSources] = useState<CustomSourceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("FR");

  useEffect(() => {
    fetch("/api/v1/sources")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => setSources(data.sources ?? []))
      .catch(() => setError("Impossible de charger les sources personnalisées."))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/v1/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), name: name.trim() || undefined, country: country.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Échec de l'ajout (HTTP ${res.status}).`);
        return;
      }
      setSources((prev) => [data.source, ...prev]);
      setUrl("");
      setName("");
      setNotice(
        `Source "${data.source.name}" ajoutée. Ses articles apparaîtront à la prochaine passe d'ingestion.`
      );
    } catch {
      setError("Erreur réseau pendant l'ajout de la source.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEnabled = async (source: CustomSourceDTO) => {
    setError(null);
    const res = await fetch(`/api/v1/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !source.enabled }),
    }).catch(() => null);
    if (!res?.ok) {
      setError("Impossible de modifier cette source.");
      return;
    }
    setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, enabled: !s.enabled } : s)));
  };

  const remove = async (source: CustomSourceDTO) => {
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/v1/sources/${source.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setError("Impossible de supprimer cette source.");
      return;
    }
    const data = await res.json().catch(() => ({ outcome: "deleted" }));
    if (data.outcome === "disabled") {
      // Des articles sont déjà rattachés à cette source : elle est désactivée, pas supprimée.
      setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, enabled: false } : s)));
      setNotice(`"${source.name}" a déjà des articles ingérés : la source a été désactivée (articles conservés).`);
    } else {
      setSources((prev) => prev.filter((s) => s.id !== source.id));
    }
  };

  return (
    <section>
      <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-fg/50">Sources personnalisées</h2>
      <p className="mt-2 text-xs text-fg/60">
        Ajoutez un média en collant l&apos;URL de son flux RSS/Atom (souvent <code>/rss</code>,{" "}
        <code>/feed</code> ou <code>rss.xml</code>), ou simplement l&apos;adresse de sa page
        d&apos;accueil : le flux est détecté automatiquement quand le site le déclare. Les articles
        sont récupérés à la prochaine passe d&apos;ingestion.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-lg border border-fg/10 bg-fg/[0.03] p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.leparisien.fr ou https://feeds.leparisien.fr/leparisien/rss"
            className="flex-1 rounded-md border border-fg/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom (optionnel)"
            className="rounded-md border border-fg/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-accent sm:w-44"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="Pays"
            title="Code pays ISO à 2 lettres du média (ex: FR), utilisé comme position de repli sur le globe"
            className="rounded-md border border-fg/15 bg-transparent px-3 py-2 text-center text-sm uppercase outline-none focus:border-accent sm:w-16"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md border border-accent px-4 py-2 text-sm text-accent transition hover:bg-accent/10 disabled:opacity-50"
          >
            {submitting ? "Vérification…" : "Ajouter"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {notice && <p className="text-xs text-accent">{notice}</p>}
      </form>

      <ul className="mt-4 flex flex-col gap-2">
        {loading && <li className="text-xs text-fg/50">Chargement…</li>}
        {!loading && sources.length === 0 && (
          <li className="text-xs text-fg/50">Aucune source personnalisée pour l&apos;instant.</li>
        )}
        {sources.map((source) => (
          <li
            key={source.id}
            className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-fg/10 px-4 py-3 ${
              source.enabled ? "bg-fg/[0.03]" : "bg-fg/[0.01] opacity-60"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{source.name}</span>
                <span className="rounded border border-fg/15 px-1.5 text-[10px] uppercase text-fg/50">
                  {source.country}
                </span>
                {!source.enabled && <span className="text-[10px] uppercase text-fg/40">désactivée</span>}
              </div>
              <p className="truncate text-xs text-fg/50">{source.rssUrl}</p>
            </div>
            <span className="text-xs text-fg/50">
              {source.articleCount} article{source.articleCount > 1 ? "s" : ""}
            </span>
            <button
              onClick={() => toggleEnabled(source)}
              className="text-xs text-fg/70 underline-offset-2 hover:underline"
            >
              {source.enabled ? "Désactiver" : "Réactiver"}
            </button>
            <button onClick={() => remove(source)} className="text-xs text-red-400 underline-offset-2 hover:underline">
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
