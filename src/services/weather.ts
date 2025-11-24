// src/services/weather.ts

export type WeatherIcon = "sunny" | "partly" | "cloudy" | "rain";

export type WeatherSource = "forecast" | "climatology";

export type DailyForecast = {
  high: number;          // daily high temperature (°F)
  low: number;           // daily low temperature (°F)
  rainChance: number;    // % chance of precipitation
  icon: WeatherIcon;     // simplified icon code for UI
  description: string;   // human-readable description
  source: WeatherSource; // "forecast" (Tomorrow.io) or "climatology" (NCEI)
};

// Optional options for fallback behavior
export type ForecastOptions = {
  /**
   * NCEI station ID, e.g. "USW00012839" for Miami Intl Airport.
   * If provided, days missing from Tomorrow.io will be filled using
   * NOAA/NCEI 1991–2020 monthly climate normals for that station.
   */
  nceiStationId?: string;
};

const NCEI_PROXY_BASE =
  import.meta.env.VITE_NCEI_PROXY_BASE_URL ?? ""; // "" = same origin

// In-memory cache: key = city|dates|station => { [date]: DailyForecast }
const forecastCache: Record<string, Record<string, DailyForecast>> = {};

// Separate cache for NCEI monthly normals, keyed by station ID
type NceiMonthlyNormalRow = {
  STATION: string;
  NAME: string;
  MONTH: string; // "1".."12" or "01".."12"
  "MLY-TMAX-NORMAL"?: string;
  "MLY-TMIN-NORMAL"?: string;
  "MLY-TAVG-NORMAL"?: string;
  "MLY-PRCP-NORMAL"?: string;
};

const nceiNormalsCache: Record<string, NceiMonthlyNormalRow[]> = {};

// --- Helpers -------------------------------------------------------

function makeCacheKey(
  city: string,
  dates: string[],
  options?: ForecastOptions
): string {
  const station = options?.nceiStationId ?? "";
  return `${city.toLowerCase().trim()}|${dates.join(",")}|${station}`;
}

function mapTomorrowCodeToIcon(code: number): WeatherIcon {
  if (code >= 1000 && code < 1100) return "sunny";   // clear
  if (code >= 1100 && code < 1300) return "partly";  // partly cloudy
  if (code >= 2000 && code < 3000) return "cloudy";  // cloudy / fog
  return "rain";                                     // rain / snow / storms
}

/**
 * Fetch NCEI monthly climate normals (1991–2020) for a given station.
 * Uses your own backend proxy at /api/ncei-normals, which in turn calls
 * NCEI's "normals-monthly-1991-2020" dataset. This avoids browser CORS issues.
 */
async function getNceiMonthlyNormalsForStation(
  stationId: string
): Promise<NceiMonthlyNormalRow[]> {
  if (nceiNormalsCache[stationId]) {
    return nceiNormalsCache[stationId];
  }

  // If NCEI_PROXY_BASE is "", this will hit /api/ncei-normals on the same origin
  const url = `${NCEI_PROXY_BASE}/api/ncei-normals?stationId=${encodeURIComponent(
    stationId
  )}`;

  const res = await fetch(url);
  const text = await res.text();

  // Defensive: make sure we actually got JSON, not an HTML/TS file
  try {
    const json = JSON.parse(text) as
      | NceiMonthlyNormalRow[]
      | NceiMonthlyNormalRow;

    const rows = Array.isArray(json) ? json : [json];
    nceiNormalsCache[stationId] = rows;
    return rows;
  } catch (err) {
    console.error("NCEI normals proxy returned non-JSON:", text.slice(0, 200));
    throw new Error("NCEI normals proxy did not return JSON");
  }
}


/**
 * Build DailyForecast entries for specific dates using NCEI monthly normals.
 * Only fills dates that are currently missing in `existing`.
 */
async function fillMissingWithClimatology(
  dates: string[],
  existing: Record<string, DailyForecast>,
  stationId?: string
): Promise<Record<string, DailyForecast>> {
  if (!stationId) return existing;

  const missingDates = dates.filter((d) => !existing[d]);
  if (!missingDates.length) return existing;

  let normals: NceiMonthlyNormalRow[];
  try {
    normals = await getNceiMonthlyNormalsForStation(stationId);
  } catch (err) {
    console.error("Failed to get NCEI climatology:", err);
    return existing;
  }

  // Index normals by month (1..12)
  const normalsByMonth = new Map<number, NceiMonthlyNormalRow>();
  for (const row of normals) {
    const m = parseInt(row.MONTH, 10);
    if (!Number.isNaN(m)) {
      normalsByMonth.set(m, row);
    }
  }

  for (const iso of missingDates) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;

    const month = d.getUTCMonth() + 1; // 1..12
    const normal = normalsByMonth.get(month);
    if (!normal) continue;

    const tMax = normal["MLY-TMAX-NORMAL"];
    const tMin = normal["MLY-TMIN-NORMAL"];
    const tAvg = normal["MLY-TAVG-NORMAL"];
    const prcp = normal["MLY-PRCP-NORMAL"];

    const high =
      tMax != null
        ? parseFloat(tMax)
        : tAvg != null
        ? parseFloat(tAvg)
        : existing[iso]?.high ?? NaN;

    const low =
      tMin != null
        ? parseFloat(tMin)
        : tAvg != null
        ? parseFloat(tAvg)
        : existing[iso]?.low ?? NaN;

    if (Number.isNaN(high) || Number.isNaN(low)) {
      continue; // can't construct a meaningful climatology record
    }

    // Very rough proxy for "raininess" based on monthly precip (inches).
    // You can tweak this formula or keep it simple.
    const precipInches = prcp != null ? parseFloat(prcp) : 0;
    const rainChance = Math.max(
      0,
      Math.min(100, Math.round(precipInches * 10))
    );

    existing[iso] = {
      high,
      low,
      rainChance,
      icon: "partly", // generic icon for climatology days
      description: `Typical conditions for this time of year (30-year average). High ~${Math.round(
        high
      )}°, low ~${Math.round(low)}°, avg raininess for this month.`,
      source: "climatology",
    };
  }

  return existing;
}

