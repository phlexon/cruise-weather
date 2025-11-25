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

function getIconPath(icon?: TimelineDay["icon"]) {
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
  shadow: string;
};

function getThemeForDay(day: TimelineDay): WeatherTheme {
  // 1) Base theme from icon
  let theme: WeatherTheme;

  switch (day.icon) {
    case "sunny":
      theme = {
        background: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
        shadow: "0 20px 40px rgba(15, 118, 178, 0.5)",
      };
      break;

    case "partly":
      theme = {
        background: "linear-gradient(135deg, #f59e0b, #fbbf24)", // warm orange
        shadow: "0 20px 40px rgba(245,158,11,0.5)",
      };
      break;

    case "cloudy":
      theme = {
        background: "linear-gradient(135deg, #64748b, #0f172a)",
        shadow: "0 20px 40px rgba(15, 23, 42, 0.55)",
      };
      break;

    case "rain":
      theme = {
        background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
        shadow: "0 20px 40px rgba(30, 64, 175, 0.6)",
      };
      break;

    default:
      theme = {
        background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
        shadow: "0 20px 40px rgba(37, 99, 235, 0.55)",
      };
      break;
  }

  // 2) Climatology days: soften the shadow a bit
  if (day.source === "climatology") {
    return {
      background: theme.background,
      shadow: "0 18px 36px rgba(15,23,42,0.45)",
    };
  }

  return theme;
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
        width: "76px",
        height: "76px",
        flexShrink: 0,
        filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.35))",
      }}
    />
  );
};

const WeatherCard: React.FC<{ day: TimelineDay; isMobile: boolean }> = ({
  day,
  isMobile,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const theme = getThemeForDay(day);
  const dateLabel = formatDisplayDate(day.date);
  const isClimo = day.source === "climatology";

  // Normalize temps so it works even if values come through as strings
  const normalizeTemp = (value: unknown): number | undefined => {
    if (value === null || value === undefined) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };

  const high = normalizeTemp(day.high);
  const low = normalizeTemp(day.low);
  const mainTemp = high ?? low;

  const baseStyle: React.CSSProperties = {
    borderRadius: "24px",
    padding: "16px 18px",
    background: theme.background,
    boxShadow: theme.shadow,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    color: "white",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  };

  if (isMobile) {
    baseStyle.flex = "0 0 auto";
    baseStyle.minWidth = "230px";
    baseStyle.maxWidth = "270px";
  } else {
    baseStyle.flex = "1 1 0";
    baseStyle.minWidth = 0;
    baseStyle.cursor = "pointer";
  }

  const transform = isPressed
    ? "scale(0.96)"
    : isHovered
    ? "translateY(-3px)"
    : "none";

  const boxShadow = isHovered || isPressed ? theme.shadow : theme.shadow;

  return (
    <div
      style={{ ...baseStyle, transform, boxShadow }}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => !isMobile && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* Day + date */}
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.8)",
          marginBottom: "4px",
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Day {day.day}</span>
        <span>{dateLabel}</span>
      </div>

      {/* Location (fixed-height so cards line up) */}
      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          marginBottom: isClimo ? "3px" : "8px",
          color: "white",
          lineHeight: 1.35,
          minHeight: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 4px",
        }}
      >
        <span>{day.location}</span>
      </div>

      {/* Climatology badge */}
      {isClimo && (
        <div
          style={{
            fontSize: "9px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "rgba(226,232,240,0.9)",
            marginBottom: "6px",
          }}
        >
          30-Year Average (Not a Forecast)
        </div>
      )}

      {/* Icon */}
      <div
        style={{
          marginTop: isClimo ? "4px" : "2px",
          marginBottom: "8px",
        }}
      >
        <WeatherIcon icon={day.icon} alt={day.description || "Weather icon"} />
      </div>

      {/* Main temperature + details */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {/* Big, bright temp – very visible on mobile */}
        {mainTemp !== undefined ? (
          <div
            style={{
              fontSize: "32px",
              fontWeight: 800,
              lineHeight: 1,
              textShadow: "0 2px 6px rgba(0,0,0,0.45)",
            }}
          >
            {Math.round(mainTemp)}°
          </div>
        ) : (
          // last-resort fallback so it's never totally blank
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              opacity: 0.8,
            }}
          >
            --°
          </div>
        )}

        {(high !== undefined || low !== undefined) && (
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "rgba(241,245,249,0.95)",
            }}
          >
            {high !== undefined && `High ${Math.round(high)}°`}
            {high !== undefined && low !== undefined ? " · " : ""}
            {low !== undefined && `Low ${Math.round(low)}°`}
          </div>
        )}

        {typeof day.rainChance === "number" && (
          <div
            style={{
              fontSize: "10px",
              fontWeight: 400,
              color: "rgba(226,232,240,0.9)",
              marginTop: "2px",
            }}
          >
            Chance of rain: {Math.round(day.rainChance)}%
          </div>
        )}

        {/* DEBUG LINE – you can delete this once things look right */}
        <div
          style={{
            marginTop: "4px",
            fontSize: "9px",
            color: "rgba(248,250,252,0.7)",
            opacity: 0.7,
          }}
        >
          {`debug hi=${String(day.high)} (${typeof day.high}), lo=${String(
            day.low
          )} (${typeof day.low})`}
        </div>
      </div>
    </div>
  );
};

