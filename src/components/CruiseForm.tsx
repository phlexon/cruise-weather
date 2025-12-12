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
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [selectedShipId, setSelectedShipId] = useState<string>("");

  const [sailDate, setSailDate] = useState<string>("");
  const [calendarSailings, setCalendarSailings] = useState<Sailing[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [sailingsError, setSailingsError] = useState<string | null>(null);

  // ---------- Load cruise lines + ships ----------
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
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const shipsForLine = useMemo(() => {
    if (!selectedLineId) return [];
    return allShips
      .filter((s) => s.lineId === selectedLineId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allShips, selectedLineId]);

  const handleLineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lineId = e.target.value;
    setSelectedLineId(lineId);
    setSelectedShipId("");
    setCalendarSailings([]);
    setSailDate("");
    setSailingsError(null);
  };

  const handleShipChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const shipId = e.target.value;
    setSelectedShipId(shipId);
    setCalendarSailings([]);
    setSailDate("");
    setSailingsError(null);

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
      setSailingsError("Unable to load sailings for this ship.");
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Calendar click → final submit
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

  return (
    <div className="cc-form">
      {/* Cruise line */}
      <div className="cc-field-group">
        <label htmlFor="cc-line-select" className="cc-field-label">
          Cruise Line
        </label>
        <select
          id="cc-line-select"
          value={selectedLineId}
          onChange={handleLineChange}
          className="cc-select"
          disabled={loadingOptions}
        >
          <option value="">Please Select One</option>
          {lines.map((line) => (
            <option key={line.id} value={line.id}>
              {line.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ship */}
      <div className="cc-field-group">
        <label htmlFor="cc-ship-select" className="cc-field-label">
          Ship
        </label>
        <select
          id="cc-ship-select"
          value={selectedShipId}
          onChange={handleShipChange}
          disabled={!selectedLineId || loadingOptions}
          className="cc-select"
        >
          <option value="">Please Select One</option>
          {shipsForLine.map((ship) => (
            <option key={ship.id} value={ship.id}>
              {ship.name}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar */}
      <div className="cc-calendar-shell">
        {loadingCalendar ? (
          <div
            style={{
              fontSize: "0.8rem",
              color: "#6b7280",
            }}
          >
            Loading upcoming sailings…
          </div>
        ) : sailingsError ? (
          <div
            style={{
              fontSize: "0.8rem",
              color: "#b91c1c",
            }}
          >
            {sailingsError}
          </div>
        ) : calendarSailings.length > 0 ? (
          <SailingsCalendar
            sailings={calendarSailings}
            selectedDate={sailDate}
            onSelectDate={handleCalendarSelect}
          />
        ) : selectedShipId && !loadingCalendar && !sailingsError ? (
          <div
            style={{
              fontSize: "0.8rem",
              color: "#6b7280",
              fontStyle: "italic",
            }}
          >
            No sailings found yet for this ship. Try a different ship or check
            back later.
          </div>
        ) : null}

        <p
          style={{
            marginTop: "6px",
            fontSize: "11px",
            color: "#6b7280",
            textAlign: "center",
          }}
        >
          Tap a highlighted date to see your cruise forecast.
        </p>
      </div>

      {optionsError && (
        <p
          style={{
            marginTop: "6px",
            fontSize: "0.8rem",
            color: "#b91c1c",
          }}
        >
          {optionsError}
        </p>
      )}
    </div>
  );
}
