import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Couleurs sémantiques pilotées par le thème actif (voir globals.css et /parametres).
        // "fg" remplace "white" partout : texte, bordures et surfaces via opacités (fg/10, fg/60...).
        fg: "rgb(var(--fg) / <alpha-value>)",
        base: "rgb(var(--bg) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        environnement: "#3ddc97",
        technologie: "#5aa9ff",
        politique: "#f2a93b",
        economique: "#e0577a",
        cybersecurite: "#d946ef",
        science: "#818cf8",
      },
    },
  },
  plugins: [],
};

export default config;
