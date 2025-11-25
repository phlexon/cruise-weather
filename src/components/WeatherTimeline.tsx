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

// Avoid timezone shift by forcing a local-time date
function formatDisplayDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getIconEmoji(icon?: TimelineDay["icon"]) {
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
      return "☀️";
  }
}

function getCardBackground(day: TimelineDay): string {
  const hasWeather =
    typeof day.high === "number" ||
    typeof day.low === "number" ||
    typeof day.rainChance === "number";

  if (day.source === "climatology") {
    return "#eef2ff"; // light indigo for normals
  }

  if (!hasWeather) {
    return "#f3f4f6"; // light gray when no weather data
  }

  if (day.icon === "rain") {
    return "#e0f2fe"; // cooler blue for rainy days
  }

  return "#fff7ed"; // warm peach for normal days
}

export default function WeatherTimeline({ itinerary }: WeatherTimelineProps) {
  if (!itinerary || itinerary.length === 0) {
    return <p style={{ fontSize: "12px" }}>No itinerary available.</p>;
  }

  const embarkationCity =
    itinerary[0]?.location.split(",")[0] ?? "departure port";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        // no maxHeight/overflow – grows with page
      }}
    >
      {/* Day cards */}
      {itinerary.map((day) => {
        const bg = getCardBackground(day);
        const dateLabel = formatDisplayDate(day.date);
        const isClimo = day.source === "climatology";

        return (
          <div
            key={day.day}
            style={{
              borderRadius: "10px",
              padding: "10px 12px",
              background: bg,
              border: "1px solid rgba(249,115,22,0.35)",
            }}
          >
            {/* Day + date */}
            <div
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#6b7280",
                marginBottom: "4px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Day {day.day}</span>
              <span>{dateLabel}</span>
            </div>

            {/* Location */}
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: isClimo ? "0px" : "2px",
                color: "#111827",
              }}
            >
              {day.location}
            </div>

            {/* Climatology badge */}
            {isClimo && (
              <div
                style={{
                  fontSize: "10px",
                  color: "#4F46E5",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginTop: "4px",
                  marginBottom: "4px",
                }}
              >
                30-YEAR AVERAGE (NOT A FORECAST)
              </div>
            )}

            {/* Weather row */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                marginTop: "4px",
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  lineHeight: 1,
                  marginTop: "-2px",
                }}
              >
                {getIconEmoji(day.icon)}
              </div>

              <div style={{ fontSize: "12px", color: "#374151" }}>
                {typeof day.high === "number" &&
                  typeof day.low === "number" && (
                    <div>
                      <strong>
                        High {Math.round(day.high)}° • Low{" "}
                        {Math.round(day.low)}°
                      </strong>
                    </div>
                  )}

                {typeof day.rainChance === "number" && (
                  <div>Chance of rain: {Math.round(day.rainChance)}%</div>
                )}

                {day.description && (
                  <div
                    style={{
                      marginTop: "2px",
                      fontSize: "11px",
                      fontStyle: isClimo ? "italic" : "normal",
                      color: isClimo ? "#4B5563" : "#374151",
                    }}
                  >
                    {day.description}
                  </div>
                )}

                {!day.description &&
                  !day.high &&
                  !day.low &&
                  !day.rainChance && (
                    <div style={{ fontSize: "11px", fontStyle: "italic" }}>
                      No forecast available for this day yet – check closer to
                      your sail date.
                    </div>
                  )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Explanatory footer text (moved from the top) */}
      <div
        style={{
          marginTop: "6px",
          fontSize: "10px",
          color: "#6b7280",
          borderTop: "1px dashed rgba(148,163,184,0.7)",
          paddingTop: "6px",
        }}
      >
        <div
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
            marginBottom: "2px",
          }}
        >
          Daily itinerary &amp; weather
        </div>
        <div style={{ marginBottom: "2px" }}>
          Weather uses forecast (and historical climate normals when forecast
          isn&apos;t available) for {embarkationCity}.
        </div>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Live forecast shown when available · 30-year averages fill missing
          days
        </div>
      </div>
    </div>
  );
}
