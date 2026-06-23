import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Globe Actu — l'actualité mondiale en direct",
  description: "Visualisation en direct de l'actualité mondiale sur un globe 3D animé.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            🌍 Globe Actu
          </Link>
          <nav className="flex gap-6 text-sm text-white/70">
            <Link href="/" className="hover:text-white">
              Accueil
            </Link>
            <Link href="/tendances" className="hover:text-white">
              Tendances
            </Link>
          </nav>
        </header>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
