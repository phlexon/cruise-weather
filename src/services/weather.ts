const API_BASE = "https://api.tomorrow.io/v4/weather/forecast";

export type SimpleWeather = {
  high: number;
  low: number;
  rainChance: number;
  icon: "sunny" | "partly" | "cloudy" | "rain";
  description: string;
};

// Map Tomorrow.io weather codes to icon types
function mapWeatherCodeToIcon(weatherCode: number): SimpleWeather["icon"] {
  if ([4000, 4001, 4200, 4201].includes(weatherCode)) return "rain"; // drizzle/rain
  if ([1001, 1102].includes(weatherCode)) return "cloudy"; // cloudy/mostly cloudy
  if ([1000, 1100, 1101].includes(weatherCode)) return "sunny"; // clear/mostly clear/partly
  return "partly";
}

// Map weather codes to readable descriptions
function mapWeatherCodeToDescription(weatherCode: number): string {
  const map: Record<number, string> = {
    1000: "Clear",
    1100: "Mostly clear",
    1101: "Partly cloudy",
    1102: "Mostly cloudy",
    1001: "Cloudy",
    4000: "Drizzle",
    4001: "Rain",
    4200: "Light rain",
    4201: "Heavy rain"
  };
  return map[weatherCode] ?? "Mixed conditions";
}

/**
 * Fetch daily forecasts from Tomorrow.io for a given city + date list.
 *
 * NOTE: Free forecast covers only the next several days from *today*.
 * Only sail dates within that window will get real API data.
 */
export async function getDailyForecastsForCity(
  city: string,
  dates: string[]
): Promise<Record<string, SimpleWeather>> {
  console.log("FETCHING DAILY WEATHER (Tomorrow.io) FOR:", city, dates);

  const apiKey = import.meta.env.VITE_TOMORROW_API_KEY;
  console.log("API KEY PREFIX:", String(apiKey).slice(0, 5));

  if (!apiKey) {
    throw new Error("Missing VITE_TOMORROW_API_KEY");
  }

  // Normalize something like "Miami (Embarkation)" -> "miami"
  const normalized = city
    .toLowerCase()
    .split("(")[0]
    .split(",")[0]
    .trim();

  // Known cruise homeports with fixed coordinates
  const coordsByCity: Record<string, { lat: number; lon: number }> = {
    miami: { lat: 25.7617, lon: -80.1918 },
    "port canaveral": { lat: 28.4108, lon: -80.6188 },
    galveston: { lat: 29.3013, lon: -94.7977 },
    tampa: { lat: 27.9506, lon: -82.4572 }
  };

  const coords = coordsByCity[normalized] ?? coordsByCity["miami"];
  const { lat, lon } = coords;

  const params = new URLSearchParams({
    location: `${lat},${lon}`, // force correct lat/lon
    timesteps: "1d",
    units: "imperial",
    apikey: apiKey as string
  });

  const url = `${API_BASE}?${params.toString()}`;
  console.log("Tomorrow.io URL:", url);

  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error("Tomorrow.io API error:", res.status, errorText);
    throw new Error(`Tomorrow.io API error: ${res.status}`);
  }

  const data = await res.json();
  console.log("Tomorrow.io raw data:", data);

  const result: Record<string, SimpleWeather> = {};

  // Forecast response shape: { timelines: { daily: [ { time, values }, ... ], ... } }
  const timelinesObj = data?.timelines ?? data?.data?.timelines;
  if (!timelinesObj) {
    console.warn("No timelines object in Tomorrow.io response");
    return result;
  }

  const dailyIntervals: any[] = timelinesObj.daily || [];
  if (!Array.isArray(dailyIntervals)) {
    console.warn("Daily intervals is not an array:", dailyIntervals);
    return result;
  }

  dailyIntervals.forEach((interval: any) => {
    const timeStr: string = interval.time || interval.startTime;
    if (!timeStr) return;

    const dateKey = timeStr.slice(0, 10); // "YYYY-MM-DD"
    const v = interval.values ?? {};

    const tempMax =
      v.temperatureMax ?? v.temperatureAvg ?? v.temperature ?? 0;
    const tempMin =
      v.temperatureMin ?? v.temperatureAvg ?? v.temperature ?? 0;

    const rainChance =
      v.precipitationProbability ?? v.precipitationProbabilityAvg ?? 0;

    const weatherCode = v.weatherCode ?? v.weatherCodeMax ?? 0;

    // Only keep dates that match the cruise dates we care about
    if (dates.length > 0 && !dates.includes(dateKey)) {
      return;
    }

    result[dateKey] = {
      high: Math.round(tempMax),
      low: Math.round(tempMin),
      rainChance: Math.round(rainChance),
      icon: mapWeatherCodeToIcon(weatherCode),
      description: mapWeatherCodeToDescription(weatherCode)
    };
  });

  console.log("FINAL DAILY FORECASTS:", result);
  return result;
}
