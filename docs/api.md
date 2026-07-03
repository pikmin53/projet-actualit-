# API publique `/api/v1/*`

Cette API est conçue pour être consommée à la fois par le frontend de Globe Actu et par
**n'importe quelle application tierce**. Voir
[strategie/api-publique.md](./strategie/api-publique.md) pour les choix de conception
(authentification optionnelle, CORS, limite de débit).

## Authentification (optionnelle)

Si la variable d'environnement `PUBLIC_API_KEY` est définie côté serveur, toutes les requêtes
doivent inclure le header :

```
x-api-key: <valeur de PUBLIC_API_KEY>
```

Sans cette variable définie, l'API est ouverte (pas de header requis).

## CORS

Contrôlé par `ALLOWED_ORIGINS` (`*` par défaut = toute origine autorisée). Chaque réponse
inclut les headers `Access-Control-Allow-*` correspondants ; chaque route répond aussi à
`OPTIONS` pour le preflight CORS.

## Limite de débit

60 requêtes / minute / IP, appliquée en mémoire par instance serverless (voir limite connue
dans [strategie/api-publique.md](./strategie/api-publique.md)). Une réponse `429` inclut un
header `Retry-After` (en secondes).

## Erreurs

Toutes les erreurs renvoient `{ "error": "message" }` avec un code HTTP approprié
(`400` paramètre invalide, `401` clé API invalide, `404` ressource introuvable, `429` quota
dépassé, `500` erreur serveur).

---

## `GET /api/v1/articles`

Liste les articles, filtrables et triables.

| Paramètre | Type | Description |
| --- | --- | --- |
| `category` | string | `environnement` \| `technologie` \| `politique` \| `economique` \| `autre`. Omis = toutes. |
| `sort` | string | `popularity` (défaut) ou `date`. |
| `search` | string | Recherche texte sur titre, résumé, lieu. |
| `limit` | number | Défaut 50, max 200. |
| `offset` | number | Défaut 0 (pagination). |

Réponse :

```json
{
  "articles": [
    {
      "id": "...",
      "title": "...",
      "url": "https://...",
      "summary": "...",
      "category": "technologie",
      "countryCode": "FR",
      "locationLabel": "Paris, France",
      "lat": 48.8566,
      "lng": 2.3522,
      "popularityScore": 3.5,
      "breaking": false,
      "publishedAt": "2026-06-20T10:00:00.000Z",
      "source": { "id": "...", "name": "Le Monde", "homepage": "...", "country": "FR", "language": "fr" }
    }
  ]
}
```

## `GET /api/v1/articles/:id`

Renvoie un article avec sa source et son `eventCluster` (articles liés des autres sources +
`interpretation` neutre déjà désérialisée).

## `GET /api/v1/trends?weeks=12`

Nombre d'articles par catégorie et par semaine (lundi 00:00 UTC), sur les `weeks` dernières
semaines (défaut 12, max 52).

```json
{ "weeks": 12, "trends": [{ "weekStart": "2026-06-15", "category": "technologie", "count": 7 }] }
```

## `GET /api/v1/search?q=...`

Recherche texte (alias pratique de `/articles?search=...`). `q` est obligatoire.

## `GET /api/v1/clusters/:id`

Renvoie un cluster d'évènement (toutes les sources qui en parlent) avec son `interpretation`
neutre désérialisée.

## Exemple d'intégration depuis une autre application

```js
const res = await fetch("https://<votre-déploiement>.vercel.app/api/v1/articles?category=environnement&sort=date", {
  headers: { "x-api-key": "VOTRE_CLE_SI_CONFIGUREE" },
});
const { articles } = await res.json();
```
