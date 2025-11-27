// src/components/WeatherTimeline.tsx
import React, { useEffect, useMemo, useState } from "react";

export type TimelineIcon = "sunny" | "partly" | "cloudy" | "rain";

export type TimelineDay = {
  day: number;
  date?: string;
  location: string;
  high?: number;
  low?: number;
  rainChance?: number;
  icon?: TimelineIcon;
  description?: string;
  source?: "forecast" | "climatology";
};

type WeatherTimelineProps = {
  itinerary: TimelineDay[];
};

const isBrowser = typeof window !== "undefined";

export default function WeatherTimeline({ itinerary }: WeatherTimelineProps) {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    isBrowser ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (!isBrowser) return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cards = useMemo(() => itinerary ?? [], [itinerary]);

  if (!cards.length) return null;

  if (isMobile) {
    return (
      <div className="cc-weather-timeline cc-weather-timeline--mobile">
        <div className="cc-weather-row-mobile">
          {cards.map((day, idx) => (
            <WeatherCard
              key={day.date ?? `${day.day}-${idx}`}
              day={day}
            />
          ))}
        </div>
      </div>
    );
  }

  return <DesktopWeatherTimeline cards={cards} />;
}

type WeatherCardProps = {
  day: TimelineDay;
};

function WeatherCard({ day }: WeatherCardProps) {
  const isClimo = day.source === "climatology";

  const iconName: TimelineIcon = day.icon || "sunny";
  const iconSrc = `/icons/${iconName}.svg`;

  const dateLabel = day.date
    ? new Date(day.date + "T00:00:00Z").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : `Day ${day.day}`;

  const badgeText = isClimo
    ? "30-year average · Not a forecast"
    : "Live forecast";

  return (
    <article
      className={
        "cc-weather-card " +
        (isClimo ? "cc-weather-card--climo" : "cc-weather-card--forecast")
      }
    >
      <header className="cc-weather-card-header">
  <div className="cc-weather-card-date">
    Day {day.day}
    {dateLabel ? ` · ${dateLabel}` : ""}
  </div>

  {/* badge now its own line */}
  <div className="cc-weather-card-badge cc-weather-card-badge--block">
    {badgeText}
  </div>
</header>


      <div className="cc-weather-icon-wrap">
        <div className="cc-weather-icon">
          <img src={iconSrc} alt={iconName} />
        </div>
      </div>

      <div className="cc-weather-temp-main">
        {typeof day.high === "number" ? `${Math.round(day.high)}°` : "--"}
      </div>
      <div className="cc-weather-temp-sub">
        {typeof day.high === "number" && typeof day.low === "number"
          ? `High ${Math.round(day.high)}° · Low ${Math.round(day.low)}°`
          : "High / low unavailable"}
      </div>

      {typeof day.rainChance === "number" && (
        <div className="cc-weather-rain">
          Chance of rain: <strong>{Math.round(day.rainChance)}%</strong>
        </div>
      )}

      <div className="cc-weather-location">
        {day.location || "At sea"}
      </div>

      {day.description && (
        <div className="cc-weather-description">{day.description}</div>
      )}
    </article>
  );
}

type DesktopTimelineProps = {
  cards: TimelineDay[];
};

function DesktopWeatherTimeline({ cards }: DesktopTimelineProps) {
  const cardsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(cards.length / cardsPerPage));
  const [page, setPage] = useState(0);

  const start = page * cardsPerPage;
  const pageCards = cards.slice(start, start + cardsPerPage);

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () =>
    setPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <div className="cc-weather-timeline cc-weather-timeline--desktop">
      <div className="cc-weather-desktop-shell">
        <div className="cc-weather-desktop-row">
          <button
            type="button"
            className="cc-weather-nav-btn"
            onClick={goPrev}
            disabled={page === 0}
            aria-label="Previous days"
          >
            ‹
          </button>

          <div className="cc-weather-desktop-cards">
            {pageCards.map((day, idx) => (
              <WeatherCard
                key={day.date ?? `${day.day}-${start + idx}`}
                day={day}
              />
            ))}
          </div>

          <button
            type="button"
            className="cc-weather-nav-btn"
            onClick={goNext}
            disabled={page === totalPages - 1}
            aria-label="Next days"
          >
            ›
          </button>
        </div>

        <div className="cc-weather-page-indicator">
          Page {page + 1} of {totalPages}
        </div>
      </div>
    </div>
  );
}
