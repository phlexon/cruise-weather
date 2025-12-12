// src/data/portClimateMeta.ts

// Very small set of embarkation cities you care about right now.
// You can expand this as needed.
const CITY_TO_NCEI_STATION: Record<string, string> = {
  "miami": "USW00012839",
  "fort lauderdale": "USW00012849",
  "port everglades": "USW00012849", // just in case
  "port canaveral": "USW00012815",  // Orlando Intl as proxy
  "orlando": "USW00012815",
  "tampa": "USW00012842",
  "galveston": "USW00012944",
  "new orleans": "USW00012916",
  "los angeles": "USW00023174",
  "san diego": "USW00023188",
  "seattle": "USW00024233",
};

/**
 * Given a city-like string (e.g. "Fort Lauderdale",
 * "Fort Lauderdale, Port Everglades, Florida"),
 * return an NCEI station ID if we know one.
 */
export function getNceiStationIdForCity(
  city: string | undefined | null
): string | undefined {
  if (!city) return undefined;

  const raw = city.trim().toLowerCase();

  // Exact match first
  if (CITY_TO_NCEI_STATION[raw]) {
    return CITY_TO_NCEI_STATION[raw];
  }

  // Fuzzy: if the raw string contains one of our keys
  for (const [key, stationId] of Object.entries(CITY_TO_NCEI_STATION)) {
    if (raw.includes(key)) {
      return stationId;
    }
  }

  return undefined;
}
