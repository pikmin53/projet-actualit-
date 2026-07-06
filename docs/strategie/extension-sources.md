# Extension des sources : fraîcheur, couverture et détection du "marquant"

## Objectif

Étendre la zone de recherche au-delà de la vingtaine de flux RSS actuels
([sources-donnees.md](./sources-donnees.md)), avec deux buts distincts qu'il ne faut pas
confondre :

1. **Fraîcheur** — détecter un évènement le plus tôt possible après sa survenue.
2. **Importance** — distinguer les évènements marquants du bruit de fond.

Une source rapide n'est pas forcément fiable, et inversement. La stratégie retenue est donc
une **architecture en couches**, où les couches rapides (social, alertes structurées) servent
de *déclencheur*, et les couches lentes mais fiables (presse) servent de *confirmation*.

## Évaluation des API commerciales envisagées

| API | Verdict | Pourquoi |
|---|---|---|
| TheNewsAPI | Non prioritaire | Tier gratuit très limité (peu de requêtes/jour, historique bridé) ; n'apporte rien que Google News RSS + GDELT ne donnent gratuitement. |
| SerpAPI (Google News) | Non | On paie cher (~75 $/mois) un scraping de Google News, alors que Google News expose des **flux RSS gratuits et sans clé**. |
| NewsCatcher | Non (pour l'instant) | Positionnement entreprise, pas de tier gratuit pérenne. À reconsidérer seulement si le projet devient un produit. |
| Mediastack | Non prioritaire | Tier gratuit faible volume, HTTPS et temps réel réservés aux plans payants — or le temps réel est précisément notre objectif. |
| NewsAPI / GNews (déjà intégrées) | Conserver en optionnel | Déjà en place via `GNEWS_KEY`/`NEWSAPI_KEY`, coût zéro, complément correct. |

Conclusion : **aucun abonnement payant n'est justifié à ce stade.** Le gain marginal face aux
sources gratuites ci-dessous est trop faible.

## Les quatre couches

### Couche 1 — Presse (fiabilité ; latence : minutes à heures)

- **Étendre `data/sources/rss-feeds.json`** : c'est l'action au meilleur rapport effort/gain.
  Passer de ~20 à 100+ flux (agences et médias par région : Asie, Afrique, Amérique latine,
  Moyen-Orient) ne demande aucun changement de code.
- **Google News RSS** : `https://news.google.com/rss/search?q=<requête>&hl=<langue>` et les
  éditions par pays/rubrique. Gratuit, sans clé, agrège des milliers de médias. Limites : les
  URLs sont des redirections Google (le dédoublonnage par URL devient inopérant → s'appuyer
  sur le dédoublonnage par similarité de titre, déjà présent dans `dedupe.ts`) et un scraping
  trop agressif peut être bloqué (rester sur un rythme de cron, pas de rafales).

### Couche 2 — Alertes structurées (détection précoce fiable ; latence : minutes)

Pour les accidents, catastrophes et conflits, des organismes publient des flux **structurés,
géolocalisés et quasi temps réel** — plus rapides que la presse et plus fiables que le social :

- **GDELT 2.0** (gdeltproject.org) : mise à jour toutes les 15 min, mondial, chaque évènement
  arrive **déjà géolocalisé (lat/lng)** — un fit parfait avec le globe, qui éviterait la
  géolocalisation heuristique par texte pour ces articles. Gratuit, sans clé.
- **USGS** (séismes, GeoJSON temps réel), **GDACS** (catastrophes, ONU/CE), **NASA EONET**
  (évènements naturels), **ReliefWeb** (crises humanitaires). Tous gratuits.

C'est la couche la plus rentable pour "détecter dès la sortie" : signal fort, zéro bruit,
zéro coût.

### Couche 3 — Réseaux sociaux (vitesse maximale ; bruit maximal)

L'intuition de départ est juste : le social devance souvent la presse de plusieurs minutes
sur les accidents/conflits. Mais deux garde-fous :

- **Un signal social seul ne doit jamais être publié.** Il crée un "évènement candidat"
  (non affiché), qui n'est promu que si une source de presse ou une alerte structurée le
  confirme dans une fenêtre de N heures. Sinon il expire. C'est la protection contre les
  fausses informations, très fréquentes précisément sur ce type d'évènements.
- **Un "listener" temps réel suppose un processus qui tourne en continu**, ce que le cron
  GitHub Actions (toutes les 20 min) ne permet pas. Commencer par du *polling* au rythme du
  cron ; un vrai streaming exigerait un petit worker hébergé (Fly.io, VPS...) — à ne faire
  que si le polling montre ses limites.

Par plateforme :

- **Reddit** (recommandé en premier) : API JSON gratuite, `r/worldnews`, `r/news`, etc. triés
  par `new` ; le ratio signal/bruit y est correct car les subreddits sont modérés.
- **Bluesky** (recommandé ensuite) : firehose/Jetstream ouvert et gratuit, filtrable par
  mots-clés.
- **Telegram** : très rapide sur les zones de conflit (canaux spécialisés), API gratuite,
  mais curation des canaux délicate et forte proportion de propagande → à ne brancher
  qu'avec la logique de confirmation croisée en place.
- **X/Twitter** : déconseillé — l'accès API pertinent est cher (centaines de $/mois) pour un
  gain devenu médiocre.

### Couche 4 — Publications scientifiques (latence : jours, mais exhaustif)

Se placer au niveau des publications elles-mêmes est pertinent, et tout est gratuit :

- **arXiv** (API + RSS par catégorie), **bioRxiv/medRxiv**, **PubMed** (E-utilities),
  **Crossref** (tout nouveau DOI), **HAL** pour la recherche française.
- **EurekAlert / AlphaGalileo** (communiqués de presse des institutions) : c'est le meilleur
  détecteur de "recherche marquante" — une institution n'émet un communiqué que pour ses
  résultats importants, et la levée d'embargo marque le moment exact où la presse va couvrir.

Signal d'importance pour cette couche : communiqué de presse + reprise par ≥ 2 médias
généralistes. Les métriques de citations sont trop lentes pour de l'actualité.

## Détection du "marquant" (toutes couches)

Étendre le `popularityScore` existant (sources distinctes + fraîcheur, voir
[popularite.md](./popularite.md)) avec :

1. **Vélocité** : nombre de sources distinctes rejoignant un cluster *par heure*, pas
   seulement en absolu. Un cluster qui gagne 5 sources en 40 min est "breaking".
2. **Confirmation croisée entre couches** : social + presse, ou alerte structurée + presse,
   vaut plus que 2 articles de presse.
3. **Pondération par autorité** : un champ `weight` par source dans `rss-feeds.json`
   (agence de presse > média national > blog).
4. Au-delà d'un seuil, marquer le cluster `breaking: true` en base → mise en avant sur le
   globe et dans la liste.

## Procédé par phases

| Phase | Contenu | Coût | Prérequis techniques |
|---|---|---|---|
| 1 ✅ | Étendre les flux RSS (46 flux), ajouter Google News RSS, ajouter GDELT | 0 € | Fait : `fetchGoogleNews.ts` + `fetchGdelt.ts`, configurés par `data/sources/google-news-feeds.json` et `gdelt-queries.json` |
| 2 ✅ | Alertes structurées (USGS, GDACS, EONET) + vélocité/`breaking` sur les clusters | 0 € | Fait : `fetchAlerts.ts` (config `data/sources/alert-feeds.json`, lat/lng natifs via `categoryHint`/geo sur `RawArticle`), `breaking.ts` + migration `breaking_clusters` |
| 3 ✅ | Social : Reddit en polling ; logique "évènement candidat → confirmation" | 0 € | Fait : `fetchSocial.ts` (flux RSS Reddit — l'API JSON refuse les IP de datacenters, Bluesky exige désormais une authentification), table `SocialSignal`, confirmation par similarité de titre avec les clusters presse, bonus dans la règle "breaking" |
| 4 ✅ | Science : arXiv, medRxiv, Nature/Science, Phys.org/ScienceDaily (EurekAlert n'a plus de RSS public), blogs officiels des labos IA (OpenAI, DeepMind, Hugging Face, Anthropic via Google News) + agences spatiales ; catégorie `science` | 0 € | Fait : `fetchScience.ts` + veille par tiers de priorité (IA > quantique/spatial > climat > santé) dans `data/sources/science-watchlist.json`, boost de popularité par tier |

Côté code, chaque nouvelle famille de sources devient un *fetcher* enregistré dans un
registre, sur le modèle des providers NLP (`src/lib/nlp/providers/registry.ts`) : chaque
fetcher retourne des `RawArticle` (éventuellement enrichis d'un lat/lng natif) et le reste du
pipeline (normalisation, dédoublonnage, clustering, résumé) reste inchangé.

## Limites connues

- Le cron 20 min borne la "fraîcheur" perçue : même une source temps réel ne sera visible
  qu'au tick suivant. Réduire l'intervalle (GitHub Actions accepte 5 min, avec un délai de
  déclenchement variable) avant d'investir dans du streaming.
- Google News RSS et Reddit tolèrent le polling modéré mais n'offrent aucun SLA : prévoir la
  même absorption d'échec silencieuse que `fetchRssArticles`.
- GDELT bloque en pratique les clients trop rapides ou sans User-Agent (vérifié) : le fetcher
  espace ses requêtes de 10 s et s'identifie ; un échec ponctuel n'interrompt pas l'ingestion.
- GDELT ne fournit que le titre (pas de description) : le résumé de ces articles est minimal
  tant que le cluster n'est pas rejoint par des articles de presse plus riches.
- La confirmation croisée retarde volontairement la publication des signaux sociaux : c'est
  un choix éditorial (fiabilité > vitesse brute), cohérent avec
  [neutralite-et-limites.md](./neutralite-et-limites.md).
