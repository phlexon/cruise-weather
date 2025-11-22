// src/components/WeatherTimeline.tsx
import React from "react";

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

type Props = {
  itinerary: ItineraryDay[];
};

function getIconEmoji(icon?: ItineraryDay["icon"]) {
  switch (icon) {
    case "sunny":
      return "☀️";
    case "partly":
      return "⛅";
    case "cloudy":
      return "☁️";
    case "rain":
      return "🌧️";
    default:
      return "🌤️";
  }
}

const WeatherTimeline: React.FC<Props> = ({ itinerary }) => {
  if (!itinerary || itinerary.length === 0) {
    return (
      <p className="text-xs text-slate-600">
        No itinerary details available for this cruise.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {itinerary.map((day) => (
        <li
          key={day.day}
          className="flex items-stretch gap-3 rounded-xl bg-white p-3 text-xs text-slate-700 shadow-sm md:text-sm"
        >
          {/* Day + bigger icon */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-[#1F7ECE] px-3 py-2 text-[11px] font-semibold text-white">
            <span className="text-[10px] uppercase tracking-wide">
              Day {day.day}
            </span>
            <span className="mt-1 text-3xl leading-none">
              {getIconEmoji(day.icon)}
            </span>
          </div>

          {/* Main info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <div>
                <p className="font-semibold text-slate-900">
                  {day.location || "At sea"}
                </p>
                {day.date && (
                  <p className="text-[11px] text-slate-500">{day.date}</p>
                )}
              </div>

              {(day.high !== undefined || day.low !== undefined) && (
                <div className="text-right text-[11px] leading-tight text-slate-600 md:text-xs">
                  {day.high !== undefined && day.low !== undefined && (
                    <p className="font-semibold">
                      {Math.round(day.high)}° / {Math.round(day.low)}°
                    </p>
                  )}
                  {day.rainChance !== undefined && (
                    <p>
                      {Math.round(day.rainChance)}% chance of rain
                    </p>
                  )}
                </div>
              )}
            </div>

            {day.description && (
              <p className="mt-1 text-[11px] text-slate-600">
                {day.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};

export default WeatherTimeline;
