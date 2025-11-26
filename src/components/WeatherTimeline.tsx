// src/components/WeatherTimeline.tsx
import React, { useEffect, useMemo, useState } from "react";

export type ItineraryDay = {
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
  itinerary: ItineraryDay[];
};

export default function WeatherTimeline({ itinerary }: WeatherTimelineProps) {
  const [page, setPage] = useState(0);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pageSize = 3;

  const totalPages = useMemo(() => {
    if (!itinerary || itinerary.length === 0) return 0;
    return Math.ceil(itinerary.length / pageSize);
  }, [itinerary, pageSize]);

  // Clamp page in case itinerary length changes
  useEffect(() => {
    if (!totalPages) {
      setPage(0);
      return;
    }
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  const visibleDays = useMemo(() => {
    if (!itinerary) return [];

    // Mobile: show ALL days as vertical stack
    if (isMobile) {
      return itinerary;
    }

    // Desktop: 3 per page
    const start = page * pageSize;
    const end = start + pageSize;
    return itinerary.slice(start, end);
  }, [itinerary, isMobile, page, pageSize]);

  const handlePrev = () => {
    setPage((p) => Math.max(0, p - 1));
  };

  const handleNext = () => {
    if (!totalPages) return;
    setPage((p) => Math.min(totalPages - 1, p + 1));
  };

  if (!itinerary || itinerary.length === 0) {
    return null;
  }

  const getIconSrc = (icon?: ItineraryDay["icon"]) => {
    switch (icon) {
      case "rain":
        return "/icons/rain.svg";
      case "cloudy":
        return "/icons/cloudy.svg";
      case "partly":
        return "/icons/partly.svg";
      case "sunny":
      default:
        return "/icons/sunny.svg";
    }
  };

  const getIconAlt = (icon?: ItineraryDay["icon"]) => {
    switch (icon) {
      case "rain":
        return "Rainy";
      case "cloudy":
        return "Cloudy";
      case "partly":
        return "Partly cloudy";
      case "sunny":
      default:
        return "Sunny";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      {/* Header row with pagination (desktop only) */}
      {!isMobile && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginBottom: "0.25rem",
          }}
        >
          <button
            type="button"
            onClick={handlePrev}
            disabled={page === 0}
            style={{
              borderRadius: "999px",
              border: "none",
              padding: "0.25rem 0.6rem",
              fontSize: "0.75rem",
              cursor: page === 0 ? "default" : "pointer",
              background:
                page === 0 ? "rgba(148, 163, 184, 0.3)" : "#0f172a",
              color: "#f9fafb",
            }}
          >
            ◀
          </button>
          <span
            style={{
              fontSize: "0.8rem",
              color: "#4b5563",
            }}
          >
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={page >= totalPages - 1}
            style={{
              borderRadius: "999px",
              border: "none",
              padding: "0.25rem 0.6rem",
              fontSize: "0.75rem",
              cursor: page >= totalPages - 1 ? "default" : "pointer",
              background:
                page >= totalPages - 1
                  ? "rgba(148, 163, 184, 0.3)"
                  : "#0f172a",
              color: "#f9fafb",
            }}
          >
            ▶
          </button>
        </div>
      )}

      {/* Cards */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "0.75rem" : "0.9rem",
          alignItems: "stretch",
        }}
      >
        {visibleDays.map((day) => {
          const isClimo = day.source === "climatology";

          const cardBackground = isClimo
            ? "linear-gradient(135deg, #ede9fe, #bfdbfe)"
            : "linear-gradient(135deg, #fef3c7, #fdba74)";

          const labelColor = isClimo ? "#312e81" : "#7c2d12";
          const tempColor = isClimo ? "#1f2937" : "#7c2d12";

          const dateLabel = day.date
            ? new Date(day.date + "T00:00:00Z").toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : `Day ${day.day}`;

          const hi = day.high != null ? Math.round(day.high) : null;
          const lo = day.low != null ? Math.round(day.low) : null;

          const iconSrc = getIconSrc(day.icon);
          const iconAlt = getIconAlt(day.icon);

          return (
            <div
              key={day.day}
              style={{
                flex: isMobile ? "0 0 auto" : 1,
                minWidth: 0,
                borderRadius: "22px",
                padding: "0.75rem 0.9rem 0.85rem",
                background: cardBackground,
                boxShadow: "none",
                color: "#111827",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* Top row: day + date */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: labelColor,
                  }}
                >
                  Day {day.day}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#374151",
                  }}
                >
                  {dateLabel}
                </div>
              </div>

              {/* Location – bigger, multi-line */}
              <div
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "0.5rem",
                  minHeight: "2.4em", // space for 2 lines so icon alignment stays clean
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    lineHeight: 1.2,
                  }}
                >
                  {day.location}
                </span>
              </div>

              {/* Middle row: temps + icon, aligned across cards */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.4rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.1rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      color: tempColor,
                    }}
                  >
                    {hi != null ? `${hi}°` : "--"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#374151",
                    }}
                  >
                    {lo != null ? `Low ${lo}°` : "Low --"}
                  </div>
                  {day.rainChance != null && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#1e40af",
                      }}
                    >
                      {Math.round(day.rainChance)}% chance of rain
                    </div>
                  )}
                </div>

                {/* Icon: SVG from /public/icons, larger size */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.78)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={iconSrc}
                    alt={iconAlt}
                    style={{
                      width: 40,
                      height: 40,
                      display: "block",
                    }}
                  />
                </div>
              </div>

              {/* Description + climatology badge */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                  marginTop: "0.15rem",
                }}
              >
                {day.description && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#374151",
                    }}
                  >
                    {day.description}
                  </div>
                )}

                {isClimo && (
                  <div
                    style={{
                      alignSelf: "flex-start",
                      marginTop: "0.1rem",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "999px",
                      background: "rgba(15, 23, 42, 0.08)",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "#111827",
                    }}
                  >
                    30-Year Average · Not a Forecast
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
