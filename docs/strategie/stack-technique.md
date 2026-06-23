# Choix de la stack technique

## Décision

Next.js 14 (App Router) + TypeScript + Tailwind CSS, hébergé sur Vercel ; Prisma comme ORM,
SQLite en développement et Postgres (Supabase/Neon) en production.

## Pourquoi

- **Un seul repo full-stack** (pages + API) plutôt qu'un frontend et un backend séparés :
  le projet est porté par une seule personne au départ, et Next.js permet de partager les
  types et les fonctions d'accès aux données (`src/lib/db/queries.ts`) entre les pages et
  l'API publique sans duplication.
- **Vercel** est le choix d'hébergement naturel pour Next.js (déploiement zéro-config,
  niveau gratuit suffisant pour démarrer).
- **SQLite en dev / Postgres en prod** : SQLite ne demande aucune installation ni compte
  externe pour cloner le repo et le faire tourner immédiatement (`npm run ingest` crée le
  fichier `dev.db` localement). Mais SQLite ne survit pas sur les fonctions serverless de
  Vercel (système de fichiers éphémère) : la production a donc besoin d'une vraie base
  réseau. Grâce à Prisma, ce changement se résume à modifier `provider` dans
  `prisma/schema.prisma` (`"sqlite"` → `"postgresql"`) et `DATABASE_URL` — aucun code
  applicatif à changer.
- **Ingestion découplée de l'app** (script Node + GitHub Actions, pas une route Next.js) :
  le cron gratuit de Vercel est limité à une exécution par jour, insuffisant pour de
  l'actualité "en direct". GitHub Actions permet une cadence de quelques minutes,
  gratuitement, sans dépendre du plan d'hébergement de l'app.

## Compromis acceptés

- Deux endroits où la base peut tourner (SQLite local, Postgres distant) demande de garder
  le schéma Prisma simple et portable (pas de fonctionnalités spécifiques à un seul moteur).
- Le passage en production nécessite une étape manuelle (créer la base Postgres, mettre à
  jour `DATABASE_URL` et le `provider` du schéma) — documentée dans le README, pas
  automatisée, car elle implique un choix de fournisseur propre à chaque utilisateur du
  projet.
