// src/components/MobileCruiseWizard.tsx
import React, { useEffect, useMemo, useState } from "react";
import SailingsCalendar, { type Sailing } from "./SailingsCalendar";
import {
  getCruiseOptionsFromApify,
  getShipSailingsFromApify,
  type CruiseLineOption,
  type ShipOption,
} from "../services/cruiseApi";
import type { CruiseSelection } from "./CruiseForm";

type MobileCruiseWizardProps = {
  onSubmit: (selection: CruiseSelection) => void;
  onBackToHome: () => void;
};

type WizardStep = 1 | 2;

export default function MobileCruiseWizard({
  onSubmit,
  onBackToHome,
}: MobileCruiseWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);

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

  // ---------------- OPTIONS ----------------
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        const { lines, ships } = await getCruiseOptionsFromApify();
        if (cancelled) return;

        setLines(lines);
        setAllShips(ships);
      } catch (e) {
        setOptionsError("Unable to load cruise options.");
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter ships
  const shipsForLine = useMemo(() => {
    if (!selectedLineId) return [];
    return allShips
      .filter((s) => s.lineId === selectedLineId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allShips, selectedLineId]);

  // ---------------- HANDLERS ----------------

  const handleLineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLineId(e.target.value);
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
    } catch (e) {
      setSailingsError("Unable to load sailings for this ship.");
    } finally {
      setLoadingCalendar(false);
    }
  };

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

  const canGoNext =
    !!selectedLineId && !!selectedShipId && !loadingOptions && !optionsError;

  // ---------------- UI ----------------

  return (
    <div className="cc-form">
      {/* Step indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "10px",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "rgba(15,23,42,0.75)",
        }}
      >
        <span style={{ fontWeight: step === 1 ? 700 : 400 }}>Line & Ship</span>
        <span>•</span>
        <span style={{ fontWeight: step === 2 ? 700 : 400 }}>Dates</span>
      </div>

      {/* ---------------- STEP 1 ---------------- */}
      {step === 1 && (
        <>
          <div className="cc-field-group">
            <label className="cc-field-label">Cruise Line</label>
            <select
              className="cc-select"
              value={selectedLineId}
              onChange={handleLineChange}
            >
              <option value="">Please Select One</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </select>
          </div>

          <div className="cc-field-group">
            <label className="cc-field-label">Ship</label>
            <select
              className="cc-select"
              value={selectedShipId}
              onChange={handleShipChange}
              disabled={!selectedLineId}
            >
              <option value="">Please Select One</option>
              {shipsForLine.map((ship) => (
                <option key={ship.id} value={ship.id}>
                  {ship.name}
                </option>
              ))}
            </select>
          </div>

          {/* BUTTONS – NEXT FIRST, BACK SECOND */}
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {/* NEXT: CHOOSE DATES */}
            <button
              type="button"
              className="cc-cta cc-cta--border cc-cta--full"
              disabled={!canGoNext}
              onClick={() => setStep(2)}
            >
              <span className="cc-cta-label">Next: Choose dates</span>
            </button>

           </div>
        </>
      )}

      {/* ---------------- STEP 2 ---------------- */}
      {step === 2 && (
        <>
          {/* Back to Step 1 */}
          <div
            style={{
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <button
              type="button"
              className="cc-cta-button cc-cta-button--secondary"
              style={{ width: "100%" }}
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
          </div>

          <div className="cc-calendar-shell">
            {loadingCalendar ? (
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                Loading upcoming sailings…
              </div>
            ) : sailingsError ? (
              <div style={{ fontSize: "0.8rem", color: "#b91c1c" }}>
                {sailingsError}
              </div>
            ) : calendarSailings.length ? (
              <SailingsCalendar
                sailings={calendarSailings}
                selectedDate={sailDate}
                onSelectDate={handleCalendarSelect}
              />
            ) : (
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                No sailings found for this ship.
              </div>
            )}

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
        </>
      )}
    </div>
  );
}
