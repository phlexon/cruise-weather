// src/components/SailingsCalendar.tsx
import React, { useMemo, useState, useEffect } from "react";

export type Sailing = {
  date: string; // "YYYY-MM-DD"
  title: string; // e.g. "7 days, round-trip Western Caribbean..."
};

type SailingsCalendarProps = {
  sailings: Sailing[];
  selectedDate?: string; // "YYYY-MM-DD"
  onSelectDate: (date: string) => void;
};

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function SailingsCalendar({
  sailings,
  selectedDate,
  onSelectDate,
}: SailingsCalendarProps) {
  // Map dates → sailing(s)
  const sailingByDate = useMemo(() => {
    const map = new Map<string, Sailing[]>();
    for (const s of sailings) {
      const key = s.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sailings]);

  // Which months actually have sailings
  const monthsWithSailings = useMemo(() => {
    const set = new Set<string>();
    for (const s of sailings) {
      const [y, m] = s.date.split("-");
      set.add(`${y}-${m}`); // "2025-11"
    }
    return Array.from(set).sort();
  }, [sailings]);

  // Current visible month
  const [year, setYear] = useState<number>(() => {
    if (monthsWithSailings.length) {
      return parseInt(monthsWithSailings[0].slice(0, 4), 10);
    }
    return new Date().getFullYear();
  });

  const [month, setMonth] = useState<number>(() => {
    if (monthsWithSailings.length) {
      return parseInt(monthsWithSailings[0].slice(5, 7), 10) - 1;
    }
    return new Date().getMonth();
  });

  // When sailings change (ship changes), reset month to first sailing
  useEffect(() => {
    if (!monthsWithSailings.length) return;
    const [yStr, mStr] = monthsWithSailings[0].split("-");
    setYear(parseInt(yStr, 10));
    setMonth(parseInt(mStr, 10) - 1);
  }, [monthsWithSailings]);

  const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const canGoPrev = monthsWithSailings.some((m) => m < currentMonthKey);
  const canGoNext = monthsWithSailings.some((m) => m > currentMonthKey);

  const goMonth = (direction: -1 | 1) => {
    const sorted = monthsWithSailings;
    const idx = sorted.findIndex((m) => m === currentMonthKey);
    if (idx === -1) return;
    const target = sorted[idx + direction];
    if (!target) return;
    const [yStr, mStr] = target.split("-");
    setYear(parseInt(yStr, 10));
    setMonth(parseInt(mStr, 10) - 1);
  };

  // Build calendar grid
  const firstOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: Array<Array<Date | null>> = [];
  let currentWeek: Array<Date | null> = new Array(firstDayOfWeek).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const selectedKey = selectedDate ?? "";

  return (
    <div
      style={{
        marginTop: "10px",
        borderRadius: "10px",
        border: "1px solid rgba(148,163,184,0.4)",
        padding: "10px 12px 8px",
        background: "#f9fafb",
      }}
    >
      {/* Header + navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          Available sailings calendar
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={() => goMonth(-1)}
            disabled={!canGoPrev}
            style={{
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.7)",
              background: canGoPrev ? "white" : "#e5e7eb",
              cursor: canGoPrev ? "pointer" : "default",
            }}
          >
            ◀
          </button>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "#374151",
            }}
          >
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => goMonth(1)}
            disabled={!canGoNext}
            style={{
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.7)",
              background: canGoNext ? "white" : "#e5e7eb",
              cursor: canGoNext ? "pointer" : "default",
            }}
          >
            ▶
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#9ca3af",
          marginBottom: "4px",
        }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} style={{ textAlign: "center" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "2px",
          fontSize: "11px",
        }}
      >
        {weeks.map((week, wi) =>
          week.map((date, di) => {
            if (!date) {
              return <div key={`${wi}-${di}`} />;
            }

            const key = toKey(date);
            const sailingsToday = sailingByDate.get(key) ?? [];
            const hasSailing = sailingsToday.length > 0;
            const isSelected = selectedKey === key;

            const baseBg = hasSailing ? "#eff6ff" : "transparent";
            const bg = isSelected ? "#2563eb" : baseBg;
            const color = isSelected ? "white" : hasSailing ? "#1d4ed8" : "#374151";
            const border = isSelected
              ? "1px solid #1d4ed8"
              : hasSailing
              ? "1px solid rgba(37,99,235,0.5)"
              : "1px solid transparent";

            return (
              <button
                key={`${wi}-${di}`}
                type="button"
                onClick={() => hasSailing && onSelectDate(key)}
                disabled={!hasSailing}
                style={{
                  minHeight: "32px",
                  padding: "4px 2px",
                  borderRadius: "8px",
                  border,
                  background: bg,
                  color,
                  cursor: hasSailing ? "pointer" : "default",
                  opacity: hasSailing ? 1 : 0.35,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={
                  hasSailing
                    ? sailingsToday.map((s) => s.title).join("\n")
                    : ""
                }
              >
                <span>{date.getDate()}</span>
                {hasSailing && !isSelected && (
                  <span
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "999px",
                      background: "#1d4ed8",
                      marginTop: "2px",
                    }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Tiny helper text only (no "Selected sailing" list) */}
      <div
        style={{
          marginTop: "6px",
          fontSize: "10px",
          color: "#6b7280",
          fontStyle: "italic",
        }}
      >
        Click a highlighted date to load matching cruises below.
      </div>
    </div>
  );
}
