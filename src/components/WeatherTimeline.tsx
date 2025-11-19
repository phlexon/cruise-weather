import React from "react";

// Helper: turn "YYYY-MM-DD" into a local date string without timezone bugs
function formatLocalDateFromIso(isoDate?: string) {
  if (!isoDate) return "";
  try {
    const [year, month, day] = isoDate.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString();
  } catch {
    return isoDate;
  }
}

// Helper: pick an emoji based on the icon string
function getEmojiForIcon(icon?: string) {
  const key = (icon || "").toLowerCase();
  if (key.includes("rain") || key === "rain") return "🌧️";
  if (key.includes("cloud") || key === "cloudy") return "☁️";
  if (key.includes("sun") || key === "sunny" || key === "clear") return "☀️";
  if (key.includes("part")) return "⛅"; // partly cloudy etc.
  return "⛅";
}

const WeatherTimeline = ({ itinerary }) => {
  if (!itinerary || itinerary.length === 0) return null;

  return (
    <section className="mt-6 rounded-xl bg-white/90 p-4 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        Your Cruise Forecast
      </h2>

      {/* GRID: 1 column on mobile, 3 side-by-side on md+ */}
      <div className="grid gap-4 md:grid-cols-3">
        {itinerary.map((day) => {
          const dateLabel = formatLocalDateFromIso(day.date);
          const emoji = getEmojiForIcon(day.icon);

          return (
            <div
              key={day.dayNumber}
              className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-sky-50/70 p-3"
            >
              {/* Top: day, port, date */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Day {day.dayNumber}
                </div>
                <div className="text-sm font-medium text-slate-900">
                  {day.location}
                </div>
                <div className="text-xs text-slate-500">{dateLabel}</div>
              </div>

              {/* Bottom: temps + emoji + description */}
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="text-sm text-slate-800">
                  <div>
                    High:{" "}
                    <span className="font-semibold">
                      {day.high != null ? `${day.high}°F` : "--"}
                    </span>
                  </div>
                  <div>
                    Low:{" "}
                    <span className="font-semibold">
                      {day.low != null ? `${day.low}°F` : "--"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Rain chance:{" "}
                    <span className="font-semibold">
                      {day.rainChance != null ? `${day.rainChance}%` : "--"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center text-right">
                  <div className="text-3xl leading-none">{emoji}</div>
                  <div className="mt-1 max-w-[160px] text-xs font-medium text-slate-700">
                    {day.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WeatherTimeline;
