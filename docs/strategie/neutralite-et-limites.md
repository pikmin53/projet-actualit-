# Neutralité et limites du projet

## Engagement de neutralité

L'"interprétation IA" affichée sur la page article (`InterpretationPanel`) n'est **pas** une
opinion générée par un modèle génératif. C'est une comparaison algorithmique des mots-clés
dominants entre les sources qui couvrent le même évènement (voir
[resume-et-interpretation.md](./resume-et-interpretation.md)). Elle est présentée avec un
disclaimer explicite dans l'interface pour éviter toute confusion avec une prise de position
éditoriale.

## Pourquoi c'est important ici

Le projet agrège des médias internationaux qui peuvent avoir des lignes éditoriales très
différentes sur un même évènement (politique, conflits, économie...). Générer une "opinion"
automatique sur ces sujets serait risqué : biais involontaire du modèle, perte de nuance,
ou impression de neutralité usurpée. Rester sur une comparaison descriptive (quels mots
reviennent chez qui) est un choix défensif délibéré.

## Limites assumées du projet (à garder en tête)

- **Géolocalisation et catégorisation heuristiques** (mots-clés/gazetteer) : pas de NER ou de
  classifieur ML, donc des erreurs occasionnelles sont attendues — voir le détail dans
  [geolocalisation.md](./geolocalisation.md) et [categorisation.md](./categorisation.md).
- **Couverture des sources limitée** (~20 flux RSS curatés à la main) : ne reflète pas
  l'ensemble de la presse mondiale, et a un biais structurel vers les médias anglophones et
  francophones les plus connus.
- **Clustering lexical approximatif** : peut sous- ou sur-regrouper des articles, ce qui
  affecte à la fois l'interprétation et le score de popularité.
- **Popularité = proxy, pas une mesure d'audience réelle** (voir
  [popularite.md](./popularite.md)).
- **Rate limiting en mémoire** sur l'API publique : protection best-effort, pas une garantie
  forte contre les abus à grande échelle (voir [api-publique.md](./api-publique.md)).

Ces limites sont documentées intentionnellement ici plutôt que masquées, pour que toute
évolution future (ou tout contributeur) sache où porter ses efforts en priorité.
