// src/App.tsx
import React, { useEffect, useState } from "react";
import "./App.css";

import CruiseForm, { type CruiseSelection } from "./components/CruiseForm";
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
import CloudBackground from "./components/CloudBackground";
import AuthPanel from "./components/AuthPanel";
import SaveCruiseButton from "./components/SaveCruiseButton";
import SavedCruises, {
  type SavedCruiseSelection,
} from "./components/SavedCruises";

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

  // mobile detection
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  // mobile stage: wizard form vs full-screen results
  const [mobileStage, setMobileStage] = useState<"form" | "results">("form");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // helper to wipe app state (used when going back to search/home)
  const resetAppState = () => {
    setSearchResults([]);
    setLoadingSearch(false);
    setLoadingDetails(false);
    setError(null);
    setDetailsError(null);
    setSelectedCruise(null);
    setItinerary(sampleItinerary as unknown as ItineraryDay[]);
    setHasWeather(false);
    setCurrentSailDate(null);
    setShouldAutoOpenSingle(false);
    setMobileStage("form");
  };

  // ---------------- SEARCH HANDLER ----------------
  const handleCruiseSubmit = async (selection: CruiseSelection) => {
    const { lineName, shipName, sailDate } = selection;

    setLoadingSearch(true);
    setError(null);
    setDetailsError(null);
    setSelectedCruise(null);
    setSearchResults([]);
    setHasWeather(false);
    setShouldAutoOpenSingle(false);
    setCurrentSailDate(sailDate);
    setMobileStage("form"); // always start at form for a new search

    try {
      const results = await searchCruisesByDate(sailDate);

      const filtered = results.filter((c) => {
        if (lineName && c.cruiseLine !== lineName) return false;
        if (shipName && c.shipName !== shipName) return false;
        return true;
      });

      setSearchResults(filtered);

      if (filtered.length === 1) {
        setShouldAutoOpenSingle(true);
      } else {
        setSelectedCruise(null);
      }
    } catch (e) {
      console.error("Error searching cruises:", e);
      setError("There was a problem loading cruise results.");
    } finally {
      setLoadingSearch(false);
    }
  };

  // when user clicks a saved cruise in the list
  const handleSelectSavedCruise = (saved: SavedCruiseSelection) => {
    setView("app");
    void handleCruiseSubmit({
      lineId: saved.lineId,
      shipId: saved.shipId,
      sailDate: saved.sailDate,
      lineName: saved.lineName,
      shipName: saved.shipName,
    });
  };

  // ---------------- LOAD ITINERARY + WEATHER ----------------
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
        console.warn("No Apify itinerary found — using sampleItinerary");
        daysToUse = (sampleItinerary as any[]).map((d: any, idx: number) => ({
          dayNumber: idx + 1,
          date: d.date,
          portName:
            d.location?.replace("(Embarkation)", "").trim() ?? d.location,
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

      // align dates based on selected sail date
      const sailIso = currentSailDate ?? cruise.departIso;
      const sailDateObj = new Date(sailIso + "T00:00:00Z");

      const isoDates = mapped.map((_, idx) => {
        const d = new Date(sailDateObj);
        d.setDate(d.getDate() + idx);
        return d.toISOString().slice(0, 10);
      });

      try {
        const firstDay = daysToUse[0] as any;
        const rawPort =
          firstDay?.portName ||
          firstDay?.rawStopText ||
          mapped[0]?.location ||
          "Miami";

        const cleanedPort =
          typeof rawPort === "string"
            ? rawPort.replace("(Embarkation)", "").trim()
            : "Miami";

        let embarkationCity = cleanedPort.split(",")[0].trim();
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
          const oneDayMs = 24 * 60 * 60 * 1000;

          let best: any | undefined;
          let bestDiff = Infinity;

          for (const [k, v] of entries) {
            const d = parseIso(k);
            if (!d) continue;
            const diff = Math.abs(d.getTime() - targetMs);
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
          const forecast =
            forecastsByDate[dateKey] || entries[idx]?.[1] || findNearby(dateKey);

          const base: ItineraryDay = {
            ...day,
            date: dateKey,
          };

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
        console.error("Weather provider failed, itinerary only:", weatherErr);
        setDetailsError("Weather data is temporarily unavailable.");

        mapped = mapped.map((day, idx) => ({
          ...day,
          date: isoDates[idx],
          description:
            day.description === "Loading weather…"
              ? "Weather not available right now."
              : day.description,
        }));
        setHasWeather(false);
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

  // auto-open when exactly 1 cruise matches
  useEffect(() => {
    if (!shouldAutoOpenSingle) return;
    if (searchResults.length !== 1) return;

    const cruise = searchResults[0];
    if (!cruise) return;

    setShouldAutoOpenSingle(false);
    void loadCruiseDetails(cruise);
    if (isMobile) {
      setMobileStage("results"); // on mobile, jump to results screen
    }
  }, [shouldAutoOpenSingle, searchResults, isMobile]);

  // ---------------- HOME SCREEN ----------------
  if (view === "home") {
    return (
      <>
        <CloudBackground />
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 9999,
          }}
        >
          <AuthPanel />
        </div>
        <HomeScreen
          onFindCruise={() => {
            resetAppState();
            setView("app");
          }}
          onLogin={() => {}}
        />
      </>
    );
  }

  // ---------------- MOBILE RESULTS SCREEN ----------------
  if (isMobile && mobileStage === "results" && selectedCruise) {
    return (
      <>
        <CloudBackground />
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 9999,
          }}
        >
          <AuthPanel />
        </div>

        <div className="cc-app">
          {(loadingSearch || loadingDetails) && (
            <Spinner
              message={
                loadingSearch
                  ? "Searching sailings..."
                  : "Loading cruise details..."
              }
            />
          )}

          <header className="cc-app-header">
            <img
              src="/cruisecast-logo.webp"
              alt="CruiseCast"
              className="cc-app-logo"
            />
            <div className="cc-app-tagline">PLAN AHEAD • SAIL SMART</div>
          </header>

          <main className="cc-app-main">
            <div className="cc-app-main-inner">
              <section className="cc-main-card">
                <div
                  style={{
                    marginBottom: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    className="cc-cta-button cc-cta-button--secondary"
                    style={{ width: "100%" }}
                    onClick={() => {
                      resetAppState();
                      setMobileStage("form");
                    }}
                  >
                    ← Back to search
                  </button>
                </div>

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

                {!loadingDetails && !hasWeather && !detailsError && (
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
                    Weather combines live forecasts from Tomorrow.io with 30-year
                    climate normals from NOAA. Peach cards show live forecasts;
                    indigo cards show long-term averages.
                  </div>

                  <SaveCruiseButton
                    cruise={selectedCruise}
                    sailDate={currentSailDate ?? selectedCruise.departIso}
                  />
                </div>
              </section>
            </div>
          </main>

          <footer className="cc-app-footer">
            v1.0 — Cruises &amp; itineraries from Apify, weather by Tomorrow.io
            and NOAA NCEI.
          </footer>
        </div>
      </>
    );
  }

  // ---------------- MAIN APP UI (desktop + mobile form stage) ----------------
  return (
    <>
      <CloudBackground />
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 9999,
        }}
      >
        <AuthPanel />
      </div>

      <div className="cc-app">
        {(loadingSearch || loadingDetails) && (
          <Spinner
            message={
              loadingSearch ? "Searching sailings..." : "Loading cruise details..."
            }
          />
        )}

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

        <main className="cc-app-main">
          <div className="cc-app-main-inner">
            <section className="cc-main-card">
              <h1 className="cc-main-title">Check Your Cruise Weather</h1>

              {isMobile ? (
                <MobileCruiseWizard
                  onSubmit={handleCruiseSubmit}
                  onBackToHome={() => {
                    resetAppState();
                    setView("home");
                  }}
                />
              ) : (
                <CruiseForm onSubmit={handleCruiseSubmit} />
              )}

              {error && <p className="cc-main-error">{error}</p>}

              <SavedCruises onSelectSaved={handleSelectSavedCruise} />

              <div className="cc-itinerary-wrapper">
                {selectedCruise ? (
                  <>
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

                    {!loadingDetails && !hasWeather && !detailsError && (
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

                    {!isMobile && (
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
                            30-year climate normals from NOAA. Peach cards show
                            live forecasts; indigo cards show long-term
                            averages.
                          </div>

                          <SaveCruiseButton
                            cruise={selectedCruise}
                            sailDate={
                              currentSailDate ?? selectedCruise.departIso
                            }
                          />
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="cc-empty-title">Your cruise, day by day.</h2>
                  </>
                )}
              </div>
            </section>
          </div>
        </main>

        <footer className="cc-app-footer">
          v1.0 — Cruises &amp; itineraries from Apify, weather by Tomorrow.io and
          NOAA NCEI.
        </footer>
      </div>
    </>
  );
}
