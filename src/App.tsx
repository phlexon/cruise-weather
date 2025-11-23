// src/App.tsx
import React, { useState } from "react";
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
import { sampleItinerary } from "./data/mockData";

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
};

// Normalize any date string to "YYYY-MM-DD" for Tomorrow.io lookups
function normalizeDateForWeather(dateStr?: string | null): string | null {
  if (!dateStr) return null;

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle "2025 Nov 22"
  const m = dateStr.match(/^(\d{4})\s+([A-Za-z]{3})\s+(\d{2})$/);
  if (m) {
    const [, yearStr, monStr, dayStr] = m;
    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const idx = months[monStr];
    if (idx != null) {
      const d = new Date(Number(yearStr), idx, Number(dayStr));
      if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
    }
  }

  // Last fallback: let Date try to parse it
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}


// --- helper: strip "(code 4000)" etc from descriptions ---
function cleanDescription(text?: string): string {
  if (!text) return "";
  return text.replace(/\(code\s*\d+\)/gi, "").trim();
}

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

  // Cruises to show in the "Matching cruises" list.
  const visibleResults = selectedCruise
    ? searchResults.filter((c) => c.id !== selectedCruise.id)
    : searchResults;

  // Map clicks on *visible* results back to the original searchResults array.
  const handleVisibleResultClick = (visibleIndex: number) => {
    const cruise = visibleResults[visibleIndex];
    if (!cruise) return;

    const originalIndex = searchResults.findIndex((c) => c.id === cruise.id);
    if (originalIndex === -1) return;

    handleResultClick(originalIndex);
  };

  // ---------- SEARCH ----------
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

    try {
      const results = await searchCruisesByDate(sailDate);

      const filtered = results.filter((c) => {
        if (lineName && c.cruiseLine !== lineName) return false;
        if (shipName && c.shipName !== shipName) return false;
        return true;
      });

      setSearchResults(filtered);
      setHasSubmitted(true);
    } catch (e) {
      console.error("Error searching cruises:", e);
      setError("There was a problem loading cruise results.");
      setHasSubmitted(true);
    } finally {
      setLoadingSearch(false);
    }
  };

  // ---------- CARD CLICK ----------
  const handleResultClick = async (index: number) => {
    const cruise = searchResults[index];
    if (!cruise) return;

    setSelectedCruise(cruise);
    setLoadingDetails(true);
    setDetailsError(null);

    try {
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

      let mapped: ItineraryDay[] = daysToUse.map((day, idx) => ({
        day: idx + 1,
        date: day.date,
        location: day.portName,
        icon: "sunny",
        description: "Loading weather…",
      }));

      try {
        // Normalize all dates to ISO for the API call
        const isoDates = mapped
          .map((d) => normalizeDateForWeather(d.date))
          .filter((d): d is string => Boolean(d));

        if (!isoDates.length) {
          throw new Error("No valid dates for weather request.");
        }

        const embarkationLocation = mapped[0]?.location ?? "Miami";
        const embarkationCity = embarkationLocation.split(",")[0];

        const forecastsByDate = await getDailyForecastsForCity(
          embarkationCity,
          isoDates
        );

        mapped = mapped.map((day) => {
          const normalized = normalizeDateForWeather(day.date);
          if (!normalized) {
            return {
              ...day,
              description: "Weather not available for this day yet.",
            };
          }

          const forecast = forecastsByDate[normalized];
          if (!forecast) {
            return {
              ...day,
              description: "Weather not available for this day yet.",
            };
          }

          return {
            ...day,
            high: forecast.high,
            low: forecast.low,
            rainChance: forecast.rainChance,
            icon: forecast.icon,
            description: forecast.description,
          };
        });

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

        mapped = mapped.map((day) => ({
          ...day,
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
    } finally {
      setLoadingDetails(false);
    }
  };

  // ---------- UI ----------
  return (
    <div
      className="app-shell"
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
        className="cc-header"
        style={{
          maxWidth: "1040px",
          margin: "0 auto 2rem auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <img
          src="/cruisecast-logo.webp"
          alt="CruiseCast"
          className="cc-logo"
          style={{ height: "48px", objectFit: "contain" }}
        />

        <div
          className="cc-tagline"
          style={{
            color: "white",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            flex: "1 1 160px",
          }}
        >
          Plan Ahead • Sail Smart
          <div
            style={{
              marginTop: "4px",
              fontSize: "12px",
              letterSpacing: 0,
              fontWeight: 400,
              opacity: 0.9,
            }}
          >
            Forecast your cruise day by day — itineraries from real sailings,
            weather from Tomorrow.io.
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
            className="main-card"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.96)",
              borderRadius: "18px",
              padding: "20px 16px 22px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
              border: "1px solid rgba(255,255,255,0.7)",
            }}
          >
            <h1
              style={{
                fontSize: "20px",
                lineHeight: 1.2,
                margin: "0 0 14px 0",
                color: "#324A6D",
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

            <div style={{ marginTop: "18px", color: "#324A6D" }}>
              {selectedCruise ? (
                <div>
                  <h2
                    style={{
                      fontSize: "16px",
                      margin: "0 0 4px 0",
                      fontWeight: 600,
                    }}
                  >
                    Selected cruise & daily weather
                  </h2>
                  <p
                    style={{
                      fontSize: "12px",
                      margin: "0 0 8px 0",
                      opacity: 0.85,
                    }}
                  >
                    {selectedCruise.title}
                    {selectedCruise.shipName
                      ? ` · Ship: ${selectedCruise.shipName}`
                      : ""}
                    {selectedCruise.cruiseLine
                      ? ` · Line: ${selectedCruise.cruiseLine}`
                      : ""}
                  </p>

                  {loadingDetails && (
                    <p
                      style={{
                        fontSize: "12px",
                        marginTop: "6px",
                        color: "#324A6D",
                      }}
                    >
                      Loading itinerary & weather...
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
                    <div
                      style={{
                        marginTop: "10px",
                        borderRadius: "12px",
                        background: "rgba(248,250,252,0.9)",
                        padding: "10px",
                        maxHeight: "380px",
                        overflowY: "auto",
                      }}
                    >
                      <WeatherTimeline itinerary={itinerary} />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h2
                    style={{
                      fontSize: "16px",
                      margin: "0 0 4px 0",
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
                    date.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* RESULTS CARD */}
          {hasSubmitted && visibleResults.length > 0 && (
            <section
              className="results-card"
              style={{
                marginTop: "14px",
                background: "rgba(255,255,255,0.96)",
                borderRadius: "16px",
                padding: "14px 16px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
                border: "1px solid rgba(255,255,255,0.7)",
              }}
            >
              <h2
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#324A6D",
                  margin: "0 0 8px 0",
                }}
              >
                Matching cruises
              </h2>
              <CruiseResults
                results={visibleResults}
                onSelect={handleVisibleResultClick}
                selectedIndex={null}
              />
            </section>
          )}

          {hasSubmitted &&
            !loadingSearch &&
            searchResults.length === 0 &&
            !error && (
              <section
                style={{
                  marginTop: "14px",
                  background: "rgba(255,255,255,0.96)",
                  borderRadius: "16px",
                  padding: "12px 16px",
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
          marginTop: "1rem",
          textAlign: "center",
          fontSize: "11px",
          color: "rgba(255,255,255,0.9)",
        }}
      >
        v1.0 — Cruises & itineraries from Apify, weather by Tomorrow.io.
      </footer>
    </div>
  );
}
