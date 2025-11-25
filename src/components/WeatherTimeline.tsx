// src/components/WeatherTimeline.tsx
import React from "react";

type TimelineDay = {
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

type WeatherTimelineProps = {
  itinerary: TimelineDay[];
};

function formatDisplayDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getIconPath(icon?: TimelineDay["icon"]): string {
  switch (icon) {
    case "sunny": return "/icons/sunny.svg";
    case "partly": return "/icons/partly.svg";
    case "cloudy": return "/icons/cloudy.svg";
    case "rain": return "/icons/rain.svg";
    default: return "/icons/sunny.svg";
  }
}

export default function WeatherTimeline({ itinerary }: WeatherTimelineProps) {
  if (!itinerary || itinerary.length === 0) {
    return <p className="text-sm text-gray-600">No itinerary available.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {itinerary.map((day) => (
        <div key={day.day} className="flex flex-col items-center p-4 rounded-xl shadow-md" style={{ backgroundColor: day.icon === 'rain' ? '#e0f2fe' : '#fff7ed' }}>
          {/* Day and Date */}
          <div className="flex justify-between w-full text-xs font-semibold text-gray-500 mb-2">
            <span>Day {day.day}</span>
            <span>{formatDisplayDate(day.date)}</span>
          </div>

          {/* Location */}
          <div className="text-center text-sm font-bold text-gray-800 mb-2">{day.location}</div>

          {/* Weather Icon */}
          <img src={getIconPath(day.icon)} alt={day.icon || "weather"} className="w-12 h-12 mb-2" />

          {/* Temperatures */}
          {(typeof day.high === "number" || typeof day.low === "number") && (
            <div className="text-lg font-bold text-gray-900 mb-1">
              {typeof day.high === "number" && `High ${Math.round(day.high)}°`}
              {typeof day.high === "number" && typeof day.low === "number" ? " • " : ""}
              {typeof day.low === "number" && `Low ${Math.round(day.low)}°`}
            </div>
          )}

          {/* Rain Chance */}
          {typeof day.rainChance === "number" && (
            <div className="text-xs text-blue-600">Chance of rain: {Math.round(day.rainChance)}%</div>
          )}

          {/* Description */}
          {day.description && (
            <div className="text-xs text-gray-600 mt-1 text-center">{day.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}
