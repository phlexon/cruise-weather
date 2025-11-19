const API_BASE = "https://api.openweathermap.org/data/2.5";

export type SimpleWeather = {
  high: number;
  low: number;
  rainChance: number;
  icon: "sunny" | "partly" | "cloudy" | "rain";
  description: string;
};

function mapConditionToIcon(main: string): SimpleWeather["icon"] {
  const key = main.toLowerCase();
  if (key.includes("rain") || key.includes("drizzle") || key.includes("storm")) return "rain";
  if (key.includes("cloud")) return "cloudy";
  return "sunny"; // default
}

/**
 * Given all 3-hour entries for a specific date, aggregate into a single daily-style summary.
 */
function aggregateDay(entries: any[]): SimpleWeather {
  const highs = entries.map((e) => e.main.temp_max);
  const lows = entries.map((e) => e.main.temp_min);
  const pops = entries.map((e) => (e.pop ?? 0) * 100);

  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const rainChance = Math.round(Math.max(...pops));

  // Choose the entry with highest POP to drive icon/description
  let chosen = entries[0];
  let maxPop = pops[0] ?? 0;

  entries.forEach((entry, idx) => {
    const pop = pops[idx] ?? 0;
    if (pop > maxPop) {
      maxPop = pop;
      chosen = entry;
    }
  });

  const weatherMain = chosen.weather?.[0]?.main ?? "Clear";
  const description = chosen.weather?.[0]?.description ?? "No description";

  return {
    high: Math.round(high),
    low: Math.round(low),
    rainChance,
    icon: mapConditionToIcon(weatherMain),
    description
  };
}

/**
 * Fetch a 5-day forecast for a city and return a map:
 *   { "YYYY-MM-DD": SimpleWeather, ... }
 *
 * You can then look up each cruise day by its ISO date string.
 */
export async function getDailyForecastsForCity(
  city: string,
  dates: string[]
): Promise<Record<string, SimpleWeather>> {
  console.log("FETCHING DAILY WEATHER FOR CITY:", city, "DATES:", dates);

  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
  console.log("ENV KEY PREFIX:", String(apiKey).slice(0, 5));

  if (!apiKey) {
    throw new Error("Missing VITE_WEATHER_API_KEY in .env.local or Vercel.");
  }

  const url = `${API_BASE}/forecast?q=${encodeURIComponent(
    city
  )}&units=imperial&appid=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status}`);
  }

  const data = await res.json();
  console.log("Weather API raw data:", data);

  // Group all entries by date (YYYY-MM-DD)
  const byDate: Record<string, any[]> = {};

  data.list.forEach((entry: any) => {
    const dtTxt = String(entry.dt_txt); // "2025-12-01 12:00:00"
    const dateKey = dtTxt.slice(0, 10); // "2025-12-01"
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(entry);
  });

  const result: Record<string, SimpleWeather> = {};

  // Only compute days we actually care about
  dates.forEach((dateKey) => {
    const entriesForDay = byDate[dateKey];
    if (entriesForDay && entriesForDay.length > 0) {
      result[dateKey] = aggregateDay(entriesForDay);
    }
  });

  console.log("Aggregated daily forecasts:", result);

  return result;
}