// --- Main API ------------------------------------------------------

/**
 * Get daily forecasts for a given city and list of ISO dates ("YYYY-MM-DD").
 *
 * Primary source: Tomorrow.io daily forecast (v4).
 * Optional fallback: NCEI monthly climate normals (1991–2020) for
 * a given station, used only for dates that Tomorrow.io does not cover.
 *
 * Returns an object keyed by date.
 */
export async function getDailyForecastsForCity(
  city: string,
  dates: string[],
  options?: ForecastOptions
): Promise<Record<string, DailyForecast>> {
  const apiKey = import.meta.env.VITE_TOMORROW_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_TOMORROW_API_KEY is missing in this build.");
  }

  if (!city || !dates.length) {
    throw new Error("City or dates missing for forecast request.");
  }

  // ---- cache check ----
  const cacheKey = makeCacheKey(city, dates, options);
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
    // If Tomorrow.io fails completely, try pure climatology if possible
    if (options?.nceiStationId) {
      console.warn(
        "Tomorrow.io error, falling back entirely to climatology:",
        res.status,
        text.substring(0, 160)
      );
      const climatologyOnly = await fillMissingWithClimatology(
        dates,
        {},
        options.nceiStationId
      );
      if (Object.keys(climatologyOnly).length > 0) {
        forecastCache[cacheKey] = climatologyOnly;
        return climatologyOnly;
      }
    }

    throw new Error(
      `Tomorrow.io error ${res.status}: ${text.substring(0, 160)}`
    );
  }

  const data = await res.json();

  // Tomorrow.io daily forecasts live under data.timelines.daily[]
  const series: any[] = data?.timelines?.daily || [];

  const byDate: Record<string, DailyForecast> = {};

  if (series.length) {
    for (const point of series) {
      const iso = point.time as string; // e.g. "2025-11-22T00:00:00Z"
      const dateKey = iso.slice(0, 10); // "YYYY-MM-DD"
      const values = point.values || {};

      const high = values.temperatureMax;
      const low = values.temperatureMin;
      const pop =
        values.precipitationProbabilityAvg ??
        values.precipitationProbabilityMax ??
        0;
      const weatherCode = values.weatherCode ?? 1000;

      if (high == null || low == null) continue;

      byDate[dateKey] = {
        high,
        low,
        rainChance: pop,
        icon: mapTomorrowCodeToIcon(weatherCode),
        description: `High ${Math.round(high)}°, low ${Math.round(
          low
        )}°, ${Math.round(pop)}% chance of precipitation.`,
        source: "forecast",
      };
    }
  }

  // Check which requested dates we actually have from Tomorrow.io
  const missingDates = dates.filter((d) => !byDate[d]);

  // If Tomorrow.io covers all requested days, we're done
  if (!missingDates.length) {
    forecastCache[cacheKey] = byDate;
    return byDate;
  }

  // If some dates are missing AND we have a station ID, fill with climatology
  if (options?.nceiStationId) {
    const merged = await fillMissingWithClimatology(
      dates,
      byDate,
      options.nceiStationId
    );
    // If we still ended up with nothing, treat as error; otherwise return what we have
    const finalMissing = dates.filter((d) => !merged[d]);
    if (finalMissing.length === dates.length) {
      const available = Object.keys(merged);
      throw new Error(
        `No matching forecast or climatology dates. Requested: ${dates.join(
          ", "
        )} — Available: ${available.join(", ") || "none"}`
      );
    }

    forecastCache[cacheKey] = merged;
    return merged;
  }

  // No climatology fallback configured: preserve your original behavior
  const matchingDates = dates.filter((d) => byDate[d]);
  if (!matchingDates.length) {
    const available = Object.keys(byDate);
    throw new Error(
      `No matching forecast dates. Requested: ${dates.join(
        ", "
      )} — Available: ${available.join(", ") || "none"}`
    );
  }

  forecastCache[cacheKey] = byDate;
  return byDate;
}
