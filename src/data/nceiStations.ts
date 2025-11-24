// src/data/nceiStations.ts
//
// Maps embarkation cities → NOAA/NCEI climate-normal stations.
// These stations supply 30-year temperature & precipitation averages.

export function getNceiStationForCity(city: string): string | null {
  if (!city) return null;

  const key = city.trim().toLowerCase();

  // Add any embarkation city you want here
  const map: Record<string, string> = {
    "miami": "USW00012839",
    "fort lauderdale": "USW00012849",
    "port everglades": "USW00012849",
    "tampa": "USW00012842",
    "galveston": "USW00012924",
    "new orleans": "USW00012916",
    "los angeles": "USW00023174",
    "long beach": "USW00023129",
    "san diego": "USW00023188",
    "seattle": "USW00024233",
    "vancouver": "CA001109078", // Canada station – optional
    "san francisco": "USW00023272",
    "cape liberty": "USW00014734",
    "bayonne": "USW00014734",
    "charleston": "USW00013782",
    "jacksonville": "USW00013889",
    "port canaveral": "USW00012815",
    "orlando": "USW00012815",
    "mobile": "USW00013896",
  };

  return map[key] ?? null;
}
