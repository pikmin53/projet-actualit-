"use client";

import { useEffect, useRef, useState } from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type ReactGlobeGl from "react-globe.gl";
import { CATEGORY_COLORS } from "@/lib/categoryColors";

/** Point géolocalisé représentant un article sur le globe. */
export interface GlobePoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: string;
  popularityScore: number;
}

interface NewsGlobeProps {
  points: GlobePoint[];
  selectedId?: string | null;
  onSelectPoint: (id: string) => void;
}

/**
 * Globe 3D animé : un point par article géolocalisé, coloré par catégorie et dimensionné selon
 * la popularité. La caméra vole automatiquement vers le point sélectionné (`selectedId`), pour
 * rester synchronisée avec la liste d'actualités affichée à côté.
 *
 * Deux subtilités d'intégration avec Next.js / une mise en page non plein-écran :
 * - `react-globe.gl` utilise `window`/WebGL et doit donc être chargé uniquement côté client.
 *   On l'importe via un `import()` dynamique dans un `useEffect` plutôt que via
 *   `next/dynamic({ ssr: false })` : ce dernier ne transmet pas correctement le `ref`
 *   (nécessaire pour piloter la caméra avec `pointOfView`) à travers son wrapper `LoadableComponent`.
 * - Sans `width`/`height` explicites, la librairie dimensionne son canvas sur la fenêtre entière
 *   plutôt que sur son conteneur, ce qui le fait déborder sur la colonne de droite (liste
 *   d'actualités) et intercepter ses clics. On mesure donc le conteneur via `ResizeObserver` et
 *   on passe `width`/`height` explicitement.
 */
export default function NewsGlobe({ points, selectedId, onSelectPoint }: NewsGlobeProps) {
  const [GlobeComponent, setGlobeComponent] = useState<typeof ReactGlobeGl | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    import("react-globe.gl").then((mod) => setGlobeComponent(mod.default));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedId || !globeRef.current) return;
    const point = points.find((p) => p.id === selectedId);
    if (point) {
      globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.6 }, 1000);
    }
  }, [selectedId, points]);

  const Globe = GlobeComponent;

  return (
    <div ref={containerRef} className="h-full w-full">
      {Globe && size.width > 0 && size.height > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundColor="rgba(0,0,0,0)"
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={(p: object) => CATEGORY_COLORS[(p as GlobePoint).category] ?? CATEGORY_COLORS.autre}
          pointAltitude={(p: object) => 0.02 + Math.min((p as GlobePoint).popularityScore, 10) / 100}
          pointRadius={(p: object) => ((p as GlobePoint).id === selectedId ? 0.6 : 0.35)}
          pointLabel={(p: object) => (p as GlobePoint).title}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPointClick={(p: any) => onSelectPoint(p.id)}
        />
      )}
    </div>
  );
}
