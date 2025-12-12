// ============================================================
// WEATHER SERVICE — Tomorrow.io + NCEI Climatology Fallback
// ============================================================

export type WeatherIcon = "sunny" | "partly" | "cloudy" | "rain";
export type WeatherSource = "forecast" | "climatology";

export type DailyForecast = {
  high: number;
  low: number;
  rainChance: number;
  icon: WeatherIcon;
  description: string;
  source: WeatherSource;
};

export type ForecastOptions = {
  /** NCEI station ID, e.g. "USW00012839" */
  nceiStationId?: string;
};

// ============================================================
// Helpers to normalize / map port names
// ============================================================

/**
 * Normalize a raw port name into a generic city-ish string.
 * This is mostly for Tomorrow.io when we pass a text location.
 */
export function normalizePortName(raw: string): string {
  if (!raw) return "Miami, FL";

  const lower = raw.toLowerCase();

  if (lower.includes("sea")) return "Caribbean Sea";

  if (lower.includes("fort lauderdale")) return "Fort Lauderdale, FL";
  if (lower.includes("miami")) return "Miami, FL";
  if (lower.includes("nassau")) return "Nassau, Bahamas";
  if (lower.includes("cozumel")) return "Cozumel, Mexico";

  // Fallback: strip extra descriptors
  return raw.split(",")[0];
}

/**
 * Map a city/port string to a Tomorrow.io location parameter.
 * For known ports we send lat,lon. Otherwise we send the raw
 * city string and let Tomorrow.io geocode it.
 */
function toTomorrowLocation(city: string): string {
  const lower = city.toLowerCase();

  // Known embarkation / cruise ports – use lat,lon
  if (lower.includes("fort lauderdale")) return "26.1224,-80.1373";
  if (lower.includes("miami")) return "25.7617,-80.1918";
  if (lower.includes("port canaveral")) return "28.4058,-80.6042";
  if (lower.includes("galveston")) return "29.3013,-94.7977";
  if (lower.includes("tampa")) return "27.9506,-82.4572";
  if (lower.includes("nassau")) return "25.0478,-77.3554";
  if (lower.includes("cozumel")) return "20.4220,-86.9223";

  // Fallback: pass the raw city text
  return city;
}

// ============================================================
// Internal caches
// ============================================================

const forecastCache: Record<string, Record<string, DailyForecast>> = {};
const nceiNormalsCache: Record<string, NceiMonthlyNormalRow[]> = {};

function makeCacheKey(
  city: string,
  dates: string[],
  opts?: ForecastOptions
): string {
  return `${city.toLowerCase().trim()}|${dates.join(",")}|${
    opts?.nceiStationId ?? ""
  }`;
}

// ============================================================
// Tomorrow.io weather code → 4-icon mapping
// ============================================================

function mapTomorrowCodeToIcon(code: number): WeatherIcon {
  // Clear / mostly clear
  if (code === 1000 || code === 1100) return "sunny";

  // Partly cloudy family
  if (code === 1101 || code === 1102 || code === 1103) return "partly";

  // Cloudy & fog-type conditions
  if (
    code === 1001 || // Cloudy
    (code >= 2000 && code < 3000) // Fog, light fog, etc.
  ) {
    return "cloudy";
  }

  // Everything else (drizzle, rain, snow, storms, etc.)
  return "rain";
}

// ============================================================
// NCEI Proxy Handling
// ============================================================

const NCEI_PROXY_BASE = import.meta.env.VITE_NCEI_PROXY_BASE_URL;

function buildNceiProxyUrl(stationId: string): string {
  if (!NCEI_PROXY_BASE) {
    // Local /api proxy path
    return `/api/ncei-normals?stationId=${encodeURIComponent(stationId)}`;
  }

  const trimmed = NCEI_PROXY_BASE.endsWith("/")
    ? NCEI_PROXY_BASE.slice(0, -1)
    : NCEI_PROXY_BASE;

  return `${trimmed}/ncei-normals?stationId=${encodeURIComponent(stationId)}`;
}

