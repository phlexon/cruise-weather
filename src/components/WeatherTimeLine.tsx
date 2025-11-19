import React from "react";

const iconToEmoji = {
  sunny: "☀️",
  partly: "⛅",
  cloudy: "☁️",
  rain: "🌧️"
};

const WeatherTimeline = ({ itinerary }) => {
  if (!itinerary.length) return null;

  return (
    <div className="mt-6 space-y-3 rounded-xl bg-white/80 p-4 shadow-md">
      <h2 className="text-xl font-semibold text-slate-800">
        Your Cruise Weather
      </h2>

      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {itinerary.map((day) => (
          <div
            key={day.dayNumber}
            className="min-w-[180px] flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-1 text-xs font-semibold text-slate-500">
              Day {day.dayNumber}
            </div>
            <div className="text-sm font-semibold text-slate-800">
              {day.location}
            </div>
            <div className="text-xs text-slate-500">
              {new Date(day.date).toLocaleDateString()}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl">{iconToEmoji[day.icon]}</span>
              <div className="text-sm">
                <div className="font-semibold">
                  {day.high}° / {day.low}°
                </div>
                <div className="text-xs text-slate-600">
                  Rain: {day.rainChance}%
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-600">{day.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherTimeline;
