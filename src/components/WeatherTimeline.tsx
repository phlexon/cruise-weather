// src/components/WeatherTimeline.tsx
import React, { useRef } from "react";

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

function renderIcon(icon?: TimelineDay["icon"]) {
  switch (icon) {
    case "sunny":
      return "☀️";
    case "partly":
      return "⛅️";
    case "cloudy":
      return "☁️";
    case "rain":
      return "🌧️";
    default:
      return "⛵️";
  }
}

export default function WeatherTimeline({ itinerary }: WeatherTimelineProps) {
  if (!itinerary || itinerary.length === 0) return null;

  const stripRef = useRef<HTMLDivElement | null>(null);

  // Scroll the horizontal strip by ~one viewport of cards
  const scrollStrip = (direction: "left" | "right") => {
    const el = stripRef.current;
    if (!el) return;

    const amount = el.clientWidth * 0.9; // 90% of visible width
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="cc-weather-timeline">
      <h2 className="cc-section-title">Itinerary &amp; forecast</h2>

      {/* Wrapper so we can place arrows on left/right for desktop */}
      <div className="cc-weather-strip-wrapper">
        {/* Left arrow – you can hide this on mobile via CSS */}
        <button
          type="button"
          className="cc-weather-strip-arrow cc-weather-strip-arrow--left"
          aria-label="Scroll itinerary left"
          onClick={() => scrollStrip("left")}
        >
          ‹
        </button>

        {/* Horizontal strip – desktop: many cards with scroll, mobile: 1 at a time */}
        <div className="cc-weather-strip" ref={stripRef}>
          {itinerary.map((day) => {
            const isForecast = day.source === "forecast";
            const isClimo = day.source === "climatology";
            const hasTemps =
              typeof day.high === "number" && typeof day.low === "number";

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
              ? "Typical for this time of year"
              : "Itinerary only";

            return (
              <article key={day.date ?? day.day} className={cardClassName}>
                <header className="cc-weather-card-header">
                  <div className="cc-weather-card-day">
                    <span>Day {day.day}</span>
                    {day.date && (
                      <span className="cc-weather-card-date">{day.date}</span>
                    )}
                  </div>
                  <div className="cc-weather-card-icon">
                    {renderIcon(day.icon)}
                  </div>
                </header>

                <div className="cc-weather-card-location">{day.location}</div>

                {hasTemps ? (
                  <div className="cc-weather-card-temps">
                    <div className="cc-weather-temp-high">
                      <span className="cc-weather-temp-label">High</span>
                      <span className="cc-weather-temp-value">
                        {Math.round(day.high!)}°
                      </span>
                    </div>
                    <div className="cc-weather-temp-low">
                      <span className="cc-weather-temp-label">Low</span>
                      <span className="cc-weather-temp-value">
                        {Math.round(day.low!)}°
                      </span>
                    </div>
                    <div className="cc-weather-temp-rain">
                      <span className="cc-weather-temp-label">Rain</span>
                      <span className="cc-weather-temp-value">
                        {Math.round(day.rainChance ?? 0)}%
                      </span>
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
                      ? "Conditions for this stop."
                      : "Check back closer to your sail date for live weather.")}
                </p>

                <div className="cc-weather-card-footer">
                  <span className="cc-weather-card-badge">{badgeText}</span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Right arrow */}
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
