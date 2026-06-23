import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#05070d",
        surface: "#0d1220",
        accent: "#3ddc97",
        environnement: "#3ddc97",
        technologie: "#5aa9ff",
        politique: "#f2a93b",
        economique: "#e0577a",
      },
    },
  },
  plugins: [],
};

export default config;
