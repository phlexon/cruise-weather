// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

import CruiseForm, { type CruiseSelection } from "./components/CruiseForm";
import MobileCruiseWizard from "./components/MobileCruiseWizard";
import CruiseResults from "./components/CruiseResults";
import WeatherTimeline from "./components/WeatherTimeline";
import Spinner from "./components/Spinner";

import CloudBackground from "./components/CloudBackground";
import SaveCruiseButton from "./components/SaveCruiseButton";
import AuthStatusBar from "./components/AuthStatusBar";

import HomeScreen from "./screens/HomeScreen";
import SavedCruisesScreen from "./screens/SavedCruisesScreen";
import LoginScreen from "./screens/LoginScreen";
import CreateAccountScreen from "./screens/CreateAccountScreen";
import AuthSplitScreen from "./screens/AuthSplitScreen";

import {
  searchCruisesByDate,
  getItineraryFromApify,
  type CruiseSummary,
  type CruiseDay,
} from "./services/cruiseApi";
import {
  getDailyForecastsForCity,
  type DailyForecast,
} from "./services/weather";
import { getNceiStationForCity } from "./data/nceiStations";
import { sampleItinerary } from "./data/mockData";
import type { SavedCruiseSelection } from "./components/SavedCruises";
import { useAuth } from "./context/AuthContext";

// ---------------- TYPES ----------------

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

type View =
  | "home"
  | "app"
  | "saved"
  | "login"
  | "createAccount"
  | "authSplit";

type MobileStage = "form" | "results";

// ---------------- HELPERS ----------------

function buildInitialItinerary(): ItineraryDay[] {
  // map the sample itinerary data shape into the WeatherTimeline shape
  return (sampleItinerary as any[]).map((d, idx) => ({
    day: d.dayNumber ?? idx + 1,
    date: d.date,
    location: d.location ?? "At sea",
    high: d.high,
    low: d.low,
    rainChance: d.rainChance,
    icon: d.icon ?? "partly",
    description:
      d.description ??
      "Sample itinerary day. Run a real search to see your cruise.",
    source: undefined,
  }));
}

function getCityForStationLookup(days: CruiseDay[]): string {
  if (!days.length) return "Miami";

  const first = days[0] as any;

  // Prefer location/portName; rawStopText often has "Departing from ..."
  const rawPort: string =
    first.location ?? first.portName ?? first.rawStopText ?? "Miami";

  const cleaned =
    typeof rawPort === "string"
      ? rawPort.replace("(Embarkation)", "").trim()
      : "Miami";

  let city = cleaned.split(",")[0].trim();

  // Remove prefixes like "Departing from Fort Lauderdale"
  if (city.toLowerCase().startsWith("departing from")) {
    city = city.replace(/^departing from\s*/i, "").trim();
  }

  if (!city) city = "Miami";
  return city;
}


function getDateKey(day: CruiseDay, index: number): string {
  const anyDay = day as any;
  const iso = anyDay.isoDate as string | undefined;
  const date = day.date as string | undefined;
  return iso || date || `missing-${index}`;
}

function getLocationLabel(day: CruiseDay, index: number): string {
  const anyDay = day as any;
  return (
    anyDay.location ??
    (day.portName || anyDay.rawStopText) ??
    `Day ${index + 1}`
  );
}

/**
 * Normalize the port/city string we send to Tomorrow.io so we avoid
 * "Invalid Query Parameters" errors from odd phrases.
 */
function normalizePortName(raw: string): string {
  if (!raw) return "Miami, FL";

  const lower = raw.toLowerCase();

  // For "At sea" style entries, use a generic ocean region
  if (lower.includes("at sea")) {
    return "Caribbean Sea";
  }

  if (lower.includes("fort lauderdale")) return "Fort Lauderdale, FL";
  if (lower.includes("miami")) return "Miami, FL";
  if (lower.includes("port canaveral")) return "Port Canaveral, FL";
  if (lower.includes("galveston")) return "Galveston, TX";
  if (lower.includes("tampa")) return "Tampa, FL";

  // Fallback: just take the first part before a comma
  const basic = raw.split(",")[0].trim();
  return basic || "Miami, FL";
}

// ---------------- APP ----------------

function toForecastCityName(city: string): string {
  const lower = city.toLowerCase();

  if (lower.includes("fort lauderdale")) return "Fort Lauderdale, FL";
  if (lower.includes("miami")) return "Miami, FL";
  if (lower.includes("port canaveral")) return "Port Canaveral, FL";
  if (lower.includes("galveston")) return "Galveston, TX";
  if (lower.includes("tampa")) return "Tampa, FL";

  // Fallback: Tomorrow.io can usually geocode a bare city name
  return city;
}

