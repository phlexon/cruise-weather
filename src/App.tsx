import React, { useState } from "react";
import CruiseForm from "./components/CruiseForm";
import WeatherTimeline from "./components/WeatherTimeline";
import { sampleItinerary } from "./data/mockData";

function App() {
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleCruiseSubmit = () => {
    setHasSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-blue-200">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Cruise Weather Companion
          </h1>
          <p className="mt-2 text-sm text-slate-700 md:text-base">
            Pick your cruise and get a simple, clean forecast for every day
            of your sailing.
          </p>
        </header>

        <CruiseForm onSubmit={handleCruiseSubmit} />

        {hasSubmitted && <WeatherTimeline itinerary={sampleItinerary} />}

        <footer className="mt-10 text-center text-xs text-slate-600">
          v0.1 MVP — Sample data only.
        </footer>
      </div>
    </div>
  );
}

export default App;
