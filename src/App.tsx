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

// 👉 NEW: import the home screen
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

      // IMPORTANT: do NOT auto-open any cruise here.
      setSelectedCruise(null);
    } catch (e) {
      console.error("Error searching cruises:", e);
      setError("There was a problem loading cruise results.");
      setHasSubmitted(true);
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

        if (text.includes("at sea") || text.includes("sea day")) {
          return "At sea";
        }

        if (!portName && raw) {
          return raw;
        }

        return portName || `Day ${idx + 1}`;
      };

      // 2) Basic mapping used by the UI
      let mapped: ItineraryDay[] = daysToUse.map((day, idx) => ({
        day: idx + 1,
        date: day.date,
        location: getLocationLabel(day, idx),
        icon: "sunny",
        description: "Loading weather…",
      }));

      // --- ALIGN DATES TO THE USER-SELECTED SAIL DATE ---
      const sailIso = currentSailDate ?? cruise.departIso;
      const sailDateObj = new Date(sailIso + "T00:00:00Z");

      const isoDates = mapped.map((_, idx) => {
        const d = new Date(sailDateObj);
        d.setDate(d.getDate() + idx);
        return d.toISOString().slice(0, 10);
      });

      // 3) Enrich with Tomorrow.io + NCEI
      try {
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

        const parseIso = (iso?: string) => {
          if (!iso) return null;
          const d = new Date(iso + "T00:00:00Z");
          return isNaN(d.getTime()) ? null : d;
        };

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

  // ---------- CARD CLICK ----------
  const handleResultClick = async (index: number) => {
    const cruise = searchResults[index];
    if (!cruise) return;
    await loadCruiseDetails(cruise);
  };

  // 👉 NEW: if we're on the home view, show the welcome screen instead
  if (view === "home") {
    return (
      <HomeScreen
        onFindCruise={() => setView("app")}
        onLogin={() => {
          // you can wire real auth later
          alert("Login coming soon!");
        }}
      />
    );
  }

  // ---------- MAIN UI (unchanged) ----------
  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: "2.5rem 1.5rem",
        background:
          "linear-gradient(to bottom, #324A6D 0%, #1F7ECE 45%, #F4D7A1 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      {/* ... rest of your existing JSX stays exactly the same ... */}
      {/* (keep all the header, main, WeatherTimeline, CruiseResults, footer, etc.) */}
    </div>
  );
}