export default function App() {
  const { user } = useAuth();

  const [view, setView] = useState<View>("home");

  // track if user has actually submitted a search
  const [hasSearched, setHasSearched] = useState(false);

  // Cruise search + selection
  const [searchResults, setSearchResults] = useState<CruiseSummary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedCruise, setSelectedCruise] =
    useState<CruiseSummary | null>(null);

  // Itinerary and weather
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(
    () => buildInitialItinerary()
  );
  const [hasWeather, setHasWeather] = useState(false);

  // Loading + error states
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Misc
  const [currentSailDate, setCurrentSailDate] = useState<string | null>(null);
  const [shouldAutoOpenSingle, setShouldAutoOpenSingle] = useState(false);
  const [loginJustCompleted, setLoginJustCompleted] = useState(false);

  // Mobile behavior (wizard vs results)
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [mobileStage, setMobileStage] = useState<MobileStage>("form");

  // ---------------- EFFECTS ----------------

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Auto-open single search result
  useEffect(() => {
    if (
      shouldAutoOpenSingle &&
      searchResults.length === 1 &&
      !loadingDetails
    ) {
      const onlyCruise = searchResults[0];
      setSelectedIndex(0);
      loadCruiseDetails(onlyCruise);
      setShouldAutoOpenSingle(false);
      if (isMobile) {
        setMobileStage("results");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoOpenSingle, searchResults, loadingDetails, isMobile]);

  // ---------------- RESET ----------------

  const resetAppState = () => {
    setSearchResults([]);
    setSelectedIndex(null);
    setSelectedCruise(null);
    setItinerary(buildInitialItinerary());
    setHasWeather(false);
    setLoadingSearch(false);
    setLoadingDetails(false);
    setError(null);
    setDetailsError(null);
    setCurrentSailDate(null);
    setShouldAutoOpenSingle(false);
    setMobileStage("form");
    setHasSearched(false); // important: hide results/weather on fresh load
  };

  const goHome = () => {
    resetAppState();
    setView("home");
    setLoginJustCompleted(false);
  };

  // ---------------- SEARCH HANDLERS ----------------

  const handleCruiseSubmit = async (selection: CruiseSelection) => {
    const { lineName, shipName, sailDate } = selection;

    setHasSearched(true); // mark that we’ve actually searched

    setLoadingSearch(true);
    setError(null);
    setDetailsError(null);
    setSelectedCruise(null);
    setSearchResults([]);
    setHasWeather(false);
    setShouldAutoOpenSingle(false);
    setCurrentSailDate(sailDate);
    setMobileStage("form");

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
        setSelectedIndex(null);
        if (isMobile) {
          setMobileStage(filtered.length ? "results" : "form");
        }
      }
    } catch (e) {
      console.error("Error searching cruises:", e);
      setError("There was a problem loading cruise results.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleResultClick = (index: number) => {
    const cruise = searchResults[index];
    if (!cruise) return;
    setSelectedIndex(index);
    loadCruiseDetails(cruise);
    if (isMobile) {
      setMobileStage("results");
    }
  };

  const handleSelectSavedCruise = (saved: SavedCruiseSelection) => {
    setView("app");
    resetAppState();
    setHasSearched(true); // selecting a saved cruise is effectively a search

    handleCruiseSubmit({
      lineId: saved.lineId,
      shipId: saved.shipId,
      sailDate: saved.sailDate,
      lineName: saved.lineName,
      shipName: saved.shipName,
    });
  };

  // ---------------- ITINERARY + WEATHER ----------------

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

    if (!cruiseDays || cruiseDays.length === 0) {
      setItinerary([
        {
          day: 1,
          location: cruise.shipName || "Your ship",
          description:
            "We couldn’t load this itinerary from the dataset yet.",
        },
      ]);
      setHasWeather(false);
      return;
    }

    const allDates = cruiseDays
      .map((d, idx) => getDateKey(d, idx))
      .filter(Boolean) as string[];

    // 🔙 Revert to the original behavior:
    // use getCityForStationLookup() directly for both station + forecast
const baseCity = getCityForStationLookup(cruiseDays);
const stationId = getNceiStationForCity(baseCity) ?? undefined;
const forecastCity = toForecastCityName(baseCity);

let forecastMap: Record<string, DailyForecast> = {};

try {
  forecastMap = await getDailyForecastsForCity(
    forecastCity,
    allDates,
    stationId ? { nceiStationId: stationId } : undefined
  );
} catch (weatherErr) {
  console.error("[Weather] Failed, will show itinerary only:", weatherErr);
  setDetailsError(
    "Weather data is temporarily unavailable. Showing itinerary only."
  );
  forecastMap = {};
}


    let anyWeather = false;

    const mapped: ItineraryDay[] = cruiseDays.map((day, idx) => {
      const dateKey = getDateKey(day, idx);
      const location = getLocationLabel(day, idx);
      const forecast = forecastMap[dateKey];

      const base: ItineraryDay = {
        day: day.dayNumber ?? idx + 1,
        date: dateKey,
        location,
      };

      if (!forecast) {
        return {
          ...base,
          description:
            "Weather not available yet for this stop. Check back closer to sail date.",
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

    setItinerary(mapped);
    setHasWeather(anyWeather);
  } catch (err) {
    console.error("Error loading itinerary + weather:", err);
    setDetailsError(
      "We couldn’t load this cruise’s itinerary yet. Please try again in a moment."
    );
    setItinerary([
      {
        day: 1,
        location: cruise.shipName || "Your ship",
        description:
          "We couldn’t load this itinerary from the dataset yet.",
      },
    ]);
    setHasWeather(false);
  } finally {
    setLoadingDetails(false);
  }
};


  // ---------------- AUTH HELPERS ----------------

  const handleAuthSuccessToSaved = () => {
    setLoginJustCompleted(true);
    setView("saved");
  };

  // ---------------- DERIVED ----------------

  const canSaveCurrentCruise = useMemo(
    () => !!selectedCruise && !!currentSailDate,
    [selectedCruise, currentSailDate]
  );

  // ---------------- VIEW RENDERING ----------------

  // HOME
  if (view === "home") {
    return (
      <>
        <CloudBackground />
        <div className="cc-app cc-app--home">
          {user && (
            <AuthStatusBar
              onGoToSaved={() => setView("saved")}
              onLogin={() => setView("authSplit")}
              onCreateAccount={() => setView("createAccount")}
            />
          )}

          {loginJustCompleted && (
            <div className="cc-success-message">
              🎉 You’re signed in — welcome back!
            </div>
          )}

          <main className="cc-app-main">
            <div className="cc-app-main-inner">
              <HomeScreen
                onFindCruise={() => {
                  resetAppState();
                  setView("app");
                }}
                onLogin={() => setView("authSplit")}
                onGoToAccount={() => setView("saved")}
              />
            </div>
          </main>

          <footer className="cc-app-footer">
            v1.0 — Cruises &amp; itineraries from Apify, weather by
            Tomorrow.io &amp; NOAA NCEI.
          </footer>
        </div>
      </>
    );
  }

  // SAVED CRUISES
  if (view === "saved") {
    return (
      <>
        <CloudBackground />
        <div className="cc-app">
          <AuthStatusBar
            onGoToSaved={() => setView("saved")}
            onLogin={() => setView("login")}
            onCreateAccount={() => setView("createAccount")}
          />

          <header className="cc-app-header">
            <img
              src="/cruisecast-logo.png"
              alt="CruiseCast"
              className="cc-app-logo"
              onClick={goHome}
              style={{ cursor: "pointer" }}
            />
            <div className="cc-app-tagline">PLAN AHEAD • SAIL SMART</div>
          </header>

          <main className="cc-app-main">
            <div className="cc-app-main-inner">
              <SavedCruisesScreen
                onBack={() => setView("app")}
                onSelectSaved={handleSelectSavedCruise}
              />
            </div>
          </main>

          <footer className="cc-app-footer">
            v1.0 — Cruises &amp; itineraries from Apify, weather by
            Tomorrow.io &amp; NOAA NCEI.
          </footer>
        </div>
      </>
    );
  }

  // LOGIN
  if (view === "login") {
    return (
      <>
        <CloudBackground />
        <div className="cc-app">
          <header className="cc-app-header">
            <img
              src="/cruisecast-logo.png"
              alt="CruiseCast"
              className="cc-app-logo"
              onClick={goHome}
              style={{ cursor: "pointer" }}
            />
            <div className="cc-app-tagline">PLAN AHEAD • SAIL SMART</div>
          </header>

          <main className="cc-app-main">
            <div className="cc-app-main-inner">
              <LoginScreen
                onBack={goHome}
                onAuthSuccess={handleAuthSuccessToSaved}
                onGoToCreate={() => setView("createAccount")}
              />
            </div>
          </main>
        </div>
      </>
    );
  }

  // CREATE ACCOUNT
  if (view === "createAccount") {
    return (
      <>
        <CloudBackground />
        <div className="cc-app">
          <header className="cc-app-header">
            <img
              src="/cruisecast-logo.png"
              alt="CruiseCast"
              className="cc-app-logo"
              onClick={goHome}
              style={{ cursor: "pointer" }}
            />
            <div className="cc-app-tagline">PLAN AHEAD • SAIL SMART</div>
          </header>

          <main className="cc-app-main">
            <div className="cc-app-main-inner">
              <CreateAccountScreen
                onBack={goHome}
                onAuthSuccess={handleAuthSuccessToSaved}
                onGoToLogin={() => setView("login")}
              />
            </div>
          </main>
        </div>
      </>
    );
  }

  // AUTH SPLIT
  if (view === "authSplit") {
    return (
      <>
        <CloudBackground />
        <AuthSplitScreen
          onBack={goHome}
          onAuthSuccess={handleAuthSuccessToSaved}
        />
      </>
    );
  }

  // MAIN APP (SEARCH + RESULTS + WEATHER)
  return (
    <>
      <CloudBackground />
      <div className="cc-app">
        <AuthStatusBar
          onGoToSaved={() => setView("saved")}
          onLogin={() => setView("authSplit")}
          onCreateAccount={() => setView("createAccount")}
        />

        <header className="cc-app-header">
          <img
            src="/cruisecast-logo.png"
            alt="CruiseCast"
            className="cc-app-logo"
            onClick={goHome}
            style={{ cursor: "pointer" }}
          />
          <div className="cc-app-tagline">PLAN AHEAD • SAIL SMART</div>
        </header>

        <main className="cc-app-main">
          <div className="cc-app-main-inner">
            <section className="cc-main-card">
              {error && <div className="cc-error-banner">{error}</div>}

              {/* DESKTOP: single column layout */}
              {!isMobile && (
                <>
                  <CruiseForm onSubmit={handleCruiseSubmit} />

                  <div className="cc-save-wrapper">
                    {canSaveCurrentCruise && currentSailDate && (
                      <SaveCruiseButton
                        cruise={selectedCruise}
                        sailDate={currentSailDate}
                      />
                    )}
                  </div>

                  {hasSearched && (
                    <div className="cc-results-section">
                      {loadingSearch ? (
                        <Spinner label="Searching sailings…" />
                      ) : (
                        <CruiseResults
                          results={searchResults}
                          selectedIndex={selectedIndex ?? -1}
                          onSelect={handleResultClick}
                        />
                      )}
                    </div>
                  )}

                  {hasSearched && (
                    <div className="cc-weather-section">
                      {loadingDetails ? (
                        <Spinner label="Loading itinerary & weather…" />
                      ) : (
                        <>
                          {detailsError && (
                            <p className="cc-weather-error">
                              {detailsError}
                            </p>
                          )}
                          <WeatherTimeline itinerary={itinerary} />
                          {!hasWeather && selectedCruise && (
                            <p className="cc-weather-footnote">
                              Some days may fall outside the live 15-day
                              forecast window. We’ll use climatology where
                              possible.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* MOBILE: wizard + stacked results/weather */}
              {isMobile && (
                <div className="cc-mobile-layout">
                  {mobileStage === "form" && (
                    <MobileCruiseWizard
                      onSubmit={handleCruiseSubmit}
                      onBackToHome={goHome}
                    />
                  )}

                  {mobileStage === "results" && hasSearched && (
                    <>
                      <div className="cc-mobile-nav">
                        <button
                          type="button"
                          className="cc-button cc-button--ghost"
                          onClick={() => setMobileStage("form")}
                        >
                          ← Back to search
                        </button>
                        <button
                          type="button"
                          className="cc-button cc-button--primary"
                          onClick={() =>
                            window.scrollTo({ top: 0, behavior: "smooth" })
                          }
                        >
                          Top
                        </button>
                      </div>

                      {loadingSearch ? (
                        <Spinner label="Searching sailings…" />
                      ) : (
                        <CruiseResults
                          results={searchResults}
                          selectedIndex={selectedIndex ?? -1}
                          onSelect={handleResultClick}
                        />
                      )}

                      <div className="cc-save-wrapper cc-save-wrapper--mobile">
                        {canSaveCurrentCruise && currentSailDate && (
                          <SaveCruiseButton
                            cruise={selectedCruise}
                            sailDate={currentSailDate}
                          />
                        )}
                      </div>

                      {hasSearched && (
                        <>
                          {loadingDetails ? (
                            <Spinner label="Loading itinerary & weather…" />
                          ) : (
                            <>
                              {detailsError && (
                                <p className="cc-weather-error">
                                  {detailsError}
                                </p>
                              )}
                              <WeatherTimeline itinerary={itinerary} />
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>

        <footer className="cc-app-footer">
          v1.0 — Cruises &amp; itineraries from Apify, weather by
          Tomorrow.io &amp; NOAA NCEI.
        </footer>
      </div>
    </>
  );
}
