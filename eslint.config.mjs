import coreWebVitals from "eslint-config-next/core-web-vitals";

// ESLint 9 (flat config) : eslint-config-next >= 16 exporte nativement ses presets flat.
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...coreWebVitals,
  {
    rules: {
      // Nouvelle règle react-hooks v7, incompatible avec le pattern setLoading(true) de nos
      // effets de fetch (pages d'accueil/tendances/paramètres). À réévaluer si on refactore
      // ces effets vers un vrai gestionnaire de données.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
