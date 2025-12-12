// src/components/ItineraryRoute.tsx
import React, { useEffect, useRef, useState } from "react";

/* ---------- Types ---------- */

export type ItineraryDay = {
  day: number;
  date?: string;            // "2025-12-16"
  displayDate?: string;     // optional formatted date
  location: string;
  avgTemp?: number | null;
  isSeaDay?: boolean;
};

/* ---------- Props ---------- */

type ItineraryRouteProps = {
  itinerary: ItineraryDay[];
};

/* ---------- Icons ---------- */

const ICONS = {
  docs: "/icons/docs.svg",   // embark
  port: "/icons/port.svg",   // debark
  sea: "/icons/sea.svg",     // sea day
  land: "/icons/land.svg",   // port (default)
};

function getIconForDay(
  day: ItineraryDay,
  index: number,
  total: number
): string {
  if (index === 0) return ICONS.docs;
  if (index === total - 1) return ICONS.port;

  const seaMatch =
    day.isSeaDay ||
    /sea day/i.test(day.location) ||
    /at sea/i.test(day.location);

  return seaMatch ? ICONS.sea : ICONS.land;
}

/* ---------- Helpers ---------- */

function formatDate(day: ItineraryDay): string | null {
  if (day.displayDate) return day.displayDate;
  if (!day.date) return null;

  const d = new Date(day.date);
  if (Number.isNaN(d.getTime())) return day.date;

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/* ---------- Component ---------- */

export default function ItineraryRoute({ itinerary }: ItineraryRouteProps) {
  if (!itinerary || itinerary.length === 0) return null;

  const isShortRoute = itinerary.length <= 3;

  const [activeIndex, setActiveIndex] = useState(0);

  const stripRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* ---------- Auto-advance highlight ---------- */
  useEffect(() => {
    if (itinerary.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % itinerary.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [itinerary.length]);

  /* ---------- Scroll active card into view ---------- */
  useEffect(() => {
    const activeCard = cardRefs.current[activeIndex];
    if (!activeCard || !stripRef.current) return;

    activeCard.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeIndex]);

  return (
    <section className="cc-route">
      <h3 className="cc-route-title">Your cruise journey</h3>

      <div
        ref={stripRef}
        className={[
          "cc-route-track",
          isShortRoute && "cc-route-track--stretch",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {itinerary.map((day, index) => {
          const icon = getIconForDay(day, index, itinerary.length);
          const dateLabel = formatDate(day);
          const avgTemp =
            typeof day.avgTemp === "number"
              ? Math.round(day.avgTemp)
              : null;

          return (
            <div
              key={`${day.day}-${index}`}
              ref={(el) => (cardRefs.current[index] = el)}
              className={[
                "cc-route-card",
                index === activeIndex && "cc-route-card--active",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="cc-route-icon-wrap">
                <img
                  src={icon}
                  alt=""
                  className="cc-route-icon"
                  aria-hidden
                />
              </div>

              <div className="cc-route-day">Day {day.day}</div>

              {dateLabel && (
                <div className="cc-route-date">{dateLabel}</div>
              )}

              <div className="cc-route-location">{day.location}</div>

              {avgTemp !== null && (
                <div className="cc-route-temp">
                  Avg {avgTemp}°
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
