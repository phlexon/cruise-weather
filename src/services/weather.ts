// src/services/weather.ts

// --- Types ---------------------------------------------------------

export type WeatherIcon = "sunny" | "partly" | "cloudy" | "rain";

export type DailyForecast = {
  high: number;          // daily high temperature (°F)
  low: number;           // daily low temperature (°F)
  rainChance: number;    // % chance of precipitation
  icon: WeatherIcon;     // simplified icon code for UI
  description: string;   // human-readable description
};

// In-memory cache: key = city|date1,date2,...  => { [date]: DailyForecast }
const forecastCache: Record<string, Record<string, DailyForecast>> = {};

// --- Helpers -------------------------------------------------------

function makeCacheKey(city: string, dates: string[]): string {
  return `${city.toLowerCase().trim()}|${dates.join(",")}`;
}

function mapTomorrowCodeToIcon(code: number): WeatherIcon {
  // You can tweak the ranges if you want more nuance.
  if (code >= 1000 && code < 1100) return "sunny";   // clear
  if (code >= 1100 && code < 1300) return "partly";  // partly cloudy
  if (code >= 2000 && code < 3000) return "cloudy";  // cloudy / fog
  return "rain";                                     // rain / snow / storms
}

// --- Main API ------------------------------------------------------

/**
 * Get daily forecasts for a given city and list of ISO dates ("YYYY-MM-DD").
 * Returns an object keyed by date.
 *
 * Example:
 *  const forecasts = await getDailyForecastsForCity("Miami", ["2025-11-22"]);
 *  const day = forecasts["2025-11-22"];
 */
export async function getDailyForecastsForCity(
  city: string,
  dates: string[]
): Promise<Record<string, DailyForecast>> {
  const apiKey = import.meta.env.VITE_TOMORROW_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_TOMORROW_API_KEY is missing in this build.");
  }

  if (!city || !dates.length) {
    throw new Error("City or dates missing for forecast request.");
  }

  // ---- cache check ----
  const cacheKey = makeCacheKey(city, dates);
  if (forecastCache[cacheKey]) {
    return forecastCache[cacheKey];
  }

  // Assume dates[] are already sorted and ISO (YYYY-MM-DD).
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // Build Tomorrow.io v4 forecast URL
  const url = new URL("https://api.tomorrow.io/v4/weather/forecast");
  url.searchParams.set("location", city);
  url.searchParams.set("timesteps", "1d");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("startTime", `${startDate}T00:00:00Z`);
  url.searchParams.set("endTime", `${endDate}T23:59:59Z`);
  url.searchParams.set("units", "imperial");

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Tomorrow.io error ${res.status}: ${text.substring(0, 160)}`
    );
  }

  const data = await res.json();

  // Tomorrow.io daily forecasts live under data.timelines.daily[]
  const series: any[] = data?.timelines?.daily || [];

  if (!series.length) {
    throw new Error(
      `Tomorrow.io returned no daily data for ${city} between ${startDate} and ${endDate}.`
    );
  }

  const byDate: Record<string, DailyForecast> = {};

  for (const point of series) {
    const iso = point.time as string;         // e.g. "2025-11-22T00:00:00Z"
    const dateKey = iso.slice(0, 10);         // "YYYY-MM-DD"
    const values = point.values || {};

    const high = values.temperatureMax;
    const low = values.temperatureMin;
    const pop =
      values.precipitationProbabilityAvg ??
      values.precipitationProbabilityMax ??
      0;
    const weatherCode = values.weatherCode ?? 1000;

    // If we don't at least have a high/low, skip this day.
    if (high == null || low == null) continue;

    byDate[dateKey] = {
      high,
      low,
      rainChance: pop,
      icon: mapTomorrowCodeToIcon(weatherCode),
      description: `High ${Math.round(high)}°, low ${Math.round(
        low
      )}°, ${Math.round(pop)}% chance of precipitation.`,
    };
  }

  // Make sure at least one of the requested dates actually has data
  const matchingDates = dates.filter((d) => byDate[d]);
  if (!matchingDates.length) {
    const available = Object.keys(byDate);
    throw new Error(
      `No matching forecast dates. Requested: ${dates.join(
        ", "
      )} — Available: ${available.join(", ") || "none"}`
    );
  }

  // Cache & return
  forecastCache[cacheKey] = byDate;
  return byDate;
}
