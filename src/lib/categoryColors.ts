/**
 * Couleur associée à chaque catégorie, utilisée par le globe, les badges et les graphes.
 * Module sans "use client" volontairement : un composant serveur (ex. la page article) doit
 * pouvoir lire ces valeurs directement, ce qui est interdit pour les exports d'un module client.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  environnement: "#3ddc97",
  technologie: "#5aa9ff",
  politique: "#f2a93b",
  economique: "#e0577a",
  cybersecurite: "#d946ef",
  science: "#818cf8",
  autre: "#9aa0ad",
};
