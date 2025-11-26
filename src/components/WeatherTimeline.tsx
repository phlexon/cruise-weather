// src/components/WeatherTimeline.tsx
import React, { useEffect, useMemo, useState } from "react";

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

function formatDisplayDate(date?: string): string {
  if (!date) return "";

  const parsed = new Date(date + "T00:00:00");
  if (isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getIconPath(icon?: TimelineDay["icon"]): string {
  switch (icon) {
    case "sunny":
      return "/icons/sunny.svg";
    case "partly":
      return "/icons/partly.svg";
    case "cloudy":
      return "/icons/cloudy.svg";
    case "rain":
      return "/icons/rain.svg";
    default:
      return "/icons/sunny.svg";
  }
}

type WeatherTheme = {
  background: string;
};

function getThemeForDay(day: TimelineDay): WeatherTheme {
  // Climatology = warm, bright orange/yellow
  if (day.source === "climatology") {
    return {
      background: "linear-gradient(135deg, #FFE7AA, #FFC970)", // soft warm day
    };
  }

  // Forecast = weather-driven colors
  switch (day.icon) {
    case "sunny":
      return {
        background: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
      };
    case "partly":
      return {
        background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
      };
    case "cloudy":
      return {
        background: "linear-gradient(135deg, #94a3b8, #64748b)",
      };
    case "rain":
      return {
        background: "linear-gradient(135deg, #60a5fa, #2563eb)",
      };
    default:
      return {
        background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
      };
  }
}

const WeatherIcon: React.FC<{
  icon?: TimelineDay["icon"];
  alt: string;
}> = ({ icon, alt }) => {
  const src = getIconPath(icon);
  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: 72,
        height: 72,
        flexShrink: 0,
      }}
    />
  );
};

const WeatherCard: React.FC<{ day: TimelineDay; isMobile: boolean }> = ({
  day,
  isMobile,
}) => {
  const theme = getThemeForDay(day);
  const dateLabel = formatDisplayDate(day.date);
  const isClimo = day.source === "climatology";

  const normalizeTemp = (value: unknown): number | undefined => {
    if (value === null || value === undefined) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };

  const high = normalizeTemp(day.high);
  const low = normalizeTemp(day.low);
  const mainTemp = high ?? low;

  const border = isClimo
    ? "1px dashed rgba(120,85,20,0.8)"
    : "1px solid rgba(255,255,255,0.85)";

  const badgeLabel = isClimo
    ? "30-Year Average · Not a Forecast"
    : "Live Forecast";

  const badgeBg = isClimo
    ? "rgba(255,165,55,0.97)"
    : "rgba(253,224,71,0.96)";

  const badgeColor = "#1a1a1a";

  const baseStyle: React.CSSProperties = {
    borderRadius: 22,
    padding: "16px 18px 14px",
    background: theme.background,
    border,
    boxShadow: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    textAlign: "center",
    color: "#1a1a1a",
    position: "relative",
    transition: "transform 0.15s ease",
    // wider cards – 3 per row on desktop, full-ish width on mobile
    width: isMobile ? "85%" : "30%",
    maxWidth: 420,
    flex: "0 0 auto",
  };

  return (
    <div style={baseStyle}>
      {/* HEADER BLOCK (fixed height so icons line up) */}
      <div
        style={{
          width: "100%",
          minHeight: 110,
          maxHeight: 110,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          marginBottom: 6,
        }}
      >
        {/* Day number */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "rgba(30,30,30,0.85)",
            marginBottom: 2,
            textAlign: "left",
            width: "100%",
          }}
        >
          Day {day.day}
        </div>

        {/* Location (bigger, own line, up to 2 lines) */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            color: "#1a1a1a",
            marginBottom: 4,
            textAlign: "left",
            width: "100%",
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {day.location}
        </div>

        {/* Date (under location) */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(30,30,30,0.7)",
            textAlign: "left",
            width: "100%",
          }}
        >
          {dateLabel}
        </div>
      </div>

      {/* Badge */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          marginBottom: 10,
          padding: "4px 12px",
          borderRadius: 999,
          background: badgeBg,
          color: badgeColor,
          alignSelf: "center",
          minHeight: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {badgeLabel}
      </div>

      {/* Icon row (same height in every card) */}
      <div
        style={{
          marginBottom: 8,
          minHeight: 80,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <WeatherIcon icon={day.icon} alt={day.description || "Weather icon"} />
      </div>

      {/* Temps + rain row */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 8,
          minHeight: 56,
        }}
      >
        {/* Temps */}
        <div style={{ textAlign: "left" }}>
          {mainTemp !== undefined && (
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: "#1a1a1a",
                marginBottom: 2,
              }}
            >
              {Math.round(mainTemp)}°
            </div>
          )}

          {(high !== undefined || low !== undefined) && (
            <div
              style={{
                fontSize: 12,
                color: "rgba(28,28,28,0.8)",
              }}
            >
              {high !== undefined && <span>High: {Math.round(high)}°</span>}
              <br />
              {low !== undefined && <span>Low: {Math.round(low)}°</span>}
            </div>
          )}
        </div>

        {/* Rain */}
        {day.rainChance !== undefined && (
          <div
            style={{
              textAlign: "right",
              fontSize: 12,
              color: "rgba(28,28,28,0.85)",
            }}
          >
            Rain: {Math.round(day.rainChance)}%
          </div>
        )}
      </div>

      {/* Description aligned bottom */}
      {day.description && (
        <div
          style={{
            fontSize: 11,
            lineHeight: 1.4,
            color: "rgba(30,30,30,0.9)",
            width: "100%",
            textAlign: "left",
            minHeight: 40,
          }}
        >
          {day.description}
        </div>
      )}
    </div>
  );
};

