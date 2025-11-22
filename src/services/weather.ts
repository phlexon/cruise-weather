// src/services/weather.ts
// Weather service using Tomorrow.io v4 Daily Forecast API
// Now with simple in-memory caching per browser session.

export type DailyForecast = {
  date: string; // "YYYY-MM-DD"
  high: number;
  low: number;
  rainChance: number;
  icon: "sunny" | "partly" | "cloudy" | "rain";
  description: string;
};

const TOMORROW_API_KEY: string | undefined =
  import.meta.env.VITE_TOMORROW_API_KEY;

// In-memory cache: key -> Record<isoDate, DailyForecast>
const weatherCache = new Map<string, Record<string, DailyForecast>>();

// Some manual fallbacks for tricky port names
const LOCATION_FALLBACKS: Record<string, string> = {
  "Port Canaveral": "Cape Canaveral, FL",
  "Perfect Day at CocoCay": "Coco Cay, Bahamas",
  CocoCay: "Coco Cay, Bahamas"
};

function mapWeatherCodeToIcon(code: number | undefined): DailyForecast["icon"] {
  if (code == null) return "partly";

  // Very rough mapping, enough for simple icons
  if (code >= 4000 && code < 5000) return "rain"; // drizzle/rain
  if (code >= 1001 && code < 2000) return "cloudy"; // cloudy
  if (code >= 1100 && code <= 1102) return "partly"; // partly cloudy
  if (code === 1000) return "sunny"; // clear
  return "partly";
}

/**
 * Build a location string suitable for Tomorrow.io's `location=` param.
 * We pass a human-readable location rather than lat/lon and let Tomorrow handle it,
 * with a few manual cleanups for cruise-style port names.
 */
function buildLocationQuery(rawCity: string): string {
  const trimmed = rawCity.trim();
  const mapped = LOCATION_FALLBACKS[trimmed];
  if (mapped) return mapped;

  // If it starts with "Port X", also try "X" internally on their side
  if (/^port\s+/i.test(trimmed)) {
    const withoutPort = trimmed.replace(/^port\s+/i, "").trim();
    if (withoutPort) {
      return withoutPort;
    }
  }

  // Default: just use the raw city name
  return trimmed;
}

/**
 * Fetch daily forecasts for a "city" / location name and return a map keyed by ISO date ("YYYY-MM-DD").
 * Only the dates in the `dates` array are included in the result.
 * Uses a simple in-memory cache so repeated clicks for the same city+dates don't hit the API again.
 */
export async function getDailyForecastsForCity(
  city: string,
  dates: string[]
): Promise<Record<string, DailyForecast>> {
  if (!TOMORROW_API_KEY) {
    console.error("VITE_TOMORROW_API_KEY is missing.");
    throw new Error("Tomorrow.io API key is not configured.");
  }

  if (!dates || dates.length === 0) {
    return {};
  }

  const locationQuery = buildLocationQuery(city);

  // 🔑 Build a stable cache key: location + sorted dates
  const sortedDates = [...dates].sort();
  const cacheKey = `${locationQuery}|${sortedDates.join(",")}`;

  // 🔁 Check cache first
  const cached = weatherCache.get(cacheKey);
  if (cached) {
    console.log("Tomorrow.io cache hit for:", cacheKey, cached);
    return cached;
  }

  console.log(
    "FETCHING DAILY WEATHER (Tomorrow.io) FOR (cache miss):",
    locationQuery,
    dates
  );

  const url = `https://api.tomorrow.io/v4/weather/forecast?location=${encodeURIComponent(
    locationQuery
  )}&timesteps=1d&units=imperial&apikey=${TOMORROW_API_KEY}`;

  console.log("Tomorrow.io URL:", url);

  const res = await fetch(url);
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    console.error("Tomorrow.io API error:", res.status, text);
    throw new Error(`Tomorrow.io API error: ${res.status}`);
  }

  type TomorrowDaily = {
    time: string; // ISO datetime
    values: {
      temperatureMax?: number;
      temperatureMin?: number;
      temperatureApparentMax?: number;
      temperatureApparentMin?: number;
      temperatureAvg?: number;
      precipitationProbability?: number;
      precipitationProbabilityAvg?: number;
      weatherCode?: number;
      weatherCodeMax?: number;
    };
  };

  const data = JSON.parse(text) as {
    timelines?: {
      daily?: TomorrowDaily[];
    };
  };

  const daily = data.timelines?.daily ?? [];
  if (!daily.length) {
    console.warn("Tomorrow.io returned no daily data.");
    return {};
  }

  const all: Record<string, DailyForecast> = {};

  for (const d of daily) {
    const iso = d.time.slice(0, 10); // YYYY-MM-DD
    const v = d.values || {};

    const high =
      v.temperatureMax ??
      v.temperatureApparentMax ??
      v.temperatureAvg ??
      0;
    const low =
      v.temperatureMin ??
      v.temperatureApparentMin ??
      v.temperatureAvg ??
      0;

    const rainProbRaw =
      v.precipitationProbability ??
      v.precipitationProbabilityAvg ??
      0;

    const weatherCode = v.weatherCode ?? v.weatherCodeMax;
    const icon = mapWeatherCodeToIcon(weatherCode);

    all[iso] = {
      date: iso,
      high,
      low,
      rainChance: rainProbRaw,
      icon,
      description: `Tomorrow.io daily forecast (code ${
        weatherCode ?? "n/a"
      })`
    };
  }

  // Filter to just the dates we care about
  const wanted = new Set(dates);
  const filtered: Record<string, DailyForecast> = {};

  for (const [iso, forecast] of Object.entries(all)) {
    if (wanted.has(iso)) {
      filtered[iso] = forecast;
    }
  }

  console.log("Tomorrow.io mapped daily forecasts:", filtered);

  // 💾 Store in cache before returning
  weatherCache.set(cacheKey, filtered);

  return filtered;
}
