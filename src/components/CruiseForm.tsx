// src/components/CruiseForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import SailingsCalendar, { type Sailing } from "./SailingsCalendar";
import {
  getCruiseOptionsFromApify,
  getShipSailingsFromApify,
  type CruiseLineOption,
  type ShipOption,
} from "../services/cruiseApi";

export type CruiseSelection = {
  lineId: string;
  shipId: string;
  sailDate: string; // "YYYY-MM-DD"
  lineName?: string;
  shipName?: string;
};

type CruiseFormProps = {
  onSubmit: (selection: CruiseSelection) => void;
};

export default function CruiseForm({ onSubmit }: CruiseFormProps) {
  const [lines, setLines] = useState<CruiseLineOption[]>([]);
  const [allShips, setAllShips] = useState<ShipOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [selectedShipId, setSelectedShipId] = useState<string>("");

  const [sailDate, setSailDate] = useState<string>(""); // ISO string
  const [calendarSailings, setCalendarSailings] = useState<Sailing[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // --- Load cruise lines + ships from Apify -----------------------

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setOptionsError(null);
        const { lines, ships } = await getCruiseOptionsFromApify();
        if (cancelled) return;

        setLines(lines);
        setAllShips(ships);
      } catch (err) {
        console.error("Error loading cruise options:", err);
        if (!cancelled) {
          setOptionsError("There was a problem loading cruise options.");
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter ships by line
  const shipsForLine = useMemo(() => {
    if (!selectedLineId) return [];
    return allShips
      .filter((s) => s.lineId === selectedLineId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allShips, selectedLineId]);

  // --- Handlers ---------------------------------------------------

  const handleLineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lineId = e.target.value;
    setSelectedLineId(lineId);
    setSelectedShipId("");
    setCalendarSailings([]);
    setSailDate("");
  };

  const handleShipChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const shipId = e.target.value;
    setSelectedShipId(shipId);
    setCalendarSailings([]);
    setSailDate("");

    const ship = allShips.find((s) => s.id === shipId);
    if (!ship) return;

    try {
      setLoadingCalendar(true);
      const sailings = await getShipSailingsFromApify(ship.name);
      setCalendarSailings(
        sailings.map((s) => ({
          date: s.departIso,
          title: s.title,
        }))
      );
    } catch (err) {
      console.error("Error loading ship sailings:", err);
      setCalendarSailings([]);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Calendar → auto submit
  const handleCalendarSelect = (dateIso: string) => {
    setSailDate(dateIso);

    const line = lines.find((l) => l.id === selectedLineId);
    const ship = allShips.find((s) => s.id === selectedShipId);

    if (!line || !ship) return;

    onSubmit({
      lineId: line.id,
      shipId: ship.id,
      sailDate: dateIso,
      lineName: line.name,
      shipName: ship.name,
    });
  };

  const handleSailDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSailDate(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const line = lines.find((l) => l.id === selectedLineId);
    const ship = allShips.find((s) => s.id === selectedShipId);

    if (!line || !ship || !sailDate) return;

    onSubmit({
      lineId: line.id,
      shipId: ship.id,
      sailDate,
      lineName: line.name,
      shipName: ship.name,
    });
  };

  const canSearch =
    !!selectedLineId && !!selectedShipId && !!sailDate && !loadingOptions;

  return (
    <form onSubmit={handleSubmit}>
      {/* Cruise line */}
      <label
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          marginBottom: "4px",
          color: "#374151",
        }}
      >
        Cruise Line
      </label>
      <select
        value={selectedLineId}
        onChange={handleLineChange}
        style={{
          width: "100%",
          fontSize: "13px",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #d1d5db",
          marginBottom: "10px",
        }}
      >
        <option value="">Please Select One</option>
        {lines.map((line) => (
          <option key={line.id} value={line.id}>
            {line.name}
          </option>
        ))}
      </select>

      {/* Ship */}
      <label
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          marginBottom: "4px",
          color: "#374151",
        }}
      >
        Ship
      </label>
      <select
        value={selectedShipId}
        onChange={handleShipChange}
        disabled={!selectedLineId}
        style={{
          width: "100%",
          fontSize: "13px",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #d1d5db",
          marginBottom: "10px",
          backgroundColor: !selectedLineId ? "#f9fafb" : "white",
        }}
      >
        <option value="">Please Select One</option>
        {shipsForLine.map((ship) => (
          <option key={ship.id} value={ship.id}>
            {ship.name}
          </option>
        ))}
      </select>

      {/* Calendar of sailings (only after ship is chosen) */}
      {selectedShipId && (
        <div style={{ marginBottom: "12px" }}>
          {loadingCalendar ? (
            <div
              style={{
                fontSize: "11px",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              Loading upcoming sailings…
            </div>
          ) : calendarSailings.length ? (
            <SailingsCalendar
              sailings={calendarSailings}
              selectedDate={sailDate}
              onSelectDate={handleCalendarSelect}
            />
          ) : (
            <div
              style={{
                marginTop: "4px",
                fontSize: "11px",
                color: "#6b7280",
                fontStyle: "italic",
              }}
            >
              No sailings found for this ship in the dataset.
            </div>
          )}
        </div>
      )}

      {/* Fallback manual date picker & button */}
      <label
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          marginBottom: "4px",
          color: "#374151",
        }}
      >
        Sail Date
      </label>
      <input
        type="date"
        value={sailDate}
        onChange={handleSailDateChange}
        style={{
          width: "100%",
          fontSize: "13px",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #d1d5db",
          marginBottom: "12px",
        }}
      />

      <button
        type="submit"
        disabled={!canSearch}
        style={{
          width: "100%",
          marginTop: "4px",
          padding: "10px 12px",
          borderRadius: "999px",
          border: "none",
          backgroundColor: canSearch ? "#2563eb" : "#9ca3af",
          color: "white",
          fontSize: "14px",
          fontWeight: 600,
          cursor: canSearch ? "pointer" : "default",
        }}
      >
        Search Cruise
      </button>

      {optionsError && (
        <p
          style={{
            marginTop: "6px",
            fontSize: "11px",
            color: "#b91c1c",
          }}
        >
          {optionsError}
        </p>
      )}
    </form>
  );
}
