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
};

type WizardStep = 1 | 2;

export default function MobileCruiseWizard({ onSubmit }: MobileCruiseWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);

  const [lines, setLines] = useState<CruiseLineOption[]>([]);
  const [allShips, setAllShips] = useState<ShipOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [selectedLineId, setSelectedLineId] = useState("");
  const [selectedShipId, setSelectedShipId] = useState("");
  const [sailings, setSailings] = useState<Sailing[]>([]);
  const [loadingSailings, setLoadingSailings] = useState(false);
  const [sailingsError, setSailingsError] = useState<string | null>(null);

  // Load lines + ships (same as in CruiseForm)
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setOptionsError(null);

        const { cruiseLines, ships } = await getCruiseOptionsFromApify();
        if (cancelled) return;

        setLines(cruiseLines);
        setAllShips(ships);
      } catch (err) {
        console.error("Error loading cruise options:", err);
        if (!cancelled) setOptionsError("Unable to load cruise lines and ships.");
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const shipsForLine = useMemo(() => {
    if (!selectedLineId) return [];
    return allShips.filter((ship) => ship.line_id === selectedLineId);
  }, [allShips, selectedLineId]);

  const selectedLine = lines.find((l) => l.id === selectedLineId) || null;
  const selectedShip = shipsForLine.find((s) => s.id === selectedShipId) || null;

  // When ship changes, load sailings for that ship
  useEffect(() => {
    if (!selectedShipId) {
      setSailings([]);
      return;
    }

    let cancelled = false;

    async function loadSailings() {
      try {
        setLoadingSailings(true);
        setSailingsError(null);
        const shipSailings = await getShipSailingsFromApify(selectedShipId);
        if (cancelled) return;
        setSailings(shipSailings);
      } catch (err) {
        console.error("Error loading ship sailings:", err);
        if (!cancelled) setSailingsError("Unable to load sailings for this ship.");
      } finally {
        if (!cancelled) setLoadingSailings(false);
      }
    }

    loadSailings();
    return () => {
      cancelled = true;
    };
  }, [selectedShipId]);

  // Handle date click in calendar – final submit
  const handleDateSelect = (sailing: Sailing) => {
    if (!selectedLine || !selectedShip) return;

    const selection: CruiseSelection = {
      lineId: selectedLine.id,
      shipId: selectedShip.id,
      sailDate: sailing.date, // expected "YYYY-MM-DD"
      lineName: selectedLine.name,
      shipName: selectedShip.name,
    };

    onSubmit(selection);
  };

  const canGoNext =
    !!selectedLineId && !!selectedShipId && !loadingOptions && !optionsError;

  return (
    <div className="cc-form">
      {/* Step indicator (simple) */}
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

      {optionsError && (
        <div className="cc-main-error" style={{ marginBottom: "8px" }}>
          {optionsError}
        </div>
      )}

      {step === 1 && (
        <>
          {/* Cruise line */}
          <div className="cc-field-group">
            <label className="cc-field-label">Cruise Line</label>
            <select
              className="cc-select"
              value={selectedLineId}
              onChange={(e) => {
                setSelectedLineId(e.target.value);
                setSelectedShipId("");
                setSailings([]);
              }}
              disabled={loadingOptions}
            >
              <option value="">Select a cruise line</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ship */}
          <div className="cc-field-group">
            <label className="cc-field-label">Ship</label>
            <select
              className="cc-select"
              value={selectedShipId}
              onChange={(e) => setSelectedShipId(e.target.value)}
              disabled={loadingOptions || !selectedLineId}
            >
              <option value="">
                {selectedLineId ? "Select a ship" : "Choose a line first"}
              </option>
              {shipsForLine.map((ship) => (
                <option key={ship.id} value={ship.id}>
                  {ship.name}
                </option>
              ))}
            </select>
          </div>

          {/* Next button */}
          <div className="cc-cta-row" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="cc-cta-button cc-cta-button--primary"
              disabled={!canGoNext}
              onClick={() => setStep(2)}
            >
              Next: Choose Dates
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          {/* Back + line/ship summary */}
          <div
            className="cc-cta-row"
            style={{
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <button
              type="button"
              className="cc-cta-button cc-cta-button--secondary"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>

            {selectedLine && selectedShip && (
              <div
                style={{
                  fontSize: "11px",
                  textAlign: "right",
                  color: "#4b5563",
                }}
              >
                <div style={{ fontWeight: 600 }}>{selectedShip.name}</div>
                <div>{selectedLine.name}</div>
              </div>
            )}
          </div>

          {/* Calendar */}
          <div className="cc-calendar-shell">
            {sailingsError && (
              <div className="cc-main-error" style={{ marginBottom: "6px" }}>
                {sailingsError}
              </div>
            )}

            <SailingsCalendar
              sailings={sailings}
              onSelect={handleDateSelect}
              loading={loadingSailings}
            />

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