type NceiMonthlyNormalRow = {
  STATION: string;
  NAME: string;
  DATE?: string;
  MONTH?: string;
  "MLY-TMAX-NORMAL"?: string;
  "MLY-TMIN-NORMAL"?: string;
  "MLY-TAVG-NORMAL"?: string;
  "MLY-PRCP-NORMAL"?: string;
};

async function getNceiMonthlyNormalsForStation(
  stationId: string
): Promise<NceiMonthlyNormalRow[]> {
  if (nceiNormalsCache[stationId]) {
    return nceiNormalsCache[stationId];
  }

  const url = buildNceiProxyUrl(stationId);
  console.log("[NCEI] REQUESTING URL:", url);

  console.log("[NCEI] Fetching normals from:", url);

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    console.error("[NCEI] Proxy fetch failed:", err);
    return [];
  }

  if (!res.ok) {
    console.error(
      "[NCEI] Proxy returned error:",
      res.status,
      await res.text().catch(() => "")
    );
    return [];
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    console.error("[NCEI] Failed to parse JSON:", err);
    return [];
  }

  const rows = Array.isArray(json) ? (json as NceiMonthlyNormalRow[]) : [json as NceiMonthlyNormalRow];
  nceiNormalsCache[stationId] = rows;
  console.log(
    "[NCEI] Loaded normals rows:",
    rows.length,
    rows[0] ? Object.keys(rows[0]) : "(no keys)"
  );
  return rows;
}

function getMonthFromNormalRow(row: NceiMonthlyNormalRow): number | null {
  if (row.MONTH) {
    const m = parseInt(row.MONTH, 10);
    if (!Number.isNaN(m) && m >= 1 && m <= 12) return m;
  }
  if (row.DATE) {
    const d = new Date(row.DATE);
    if (!Number.isNaN(d.getTime())) {
      return d.getUTCMonth() + 1;
    }
  }
  return null;
}

// ============================================================
// Fill missing forecast days with NCEI climatology
// ============================================================

async function fillMissingWithClimatology(
  dates: string[],
  existing: Record<string, DailyForecast>,
  stationId?: string
): Promise<Record<string, DailyForecast>> {
  if (!stationId) {
    console.log("[NCEI] No stationId provided, skipping climatology.");
    return existing;
  }

  const missing = dates.filter((d) => !existing[d]);
  if (!missing.length) {
    return existing;
  }

  console.log("[NCEI] Filling missing days with climatology:", {
    stationId,
    missing,
  });

  const rows = await getNceiMonthlyNormalsForStation(stationId);
  if (!rows.length) {
    console.warn("[NCEI] No normals returned for station:", stationId);
    return existing;
  }

  const normalsByMonth = new Map<number, NceiMonthlyNormalRow>();
  for (const row of rows) {
    const m = getMonthFromNormalRow(row);
    if (m != null && !normalsByMonth.has(m)) {
      normalsByMonth.set(m, row);
    }
  }

  if (!normalsByMonth.size) {
    console.warn(
      "[NCEI] Could not infer months from DATE/MONTH; climatology not applied."
    );
    return existing;
  }

  for (const iso of missing) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;

    const month = d.getUTCMonth() + 1;
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
      high: Math.round(high),
      low: Math.round(low),
      rainChance,
      icon: "partly",
      description:
        "Typical conditions for this time of year (30-year average).",
      source: "climatology",
    };
  }

  console.log("[NCEI] After fill, keys:", Object.keys(existing));
  return existing;
}

// ============================================================
// MAIN: Tomorrow.io + NCEI fallback
// ============================================================

