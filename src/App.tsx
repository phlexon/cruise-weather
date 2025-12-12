// src/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import ChangePasswordScreen from "./screens/ChangePasswordScreen";

import {
  searchCruisesByDate,
  getItineraryFromApify,
  type CruiseSummary,
  type CruiseDay,
} from "./services/cruiseApi";

import { getNceiStationForCity } from "./data/nceiStations";
import { sampleItinerary } from "./data/mockData";
import type { SavedCruiseSelection } from "./components/SavedCruises";
import { useAuth } from "./context/AuthContext";
import GlobalHeader from "./components/GlobalHeader";
import InstallPrompt from "./components/InstallPrompt";
import { getDailyForecastsForCity } from "./services/weather";
import { resolvePortLocation } from "./data/resolvePort";





// ⭐ NEW IMPORT – packing checklist component
import PackingChecklist from "./components/PackingChecklist";

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
  | "authSplit"
  | "changePassword"
  // ⭐ NEW VIEW
  | "packing";

type MobileStage = "form" | "results";



// ---------------- HELPERS ----------------

function buildInitialItinerary(): ItineraryDay[] {
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
  const rawPort: string =
    first.location ?? first.portName ?? first.rawStopText ?? "Miami";

  const cleaned =
    typeof rawPort === "string"
      ? rawPort.replace("(Embarkation)", "").trim()
      : "Miami";

// Use full label if possible
let city = cleaned.trim();
if (!city || city.length < 2) city = "Miami, FL";



  if (city.toLowerCase().startsWith("departing from")) {
    city = city.replace(/^departing from\s*/i, "").trim();
  }

  return city || "Miami";
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



function handleCheckAnotherCruise() {
  // Reset all search-related state
  setSelectedCruise(null);
  setSearchResults([]);
  setItinerary([]);
  setSelectedIndex(null);
  setHasSearched(false);
  setDetailsError(null);

  // Reset mobile wizard flow
  setMobileStage("form");

  // Go to the main search screen
  setView("app");
}


// ---------------- APP ----------------


export default function App() {
  // 1) AUTH HOOK – MUST BE FIRST
  const { user, loading: authLoading } = useAuth();

     // SAVED CRUISES
  const [savedCruises, setSavedCruises] = useState<SavedCruiseSelection[]>([]);


  // 2) ALL OTHER HOOKS (STATE, MEMO, REF) – ALWAYS IN SAME ORDER
   // MUST BE INSIDE THE APP FUNCTION, AT THE TOP
  const [view, setView] = useState<View>("home");
  const [hasSearched, setHasSearched] = useState(false);

    // ✅ views where install banner SHOULD appear
  const showInstall =
    view !== "login" &&
    view !== "createAccount" &&
    view !== "authSplit" &&
    view !== "changePassword";


  const [searchResults, setSearchResults] = useState<CruiseSummary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedCruise, setSelectedCruise] =
    useState<CruiseSummary | null>(null);

  

  const [itinerary, setItinerary] = useState<ItineraryDay[]>(() =>
    buildInitialItinerary()
  );
  const [hasWeather, setHasWeather] = useState(false);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const isGlobalLoading = loadingSearch || loadingDetails || loadingGlobal;

  const [error, setError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [currentSailDate, setCurrentSailDate] = useState<string | null>(null);
  const [shouldAutoOpenSingle, setShouldAutoOpenSingle] = useState(false);

  const [loginJustCompleted, setLoginJustCompleted] = useState(false);
  const [registrationJustCompleted, setRegistrationJustCompleted] =
    useState(false);
  const [logoutJustCompleted, setLogoutJustCompleted] = useState(false);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [mobileStage, setMobileStage] = useState<MobileStage>("form");

  // Packing checklist title info
const [packingMeta, setPackingMeta] = useState<{
  lineName?: string;
  shipName?: string;
}>({
  lineName: "",
  shipName: "",
});

// ---------------- ITINERARY RESET ----------------
function resetItineraryState() {
  setItinerary([]);
  setSelectedCruise(null);
  setSelectedIndex(null);
  setSearchResults([]);
  setHasWeather(false);
  setCurrentSailDate("");
  setLoadingDetails(false);

  setPackingMeta({
    lineName: "",
    shipName: "",
  });
}



  // ---------------- NAVIGATION ----------------
  function goTo(next: View) {
    setLoadingGlobal(true);
    setTimeout(() => {
      setView(next);
      setLoadingGlobal(false);
    }, 250);
  }

// ---------------- RESET + GO HOME ----------------
const resetAppState = () => {
  setSearchResults([]);
  setSelectedIndex(null);
  setSelectedCruise(null);
  setItinerary([]);
  setHasWeather(false);
  setLoadingSearch(false);
  setLoadingDetails(false);
  setError(null);
  setDetailsError(null);
  setCurrentSailDate("");
  setShouldAutoOpenSingle(false);
  setMobileStage("form");
  setHasSearched(false);
  setPackingMeta({ lineName: "", shipName: "" });
};

const goHome = () => {
  resetAppState();
  setView("home");
  setLoginJustCompleted(false);
  setRegistrationJustCompleted(false);
  setLogoutJustCompleted(false);
};



  // ---------------- ITINERARY + WEATHER ----------------
async function loadCruiseDetails(cruise: CruiseSummary) {
  setSelectedCruise(cruise);
  setLoadingDetails(true);
  setDetailsError(null);
  setHasWeather(false);

  try {
    // 1. GET ITINERARY
    const cruiseDays = await getItineraryFromApify({
      shipName: cruise.shipName,
      sailDate: cruise.departIso,
    });

    if (!cruiseDays || cruiseDays.length === 0) {
      setItinerary([
        {
          day: 1,
          location: cruise.shipName ?? "Your ship",
          description: "We couldn’t load this itinerary from the dataset.",
        },
      ]);
      return;
    }

    // 1. Build date list
const allDates = cruiseDays.map((day, idx) => getDateKey(day, idx));

// 2. Resolve port → strict lat/lon + optional NCEI station
const firstStop = getLocationLabel(cruiseDays[0], 0);
const { lat, lon, nceiStationId } = resolvePortLocation(firstStop);

let forecastMap: Record<string, DailyForecast> = {};

// 3. Try Tomorrow.io first
try {
  forecastMap = await getDailyForecastsForCity(
    `${lat},${lon}`,
    allDates,
    nceiStationId ? { nceiStationId } : undefined
  );
} catch (err) {
  console.error("[Tomorrow.io] Forecast failed:", err);
}

// 4. If Tomorrow.io returns nothing → fallback to climate normals
if (!forecastMap || Object.keys(forecastMap).length === 0) {
  console.log("[Weather] Using fallback climate normals...");
  forecastMap = await getClimateNormals(lat, lon, allDates);
}

    // 5. BUILD FINAL MAPPED ITINERARY
    let anyWeather = false;

    const mapped: ItineraryDay[] = cruiseDays.map((day, idx) => {
      const dateKey = getDateKey(day, idx);
      const location = getLocationLabel(day, idx);
      const forecast = forecastMap[dateKey];

      if (!forecast) {
        return {
          day: idx + 1,
          date: dateKey,
          location,
          description:
            "Weather not available yet — check again closer to sail date.",
        };
      }

      anyWeather = true;

      return {
        day: idx + 1,
        date: dateKey,
        location,
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
  } finally {
    setLoadingDetails(false);
  }
}


  // ---------------- EFFECTS ----------------

  // Track resizing for mobile layout
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Auto-open a single search result (desktop + mobile)
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
  }, [shouldAutoOpenSingle, searchResults, loadingDetails, isMobile]);

  // ---------------- SEARCH HANDLERS ----------------
  const handleCruiseSubmit = async (selection: CruiseSelection) => {
    const { lineName, shipName, sailDate } = selection;

    setHasSearched(true);
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
  if (selection.lineName && c.cruiseLine !== selection.lineName) return false;
  if (selection.shipName && c.shipName !== selection.shipName) return false;
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

    setSelectedCruise(cruise);
    setSelectedIndex(index);
    loadCruiseDetails(cruise);

    if (isMobile) {
      setMobileStage("results");
    }
  };

// ---------------- SAVED-CRUISE HANDLER ----------------
const handleSelectSavedCruise = async (saved: SavedCruiseSelection) => {
  // Mark that a search-like action occurred
  setHasSearched(true);

  // Create a CruiseSummary-like object the UI expects
  const summary = {
    id: "saved-" + saved.sailDate,
    cruiseLine: saved.lineName || "",
    shipName: saved.shipName || "",
    departIso: saved.sailDate,
    title: `${saved.shipName} — Saved Cruise`,
  };

  // REQUIRED: let the UI know which cruise the packing checklist belongs to
  setPackingMeta({
    lineName: summary.cruiseLine,
    shipName: summary.shipName,
  });

  // Populate searchResults with one cruise so results UI loads
  setSearchResults([summary]);

  // Set selected index
  setSelectedIndex(0);

  // Store metadata
  setCurrentSailDate(saved.sailDate);
  setSelectedCruise(summary);

  // Go to results view
  setView("app");

  // Load itinerary + weather
  await loadCruiseDetails(summary);
};



// Go to the form search (NOT home screen)
const handleGoToSearch = () => {
  setSelectedCruise(null);
  setItinerary([]);
  setView("app");
  setMobileStage("form"); // ensures mobile goes to step 1
};




const handleOpenPackingFromSaved = async (
  saved: SavedCruiseSelection
) => {
  const selection: CruiseSelection = {
    lineId: saved.lineId ?? "",
    shipId: saved.shipId ?? "",
    sailDate: saved.sailDate,
    lineName: saved.lineName,
    shipName: saved.shipName,
  };

  // ✅ set current cruise
  setSelectedCruise(selection);

  // ✅ REQUIRED for title
  setPackingMeta({
    lineName: selection.lineName ?? "",
    shipName: selection.shipName ?? "",
  });

  if (saved.itinerary) {
    setItinerary(saved.itinerary);
  } else {
    await handleCruiseSubmit(selection);
  }

  setView("packing");
};

const openPackingChecklistFromCurrentCruise = () => {
  if (!selectedCruise || itinerary.length === 0) return;

  setPackingMeta({
    lineName: selectedCruise.lineName ?? "",
    shipName: selectedCruise.shipName ?? "",
  });

  setView("packing");
};



  // ---------------- AUTH HELPERS ----------------
  const handleAuthSuccessToSaved = () => {
    setRegistrationJustCompleted(false);
    setLoginJustCompleted(true);
    setView("saved");
  };

  const handleSignupSuccessToLogin = () => {
    setLoginJustCompleted(false);
    setRegistrationJustCompleted(true);
    setView("login");
  };

  // ---------------- DERIVED ----------------
  const canSaveCurrentCruise = useMemo(
    () => !!selectedCruise && !!currentSailDate,
    [selectedCruise, currentSailDate]
  );

  // ---------------- LOGOUT DETECTION ----------------
  const prevUserRef = useRef(user);

  useEffect(() => {
    const prevUser = prevUserRef.current;

    if (prevUser && !user) {
      resetAppState();
      setView("home");
      setLoginJustCompleted(false);
      setRegistrationJustCompleted(false);
      setLogoutJustCompleted(true);
    }

    prevUserRef.current = user;
  }, [user]);

  // ---------------- VIEW ROUTING ----------------

  let renderedScreen = null;

  // HOME SCREEN
  if (view === "home") {
    renderedScreen = (
      <>
        <CloudBackground />
        {isGlobalLoading && <Spinner message="Loading…" />}

        <div className="cc-app cc-app--home">
          {user && (
            <AuthStatusBar
              onGoToSaved={() => goTo("saved")}
              onLogin={() => goTo("authSplit")}
              onCreateAccount={() => goTo("createAccount")}
            />
          )}

          {logoutJustCompleted && (
            <div className="cc-toast">
              You’ve been signed out of CruiseCast. Come back anytime to plan
              your next sailing.
            </div>
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
                  goTo("app");
                }}
                onLogin={() => goTo("authSplit")}
                onGoToAccount={() => goTo("saved")}
              />
            </div>
          </main>

          <footer className="cc-app-footer">
            <div className="cc-footer-inner">
              <div>
                v1.0 — Cruises &amp; itineraries from Apify, weather by
                Tomorrow.io &amp; NOAA NCEI.
              </div>
              <div className="cc-footer-copy">
                © {new Date().getFullYear()} CruiseCast. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </>
    );
  }

  // SAVED CRUISES SCREEN
  if (view === "saved") {
    renderedScreen = (
      <>
        <CloudBackground />

        <div className="cc-app">
          <AuthStatusBar
            onGoToSaved={() => goTo("saved")}
            onLogin={() => goTo("authSplit")}
            onCreateAccount={() => goTo("createAccount")}
          />

          <GlobalHeader onBack={goHome} />

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

          <main className="cc-app-main cc-app-main--saved">
            <div className="cc-app-main-inner">

              <SavedCruisesScreen
              onBack={goHome}
              onSelectSaved={handleSelectSavedCruise}
              onManagePassword={() => setView("changePassword")}
              onOpenPackingChecklist={handleOpenPackingFromSaved}
              onCheckAnotherCruise={handleGoToSearch}
            />
     
            </div>
          </main>

          <footer className="cc-app-footer">
            <div className="cc-footer-inner">
              <div>
                v1.0 — Cruises &amp; itineraries from Apify, weather by
                Tomorrow.io &amp; NOAA NCEI.
              </div>
              <div className="cc-footer-copy">
                © {new Date().getFullYear()} CruiseCast. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </>
    );
  }

  // CHANGE PASSWORD SCREEN
  if (view === "changePassword") {
    renderedScreen = (
      <>
        <CloudBackground />
        {isGlobalLoading && <Spinner message="Loading…" />}

        <div className="cc-app">
          <GlobalHeader onBack={goHome} />

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
              <ChangePasswordScreen
                onBack={() => goTo("saved")}
                onPasswordChanged={() => {}}
              />
            </div>
          </main>

          <footer className="cc-app-footer">
            <div className="cc-footer-inner">
              <div>
                v1.0 — Cruises &amp; itineraries from Apify, weather by
                Tomorrow.io &amp; NOAA NCEI.
              </div>
              <div className="cc-footer-copy">
                © {new Date().getFullYear()} CruiseCast. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </>
    );
  }

  // AUTH SPLIT SCREEN (Login + Create side-by-side)
if (view === "authSplit") {
  renderedScreen = (
    <>
      <CloudBackground />
      {isGlobalLoading && <Spinner message="Loading…" />}

      <div className="cc-app">
        <GlobalHeader onBack={goHome} />

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

        <AuthSplitScreen
          onAuthSuccess={handleAuthSuccessToSaved}
          onSignupSuccess={() => {
            setRegistrationJustCompleted(true);
            goTo("login");
          }}
        />
      </div>
    </>
  );
}

  // LOGIN SCREEN
  if (view === "login") {
    renderedScreen = (
      <>
        <CloudBackground />
        {isGlobalLoading && <Spinner message="Loading…" />}

        <div className="cc-app">
          {registrationJustCompleted && (
            <div className="cc-toast">
              Thank you for registering! Please check your email to confirm your
              account.
            </div>
          )}

          <GlobalHeader onBack={goHome} />

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
                onGoToCreate={() => goTo("createAccount")}
              />
            </div>
          </main>
        </div>
      </>
    );
  }

  // CREATE ACCOUNT
  if (view === "createAccount") {
    renderedScreen = (
      <>
        <CloudBackground />
        {isGlobalLoading && <Spinner message="Loading…" />}

        <div className="cc-app">
          <GlobalHeader onBack={goHome} />

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
                onAuthSuccess={handleSignupSuccessToLogin}
                onGoToLogin={() => goTo("login")}
              />
            </div>
          </main>

          <footer className="cc-app-footer">
            <div className="cc-footer-inner">
              <div>
                v1.0 — Cruises &amp; itineraries from Apify, weather by
                Tomorrow.io &amp; NOAA NCEI.
              </div>
              <div className="cc-footer-copy">
                © {new Date().getFullYear()} CruiseCast. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </>
    );
  }

 // ⭐ NEW: PACKING CHECKLIST SCREEN
if (view === "packing") {
  renderedScreen = (
    <>
      <CloudBackground />
      {isGlobalLoading && <Spinner message="Loading…" />}

      <div className="cc-app">
        <AuthStatusBar
          onGoToSaved={() => goTo("saved")}
          onLogin={() => goTo("authSplit")}
          onCreateAccount={() => goTo("createAccount")}
        />

        <GlobalHeader onBack={() => setView("app")} />

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
             <PackingChecklist
  days={itinerary}
  cruiseLine={packingMeta.lineName}
  shipName={packingMeta.shipName}
  onBack={() => setView("app")}
/>

            </section>
          </div>
        </main>

        <footer className="cc-app-footer">
          <div className="cc-footer-inner">
            <div>
              v1.0 — Cruises &amp; itineraries from Apify, weather by
              Tomorrow.io &amp; NOAA NCEI.
            </div>
            <div className="cc-footer-copy">
              © {new Date().getFullYear()} CruiseCast. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}


  // ---------------- MAIN APP (SEARCH + RESULTS + WEATHER) ----------------
  if (view === "app") {
    renderedScreen = (
      <>
        <CloudBackground />
        {isGlobalLoading && <Spinner message="Loading…" />}

        <div className="cc-app">
          {/* Top auth bar */}
          <AuthStatusBar
            onGoToSaved={() => setView("saved")}
            onLogin={() => setView("authSplit")}
            onCreateAccount={() => setView("createAccount")}
          />

          <GlobalHeader onBack={goHome} />

          {/* App header */}
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
                {/* Error banner */}
                {error && <div className="cc-error-banner">{error}</div>}

                {/* DESKTOP MODE */}
                {!isMobile && (
                  <>
                    {/* Cruise Form */}
                    <CruiseForm onSubmit={handleCruiseSubmit} />

                                       {/* Search Results */}
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

             {/* Weather results */}
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

        {/* ⬇️ Save button now lives BELOW the itinerary/forecast */}

{hasWeather && itinerary.length > 0 && (
  <div className="cc-packing-cta">
    <button
      type="button"
      className="cc-button cc-button-secondary"
      onClick={openPackingChecklistFromCurrentCruise}
    >
      View packing checklist
    </button>
  </div>
)}


        {canSaveCurrentCruise && currentSailDate && (
          <div className="cc-save-wrapper">
            <SaveCruiseButton
              cruise={selectedCruise}
              sailDate={currentSailDate}
              onRequireAuth={() => setView("authSplit")}
            />
          </div>
        )}

        {/* Packing checklist button (desktop) */}
        {hasWeather && itinerary.length > 0 && (
     <div className="cc-packing-cta">


</div>




        )}

        {!hasWeather && selectedCruise && (
          <p className="cc-weather-footnote">
            Some days fall outside the 15-day forecast
            window. CruiseCast fills missing days using
            climatology.
          </p>
        )}
      </>
    )}
  </div>
)}

                  </>
                )}

                {/* MOBILE MODE */}
                {isMobile && (
                  <div className="cc-mobile-layout">
                    {/* Step 1 — User selects cruise */}
                    {mobileStage === "form" && (
                      <MobileCruiseWizard
                        onSubmit={handleCruiseSubmit}
                        onBackToHome={goHome}
                      />
                    )}

                    {/* Step 2 — Results */}
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

                     {/* Mobile weather */}
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

        {/* ⬇️ Save button now below itinerary on mobile too */}
        {canSaveCurrentCruise && currentSailDate && (
          <div className="cc-save-wrapper cc-save-wrapper--mobile">
            <SaveCruiseButton
              cruise={selectedCruise}
              sailDate={currentSailDate}
              onRequireAuth={() => setView("authSplit")}
            />
          </div>
        )}

        {/* Packing checklist button (mobile) */}
        {hasWeather && itinerary.length > 0 && (
          <div className="cc-packing-cta cc-packing-cta--mobile">
            <button
              type="button"
              className="cc-button cc-button-secondary"
              onClick={() => setView("packing")}
            >
              View packing checklist
            </button>
          </div>
        )}
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

          {/* FOOTER */}
          <footer className="cc-app-footer">
            <div className="cc-footer-inner">
              <div>
                v1.0 — Cruises &amp; itineraries from Apify, weather by
                Tomorrow.io &amp; NOAA NCEI.
              </div>
              <div className="cc-footer-copy">
                © {new Date().getFullYear()} CruiseCast. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </>
    );
  } // <-- closes "if (view === 'app')"

return (
  <>
    {renderedScreen}

    {showInstall && <InstallPrompt />}
  </>
);

}
