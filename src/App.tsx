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
      // User will click a card in "Matching cruises" to see the itinerary.
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
      // 1) load itinerary from Apify
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

      // 2) basic mapping used by the UI (location + day index)
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

      // 2) basic mapping used by the UI (location + day index)
      let mapped: ItineraryDay[] = daysToUse.map((day, idx) => ({
        day: idx + 1,
        date: day.date, // will be overwritten with aligned date below
        location: getLocationLabel(day, idx),
        icon: "sunny",
        description: "Loading weather…",
      }));


      // --- ALIGN DATES TO THE USER-SELECTED SAIL DATE ---
      // If we have the user's sail date, treat that as canonical; otherwise fall back to Apify's.
      const sailIso = currentSailDate ?? cruise.departIso; // "YYYY-MM-DD"
      const sailDateObj = new Date(sailIso + "T00:00:00Z");

      const isoDates = mapped.map((_, idx) => {
        const d = new Date(sailDateObj);
        d.setDate(d.getDate() + idx); // Day 1 = sail date, Day 2 = +1, etc.
        return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
      });

      // 3) enrich with Tomorrow.io + NCEI climatology fallback
      try {
        const embarkationLocation = mapped[0]?.location ?? "Miami";
        const embarkationCity = embarkationLocation.split(",")[0];
        const stationId = getNceiStationForCity(embarkationCity);

        const forecastsByDate = await getDailyForecastsForCity(
          embarkationCity,
          isoDates,
          { nceiStationId: stationId ?? undefined }
        );

        let anyWeather = false;

        mapped = mapped.map((day, idx) => {
          const dateKey = isoDates[idx];
          const forecast = forecastsByDate[dateKey];

          // always use aligned date for display
          const baseDay: ItineraryDay = {
            ...day,
            date: isoDates[idx],
          };

          if (!forecast) {
            return {
              ...baseDay,
              description: "Weather not available for this day yet.",
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

  // ---------- CARD CLICK ----------
  const handleResultClick = async (index: number) => {
    const cruise = searchResults[index];
    if (!cruise) return;
    await loadCruiseDetails(cruise);
  };

  // ---------- UI ----------
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
      <header
  style={{
    maxWidth: "1040px",
    margin: "0 auto 2rem auto",
    display: "flex",
    flexDirection: "column", // <-- Always stacked
    alignItems: "center",    // <-- Center horizontally
    textAlign: "center",     // <-- Center text
    gap: "1rem",
  }}
>
  {/* Logo */}
  <img
    src="/cruisecast-logo.webp"
    alt="CruiseCast"
    style={{
      height: isMobile ? "46px" : "54px",
      objectFit: "contain",
    }}
  />

  {/* Tagline + description */}
  <div
    style={{
      color: "white",
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
    }}
  >
    Plan Ahead • Sail Smart

    <div
      style={{
        marginTop: "4px",
        fontSize: "12px",
        fontWeight: 400,
        letterSpacing: 0,
        opacity: 0.9,
        maxWidth: "620px", // keeps the paragraph readable
      }}
    >
      Forecast your cruise day by day — itineraries from real sailings,  
      weather from Tomorrow.io and NOAA climate normals.
    </div>
  </div>
</header>


      {/* MAIN */}
      <main
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <div style={{ width: "100%", maxWidth: "1040px" }}>
          {/* MAIN CARD */}
          <section
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.96)",
              borderRadius: "18px",
              padding: "24px 24px 28px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
              border: "1px solid rgba(255,255,255,0.7)",
            }}
          >
            <h1
              style={{
                fontSize: "24px",
                lineHeight: 1.2,
                margin: "0 0 18px 0",
                color: "#324A6D",
                textAlign: isMobile ? "center" : "left",
              }}
            >
              Check Your Cruise Weather
            </h1>

            <CruiseForm onSubmit={handleCruiseSubmit} />

            {loadingSearch && (
              <p
                style={{
                  marginTop: "10px",
                  fontSize: "12px",
                  textAlign: "center",
                  color: "#324A6D",
                }}
              >
                Loading cruise data...
              </p>
            )}

            {error && (
              <p
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                  textAlign: "center",
                  color: "#b91c1c",
                  fontWeight: 500,
                }}
              >
                {error}
              </p>
            )}

            <div style={{ marginTop: "22px", color: "#324A6D" }}>
              {selectedCruise ? (
                <div>
                  {/* NOTE: removed "Selected cruise & daily weather" heading */}

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
                      <div
                        style={{
                          marginTop: "10px",
                          borderRadius: "12px",
                          background: "rgba(248,250,252,0.9)",
                          padding: "10px",
                        }}
                      >
                        <WeatherTimeline itinerary={itinerary} />
                      </div>

                      {/* Selected cruise summary + explanation BELOW the itinerary */}
                      <div
                        style={{
                          marginTop: "10px",
                          fontSize: "11px",
                          color: "#4b5563",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            marginBottom: "2px",
                          }}
                        >
                          {selectedCruise.title}
                          {selectedCruise.shipName
                            ? ` · Ship: ${selectedCruise.shipName}`
                            : ""}
                          {selectedCruise.cruiseLine
                            ? ` · Line: ${selectedCruise.cruiseLine}`
                            : ""}
                        </div>
                        <div style={{ marginTop: "2px" }}>
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
                  <h2
                    style={{
                      fontSize: "18px",
                      margin: "0 0 6px 0",
                      fontWeight: 600,
                    }}
                  >
                    Your cruise, day by day.
                  </h2>
                  <p
                    style={{
                      fontSize: "13px",
                      margin: "0 0 6px 0",
                      opacity: 0.9,
                    }}
                  >
                    Choose your cruise to see each port stop with high/low
                    temperatures and rain chances — all in one clean view.
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      margin: 0,
                      fontStyle: "italic",
                      opacity: 0.75,
                    }}
                  >
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
            <section
              style={{
                marginTop: "18px",
                background: "rgba(255,255,255,0.96)",
                borderRadius: "16px",
                padding: "16px 20px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
                border: "1px solid rgba(255,255,255,0.7)",
              }}
            >
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#324A6D",
                  margin: "0 0 10px 0",
                }}
              >
                Matching cruises
              </h2>
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
              <section
                style={{
                  marginTop: "18px",
                  background: "rgba(255,255,255,0.96)",
                  borderRadius: "16px",
                  padding: "14px 18px",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.14)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  fontSize: "13px",
                  color: "#374151",
                }}
              >
                No cruises found for that ship and date. Try adjusting your
                selection.
              </section>
            )}
        </div>
      </main>

      {/* FOOTER */}
      <footer
        style={{
          marginTop: "1.25rem",
          textAlign: "center",
          fontSize: "11px",
          color: "rgba(255,255,255,0.9)",
        }}
      >
        v1.0 — Cruises & itineraries from Apify, weather by Tomorrow.io and
        NOAA NCEI.
      </footer>
    </div>
  );
}
