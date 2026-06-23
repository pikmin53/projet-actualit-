import countriesData from "../../../data/geo/countries.json";
import citiesData from "../../../data/geo/cities.json";
import type { GeoMatch } from "@/lib/types";

interface CountryEntry {
  code: string;
  lat: number;
  lng: number;
  names: string[];
}

interface CityEntry {
  name: string;
  country: string;
  lat: number;
  lng: number;
  aliases: string[];
}

const countryList = countriesData as CountryEntry[];
const cityList = citiesData as CityEntry[];

/** Échappe les caractères spéciaux d'une chaîne pour l'utiliser dans une RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Vrai si `needle` apparaît comme mot entier (insensible à la casse) dans `haystack`. */
function containsWord(haystack: string, needle: string): boolean {
  if (needle.length < 3) return false;
  return new RegExp(`\\b${escapeRegExp(needle)}\\b`, "i").test(haystack);
}

function countryNameOf(code: string): string {
  return countryList.find((c) => c.code === code)?.names[0] ?? code;
}

/**
 * Géolocalisation heuristique par mots-clés : recherche d'abord une ville connue, puis un pays
 * connu, dans le texte fourni. Approche volontairement simple (pas de NER), voir
 * docs/strategie/geolocalisation.md pour les limites (ambiguïté, biais anglophone, faux positifs).
 * @param text Texte à analyser (typiquement `${title} ${rawContent}` d'un article).
 * @returns Le premier lieu détecté (ville prioritaire sur pays), ou `null` si aucun lieu connu n'est trouvé.
 */
export function geolocate(text: string): GeoMatch | null {
  for (const city of cityList) {
    if (city.aliases.some((alias) => containsWord(text, alias))) {
      return {
        countryCode: city.country,
        locationLabel: `${city.name}, ${countryNameOf(city.country)}`,
        lat: city.lat,
        lng: city.lng,
      };
    }
  }

  for (const country of countryList) {
    if (country.names.some((name) => containsWord(text, name))) {
      return {
        countryCode: country.code,
        locationLabel: country.names[0],
        lat: country.lat,
        lng: country.lng,
      };
    }
  }

  return null;
}

/**
 * Renvoie le centroïde d'un pays par son code ISO, utilisé comme repli quand aucun lieu n'a pu
 * être détecté dans le texte d'un article (on retombe alors sur le pays d'origine de la source).
 * @param code Code pays ISO 3166-1 alpha-2 (ex: "FR").
 * @returns Le lieu correspondant au pays, ou `null` si le code est inconnu du gazetteer.
 */
export function countryCentroid(code: string): GeoMatch | null {
  const country = countryList.find((c) => c.code === code);
  if (!country) return null;
  return {
    countryCode: country.code,
    locationLabel: country.names[0],
    lat: country.lat,
    lng: country.lng,
  };
}