export default function WeatherTimeline({ itinerary }: WeatherTimelineProps) {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // 3 cards per page
  const pages = useMemo(() => {
    const chunkSize = 3;
    const result: TimelineDay[][] = [];

    for (let i = 0; i < itinerary.length; i += chunkSize) {
      result.push(itinerary.slice(i, i + chunkSize));
    }

    return result;
  }, [itinerary]);

  const [pageIndex, setPageIndex] = useState(0);
  const currentPage = pages[pageIndex] ?? [];

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pages.length - 1;

  if (!itinerary || itinerary.length === 0) return null;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "stretch",
        }}
      >
        {/* Prev (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => canPrev && setPageIndex((p) => p - 1)}
            disabled={!canPrev}
            style={{
              width: 34,
              borderRadius: 999,
              border: "none",
              background: "rgba(255,255,255,0.6)",
              color: "#1a1a1a",
              cursor: canPrev ? "pointer" : "default",
            }}
          >
            ‹
          </button>
        )}

        {/* Cards */}
        <div
          style={{
            flex: 1,
            overflowX: isMobile ? "auto" : "visible",
            paddingBottom: isMobile ? 4 : 0,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: isMobile ? "flex-start" : "center",
              alignItems: "stretch",
            }}
          >
            {currentPage.map((day) => (
              <WeatherCard key={day.day} day={day} isMobile={isMobile} />
            ))}
          </div>
        </div>

        {/* Next (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => canNext && setPageIndex((p) => p + 1)}
            disabled={!canNext}
            style={{
              width: 34,
              borderRadius: 999,
              border: "none",
              background: "rgba(255,255,255,0.6)",
              color: "#1a1a1a",
              cursor: canNext ? "pointer" : "default",
            }}
          >
            ›
          </button>
        )}
      </div>

      {/* Page dots */}
      <div
        style={{
          marginTop: 8,
          display: "flex",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {pages.map((_, idx) => (
          <div
            key={idx}
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor:
                idx === pageIndex ? "#1a1a1a" : "rgba(28,28,28,0.3)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
