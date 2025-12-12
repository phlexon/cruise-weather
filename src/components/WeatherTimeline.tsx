import React, { useRef } from "react";
import ItineraryRoute from "./ItineraryRoute";

/* ---------- Types ---------- */

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

/* ---------- Icon mapping ---------- */

const ICON_SRC: Record<
  NonNullable<TimelineDay["icon"]>,
  string
> = {
  sunny: "/icons/sunny.svg",
  partly: "/icons/partly.svg",
  cloudy: "/icons/cloudy.svg",
  rain: "/icons/rain.svg",
};

const ICON_ALT: Record<
  NonNullable<TimelineDay["icon"]>,
  string
> = {
  sunny: "Sunny",
  partly: "Partly cloudy",
  cloudy: "Cloudy",
  rain: "Rainy",
};

function renderIcon(icon?: TimelineDay["icon"]) {
  if (!icon || !(icon in ICON_SRC)) {
    return (
      <img
        src="/icons/boat.svg"
        alt="Cruise day"
        className="cc-weather-icon-img cc-weather-icon-fallback"
        loading="lazy"
      />
    );
  }

  return (
    <img
      src={ICON_SRC[icon]}
      alt={ICON_ALT[icon]}
      className="cc-weather-icon-img"
      loading="lazy"
    />
  );
}


/* ---------- Component ---------- */

export default function WeatherTimeline({ itinerary }: WeatherTimelineProps) {
  if (!itinerary || itinerary.length === 0) return null;

  const stripRef = useRef<HTMLDivElement | null>(null);

  const scrollStrip = (direction: "left" | "right") => {
    if (!stripRef.current) return;

    stripRef.current.scrollBy({
      left:
        direction === "left"
          ? -stripRef.current.clientWidth
          : stripRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <section className="cc-weather-timeline">
      <h2 className="cc-section-title">Itinerary &amp; Forecast</h2>


      {/* Swipe hint (mobile only – hidden by CSS on desktop) */}
      <div className="cc-swipe-hint">
        Swipe to see full forecast <span className="cc-swipe-arrow">→</span>
      </div>

      {/* CARD STRIP */}
      <div className="cc-weather-strip-wrapper">
        {/* Left arrow (desktop only via CSS) */}
        <button
          type="button"
          className="cc-weather-strip-arrow cc-weather-strip-arrow--left"
          aria-label="Scroll itinerary left"
          onClick={() => scrollStrip("left")}
        >
          ‹
        </button>

        {/* ✅ FIXED VIEWPORT so exactly 3 cards show on desktop */}
        <div className="cc-weather-window">
          <div className="cc-weather-strip" ref={stripRef}>
            {itinerary.map((day, index) => {
              const isForecast = day.source === "forecast";
              const isClimo = day.source === "climatology";

              const hasTemps =
                typeof day.high === "number" &&
                typeof day.low === "number";

              const cardClassName = [
                "cc-weather-card",
                isForecast && "cc-weather-card--forecast",
                isClimo && "cc-weather-card--climo",
                !day.source && "cc-weather-card--unknown",
              ]
                .filter(Boolean)
                .join(" ");

              const badgeText = isForecast
                ? "Live forecast"
                : isClimo
                ? "Typical weather"
                : "Itinerary only";

              return (
                <article
                  key={`${day.date ?? "day"}-${index}`}
                  className={cardClassName}
                >
                  <header className="cc-weather-card-header">
                    <div className="cc-weather-card-day">
                      <span>Day {day.day}</span>
                      {day.date && (
                        <span className="cc-weather-card-date">
                          {day.date}
                        </span>
                      )}
                    </div>

                    <div className="cc-weather-card-icon">
                      {renderIcon(day.icon)}
                    </div>
                  </header>

                  <div className="cc-weather-card-location">
                    {day.location}
                  </div>

                  {hasTemps ? (
                    <div className="cc-weather-card-temps">
                      <div>
                        <span>High</span>
                        <strong>{Math.round(day.high!)}°</strong>
                      </div>
                      <div>
                        <span>Low</span>
                        <strong>{Math.round(day.low!)}°</strong>
                      </div>
                      <div>
                        <span>Rain</span>
                        <strong>
                          {Math.round(day.rainChance ?? 0)}%
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="cc-weather-card-no-temps">
                      Weather not available yet for this stop.
                    </div>
                  )}

                  <p className="cc-weather-card-description">
                    {day.description ??
                      (hasTemps
                        ? "Forecast conditions for this stop."
                        : "Check back closer to sail date.")}
                  </p>

                  <div className="cc-weather-card-footer">
                    <span className="cc-weather-card-badge">
                      {badgeText}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Right arrow (desktop only via CSS) */}
        <button
          type="button"
          className="cc-weather-strip-arrow cc-weather-strip-arrow--right"
          aria-label="Scroll itinerary right"
          onClick={() => scrollStrip("right")}
        >
          ›
        </button>
      </div>
    </section>
  );
}
