// src/data/nceiStations.ts
//
// Maps embarkation cities/ports → NOAA/NCEI climate-normal stations.
// These stations supply 30-year temperature & precipitation averages.

export function getNceiStationForCity(cityLike: string): string | null {
  if (!cityLike) return null;

  // Normalize:
  // - lowercase
  // - remove anything in parentheses e.g. "(Embarkation)", "(Florida)"
  // - collapse extra spaces
  const stripped = cityLike
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")   // remove (...) blocks
    .replace(/\s+/g, " ")       // collapse multiple spaces
    .trim();

  // Base map – keys should be short, "clean" city/port names
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

  // 1) Exact match on the stripped string
  if (map[stripped]) {
    return map[stripped];
  }

  // 2) Substring match – handles things like:
  //    "port everglades (fort lauderdale, florida)"
  //    "miami, florida"
  for (const key of Object.keys(map)) {
    if (stripped.includes(key)) {
      return map[key];
    }
  }

  return null;
}
