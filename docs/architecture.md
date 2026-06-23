# Architecture

Diagramme complet : [architecture.mmd](./architecture.mmd) (à ouvrir avec un visualiseur Mermaid,
ou directement rendu par GitHub).

## Vue d'ensemble

Le projet a trois grandes parties qui ne tournent pas au même endroit ni au même rythme :

1. **Ingestion** (`scripts/ingest.ts`) — un script Node autonome, lancé en local ou par
   GitHub Actions toutes les 20 minutes. Il récupère les actualités, les enrichit (lieu,
   catégorie, résumé, interprétation, popularité) et les écrit en base.
2. **Base de données** — Prisma + SQLite en dev, Postgres en production (voir
   [strategie/stack-technique.md](./strategie/stack-technique.md)). Source de vérité unique,
   lue à la fois par l'app Next.js et potentiellement par des applications tierces.
3. **Application Next.js** — déployée sur Vercel. Expose :
   - des **pages** (Accueil, Article, Tendances) qui lisent la base via les mêmes fonctions
     que l'API (`src/lib/db/queries.ts`) ;
   - une **API publique** `/api/v1/*` (voir [api.md](./api.md)), conçue pour être consommée
     aussi bien par le frontend du projet que par une application tierce.

## Pourquoi découpler l'ingestion de l'application web

Vercel (hébergement choisi) exécute l'app comme des fonctions serverless : pas de processus
long-running, et le cron gratuit ("Hobby") est limité à une exécution par jour — insuffisant
pour de l'actualité "en direct". L'ingestion est donc un script indépendant, déclenché par
GitHub Actions (gratuit, cadence flexible), qui écrit dans la même base que l'app lit. L'app
elle-même reste un simple lecteur + une petite API, ce qui la garde rapide et stateless.

## Flux de données (résumé du diagramme)

```
RSS + API gratuite → fetch → normalize/dedupe → geolocate → categorize → cluster
  → résumé (SummarizerProvider) → interprétation (InterpreterProvider) → popularité
  → écriture en base (Prisma)
       ↓
/api/v1/* (lu par les pages Next.js ET par toute application tierce autorisée)
```

## Fichiers clés

| Rôle | Fichier |
| --- | --- |
| Entrée de l'ingestion | `scripts/ingest.ts` |
| Schéma de données | `prisma/schema.prisma` |
| Pipeline NLP (catégorisation, géoloc, clustering, popularité) | `src/lib/nlp/*.ts` |
| Providers interchangeables (résumé, interprétation) | `src/lib/nlp/providers/*.ts` |
| Accès base (lecture + écriture) | `src/lib/db/queries.ts` |
| Sécurité/transport de l'API publique | `src/lib/api/*.ts` |
| Routes API publiques | `src/app/api/v1/**/route.ts` |
| Pages | `src/app/page.tsx`, `src/app/article/[id]/page.tsx`, `src/app/tendances/page.tsx` |
| Ingestion planifiée | `.github/workflows/ingest.yml` |
