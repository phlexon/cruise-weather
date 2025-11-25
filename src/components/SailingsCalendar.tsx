// src/components/SailingsCalendar.tsx
import React, { useMemo, useState, useEffect } from "react";

export type Sailing = {
  date: string; // "YYYY-MM-DD"
  title: string;
};

type SailingsCalendarProps = {
  sailings: Sailing[];
  selectedDate?: string;
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
  // Map: date ISO -> sailings[] for that day
  const sailingByDate = useMemo(() => {
    const map = new Map<string, Sailing[]>();
    for (const s of sailings) {
      const key = s.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sailings]);

  // All months that have *any* sailing, as "YYYY-MM"
  const monthKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of sailings) {
      const [y, m] = s.date.split("-");
      set.add(`${y}-${m}`);
    }
    return Array.from(set).sort(); // ascending
  }, [sailings]);

  const minMonthKey = monthKeys[0];
  const maxMonthKey = monthKeys[monthKeys.length - 1];

  // Initial visible month: earliest sailing month or current month
  const [year, setYear] = useState<number>(() => {
    if (sailings.length) {
      const [y] = sailings[0].date.split("-");
      return parseInt(y, 10);
    }
    return new Date().getFullYear();
  });

  const [month, setMonth] = useState<number>(() => {
    if (sailings.length) {
      const [, m] = sailings[0].date.split("-");
      return parseInt(m, 10) - 1; // 0-based
    }
    return new Date().getMonth();
  });

  // If sailings list changes (e.g., different ship), reset to earliest month
  useEffect(() => {
    if (!sailings.length) return;
    const [y, m] = sailings[0].date.split("-");
    setYear(parseInt(y, 10));
    setMonth(parseInt(m, 10) - 1);
  }, [sailings]);

  const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const canGoPrev = !!minMonthKey && currentMonthKey > minMonthKey;
  const canGoNext = !!maxMonthKey && currentMonthKey < maxMonthKey;

  const goMonth = (direction: -1 | 1) => {
    let newYear = year;
    let newMonth = month + direction;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    const newKey = `${newYear}-${String(newMonth + 1).padStart(2, "0")}`;

    // Clamp so we don't move past the range of actual sailings
    if (direction === -1 && minMonthKey && newKey < minMonthKey) return;
    if (direction === 1 && maxMonthKey && newKey > maxMonthKey) return;

    setYear(newYear);
    setMonth(newMonth);
  };

  // Build calendar grid for visible month
  const firstOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = firstOfMonth.getDay(); // 0 = Sun
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

  // Arrow press animation state
  const [prevPressed, setPrevPressed] = useState(false);
  const [nextPressed, setNextPressed] = useState(false);

  return (
    <div
      style={{
        marginTop: "10px",
        borderRadius: "16px",
        border: "1px solid rgba(148,163,184,0.35)",
        padding: "12px 14px 14px",
        background:
          "linear-gradient(135deg, rgba(248,250,252,0.98), rgba(239,246,255,0.98))",
        boxShadow: "0 16px 40px rgba(15,23,42,0.12)",
      }}
    >
      {/* Header + navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          gap: "8px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Available sailings
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#6b7280",
              marginTop: "2px",
            }}
          >
            Tap a highlighted date to auto-run your search.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <button
            type="button"
            onClick={() => goMonth(-1)}
            onMouseDown={() => canGoPrev && setPrevPressed(true)}
            onMouseUp={() => setPrevPressed(false)}
            onMouseLeave={() => setPrevPressed(false)}
            disabled={!canGoPrev}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.7)",
              background: canGoPrev ? "white" : "#e5e7eb",
              cursor: canGoPrev ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: prevPressed ? "scale(0.9)" : "scale(1)",
              transition:
                "transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease",
              boxShadow: prevPressed
                ? "0 4px 10px rgba(15,23,42,0.18)"
                : "none",
            }}
          >
            <img
              src="/icons/arrow.svg"
              alt="Previous month"
              style={{
                width: "14px",
                height: "14px",
                transform: "rotate(180deg)",
                opacity: canGoPrev ? 1 : 0.65,
              }}
            />
          </button>

          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#111827",
              padding: "4px 8px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(209,213,219,0.8)",
            }}
          >
            {monthLabel}
          </div>

          <button
            type="button"
            onClick={() => goMonth(1)}
            onMouseDown={() => canGoNext && setNextPressed(true)}
            onMouseUp={() => setNextPressed(false)}
            onMouseLeave={() => setNextPressed(false)}
            disabled={!canGoNext}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.7)",
              background: canGoNext ? "white" : "#e5e7eb",
              cursor: canGoNext ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: nextPressed ? "scale(0.9)" : "scale(1)",
              transition:
                "transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease",
              boxShadow: nextPressed
                ? "0 4px 10px rgba(15,23,42,0.18)"
                : "none",
            }}
          >
            <img
              src="/icons/arrow.svg"
              alt="Next month"
              style={{
                width: "14px",
                height: "14px",
                opacity: canGoNext ? 1 : 0.65,
              }}
            />
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
          gap: "3px",
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
            const bg = isSelected ? "linear-gradient(135deg,#2563eb,#0ea5e9)" : baseBg;

            const color = isSelected
              ? "white"
              : hasSailing
              ? "#1d4ed8"
              : "#6b7280";

            const border = isSelected
              ? "1px solid rgba(37,99,235,0.9)"
              : hasSailing
              ? "1px solid rgba(191,219,254,1)"
              : "1px solid transparent";

            const boxShadow = isSelected
              ? "0 6px 12px rgba(37,99,235,0.35)"
              : hasSailing
              ? "0 3px 8px rgba(148,163,184,0.22)"
              : "none";

            const today = new Date();
            const isToday =
              date.getFullYear() === today.getFullYear() &&
              date.getMonth() === today.getMonth() &&
              date.getDate() === today.getDate();

            return (
              <button
                key={`${wi}-${di}`}
                type="button"
                onClick={() => hasSailing && onSelectDate(key)}
                disabled={!hasSailing}
                style={{
                  minHeight: "36px",
                  padding: "4px 2px",
                  borderRadius: "999px",
                  border,
                  background: bg,
                  color,
                  cursor: hasSailing ? "pointer" : "default",
                  opacity: hasSailing ? 1 : 0.4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transition:
                    "transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease",
                  boxShadow,
                }}
                title={
                  hasSailing
                    ? sailingsToday.map((s) => s.title).join("\n")
                    : ""
                }
                onMouseDown={(e) => {
                  if (!hasSailing) return;
                  (e.currentTarget.style.transform = "scale(0.94)");
                }}
                onMouseUp={(e) => {
                  (e.currentTarget.style.transform = "scale(1)");
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget.style.transform = "scale(1)");
                }}
              >
                <span>{date.getDate()}</span>

                {/* Dot to indicate sailings */}
                {hasSailing && !isSelected && (
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "999px",
                      marginTop: "2px",
                      background: "#1d4ed8",
                    }}
                  />
                )}

                {/* "Today" ring indicator (only if not selected) */}
                {isToday && !isSelected && (
                  <span
                    style={{
                      marginTop: "1px",
                      fontSize: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#6b7280",
                    }}
                  >
                    Today
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