export default function WeatherTimeline({ itinerary }: WeatherTimelineProps) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!itinerary || itinerary.length === 0) {
    return <p style={{ fontSize: "12px" }}>No itinerary available.</p>;
  }

  const embarkationCity =
    itinerary[0]?.location.split(",")[0] ?? "departure port";

  // Desktop pagination (3 cards at a time)
  const CARDS_PER_PAGE = 3;
  const [page, setPage] = useState(0);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(itinerary.length / CARDS_PER_PAGE)),
    [itinerary.length]
  );

  useEffect(() => {
    setPage(0);
  }, [itinerary.length]);

  const canGoPrev = !isMobile && page > 0;
  const canGoNext = !isMobile && page < totalPages - 1;

  const desktopSlice = useMemo(() => {
    if (isMobile) return itinerary;
    const start = page * CARDS_PER_PAGE;
    return itinerary.slice(start, start + CARDS_PER_PAGE);
  }, [isMobile, itinerary, page]);

  // Arrow click animation state
  const [prevPressed, setPrevPressed] = useState(false);
  const [nextPressed, setNextPressed] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {/* MAIN TIMELINE */}
      {isMobile ? (
        // Mobile: horizontal scroll, NO gradients
        <div
          style={{
            margin: "0 -6px",
          }}
        >
          <div
            style={{
              display: "flex",
              overflowX: "auto",
              paddingBottom: "6px",
              paddingLeft: "6px",
              paddingRight: "6px",
              gap: "12px",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {itinerary.map((day) => (
              <WeatherCard key={day.day} day={day} isMobile={true} />
            ))}
          </div>
        </div>
      ) : (
        // Desktop: 3 cards + arrow nav
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (canGoPrev) {
                setPage((p) => Math.max(0, p - 1));
              }
            }}
            onMouseDown={() => canGoPrev && setPrevPressed(true)}
            onMouseUp={() => setPrevPressed(false)}
            onMouseLeave={() => setPrevPressed(false)}
            disabled={!canGoPrev}
            style={{
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.8)",
              backgroundColor: canGoPrev ? "white" : "#e5e7eb",
              width: "32px",
              height: "32px",
              cursor: canGoPrev ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "transform 0.15s ease, background-color 0.15s ease",
              transform: prevPressed ? "scale(0.9)" : "scale(1)",
            }}
          >
            <img
              src="/icons/arrow.svg"
              alt="Previous days"
              style={{
                width: "16px",
                height: "16px",
                transform: "rotate(180deg)",
                opacity: canGoPrev ? 1 : 0.6,
              }}
            />
          </button>

          <div
            style={{
              flex: 1,
              display: "flex",
              gap: "12px",
              paddingBottom: "25px", // extra room for shadows
            }}
          >
            {desktopSlice.map((day) => (
              <WeatherCard key={day.day} day={day} isMobile={false} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (canGoNext) {
                setPage((p) => Math.min(totalPages - 1, p + 1));
              }
            }}
            onMouseDown={() => canGoNext && setNextPressed(true)}
            onMouseUp={() => setNextPressed(false)}
            onMouseLeave={() => setNextPressed(false)}
            disabled={!canGoNext}
            style={{
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.8)",
              backgroundColor: canGoNext ? "white" : "#e5e7eb",
              width: "32px",
              height: "32px",
              cursor: canGoNext ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "transform 0.15s ease, background-color 0.15s ease",
              transform: nextPressed ? "scale(0.9)" : "scale(1)",
            }}
          >
            <img
              src="/icons/arrow.svg"
              alt="Next days"
              style={{
                width: "16px",
                height: "16px",
                opacity: canGoNext ? 1 : 0.6,
              }}
            />
          </button>
        </div>
      )}

      {/* FOOTER TEXT */}
      <div
        style={{
          marginTop: "4px",
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
        <div
          style={{
            marginBottom: "2px",
            fontWeight: 400,
          }}
        >
          Weather uses forecast (and historical climate normals when forecast
          isn&apos;t available) for {embarkationCity}.
        </div>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Live forecast shown when available · 30-year averages fill missing
          days
        </div>
      </div>
    </div>
  );
}
