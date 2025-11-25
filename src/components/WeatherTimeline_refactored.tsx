// WeatherTimeline_refactored.tsx
import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

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
  loading?: boolean;
};

function formatDisplayDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getIcon(icon?: TimelineDay["icon"]): string {
  switch (icon) {
    case "sunny": return "/icons/sunny.svg";
    case "partly": return "/icons/partly.svg";
    case "cloudy": return "/icons/cloudy.svg";
    case "rain": return "/icons/rain.svg";
    default: return "/icons/sunny.svg";
  }
}

export default function WeatherTimeline({ itinerary, loading }: WeatherTimelineProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(7)].map((_, i) => (<Skeleton key={i} height={140} borderRadius={12} />))}
      </div>
    );
  }

  if (!itinerary || itinerary.length === 0) {
    return <p className="text-sm text-gray-600">No itinerary available.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {itinerary.map((day) => (
        <div key={day.day} className="flex flex-col items-center p-4 rounded-xl shadow-md" style={{ backgroundColor: day.icon === 'rain' ? '#e0f2fe' : '#fff7ed' }}>
          <div className="text-xs font-semibold text-gray-500">Day {day.day}</div>
          <div className="text-xs text-gray-600">{formatDisplayDate(day.date)}</div>
          <img src={getIcon(day.icon)} alt={day.icon} className="w-8 h-8 my-2" />
          <div className="text-lg font-bold">{day.high}° / {day.low}°</div>
          <div className="text-xs text-blue-600">Rain: {day.rainChance}%</div>
        </div>
      ))}
    </div>
  );
}
