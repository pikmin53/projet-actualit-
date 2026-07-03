# 🌍 Globe Actu

Visualisation en direct de l'actualité mondiale sur un **globe 3D animé** : chaque actualité
géolocalisée apparaît comme un point sur le globe, coloré par catégorie et dimensionné par
popularité. Une liste filtrable/triable est synchronisée avec le globe, chaque article a une
page de détail avec résumé et interprétation neutre multi-sources, et une page "Tendances"
montre l'évolution hebdomadaire de l'activité par catégorie.

100% gratuit à faire tourner : pas de clé API ni de modèle payant requis pour démarrer.

## Fonctionnalités

- 🌐 **Globe animé** (`react-globe.gl`) — la caméra vole vers le lieu de l'actualité
  sélectionnée, dans la liste comme sur le globe.
- 📰 **Liste d'actualités** filtrable par catégorie (environnement, technologie, politique,
  économique, cyberattaques) et triable par popularité ou date, avec recherche texte.
- 🛡️ **Veille cyberattaques** : catégorie dédiée alimentée par des sources spécialisées
  (BleepingComputer, The Hacker News, CERT-FR...) ; les attaques à fort impact (services que
  vous utilisez, conséquences nationales, grands pays) sont boostées dans le classement —
  liste de veille personnalisable dans
  [data/sources/cyber-watchlist.json](data/sources/cyber-watchlist.json).
- 📄 **Page article** : résumé automatique, bloc "Interprétation IA" (comparaison neutre des
  sources couvrant le même évènement, avec disclaimer explicite), liste des sources.
- 📈 **Page Tendances** : courbes hebdomadaires du nombre d'articles par catégorie, pour
  repérer les pics d'activité.
- 🔌 **API publique** `/api/v1/*` (CORS + clé API optionnelle + rate limiting) — voir
  [docs/api.md](docs/api.md) : une autre application peut consommer les données directement.
- 🧩 **Modèles de résumé/interprétation interchangeables** sans changer de code (variables
  d'environnement) — voir [docs/strategie/resume-et-interpretation.md](docs/strategie/resume-et-interpretation.md).
- 100% **local et gratuit** par défaut : pas de clé LLM payante, résumé/interprétation par
  heuristiques locales.

## Stack technique

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Prisma + PostgreSQL +
`react-globe.gl` + `recharts`. Détail et justification des choix dans
[docs/strategie/](docs/strategie/).

## Démarrage rapide (Docker — recommandé)

Prérequis : Docker avec le plugin compose. Sous NixOS : `virtualisation.docker.enable = true;`
dans la configuration système, puis ajouter l'utilisateur au groupe `docker`.

```bash
docker compose up -d --build
```

C'est tout : la base PostgreSQL est créée, les migrations appliquées, l'app servie sur
http://localhost:3000 et l'ingestion relancée toutes les 20 minutes (`INGEST_INTERVAL_SECONDS`
pour changer le rythme). Depuis un smartphone sur le même réseau : `http://<ip-machine>:3000`.
Les clés optionnelles se mettent dans un fichier `.env` (voir [.env.example](.env.example)).

## Démarrage manuel (sans Docker)

Prérequis : Node.js 20+ et un PostgreSQL accessible (ex. le service `db` de docker compose,
ou une base managée gratuite type Neon/Supabase).

```bash
npm install
cp .env.example .env          # renseigner DATABASE_URL (PostgreSQL)
npx prisma migrate deploy     # applique les migrations
npm run ingest                # récupère de vraies actus (RSS + Google News + GDELT)
npm run dev                   # http://localhost:3000
```

Sans aucune clé API configurée, l'app fonctionne déjà pleinement (flux RSS + Google News RSS
+ GDELT + résumé/interprétation locaux). Les clés `NEWSAPI_KEY`/`GNEWS_KEY` sont
optionnelles, pour enrichir la couverture.

## Variables d'environnement

Voir [.env.example](.env.example) pour la liste complète et leur signification :
base de données, clés d'API d'actualité optionnelles, choix des providers de résumé/
interprétation, clé API publique optionnelle, origines CORS autorisées.

## Scripts npm

| Commande | Effet |
| --- | --- |
| `npm run dev` | Lance l'app en développement (http://localhost:3000) |
| `npm run build` / `npm run start` | Build puis lance l'app en production |
| `npm run ingest` | Lance une exécution d'ingestion (RSS + Google News + GDELT + API → base) |
| `npm run prisma:migrate` | Crée/applique une migration Prisma (dev) |
| `npm run typecheck` | Vérifie les types TypeScript sans compiler |
| `npm run lint` | Lint ESLint |

## Ingestion planifiée

- **Avec docker compose** : le service `ingest` relance l'ingestion toutes les 20 minutes,
  rien d'autre à configurer.
- **En cloud** : le workflow GitHub Actions (`.github/workflows/ingest.yml`) tourne toutes
  les 20 minutes — configurer dans les paramètres du dépôt GitHub le secret `DATABASE_URL`
  (une base Postgres managée), optionnellement `NEWSAPI_KEY`/`GNEWS_KEY`, et en variables de
  repo `SUMMARIZER_PROVIDER`/`INTERPRETER_PROVIDER` si différents des défauts. Si vous
  utilisez uniquement docker compose, ce workflow peut être désactivé dans l'onglet Actions.

## Déploiement en production (cloud)

1. Créer une base Postgres gratuite (ex. [Supabase](https://supabase.com) ou
   [Neon](https://neon.tech)) et récupérer son `DATABASE_URL`.
2. `npx prisma migrate deploy` avec ce `DATABASE_URL`.
3. Déployer sur [Vercel](https://vercel.com) (import du repo GitHub), en configurant les
   mêmes variables d'environnement que `.env.example` dans les paramètres du projet Vercel.
4. Configurer les secrets du repo GitHub pour que `.github/workflows/ingest.yml` alimente
   cette même base en continu.

## Architecture et documentation

- [docs/architecture.md](docs/architecture.md) + [docs/architecture.mmd](docs/architecture.mmd)
  (diagramme Mermaid) — vue d'ensemble des composants et du flux de données.
- [docs/fonctions.md](docs/fonctions.md) — référence textuelle des fonctions clés du pipeline
  (rôle, paramètres, retour).
- [docs/api.md](docs/api.md) — contrat de l'API publique `/api/v1/*`.
- [docs/strategie/](docs/strategie/) — justification de chaque choix structurant (stack,
  sources de données, géolocalisation, catégorisation, clustering, résumé/interprétation,
  popularité, neutralité/limites, ouverture de l'API publique).

## Limites connues

Le pipeline NLP repose sur des heuristiques locales et gratuites (mots-clés, gazetteer,
similarité lexicale), pas sur des modèles ML entraînés. C'est un choix délibéré documenté
dans [docs/strategie/neutralite-et-limites.md](docs/strategie/neutralite-et-limites.md), qui
liste aussi les limites assumées (couverture des sources, précision de la géolocalisation,
etc.).
