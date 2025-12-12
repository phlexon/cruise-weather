// src/components/SailingsCalendar.tsx
import React, { useMemo, useState } from "react";

export type Sailing = {
  date: string; // "YYYY-MM-DD"
  title?: string;
};

type SailingsCalendarProps = {
  sailings: Sailing[];
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateIso: string) => void;
};

function parseIso(dateIso: string): Date {
  return new Date(dateIso + "T12:00:00");
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function toIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SailingsCalendar({
  sailings,
  selectedDate,
  onSelectDate,
}: SailingsCalendarProps) {
  // Determine initial month: selected date, first sailing, or today
  const initialMonth = useMemo(() => {
    if (selectedDate) return parseIso(selectedDate);
    if (sailings.length > 0) return parseIso(sailings[0].date);
    return new Date();
  }, [selectedDate, sailings]);

  const [monthStart, setMonthStart] = useState<Date>(() => {
    const d = new Date(initialMonth);
    d.setDate(1);
    return d;
  });

  // Quick lookup for sailing dates
  const sailingDatesSet = useMemo(() => {
    const set = new Set<string>();
    sailings.forEach((s) => set.add(s.date));
    return set;
  }, [sailings]);

  const selectedIso = selectedDate || "";

  // Build calendar grid for the current month
  const days: { iso: string; inMonth: boolean; hasSailing: boolean }[] =
    useMemo(() => {
      const daysArr: { iso: string; inMonth: boolean; hasSailing: boolean }[] =
        [];

      const year = monthStart.getFullYear();
      const month = monthStart.getMonth();

      // First day of this month (0..6, Sun..Sat)
      const firstOfMonth = new Date(year, month, 1);
      const startWeekday = firstOfMonth.getDay();

      // Go back to the Sunday (or whatever is the first column) before the 1st
      const gridStart = new Date(year, month, 1 - startWeekday);

      // We will render 6 weeks * 7 days = 42 cells
      for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);

        const inMonth = d.getMonth() === month;
        const iso = toIso(d);
        const hasSailing = sailingDatesSet.has(iso);

        daysArr.push({ iso, inMonth, hasSailing });
      }

      return daysArr;
    }, [monthStart, sailingDatesSet]);

  const handlePrevMonth = () => {
    const d = new Date(monthStart);
    d.setMonth(d.getMonth() - 1);
    setMonthStart(d);
  };

  const handleNextMonth = () => {
    const d = new Date(monthStart);
    d.setMonth(d.getMonth() + 1);
    setMonthStart(d);
  };

  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        backgroundColor: "white",
        padding: "10px 10px 8px",
        boxShadow: "0 10px 25px rgba(15,23,42,0.06)",
      }}
    >
      {/* HEADER: month + arrows span full width */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            backgroundColor: "white",
            padding: "4px 10px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          ◀
        </button>

        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: "13px",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {formatMonthYear(monthStart)}
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          style={{
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            backgroundColor: "white",
            padding: "4px 10px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          ▶
        </button>
      </div>

      {/* Weekday labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          marginBottom: "4px",
        }}
      >
        {weekdayLabels.map((label) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#9ca3af",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
        }}
      >
        {days.map((day) => {
          const d = parseIso(day.iso);
          const dayNum = d.getDate();
          const isSelected = day.iso === selectedIso;

          const baseBg = day.inMonth ? "#f9fafb" : "#f3f4f6";
          const sailingBg = day.hasSailing ? "#dbeafe" : baseBg;
          const finalBg = isSelected ? "#2b4680" : sailingBg;

          const baseColor = day.inMonth ? "#111827" : "#9ca3af";
          const finalColor = isSelected ? "white" : baseColor;

          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => day.hasSailing && onSelectDate(day.iso)}
              disabled={!day.hasSailing}
              style={{
                borderRadius: "999px",
                border: "none",
                padding: "5px 0",
                fontSize: "12px",
                fontWeight: day.hasSailing ? 600 : 400,
                backgroundColor: finalBg,
                color: finalColor,
                cursor: day.hasSailing ? "pointer" : "default",
                boxShadow: isSelected
                  ? "0 0 0 1px rgba(37,99,235,0.4)"
                  : "none",
                opacity: day.hasSailing ? 1 : 0.4,
              }}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: "6px",
          fontSize: "10px",
          color: "#6b7280",
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span>● Blue = sailing available</span>
        <span>● Tap a date to select</span>
      </div>
    </div>
  );
}
