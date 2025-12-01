// src/services/weather.ts

export type WeatherIcon = "sunny" | "partly" | "cloudy" | "rain";
export type WeatherSource = "forecast" | "climatology";

export type DailyForecast = {
  high: number;          // daily high temperature (°F)
  low: number;           // daily low temperature (°F)
  rainChance: number;    // % chance of precipitation
  icon: WeatherIcon;     // simplified icon code for UI
  description: string;   // human-readable description
  source: WeatherSource; // "forecast" (Tomorrow.io) or "climatology" (NCEI/approx)
};

export type ForecastOptions = {
  /** NCEI station ID, e.g. "USW00012839" for Miami Intl Airport. */
  nceiStationId?: string;
};

export function normalizePortName(raw: string): string {
  if (!raw) return "Miami, FL"; // fallback

  const lower = raw.toLowerCase();

  if (lower.includes("sea")) return "Caribbean Sea"; // safe location

  if (lower.includes("fort lauderdale")) return "Fort Lauderdale, FL";
  if (lower.includes("miami")) return "Miami, FL";
  if (lower.includes("nasau")) return "Nassau, Bahamas";
  if (lower.includes("cozumel")) return "Cozumel, Mexico";

  // strip extra descriptors like "Port Everglades, Florida"
  return raw.split(",")[0];
}

// Map our city string to the format Tomorrow.io likes (lat,lon where possible)
function toTomorrowLocation(city: string): string {
  const lower = city.toLowerCase();

  // Known embarkation / cruise ports – use lat,lon so Tomorrow.io never has to geocode
  if (lower.includes("fort lauderdale")) return "26.1224,-80.1373";
  if (lower.includes("miami")) return "25.7617,-80.1918";
  if (lower.includes("port canaveral")) return "28.4058,-80.6042";
  if (lower.includes("galveston")) return "29.3013,-94.7977";
  if (lower.includes("tampa")) return "27.9506,-82.4572";
  if (lower.includes("nassau")) return "25.0478,-77.3554";
  if (lower.includes("cozumel")) return "20.4220,-86.9223";

  // Fallback: send the raw city; if Tomorrow.io can parse it, great
  return city;
}

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

// Base URL for proxy (optional).
// If not set, we'll call "/api/ncei-normals" directly.
const NCEI_PROXY_BASE = import.meta.env.VITE_NCEI_PROXY_BASE_URL;

/**
 * Build the URL for the NCEI proxy.
 *
 * - If VITE_NCEI_PROXY_BASE_URL is set (e.g. "/api"), we call:
 *     "<base>/ncei-normals?stationId=..."
 *
 * - If it's NOT set, we fall back to:
 *     "/api/ncei-normals?stationId=..."
 */
