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
  // marks where the data came from
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

  // Climatology days: soft indigo tint
  if (day.source === "climatology") {
    return "#eef2ff";
  }

  if (!hasWeather) {
    return "#f3f4f6"; // light gray when nothing
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

  const embarkationCity = itinerary[0]?.location.split(",")[0] ?? "departure port";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxHeight: "420px",
        overflowY: "auto",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#6b7280",
          marginBottom: "4px",
        }}
      >
        <div>
          <div>Daily itinerary &amp; weather</div>
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginTop: "2px",
            }}
          >
            Live forecast shown when available · 30-year averages fill missing days
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div>Forecast + climate normals for {embarkationCity}.</div>
        </div>
      </div>

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
            {/* Day + date row */}
            <div
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#6b7280",
                marginBottom: "4px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Day {day.day}</span>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isClimo && (
                  <span
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      border: "1px solid #4f46e5",
                      background: "#e0e7ff",
                      color: "#3730a3",
                      whiteSpace: "nowrap",
                    }}
                  >
                    30-year average (not a forecast)
                  </span>
                )}
                <span>{dateLabel}</span>
              </div>
            </div>

            {/* Location */}
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "2px",
                color: "#111827",
              }}
            >
              {day.location}
            </div>

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
                        High {Math.round(day.high)}° • Low {Math.round(day.low)}°
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
                      color: isClimo ? "#4b5563" : "#374151",
                    }}
                  >
                    {day.description}
                  </div>
                )}

                {!day.description &&
                  !day.high &&
                  !day.low &&
                  !day.rainChance && (
                    <div
                      style={{
                        fontSize: "11px",
                        fontStyle: "italic",
                        color: "#6b7280",
                      }}
                    >
                      No forecast available for this day yet – check closer to
                      your sail date.
                    </div>
                  )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
