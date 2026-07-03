# Catégorisation des articles

## Décision

Classification par comptage de mots-clés (FR+EN) par catégorie (`src/lib/nlp/categorize.ts`),
catégorie gagnante = celle dont le score est le plus élevé, repli sur `"autre"` si aucun
mot-clé ne correspond.

## Pourquoi

- Simple, rapide, déterministe, gratuite : pas de modèle ML à entraîner ou héberger.
- Explicable : on peut toujours dire *pourquoi* un article a été classé dans une catégorie
  (les mots-clés qui ont matché), ce qui aide à corriger la liste si besoin.
- Suffisant pour les 4 catégories demandées (environnement, technologie, politique,
  économique) qui ont un vocabulaire assez distinct dans les titres d'actualité.

## Limites connues

- Un article peut légitimement relever de plusieurs catégories (ex: une loi sur l'IA est à
  la fois "politique" et "technologie") ; seule la catégorie au score le plus élevé est
  retenue, pas un multi-label.
- Les listes de mots-clés (`CATEGORY_KEYWORDS`) sont curatées à la main et non exhaustives ;
  les étendre est la première chose à faire si une catégorie semble sous-représentée ou mal
  classée.

## Piste d'évolution

Le pipeline n'a pas (encore) de notion de "provider" pour la catégorisation comme pour le
résumé/l'interprétation (voir [resume-et-interpretation.md](./resume-et-interpretation.md)),
car l'approche par mots-clés suffit pour la V1. Si besoin d'un classifieur plus fin (ex.
zero-shot via un modèle local), le même principe de registre interchangeable pourrait être
appliqué ici sans changer la signature de `categorize()`.

## Catégorie "cybersecurite" (ajoutée en phase 1)

Catégorie dédiée aux cyberattaques, alimentée à la fois par les mots-clés de
`CATEGORY_KEYWORDS` et par des sources spécialisées (BleepingComputer, The Hacker News,
CERT-FR, The Record, Numerama Cyberguerre... voir `data/sources/rss-feeds.json`) et des
requêtes Google News/GDELT ciblées. Les clusters de cette catégorie reçoivent un
multiplicateur de popularité selon leur impact estimé (services personnels de la liste de
veille, conséquences nationales, grands pays touchés) — voir `src/lib/nlp/cyberImpact.ts`
et `data/sources/cyber-watchlist.json` (personnalisable, notamment la liste des services
dont vous avez un compte).