export async function getDailyForecastsForCity(
  city: string, // e.g. "Miami, FL" OR "25.76,-80.19"
  dates: string[],
  options?: ForecastOptions
): Promise<Record<string, DailyForecast>> {
  const apiKey = import.meta.env.VITE_TOMORROW_API_KEY;

  if (!apiKey) {
    console.warn(
      "[Weather] VITE_TOMORROW_API_KEY is missing – cannot fetch forecast."
    );
    // If no key, best we can do is NCEI-only (if provided)
    if (options?.nceiStationId) {
      return await fillMissingWithClimatology(dates, {}, options.nceiStationId);
    }
    return {};
  }

  if (!dates.length) {
    console.warn("[Weather] No dates requested for forecast.");
    return {};
  }

  const normalizedCity = city.trim();
  const cacheKey = makeCacheKey(normalizedCity, dates, options);

  if (forecastCache[cacheKey]) {
    return forecastCache[cacheKey];
  }

  const locationParam = toTomorrowLocation(normalizedCity);

  // -------------------------------
  // Determine start/end time for Tomorrow.io
  // -------------------------------
  const sortedDates = [...dates].sort();
  const earliest = new Date(sortedDates[0] + "T00:00:00Z");
  const latest = new Date(sortedDates[sortedDates.length - 1] + "T23:59:59Z");
  const now = new Date();

  let startDate = earliest < now ? now : earliest;
  let endDate = latest;
  if (startDate > endDate) startDate = endDate;

  const startTimeIso = startDate.toISOString();
  const endTimeIso = endDate.toISOString();

  const url = new URL("https://api.tomorrow.io/v4/weather/forecast");
  url.searchParams.set("location", locationParam);
  url.searchParams.set("timesteps", "1d");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("units", "imperial");
  url.searchParams.set("startTime", startTimeIso);
  url.searchParams.set("endTime", endTimeIso);

  let res: Response;

  try {
    res = await fetch(url.toString());
  } catch (err) {
    console.error("[Tomorrow.io] Network failure:", err);

    // Network fail → try pure climatology if stationId is provided
    if (options?.nceiStationId) {
      const climatologyOnly = await fillMissingWithClimatology(
        dates,
        {},
        options.nceiStationId
      );
      forecastCache[cacheKey] = climatologyOnly;
      return climatologyOnly;
    }

    return {};
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(
      "[Tomorrow.io] HTTP error:",
      res.status,
      text.substring(0, 200)
    );

    // API error → try NCEI-only if stationId exists
    if (options?.nceiStationId) {
      const climatologyOnly = await fillMissingWithClimatology(
        dates,
        {},
        options.nceiStationId
      );
      forecastCache[cacheKey] = climatologyOnly;
      return climatologyOnly;
    }

    return {};
  }

  // -------------------------------
  // Parse Tomorrow.io forecast
  // -------------------------------
  let json: any;
  try {
    json = await res.json();
  } catch (err) {
    console.error("[Tomorrow.io] Failed to parse JSON:", err);
    if (options?.nceiStationId) {
      const climatologyOnly = await fillMissingWithClimatology(
        dates,
        {},
        options.nceiStationId
      );
      forecastCache[cacheKey] = climatologyOnly;
      return climatologyOnly;
    }
    return {};
  }

  const series: any[] = json?.timelines?.daily || [];
  const forecasts: Record<string, DailyForecast> = {};

  if (series.length) {
    for (const point of series) {
      const iso = point.time as string;
      const dateKey = iso.slice(0, 10);

      if (!dates.includes(dateKey)) continue;

      const values = point.values || {};
      const high = values.temperatureMax;
      const low = values.temperatureMin;

      if (high == null || low == null) continue;

      const popRaw =
        values.precipitationProbabilityMax ??
        values.precipitationProbabilityAvg ??
        0;
      const pop = Math.max(0, Math.min(100, Math.round(popRaw)));

      const rawWeatherCode =
        values.weatherCodeMax ??
        values.weatherCodeMin ??
        values.weatherCode ??
        1000;

      let icon = mapTomorrowCodeToIcon(rawWeatherCode);

      if (pop >= 50) {
        icon = "rain";
      } else if (pop >= 30) {
        icon = "partly";
      }

      forecasts[dateKey] = {
        high: Math.round(high),
        low: Math.round(low),
        rainChance: pop,
        icon,
        description: `High ${Math.round(high)}°, low ${Math.round(
          low
        )}°, ${pop}% chance of precipitation.`,
        source: "forecast",
      };
    }
  }

  // -------------------------------
  // Fill missing days with NCEI climatology (if available)
  // -------------------------------
  let finalForecasts: Record<string, DailyForecast> = forecasts;

  if (options?.nceiStationId) {
    finalForecasts = await fillMissingWithClimatology(
      dates,
      finalForecasts,
      options.nceiStationId
    );
  }

  forecastCache[cacheKey] = finalForecasts;
  return finalForecasts;
}
