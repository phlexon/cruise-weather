// src/components/PackingChecklist.tsx
import React from "react";
import ItineraryRoute from "./ItineraryRoute";

/* ---------- Types ---------- */

export type TimelineDay = {
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

type PackingChecklistProps = {
  days: TimelineDay[];
  onBack: () => void;
  cruiseLine?: string;
  shipName?: string;
};

type ChecklistItem = {
  id: string;
  label: string;
  note?: string;
};

type ChecklistSection = {
  id: string;
  title: string;
  items: ChecklistItem[];
};

/* ---------- Component ---------- */

export default function PackingChecklist({
  days,
  onBack,
  cruiseLine,
  shipName,
}: PackingChecklistProps) {
  if (!days || days.length === 0) return null;

  /* ---------- Derive conditions ---------- */

  const hasHotDays = days.some((d) => (d.high ?? 0) >= 85);
  const hasVeryHotDays = days.some((d) => (d.high ?? 0) >= 90);
  const hasMildDays = days.some(
    (d) => (d.high ?? 0) >= 70 && (d.high ?? 0) < 85
  );
  const hasCoolNights = days.some((d) => (d.low ?? 999) <= 65);
  const hasRainyDays = days.some((d) => (d.rainChance ?? 0) >= 50);
  const hasMaybeRain = days.some(
    (d) => (d.rainChance ?? 0) >= 30 && (d.rainChance ?? 0) < 50
  );

  const totalDays = days.length;
  const rainyDayCount = days.filter(
    (d) => (d.rainChance ?? 0) >= 50
  ).length;

  /* ---------- Build checklist ---------- */

  const sections: ChecklistSection[] = [];

  sections.push({
    id: "essentials",
    title: "Trip essentials",
    items: [
      { id: "passport", label: "Passport / government ID" },
      { id: "docs", label: "Cruise documents & luggage tags" },
      { id: "wallet", label: "Wallet, credit card, and some cash" },
      { id: "meds", label: "Prescription meds & pain reliever" },
      { id: "chargers", label: "Phone and device chargers" },
    ],
  });

  if (hasHotDays || hasMildDays) {
    sections.push({
      id: "warm-weather",
      title: "Warm-weather clothing",
      items: [
        { id: "shirts", label: "Breathable shirts / tops" },
        { id: "shorts", label: "Shorts or lightweight pants" },
        { id: "swimsuits", label: "Swimsuit(s) & cover-up" },
        {
          id: "sun-hat",
          label: "Sun hat or cap",
          note: hasVeryHotDays
            ? "Especially helpful on very hot port days."
            : undefined,
        },
        { id: "shoes", label: "Comfortable walking shoes or sandals" },
      ],
    });
  }

  if (hasCoolNights) {
    sections.push({
      id: "cool-evenings",
      title: "Cool evenings & ship interiors",
      items: [
        { id: "hoodie", label: "Light sweater or hoodie" },
        { id: "pants", label: "Long pants or jeans" },
        {
          id: "ac-layer",
          label: "Extra layer for dining rooms & theaters",
          note: "Ship interiors can feel chilly.",
        },
      ],
    });
  }

  if (hasRainyDays || hasMaybeRain) {
    sections.push({
      id: "rain",
      title: "Rain & wet-weather gear",
      items: [
        {
          id: "rain-jacket",
          label: "Packable rain jacket or poncho",
          note:
            rainyDayCount > 1
              ? `Rain expected on about ${rainyDayCount} day(s).`
              : undefined,
        },
        { id: "umbrella", label: "Compact umbrella" },
        { id: "dry-bag", label: "Waterproof phone pouch" },
        { id: "extra-socks", label: "Extra socks" },
      ],
    });
  }

  sections.push({
    id: "nice-to-have",
    title: "Nice-to-have cruise items",
    items: [
      { id: "daypack", label: "Small daypack or tote" },
      { id: "water-bottle", label: "Reusable water bottle" },
      { id: "sea-sick", label: "Sea-sickness medication or bands" },
      { id: "luggage-tags", label: "Extra luggage tags / zip ties" },
    ],
  });

  /* ---------- Render ---------- */

  return (
    <section className="cc-packing">
      <header className="cc-packing-header">
        <button
          type="button"
          className="cc-back-secondary"
          onClick={onBack}
        >
          ← Back to forecast
        </button>

        <h2 className="cc-packing-title">
          Packing checklist
          {cruiseLine && shipName && (
            <span className="cc-packing-subtitle">
              {" "}
              for {cruiseLine} — {shipName}
            </span>
          )}
        </h2>

        {/* ✅ Route lives here now */}
{Array.isArray(days) && days.length > 0 && (
  <ItineraryRoute itinerary={days} />
)}

        <p className="cc-packing-subtitle">
          Based on your {totalDays}-day itinerary and forecast.
        </p>
      </header>

      <div className="cc-packing-sections">
        {sections.map((section) => (
          <div key={section.id} className="cc-packing-section">
            <h3 className="cc-packing-section-title">
              {section.title}
            </h3>

            <ul className="cc-packing-list">
              {section.items.map((item) => (
                <li key={item.id} className="cc-packing-item">
                  <label className="cc-packing-item-label">
                    <input type="checkbox" />
                    <span>
                      {item.label}
                      {item.note && (
                        <span className="cc-packing-item-note">
                          {" "}
                          — {item.note}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
