"use client";

import { useEffect, useState } from "react";
import CustomSourcesManager from "@/components/parametres/CustomSourcesManager";

const STORAGE_KEY = "globe-actu-theme";

/** Les thèmes disponibles : identifiant (attribut data-theme), libellé et aperçu de palette. */
const THEMES = [
  {
    id: "sombre",
    label: "Sombre",
    description: "Le thème d'origine : bleu nuit et néon cyan, pensé pour le globe.",
    swatches: ["#05070d", "#e7ebf3", "#22d3ee"],
  },
  {
    id: "jour",
    label: "Jour",
    description: "Fond clair et texte encre, pour les environnements lumineux.",
    swatches: ["#f3f5fa", "#141c2e", "#0284c7"],
  },
  {
    id: "pride",
    label: "Pride",
    description:
      "L'arc-en-ciel partout : titre en dégradé, fond irisé, et chaque pays du globe aux couleurs du drapeau. 🏳️‍🌈",
    swatches: ["#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982"],
  },
  {
    id: "hacker",
    label: "Vert hacker",
    description: "Vert phosphore sur noir, police monospace. Wake up, Neo.",
    swatches: ["#020803", "#86efac", "#00ff88"],
  },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

/** Page Paramètres : choix du thème de couleur, persisté en localStorage. */
export default function ParametresPage() {
  const [theme, setTheme] = useState<ThemeId>("sombre");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (THEMES.some((t) => t.id === saved)) setTheme(saved as ThemeId);
  }, []);

  const applyTheme = (id: ThemeId) => {
    setTheme(id);
    localStorage.setItem(STORAGE_KEY, id);
    document.documentElement.dataset.theme = id;
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Paramètres</h1>

      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-fg/50">Thème de couleur</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {THEMES.map((t) => {
          const active = t.id === theme;
          return (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className={`rounded-lg border p-4 text-left transition ${
                active ? "border-accent bg-fg/10" : "border-fg/10 bg-fg/[0.03] hover:bg-fg/[0.06]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.label}</span>
                {active && <span className="text-xs text-accent">✓ actif</span>}
              </div>
              <div className="mt-2 flex gap-1.5">
                {t.swatches.map((color) => (
                  <span
                    key={color}
                    className="h-5 w-5 rounded-full border border-fg/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-fg/60">{t.description}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-fg/40">
        Le thème est enregistré dans ce navigateur (localStorage) et appliqué instantanément à
        toutes les pages.
      </p>

      <CustomSourcesManager />
    </div>
  );
}
