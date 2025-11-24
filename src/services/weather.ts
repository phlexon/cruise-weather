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

export type ForecastOptions = {
  /** NCEI station ID, e.g. "USW00012839" for Miami Intl Airport. */
  nceiStationId?: string;
};

// In-memory cache: key = city|dates|station => { [date]: DailyForecast }
const forecastCache: Record<string, Record<string, DailyForecast>> = {};

// NCEI normals row shape – supports either MONTH or DATE field
type NceiMonthlyNormalRow = {
  STATION: string;
  NAME: string;
  DATE?: string;   // e.g. "2010-11-01"
  MONTH?: string;  // some configs may expose this
  "MLY-TMAX-NORMAL"?: string;
  "MLY-TMIN-NORMAL"?: string;
  "MLY-TAVG-NORMAL"?: string;
  "MLY-PRCP-NORMAL"?: string;
};

const nceiNormalsCache: Record<string, NceiMonthlyNormalRow[]> = {};

// Base URL for proxy (same origin by default)
const NCEI_PROXY_BASE = import.meta.env.VITE_NCEI_PROXY_BASE_URL ?? "";

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
  if (code >= 1000 && code < 1100) return "sunny";
  if (code >= 1100 && code < 1300) return "partly";
  if (code >= 2000 && code < 3000) return "cloudy";
  return "rain";
}

/**
 * Fetch NCEI monthly climate normals (1991–2020) for a given station
 * via your backend proxy at /api/ncei-normals (to avoid browser CORS).
 */
async function getNceiMonthlyNormalsForStation(
  stationId: string
): Promise<NceiMonthlyNormalRow[]> {
  if (nceiNormalsCache[stationId]) {
    return nceiNormalsCache[stationId];
  }

  const url = `${NCEI_PROXY_BASE}/api/ncei-normals?stationId=${encodeURIComponent(
    stationId
  )}`;

  const res = await fetch(url);
  const text = await res.text();

  try {
    const json = JSON.parse(text) as NceiMonthlyNormalRow[] | NceiMonthlyNormalRow;
    const rows = Array.isArray(json) ? json : [json];
    nceiNormalsCache[stationId] = rows;
    return rows;
  } catch {
    console.error("NCEI normals proxy returned non-JSON:", text.slice(0, 200));
    throw new Error("NCEI normals proxy did not return JSON");
  }
}

/**
 * Extract a 1–12 month number from a normals row.
 * Supports either MONTH column or DATE column.
 */
function getMonthFromNormalRow(row: NceiMonthlyNormalRow): number | null {
  if (row.MONTH) {
    const m = parseInt(row.MONTH, 10);
    if (!Number.isNaN(m) && m >= 1 && m <= 12) return m;
  }
  if (row.DATE) {
    const d = new Date(row.DATE);
    if (!Number.isNaN(d.getTime())) {
      return d.getUTCMonth() + 1; // 1..12
    }
  }
  return null;
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

  const normalsByMonth = new Map<number, NceiMonthlyNormalRow>();
  for (const row of normals) {
    const m = getMonthFromNormalRow(row);
    if (m != null) {
      // last one wins if duplicates, which is fine here
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

    if (Number.isNaN(high) || Number.isNaN(low)) continue;

    const precipInches = prcp != null ? parseFloat(prcp) : 0;
    const rainChance = Math.max(
      0,
      Math.min(100, Math.round(precipInches * 10))
    );

    existing[iso] = {
      high,
      low,
      rainChance,
      icon: "partly",
      description: `Typical conditions for this time of year (30-year average). High ~${Math.round(
        high
      )}°, low ~${Math.round(low)}°, avg raininess for this month.`,
      source: "climatology",
    };
  }

  return existing;
}

// --- Main API ------------------------------------------------------

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

  const cacheKey = makeCacheKey(city, dates, options);
  if (forecastCache[cacheKey]) {
    return forecastCache[cacheKey];
  }

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

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
  const series: any[] = data?.timelines?.daily || [];

  const byDate: Record<string, DailyForecast> = {};

  if (series.length) {
    for (const point of series) {
      const iso = point.time as string;
      const dateKey = iso.slice(0, 10);
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

  // Missing dates + debug
  const missingDates = dates.filter((d) => !byDate[d]);
  console.log("Weather debug:", {
    city,
    stationId: options?.nceiStationId ?? null,
    missingDates,
  });

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

  // No climatology fallback configured: preserve original behavior
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
