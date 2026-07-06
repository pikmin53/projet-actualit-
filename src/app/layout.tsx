import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Globe Actu — l'actualité mondiale en direct",
  description: "Visualisation en direct de l'actualité mondiale sur un globe 3D animé.",
};

/**
 * Applique le thème persisté avant la première peinture (évite le "flash" du thème par défaut).
 * Doit rester un script inline synchrone dans <head> — voir /parametres pour le choix du thème.
 */
const THEME_INIT_SCRIPT = `
try {
  var theme = localStorage.getItem("globe-actu-theme");
  if (["sombre", "jour", "pride", "hacker"].includes(theme)) {
    document.documentElement.dataset.theme = theme;
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <header className="flex items-center justify-between border-b border-fg/10 px-6 py-4">
          <Link href="/" className="site-title text-lg font-semibold tracking-tight">
            🌍 Globe Actu
          </Link>
          <nav className="flex gap-6 text-sm text-fg/70">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <Link href="/tendances" className="hover:text-fg">
              Tendances
            </Link>
            <Link href="/parametres" className="hover:text-fg">
              ⚙ Paramètres
            </Link>
          </nav>
        </header>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
