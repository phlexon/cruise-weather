// src/data/portClimateMeta.ts

/**
 * Minimal mapping from embarkation city -> NCEI GHCND station ID.
 *
 * Station IDs are from NOAA/NCEI GHCND station detail pages for
 * the main airport near each port, e.g.:
 * - Miami Intl Airport, FL US (USW00012839) 
 * - Fort Lauderdale Intl Airport, FL US (USW00012849) 
 * - Orlando Intl Airport, FL US (USW00012815) — used for Port Canaveral 
 * - Tampa Intl Airport, FL US (USW00012842) 
 * - Galveston, TX US (USW00012944) 
 * - New Orleans Airport, LA US (USW00012916) 
 * - Los Angeles Intl Airport, CA US (USW00023174) 
 * - San Diego Intl Airport, CA US (USW00023188) 
 * - Seattle-Tacoma Airport, WA US (USW00024233) 
 */

const CITY_TO_NCEI_STATION: Record<string, string> = {
  // Florida
  Miami: "USW00012839",
  "Fort Lauderdale": "USW00012849",
  "Port Canaveral": "USW00012815", // uses Orlando Intl as proxy
  Orlando: "USW00012815",
  Tampa: "USW00012842",

  // Texas / Gulf
  Galveston: "USW00012944",
  "New Orleans": "USW00012916",

  // West Coast
  "Los Angeles": "USW00023174",
  "San Diego": "USW00023188",
  Seattle: "USW00024233",
};

/**
 * Given a city name (e.g. "Miami", "Fort Lauderdale"), return the
 * corresponding NCEI station ID if we know it.
 *
 * This expects just the *city part* – in App.tsx you’re already doing:
 *   const embarkationCity = embarkationLocation.split(",")[0];
 */
export function getNceiStationIdForCity(
  city: string | undefined | null
): string | undefined {
  if (!city) return undefined;
  const key = city.trim();
  return CITY_TO_NCEI_STATION[key];
}
