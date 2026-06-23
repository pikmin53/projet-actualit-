# Ouverture d'une API publique

## Décision

Les routes `/api/v1/*` (voir [../api.md](../api.md) pour le contrat détaillé) sont conçues
comme une vraie API réutilisable par une application tierce, pas seulement comme un backend
interne pour le frontend de Globe Actu.

## Pourquoi

- Le besoin exprimé est explicite : permettre à une autre application de dialoguer avec ce
  projet. Construire l'API comme un produit à part (versionnée, documentée, avec CORS et
  auth optionnelle) évite d'avoir à la retravailler plus tard si un consommateur externe
  apparaît.
- **Versionnement `/v1/`** : permet de faire évoluer le contrat plus tard (`/v2/`) sans
  casser les intégrations existantes.
- **CORS** activé par défaut (`ALLOWED_ORIGINS=*`) : sans ça, un navigateur bloquerait les
  appels depuis une autre application web. Restreignable à une liste précise de domaines en
  production via la même variable, sans changement de code.
- **Authentification par clé API optionnelle** (`PUBLIC_API_KEY`) plutôt qu'obligatoire :
  permet de garder l'API ouverte en développement/démo, et de la sécuriser en production en
  ajoutant simplement une variable d'environnement.
- **Rate limiting simple** (60 req/min/IP, en mémoire) : un garde-fou minimal contre les abus
  évidents, sans dépendance externe (Redis, etc.) qui ajouterait un coût/une complexité non
  justifiée à ce stade.

## Limites connues

- Le rate limiting est **par instance serverless**, pas global : sur Vercel, plusieurs
  instances peuvent tourner en parallèle, chacune avec son propre compteur. La limite réelle
  observée peut donc dépasser 60 req/min en agrégé. Si cela devient un problème réel, la
  prochaine étape serait un store partagé (ex. Upstash Redis, lui aussi gratuit en petit
  volume).
- La clé API est unique et globale (pas de gestion multi-clients/quotas par client). Suffisant
  pour un usage "une ou quelques applications tierces de confiance" ; une vraie gestion
  multi-clients demanderait une table dédiée en base.
