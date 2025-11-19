import React, { useState } from "react";
import CruiseForm from "./components/CruiseForm";
import WeatherTimeline from "./components/WeatherTimeline";
import { sampleItinerary } from "./data/mockData";
import { getDailyForecastsForCity } from "./services/weather";

type CruiseSelection = {
  lineId: string;
  shipId: string;
  sailDate: string; // "YYYY-MM-DD"
};

function App() {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState(sampleItinerary);

  const handleCruiseSubmit = async ({ sailDate }: CruiseSelection) => {
    setLoading(true);
    setError(null);

    try {
      const firstDay = sampleItinerary[0];

      // Use the label to derive a city (e.g. "Miami (Embarkation)" -> "Miami")
      const cityForApi = firstDay.location.split("(")[0].trim() || "Miami";

      // Build a new itinerary with dates based on the sail date
      const sailDateObj = new Date(sailDate);

      const datedItinerary = sampleItinerary.map((day, index) => {
        const d = new Date(sailDateObj);
        d.setDate(d.getDate() + index); // Day 1 = sail date, Day 2 = +1, etc.
        const isoDate = d.toISOString().slice(0, 10); // "YYYY-MM-DD"

        return {
          ...day,
          date: isoDate
        };
      });

      const dates = datedItinerary.map((day) => day.date);
      console.log("Using city/dates for API:", cityForApi, dates);

      // Fetch daily forecasts for all these dates in one shot
      const forecastsByDate = await getDailyForecastsForCity(cityForApi, dates);

      // Merge live weather into every day that has data
      const updated = datedItinerary.map((day) => {
        const forecast = forecastsByDate[day.date];

        if (forecast) {
          return {
            ...day,
            high: forecast.high,
            low: forecast.low,
            rainChance: forecast.rainChance,
            icon: forecast.icon,
            description: `API (daily): ${forecast.description}`
          };
        }

        // No forecast data for this date (e.g. beyond 5 days) → keep mock values
        return day;
      });

      console.log("Final updated itinerary:", updated);

      setItinerary(updated);
      setHasSubmitted(true);
    } catch (e) {
      console.error("Weather error:", e);
      setError("There was a problem loading the weather. Please try again.");
      setHasSubmitted(true);
      setItinerary(sampleItinerary);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-blue-200">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Cruise Weather Companion
          </h1>
          <p className="mt-2 text-sm text-slate-700 md:text-base">
            Pick your cruise and get a simple, clean forecast for every day of your sailing.
          </p>
        </header>

        <CruiseForm onSubmit={handleCruiseSubmit} />

        {loading && (
          <p className="mt-4 text-center text-sm text-slate-700">
            Loading weather forecast...
          </p>
        )}

        {error && (
          <p className="mt-2 text-center text-sm text-red-600">
            {error}
          </p>
        )}

        {hasSubmitted && <WeatherTimeline itinerary={itinerary} />}

        <footer className="mt-10 text-center text-xs text-slate-600">
          v0.4 — All cruise days use daily-style live weather (where available).
        </footer>
      </div>
    </div>
  );
}

export default App;
