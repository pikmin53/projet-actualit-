// Dépendance optionnelle (voir src/lib/nlp/providers/summarizer.transformers.ts).
// Cette déclaration évite une erreur de compilation TypeScript quand le paquet
// n'est pas installé (le provider n'est utilisé que si SUMMARIZER_PROVIDER l'active).
declare module "@xenova/transformers";
