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

  return (
    <div
      style={{
        marginTop: "10px",
        borderRadius: "10px",
        border: "1px solid rgba(148,163,184,0.4)",
        padding: "10px 12px",
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
                      marginTop: "2px",
                      background: "#1d4ed8",
                    }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