function buildNceiProxyUrl(stationId: string): string {
  if (!NCEI_PROXY_BASE) {
    // Default: same-origin API route
    return `/api/ncei-normals?stationId=${encodeURIComponent(stationId)}`;
  }

  const trimmed = NCEI_PROXY_BASE.endsWith("/")
    ? NCEI_PROXY_BASE.slice(0, -1)
    : NCEI_PROXY_BASE;

  return `${trimmed}/ncei-normals?stationId=${encodeURIComponent(stationId)}`;
}

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
  // Use cache if we already fetched this station
  if (nceiNormalsCache[stationId]) {
    return nceiNormalsCache[stationId];
  }

  const url = buildNceiProxyUrl(stationId);
  console.log("[NCEI] Fetching normals from:", url);

  let res: Response;
  let text: string;

  try {
    res = await fetch(url);
    text = await res.text();
  } catch (err) {
    console.error("[NCEI] Fetch to proxy failed:", err);
    return [];
  }

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok || !contentType.includes("application/json")) {
    console.error(
      "[NCEI] Proxy returned non-JSON or error response:",
      res.status,
      text.slice(0, 200)
    );
    // Don't blow up the app; just skip climatology in this case.
    return [];
  }

  try {
    const json = JSON.parse(text) as
      | NceiMonthlyNormalRow[]
      | NceiMonthlyNormalRow;
    const rows = Array.isArray(json) ? json : [json];
    nceiNormalsCache[stationId] = rows;
    console.log(
      "[NCEI] Loaded normals rows:",
      rows.length,
      rows[0] ? Object.keys(rows[0]) : "(no keys)"
    );
    return rows;
  } catch (err) {
    console.error("[NCEI] Failed to parse proxy JSON:", err, text.slice(0, 200));
    return [];
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
  if (!stationId) {
    console.log("[NCEI] No stationId provided, skipping climatology.");
    return existing;
  }

  const missingDates = dates.filter((d) => !existing[d]);
  if (!missingDates.length) {
    console.log("[NCEI] No missing dates to fill with climatology.");
    return existing;
  }

  console.log("[NCEI] Filling missing days with climatology:", {
    stationId,
    missingDates,
  });

  let normals: NceiMonthlyNormalRow[];
  try {
    normals = await getNceiMonthlyNormalsForStation(stationId);
  } catch (err) {
    console.error("[NCEI] Failed to get climatology:", err);
    return existing;
  }

  if (!normals || normals.length === 0) {
    console.warn("[NCEI] No normals returned for station:", stationId);
    // No normals available; just return what we have from Tomorrow.io
    return existing;
  }

  // Build a map month -> row.
  const normalsByMonth = new Map<number, NceiMonthlyNormalRow>();
  for (const row of normals) {
    const m = getMonthFromNormalRow(row);
    if (m != null) {
      normalsByMonth.set(m, row);
    }
  }

  // Fallback: if we couldn't detect months from DATE/MONTH fields,
  // assume rows are in Jan..Dec order and map by index.
  if (normalsByMonth.size === 0) {
    console.warn(
      "[NCEI] Could not infer months from DATE/MONTH fields; falling back to index-based month mapping."
    );
    normals.forEach((row, idx) => {
      const monthIndex = idx + 1; // 1..12
      normalsByMonth.set(monthIndex, row);
    });
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
        ? Number(tMax)
        : tAvg != null
        ? Number(tAvg)
        : existing[iso]?.high ?? NaN;

    const low =
      tMin != null
        ? Number(tMin)
        : tAvg != null
        ? Number(tAvg)
        : existing[iso]?.low ?? NaN;

    if (!Number.isFinite(high) || !Number.isFinite(low)) {
      console.warn("[NCEI] Skipping normals with bad temps:", {
        iso,
        tMax,
        tMin,
        tAvg,
      });
      continue;
    }

    const precipInches = prcp != null ? Number(prcp) : 0;
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

  console.log("[NCEI] After fill, keys:", Object.keys(existing));
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
    console.warn(
      "[Weather] VITE_TOMORROW_API_KEY is missing – returning empty forecast."
    );
    return {};
  }

  if (!city || !dates.length) {
    console.warn("[Weather] City or dates missing for forecast request.");
    return {};
  }

  const cacheKey = makeCacheKey(city, dates, options);
  if (forecastCache[cacheKey]) {
    return forecastCache[cacheKey];
  }

  // --- Build safe start/end times ---------------------------------
  // dates are "YYYY-MM-DD"
  const sorted = [...dates].sort();
  const firstDateStr = sorted[0];
  const lastDateStr = sorted[sorted.length - 1];

  // Convert to Date objects in UTC
  const earliest = new Date(firstDateStr + "T00:00:00Z");
  const latest = new Date(lastDateStr + "T23:59:59Z");
  const now = new Date();

  // Clamp start to "now" if earliest is in the past
  let startDate = earliest < now ? now : earliest;
  let endDate = latest;

  // Ensure start is never after end
  if (startDate > endDate) {
    startDate = endDate;
  }

  const startTimeIso = startDate.toISOString();
  const endTimeIso = endDate.toISOString();

  const url = new URL("https://api.tomorrow.io/v4/weather/forecast");
  url.searchParams.set("location", toTomorrowLocation(city));
  url.searchParams.set("timesteps", "1d");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("startTime", startTimeIso);
  url.searchParams.set("endTime", endTimeIso);
  url.searchParams.set("units", "imperial");

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text().catch(() => "");

    if (options?.nceiStationId) {
      console.warn(
        "[Tomorrow.io] Error, falling back entirely to climatology:",
        res.status,
        text.substring(0, 160)
      );
      try {
        const climatologyOnly = await fillMissingWithClimatology(
          dates,
          {},
          options.nceiStationId
        );
        if (Object.keys(climatologyOnly).length > 0) {
          forecastCache[cacheKey] = climatologyOnly;
          return climatologyOnly;
        }
      } catch (err) {
        console.warn("[NCEI] Climatology fallback failed:", err);
      }
    }

    // 👇 don’t crash the app; just log & return empty
    console.warn(
      "[Tomorrow.io] Error and no climatology available; returning empty forecast:",
      res.status,
      text.substring(0, 200)
    );
    return {};
  }

  const data = await res.json();
  const series: any[] = data?.timelines?.daily || [];

  const byDate: Record<string, DailyForecast> = {};

  if (series.length) {
    for (const point of series) {
      const iso = point.time as string;
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

  // --- Optionally fill missing days with climatology --------------
  let finalForecasts: Record<string, DailyForecast> = byDate;

  if (options?.nceiStationId) {
    const missingDates = dates.filter((d) => !finalForecasts[d]);
    if (missingDates.length) {
      console.warn(
        "[Weather] Missing forecast dates, using climatology for:",
        missingDates
      );
      try {
        finalForecasts = await fillMissingWithClimatology(
          dates,
          finalForecasts,
          options.nceiStationId
        );
      } catch (err) {
        console.warn(
          "[NCEI] Failed to fill missing dates with climatology:",
          err
        );
      }
    }
  }

  // Cache & return
  forecastCache[cacheKey] = finalForecasts;
  return finalForecasts;
}
