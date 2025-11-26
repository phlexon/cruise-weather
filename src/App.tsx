// src/App.tsx
import React, { useEffect, useState } from "react";
import CruiseForm from "./components/CruiseForm";
import CruiseResults from "./components/CruiseResults";
import WeatherTimeline from "./components/WeatherTimeline";
import {
  searchCruisesByDate,
  getItineraryFromApify,
  type CruiseSummary,
  type CruiseDay,
} from "./services/cruiseApi";
import { getDailyForecastsForCity } from "./services/weather";
import { getNceiStationForCity } from "./data/nceiStations";
import { sampleItinerary } from "./data/mockData";
import Spinner from "./components/Spinner";

// 👉 NEW: home screen
import HomeScreen from "./screens/HomeScreen";

type CruiseSelection = {
  lineId: string;
  shipId: string;
  sailDate: string; // "YYYY-MM-DD"
  lineName?: string;
  shipName?: string;
};

type ItineraryDay = {
  day: number;
  date?: string;
  location: string;
  high?: number;
  low?: number;
  rainChance?: number;
  icon?: "sunny" | "partly" | "cloudy" | "rain";
  description?: string;
  source?: "forecast" | "climatology";
};

export default function App() {
  // 👉 NEW: simple view switcher
  const [view, setView] = useState<"home" | "app">("home");

  const [searchResults, setSearchResults] = useState<CruiseSummary[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [selectedCruise, setSelectedCruise] = useState<CruiseSummary | null>(
    null
  );
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(
    sampleItinerary as unknown as ItineraryDay[]
  );

  // Does the selected cruise have ANY weather data at all?
  const [hasWeather, setHasWeather] = useState<boolean>(false);

  // keep track of the sail date the user selected in the form/calendar
  const [currentSailDate, setCurrentSailDate] = useState<string | null>(null);

  // ✅ NEW: auto-open when there is exactly one matching cruise
  const [shouldAutoOpenSingle, setShouldAutoOpenSingle] = useState(false);

  // simple "isMobile" flag for header layout
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const selectedIndex =
    selectedCruise && searchResults.length
      ? searchResults.findIndex((c) => c.id === selectedCruise.id)
      : null;

  // ---------- SEARCH (called from form + calendar) ----------
  const handleCruiseSubmit = async ({
    lineName,
    shipName,
    sailDate,
  }: CruiseSelection) => {
    setLoadingSearch(true);
    setError(null);
    setDetailsError(null);
    setSelectedCruise(null);
    setSearchResults([]);
    setHasSubmitted(false);
    setHasWeather(false);
    setShouldAutoOpenSingle(false);

    // store the sail date the user picked
    setCurrentSailDate(sailDate);

    try {
      const results = await searchCruisesByDate(sailDate);

      // Filter to match selected line + ship if names are provided
      const filtered = results.filter((c) => {
        if (lineName && c.cruiseLine !== lineName) return false;
        if (shipName && c.shipName !== shipName) return false;
        return true;
      });

      setSearchResults(filtered);
      setHasSubmitted(true);

      if (filtered.length === 1) {
        // ✅ exactly one cruise — auto-open it
        setShouldAutoOpenSingle(true);
      } else {
        setSelectedCruise(null);
        setShouldAutoOpenSingle(false);
      }
    } catch (e) {
      console.error("Error searching cruises:", e);
      setError("There was a problem loading cruise results.");
      setHasSubmitted(true);
      setShouldAutoOpenSingle(false);
    } finally {
      setLoadingSearch(false);
    }
  };

  // ---------- LOAD DETAILS FOR A SPECIFIC CRUISE ----------
  const loadCruiseDetails = async (cruise: CruiseSummary) => {
    setSelectedCruise(cruise);
    setLoadingDetails(true);
    setDetailsError(null);
    setHasWeather(false);

    try {
      // 1) Load itinerary from Apify
      const cruiseDays: CruiseDay[] = await getItineraryFromApify({
        shipName: cruise.shipName,
        sailDate: cruise.departIso,
      });

      let daysToUse = cruiseDays;

      if (!daysToUse || daysToUse.length === 0) {
        console.warn("No Apify itinerary found — using sampleItinerary");
        daysToUse = (sampleItinerary as any[]).map(
          (d: any, idx: number): CruiseDay => ({
            dayNumber: idx + 1,
            date: d.date,
            portName:
              d.location?.replace("(Embarkation)", "").trim() ?? d.location,
            rawStopText: d.location,
          })
        );
      }

      // Helper to normalize port/sea-day labels
      const getLocationLabel = (day: CruiseDay, idx: number): string => {
        const raw = (day as any).rawStopText ?? "";
        const portName = (day as any).portName?.trim?.() ?? "";

        const text = `${portName} ${raw}`.toLowerCase();

        // Treat anything that looks like "at sea" / "sea day" as a sea day
        if (text.includes("at sea") || text.includes("sea day")) {
          return "At sea";
        }

        // If port name is empty but we have some raw text, use that
        if (!portName && raw) {
          return raw;
        }

        // Fallback to portName or a generic label
        return portName || `Day ${idx + 1}`;
      };

      // 2) Basic mapping used by the UI (location + day index)
      let mapped: ItineraryDay[] = daysToUse.map((day, idx) => ({
        day: idx + 1,
        date: day.date, // will be overwritten with aligned date below
        location: getLocationLabel(day, idx),
        icon: "sunny",
        description: "Loading weather…",
      }));

      // --- ALIGN DATES TO THE USER-SELECTED SAIL DATE ---
      const sailIso = currentSailDate ?? cruise.departIso; // "YYYY-MM-DD"
      const sailDateObj = new Date(sailIso + "T00:00:00Z");

      const isoDates = mapped.map((_, idx) => {
        const d = new Date(sailDateObj);
        d.setDate(d.getDate() + idx); // Day 1 = sail date, Day 2 = +1, etc.
        return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
      });

      // 3) Enrich with Tomorrow.io + NCEI climatology fallback
      try {
        // Use *real* port from Apify as city, NOT "At sea"
        const firstDay = daysToUse[0] as any;
        const rawPort =
          firstDay?.portName ||
          firstDay?.rawStopText ||
          mapped[0]?.location ||
          "Miami";

        const cleanedRawPort =
          typeof rawPort === "string"
            ? rawPort.replace("(Embarkation)", "").trim()
            : "Miami";

        // Take just the city portion (before first comma)
        let embarkationCity = cleanedRawPort.split(",")[0].trim();
        if (!embarkationCity) embarkationCity = "Miami";

        const stationId = getNceiStationForCity(embarkationCity) ?? undefined;

        console.log("[Weather] Using city/station:", {
          embarkationCity,
          stationId,
        });

        const forecastsByDate = await getDailyForecastsForCity(
          embarkationCity,
          isoDates,
          { nceiStationId: stationId }
        );

        const forecastEntries = Object.entries(forecastsByDate).sort((a, b) =>
          a[0].localeCompare(b[0])
        );

        // Helper: parse "YYYY-MM-DD" safely
        const parseIso = (iso?: string) => {
          if (!iso) return null;
          const d = new Date(iso + "T00:00:00Z");
          return isNaN(d.getTime()) ? null : d;
        };

        // Helper: if exact date missing, find a forecast within ±1 day
        const findNearbyForecast = (dateKey?: string): any | undefined => {
          if (!dateKey) return undefined;
          const target = parseIso(dateKey);
          if (!target) return undefined;

          const targetTime = target.getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;

          let best: any | undefined = undefined;
          let bestDiff = Infinity;

          for (const [k, v] of forecastEntries) {
            const d = parseIso(k);
            if (!d) continue;
            const diff = Math.abs(d.getTime() - targetTime);
            if (diff <= oneDayMs && diff < bestDiff) {
              bestDiff = diff;
              best = v;
            }
          }

          return best;
        };

        let anyWeather = false;

        mapped = mapped.map((day, idx) => {
          const dateKey = isoDates[idx];

          // Try: exact date → same index → ±1 day
          const forecast: any =
            (dateKey && forecastsByDate[dateKey]) ||
            forecastEntries[idx]?.[1] ||
            findNearbyForecast(dateKey);

          const baseDay: ItineraryDay = {
            ...day,
            date: dateKey,
          };

          if (!forecast) {
            return {
              ...baseDay,
              description:
                baseDay.description === "Loading weather…"
                  ? "Weather not available for this day yet."
                  : baseDay.description,
            };
          }

          anyWeather = true;

          return {
            ...baseDay,
            high: forecast.high,
            low: forecast.low,
            rainChance: forecast.rainChance,
            icon: forecast.icon,
            description: forecast.description,
            source: forecast.source,
          };
        });

        setHasWeather(anyWeather);
      } catch (weatherErr: any) {
        console.error("Weather provider failed, itinerary only:", weatherErr);

        const msg =
          (weatherErr &&
            (weatherErr.message ||
              weatherErr.toString?.() ||
              JSON.stringify(weatherErr))) ||
          "Unknown error (null error object)";

        setDetailsError(
          "Weather data is temporarily unavailable. " + String(msg)
        );

        setHasWeather(false);

        // even if weather fails, still align dates to sail date
        mapped = mapped.map((day, idx) => ({
          ...day,
          date: isoDates[idx],
          description:
            day.description === "Loading weather…"
              ? "Weather not available right now."
              : day.description,
        }));
      }

      setItinerary(mapped);
    } catch (e) {
      console.error("Error loading cruise itinerary:", e);
      setDetailsError("There was a problem loading the cruise itinerary.");
      setItinerary(sampleItinerary as unknown as ItineraryDay[]);
      setHasWeather(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  // ✅ Auto-open the cruise when there is exactly one matching result
  useEffect(() => {
    if (!shouldAutoOpenSingle) return;
    if (searchResults.length !== 1) return;

    const cruise = searchResults[0];
    if (!cruise) return;

    // reset the flag so it doesn't fire again unintentionally
    setShouldAutoOpenSingle(false);

    void loadCruiseDetails(cruise);
  }, [shouldAutoOpenSingle, searchResults]);

  // ---------- CARD CLICK ----------
  const handleResultClick = async (index: number) => {
    const cruise = searchResults[index];
    if (!cruise) return;
    await loadCruiseDetails(cruise);
  };

  // 👉 show home screen first
  if (view === "home") {
    return (
      <HomeScreen
        onFindCruise={() => setView("app")}
        onLogin={() => {
          alert("Login coming soon!");
        }}
      />
    );
  }

  // ---------- MAIN APP UI ----------
  return (
    <div className="cc-app">
      {/* SPINNER OVERLAY */}
      {(loadingSearch || loadingDetails) && (
        <Spinner
          message={
            loadingSearch
              ? "Searching sailings..."
              : "Loading cruise details..."
          }
        />
      )}

      {/* HEADER */}
      <header className="cc-app-header">
        <img
          src="/cruisecast-logo.webp"
          alt="CruiseCast"
          className="cc-app-logo"
        />

        <div className="cc-app-tagline">
          PLAN AHEAD • SAIL SMART
          <div className="cc-app-subtitle">
            Forecast your cruise day by day — itineraries from real sailings,
            weather from Tomorrow.io and NOAA climate normals.
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="cc-app-main">
        <div className="cc-app-main-inner">
          {/* MAIN CARD */}
          <section className="cc-main-card">
            <h1 className="cc-main-title">Check Your Cruise Weather</h1>

            <CruiseForm onSubmit={handleCruiseSubmit} />

            {loadingSearch && (
              <p className="cc-main-status">Loading cruise data...</p>
            )}

            {error && <p className="cc-main-error">{error}</p>}

            <div className="cc-itinerary-wrapper">
              {selectedCruise ? (
                <div>
                  {!loadingDetails &&
                    selectedCruise &&
                    !hasWeather &&
                    !detailsError && (
                      <p
                        style={{
                          fontSize: "11px",
                          margin: "0 0 6px 0",
                          opacity: 0.8,
                          fontStyle: "italic",
                        }}
                      >
                        Weather data isn&apos;t available yet for this sailing —
                        showing itinerary only.
                      </p>
                    )}

                  {loadingDetails && (
                    <p
                      style={{
                        fontSize: "12px",
                        marginTop: "6px",
                        color: "#324A6D",
                      }}
                    >
                      Loading itinerary &amp; weather...
                    </p>
                  )}

                  {detailsError && (
                    <p
                      style={{
                        fontSize: "12px",
                        marginTop: "6px",
                        color: "#b91c1c",
                        fontWeight: 500,
                      }}
                    >
                      {detailsError}
                    </p>
                  )}

                  {!loadingDetails && (
                    <>
                      <div className="cc-weather-panel">
                        <WeatherTimeline itinerary={itinerary} />
                      </div>

                      <div className="cc-cruise-summary">
                        <div className="cc-cruise-summary-title">
                          {selectedCruise.title}
                          {selectedCruise.shipName
                            ? ` · Ship: ${selectedCruise.shipName}`
                            : ""}
                          {selectedCruise.cruiseLine
                            ? ` · Line: ${selectedCruise.cruiseLine}`
                            : ""}
                        </div>
                        <div>
                          Weather combines live forecasts from Tomorrow.io with
                          30-year climate normals from NOAA when a specific day
                          is beyond the forecast window. Peach cards show live
                          forecasts; indigo-tinted cards show long-term
                          averages.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <h2 className="cc-empty-title">Your cruise, day by day.</h2>
                  <p className="cc-empty-text">
                    Choose your cruise to see each port stop with high/low
                    temperatures and rain chances — all in one clean view.
                  </p>
                  <p className="cc-empty-tip">
                    Tip: Start by picking your cruise line, then ship, then sail
                    date. Clicking a highlighted date on the calendar will show
                    matching cruises for that day — then pick one to view the
                    full itinerary and weather.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* RESULTS CARD */}
          {hasSubmitted && searchResults.length > 0 && (
            <section className="cc-results-card">
              <h2 className="cc-results-title">Matching cruises</h2>
              <CruiseResults
                results={searchResults}
                onSelect={handleResultClick}
                selectedIndex={selectedIndex}
              />
            </section>
          )}

          {hasSubmitted &&
            !loadingSearch &&
            searchResults.length === 0 &&
            !error && (
              <section className="cc-results-empty">
                No cruises found for that ship and date. Try adjusting your
                selection.
              </section>
            )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="cc-app-footer">
        v1.0 — Cruises &amp; itineraries from Apify, weather by Tomorrow.io and
        NOAA NCEI.
      </footer>
    </div>
  );
}
