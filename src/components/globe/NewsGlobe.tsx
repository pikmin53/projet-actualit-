"use client";

import { useEffect, useRef, useState } from "react";
 
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
  /** Vrai si l'évènement est en cours d'emballement médiatique (anneau rouge pulsant). */
  breaking?: boolean;
}

interface NewsGlobeProps {
  points: GlobePoint[];
  selectedId?: string | null;
  onSelectPoint: (id: string) => void;
}

/** Palette du globe pour chaque thème de l'app (voir /parametres et globals.css). */
interface GlobePalette {
  sphere: string;
  land: string;
  atmosphere: string;
  /** Pride : chaque pays prend une couleur du drapeau arc-en-ciel. 🏳️‍🌈 */
  rainbowLand?: boolean;
}

const GLOBE_PALETTES: Record<string, GlobePalette> = {
  sombre: { sphere: "#0b1026", land: "rgba(34, 211, 238, 0.55)", atmosphere: "#22d3ee" },
  jour: { sphere: "#dce7f5", land: "rgba(29, 78, 216, 0.65)", atmosphere: "#0284c7" },
  pride: { sphere: "#160826", land: "rgba(236, 72, 153, 0.6)", atmosphere: "#ec4899", rainbowLand: true },
  hacker: { sphere: "#02120a", land: "rgba(0, 255, 136, 0.5)", atmosphere: "#00ff88" },
};

/** Drapeau arc-en-ciel (6 bandes), légèrement translucide pour garder les points lisibles. */
const RAINBOW_LAND = ["#e40303dd", "#ff8c00dd", "#ffed00dd", "#008026dd", "#24408edd", "#732982dd"];

/** Couleur arc-en-ciel stable pour un pays donné (hash de son nom → une des 6 bandes). */
function rainbowColorFor(feature: object): string {
  const name = String((feature as { properties?: { SOVEREIGNT?: string } }).properties?.SOVEREIGNT ?? "");
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return RAINBOW_LAND[Math.abs(hash) % RAINBOW_LAND.length];
}

/** Lit le thème actif sur <html data-theme> et suit ses changements (page Paramètres). */
function useActiveTheme(): string {
  const [theme, setTheme] = useState("sombre");
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setTheme(el.dataset.theme ?? "sombre");
    read();
    const observer = new MutationObserver(read);
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/**
 * Globe 3D animé : un point par article géolocalisé, coloré par catégorie et dimensionné selon
 * la popularité. La caméra vole automatiquement vers le point sélectionné (`selectedId`), pour
 * rester synchronisée avec la liste d'actualités affichée à côté.
 *
 * Rendu "néon" : sphère + continents en hexagones (GeoJSON servi depuis public/geo/, aucune
 * dépendance réseau externe) + halo atmosphérique, aux couleurs du thème actif de l'app
 * (GLOBE_PALETTES ; en pride, chaque pays prend une bande du drapeau arc-en-ciel). Si le
 * GeoJSON ne charge pas, on retombe sur la texture satellite nocturne d'origine, qui reste
 * lisible. Quand aucune localisation n'est sélectionnée, le globe tourne lentement sur lui-même.
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
   
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // null = chargement en cours, [] = échec (bascule sur la texture), sinon features GeoJSON.
  const [landPolygons, setLandPolygons] = useState<object[] | null>(null);
  const theme = useActiveTheme();
  const palette = GLOBE_PALETTES[theme] ?? GLOBE_PALETTES.sombre;

  useEffect(() => {
    import("react-globe.gl").then((mod) => setGlobeComponent(mod.default));
  }, []);

  useEffect(() => {
    fetch("/geo/countries-110m.geojson")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((geojson) => setLandPolygons(geojson.features ?? []))
      .catch((error) => {
        console.error("[NewsGlobe] GeoJSON des pays indisponible, repli sur la texture:", error);
        setLandPolygons([]);
      });
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

  // Rotation passive : active tant qu'aucune localisation n'est affichée, coupée dès qu'un
  // point est sélectionné pour ne pas dériver hors de la zone visée par la caméra.
  // L'instance globe.gl n'est pas disponible immédiatement après le montage (import dynamique
  // + initialisation WebGL) et onGlobeReady n'est pas fiable selon les versions : on réessaie
  // via requestAnimationFrame jusqu'à ce que les contrôles répondent.
  const useNeonTheme = landPolygons !== null && landPolygons.length > 0;
  useEffect(() => {
    let cancelled = false;
    const setup = () => {
      if (cancelled) return;
      const globe = globeRef.current;
      if (globe?.controls) {
        const controls = globe.controls();
        controls.autoRotate = !selectedId;
        controls.autoRotateSpeed = 0.6;
        if (useNeonTheme && globe.globeMaterial) {
          globe.globeMaterial().color.set(palette.sphere);
        }
        return;
      }
      requestAnimationFrame(setup);
    };
    setup();
    return () => {
      cancelled = true;
    };
  }, [GlobeComponent, landPolygons, size, selectedId, useNeonTheme, palette]);

  const Globe = GlobeComponent;
  // Anneaux pulsants : rouge sur les évènements "breaking", couleur de catégorie sur la sélection.
  const ringPoints = points.filter((p) => p.breaking || p.id === selectedId);

  return (
    <div ref={containerRef} className="h-full w-full">
      {Globe && size.width > 0 && size.height > 0 && landPolygons !== null && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          globeImageUrl={useNeonTheme ? null : "//unpkg.com/three-globe/example/img/earth-night.jpg"}
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor={palette.atmosphere}
          atmosphereAltitude={0.2}
          hexPolygonsData={useNeonTheme ? landPolygons : []}
          hexPolygonResolution={3}
          hexPolygonMargin={0.65}
          hexPolygonColor={palette.rainbowLand ? rainbowColorFor : () => palette.land}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={(p: object) => CATEGORY_COLORS[(p as GlobePoint).category] ?? CATEGORY_COLORS.autre}
          pointAltitude={(p: object) => 0.02 + Math.min((p as GlobePoint).popularityScore, 10) / 100}
          pointRadius={(p: object) => ((p as GlobePoint).id === selectedId ? 0.6 : 0.35)}
          pointLabel={(p: object) => (p as GlobePoint).title}
           
          onPointClick={(p: any) => onSelectPoint(p.id)}
          ringsData={ringPoints}
          ringLat="lat"
          ringLng="lng"
          ringColor={(p: object) => {
            const point = p as GlobePoint;
            if (point.breaking && point.id !== selectedId) return "#ff4d4d";
            return CATEGORY_COLORS[point.category] ?? palette.atmosphere;
          }}
          ringMaxRadius={4}
          ringPropagationSpeed={2}
          ringRepeatPeriod={900}
        />
      )}
    </div>
  );
}
