/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sortie autonome (server.js + node_modules minimal) pour l'image Docker "runner".
  output: "standalone",
};

module.exports = nextConfig;
