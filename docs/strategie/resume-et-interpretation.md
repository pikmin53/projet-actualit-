# Résumé et interprétation : modèles locaux/gratuits, interchangeables

## Décision

Pas d'API LLM payante (ex. Claude/OpenAI). Par défaut :
- **Résumé** : extractif par scoring de phrases (`extractiveSummarizer`), aucune dépendance ML.
- **Interprétation** : heuristique par comparaison de mots-clés dominants entre sources
  (`heuristicInterpreter`), pas de génération de texte libre.

Les deux sont choisis via une **architecture "providers"** interchangeable : il est possible
de changer de modèle sans toucher au reste du code.

## Pourquoi cette architecture

L'utilisateur du projet doit pouvoir, à terme, essayer un modèle local plus capable
(ex. `transformers.js`) sans réécrire le pipeline d'ingestion. La solution : une interface
commune par capacité (`SummarizerProvider`, `InterpreterProvider` dans
`src/lib/nlp/providers/types.ts`), un registre qui résout le provider actif à partir d'une
variable d'environnement, et une implémentation par fichier.

### Comment changer de modèle

1. Choisir un provider déjà enregistré (`src/lib/nlp/providers/registry.ts`) :
   - `SUMMARIZER_PROVIDER=extractive` (défaut) ou `SUMMARIZER_PROVIDER=transformers-distilbart`
     (nécessite `npm install @xenova/transformers`).
   - `INTERPRETER_PROVIDER=heuristic` (seul disponible pour l'instant).
2. Mettre la valeur dans `.env`, relancer `npm run ingest`. **Aucune modification de code.**

### Comment ajouter un nouveau provider

1. Créer `src/lib/nlp/providers/summarizer.<nom>.ts` (ou `interpreter.<nom>.ts`) qui implémente
   l'interface (`summarize(...)` ou `interpret(...)`).
2. L'enregistrer dans `registry.ts` (une ligne : `[monProvider.name]: monProvider`).
3. Le sélectionner via la variable d'environnement correspondante.

Ce découplage permet, par exemple, de brancher plus tard une clé API LLM externe (Claude,
etc.) comme provider optionnel `external-llm`, sans toucher à `scripts/ingest.ts` ni aux
routes API : elles ne connaissent que l'interface, pas l'implémentation.

## Pourquoi pas un LLM génératif par défaut

- **Coût récurrent** : un LLM payant facturerait à l'usage, proportionnellement au volume
  d'articles ingérés en continu — incompatible avec l'objectif "gratuit".
- **Fiabilité de l'interprétation neutre** : un résumé/synthèse purement extractif/heuristique
  ne peut pas "halluciner" une opinion ou une nuance absente des sources, ce qui sert
  directement l'exigence de neutralité (voir
  [neutralite-et-limites.md](./neutralite-et-limites.md)) — au prix d'une interprétation plus
  pauvre qu'une vraie synthèse rédigée.

## Limites connues du choix par défaut

- Le résumé extractif reprend des phrases existantes plutôt que de reformuler : moins fluide
  qu'un résumé abstractif, mais fiable (jamais d'invention de fait).
- L'interprétation heuristique compare des **mots-clés**, pas des arguments : elle indique
  "ces mots apparaissent dans la majorité des sources" plutôt que "voici ce qui fait
  consensus" au sens journalistique. C'est un choix délibéré de rester descriptif plutôt
  qu'interprétatif au sens fort, pour limiter le risque de biais introduit par l'automatisation.
