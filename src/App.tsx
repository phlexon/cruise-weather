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
import MobileCruiseWizard from "./components/MobileCruiseWizard";
import HomeScreen from "./screens/HomeScreen";

type CruiseSelection = {
  lineId: string;
  shipId: string;
  sailDate: string;
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

  const [hasWeather, setHasWeather] = useState(false);
  const [currentSailDate, setCurrentSailDate] = useState<string | null>(null);

  const [shouldAutoOpenSingle, setShouldAutoOpenSingle] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const selectedIndex =
    selectedCruise && searchResults.length
      ? searchResults.findIndex((c) => c.id === selectedCruise.id)
      : null;

  // ------------------- SEARCH HANDLER -------------------
  const handleCruiseSubmit = async (selection: CruiseSelection) => {
    const { lineName, shipName, sailDate } = selection;

    setLoadingSearch(true);
    setError(null);
    setDetailsError(null);
    setSelectedCruise(null);
    setSearchResults([]);
    setHasSubmitted(false);
    setHasWeather(false);
    setShouldAutoOpenSingle(false);

    setCurrentSailDate(sailDate);

    try {
      const results = await searchCruisesByDate(sailDate);

      const filtered = results.filter((c) => {
        if (lineName && c.cruiseLine !== lineName) return false;
        if (shipName && c.shipName !== shipName) return false;
        return true;
      });

      setSearchResults(filtered);
      setHasSubmitted(true);

      if (filtered.length === 1) {
        setShouldAutoOpenSingle(true);
      }
    } catch (e) {
      setError("There was a problem loading cruise results.");
      setHasSubmitted(true);
    } finally {
      setLoadingSearch(false);
    }
  };

  // ------------------- LOAD ITINERARY + WEATHER -------------------
  const loadCruiseDetails = async (cruise: CruiseSummary) => {
    setSelectedCruise(cruise);
    setLoadingDetails(true);
    setDetailsError(null);
    setHasWeather(false);

    try {
      const cruiseDays: CruiseDay[] = await getItineraryFromApify({
        shipName: cruise.shipName,
        sailDate: cruise.departIso,
      });

      let daysToUse = cruiseDays;
      if (!daysToUse || !daysToUse.length) {
        daysToUse = (sampleItinerary as any[]).map((d: any, idx: number) => ({
          dayNumber: idx + 1,
          date: d.date,
          portName: d.location?.replace("(Embarkation)", "").trim(),
          rawStopText: d.location,
        }));
      }

      const getLocationLabel = (day: CruiseDay, idx: number): string => {
        const raw = (day as any).rawStopText ?? "";
        const portName = (day as any).portName?.trim?.() ?? "";
        const text = `${portName} ${raw}`.toLowerCase();

        if (text.includes("at sea") || text.includes("sea day")) {
          return "At sea";
        }
        if (!portName && raw) return raw;
        return portName || `Day ${idx + 1}`;
      };

      let mapped: ItineraryDay[] = daysToUse.map((day, idx) => ({
        day: idx + 1,
        date: day.date,
        location: getLocationLabel(day, idx),
        icon: "sunny",
        description: "Loading weather…",
      }));

      const sailIso = currentSailDate ?? cruise.departIso;
      const sailDateObj = new Date(sailIso + "T00:00:00Z");

      const isoDates = mapped.map((_, idx) => {
        const d = new Date(sailDateObj);
        d.setDate(d.getDate() + idx);
        return d.toISOString().slice(0, 10);
      });

      try {
        const rawPort =
          (daysToUse[0] as any)?.portName ||
          (daysToUse[0] as any)?.rawStopText ||
          "Miami";

        let embarkationCity = rawPort.split(",")[0].trim();
        if (!embarkationCity) embarkationCity = "Miami";

        const stationId = getNceiStationForCity(embarkationCity) ?? undefined;

        const forecastsByDate = await getDailyForecastsForCity(
          embarkationCity,
          isoDates,
          { nceiStationId: stationId }
        );

        const entries = Object.entries(forecastsByDate).sort((a, b) =>
          a[0].localeCompare(b[0])
        );

        const parseIso = (iso?: string) => {
          if (!iso) return null;
          const d = new Date(iso + "T00:00:00Z");
          return isNaN(d.getTime()) ? null : d;
        };

        const findNearby = (dateKey?: string): any | undefined => {
          if (!dateKey) return undefined;
          const target = parseIso(dateKey);
          if (!target) return undefined;
          const targetMs = target.getTime();
          const oneDay = 86_400_000;

          let best: any | undefined;
          let bestDiff = Infinity;

          for (const [k, v] of entries) {
            const d = parseIso(k);
            if (!d) continue;
            const diff = Math.abs(d.getTime() - targetMs);
            if (diff <= oneDay && diff < bestDiff) {
              bestDiff = diff;
              best = v;
            }
          }
          return best;
        };

        let anyWeather = false;

        mapped = mapped.map((day, idx) => {
          const dateKey = isoDates[idx];
          const forecast =
            forecastsByDate[dateKey] || entries[idx]?.[1] || findNearby(dateKey);

          const base = { ...day, date: dateKey };

          if (!forecast) {
            return {
              ...base,
              description:
                base.description === "Loading weather…"
                  ? "Weather not available yet."
                  : base.description,
            };
          }

          anyWeather = true;

          return {
            ...base,
            high: forecast.high,
            low: forecast.low,
            rainChance: forecast.rainChance,
            icon: forecast.icon,
            description: forecast.description,
            source: forecast.source,
          };
        });

        setHasWeather(anyWeather);
      } catch (weatherErr) {
        setDetailsError("Weather unavailable. Using itinerary only.");
        setHasWeather(false);

        mapped = mapped.map((day, idx) => ({
          ...day,
          date: isoDates[idx],
          description: "Weather not available right now.",
        }));
      }

      setItinerary(mapped);
    } catch (e) {
      setDetailsError("There was a problem loading the cruise itinerary.");
      setItinerary(sampleItinerary as unknown as ItineraryDay[]);
      setHasWeather(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Auto-open single match
  useEffect(() => {
    if (shouldAutoOpenSingle && searchResults.length === 1) {
      setShouldAutoOpenSingle(false);
      loadCruiseDetails(searchResults[0]);
    }
  }, [shouldAutoOpenSingle, searchResults]);

  const handleResultClick = async (i: number) => {
    const cruise = searchResults[i];
    if (!cruise) return;
    await loadCruiseDetails(cruise);
  };

  // --------------- HOME SCREEN ---------------
  if (view === "home") {
    return (
      <HomeScreen
        onFindCruise={() => setView("app")}
        onLogin={() => alert("Login coming soon!")}
      />
    );
  }

  // --------------- MAIN APP UI ---------------
  return (
    <div className="cc-app">
      {(loadingSearch || loadingDetails) && (
        <Spinner
          message={loadingSearch ? "Searching sailings..." : "Loading details..."}
        />
      )}

      <header className="cc-app-header">
        <img src="/cruisecast-logo.webp" alt="CruiseCast" className="cc-app-logo" />

        <div className="cc-app-tagline">
          PLAN AHEAD • SAIL SMART
          <div className="cc-app-subtitle">
            Forecast your cruise day by day — itineraries from Apify, weather from
            Tomorrow.io + NOAA.
          </div>
        </div>
      </header>

      <main className="cc-app-main">
        <div className="cc-app-main-inner">
          <section className="cc-main-card">
            <h1 className="cc-main-title">Check Your Cruise Weather</h1>

            {/* DESKTOP → CruiseForm | MOBILE → Wizard */}
            {isMobile ? (
              <MobileCruiseWizard
                onSubmit={handleCruiseSubmit}
                onBackToHome={() => setView("home")}
              />
            ) : (
              <CruiseForm onSubmit={handleCruiseSubmit} />
            )}

            {error && <p className="cc-main-error">{error}</p>}

            <div className="cc-itinerary-wrapper">
              {!selectedCruise ? (
                <>
                  <h2 className="cc-empty-title">Your cruise, day by day.</h2>
                </>
              ) : (
                <>
                  <div className="cc-weather-panel">
                    <WeatherTimeline itinerary={itinerary} />
                  </div>

                  <div className="cc-cruise-summary">
                    <div className="cc-cruise-summary-title">
                      {selectedCruise.title}
                    </div>
                    <div>
                      Weather combines Tomorrow.io forecasts with NOAA 30-year
                      climate normals.
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {hasSubmitted && searchResults.length > 0 && (
            <section className="cc-results-card">
              <h2 className="cc-results-title">Matching cruises</h2>
              <CruiseResults
                results={searchResults}
                selectedIndex={selectedIndex}
                onSelect={handleResultClick}
              />
            </section>
          )}

          {hasSubmitted &&
            !loadingSearch &&
            searchResults.length === 0 &&
            !error && (
              <section className="cc-results-empty">
                No cruises found for that ship / date.
              </section>
            )}
        </div>
      </main>

      <footer className="cc-app-footer">
        v1.0 — Cruises from Apify. Weather: Tomorrow.io + NOAA.
      </footer>
    </div>
  );
}
