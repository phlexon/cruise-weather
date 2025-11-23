// src/components/CruiseForm.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  getCruiseOptionsFromApify,
  type CruiseLineOption,
  type ShipOption,
} from "../services/cruiseApi";

type CruiseFormProps = {
  onSubmit: (params: {
    lineId: string;
    shipId: string;
    sailDate: string;
    lineName: string;
    shipName: string;
  }) => void;
};

const ALLOWED_CRUISE_LINES = new Set<string>([
  "Carnival Cruise Line Cruises",
  "Celebrity Cruises",
  "Disney Cruise Line Cruises",
  "Holland America Cruises",
  "Margaritaville at Sea Cruises",
  "MSC Cruises",
  "Norwegian Cruise Line Cruises",
  "Princess Cruises",
  "Royal Caribbean Cruises",
  "Silversea Cruises",
  "Viking Cruises",
  "Virgin Voyages Cruises",
]);

const CruiseForm: React.FC<CruiseFormProps> = ({ onSubmit }) => {
  const [lines, setLines] = useState<CruiseLineOption[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [lineId, setLineId] = useState<string>(""); // start empty
  const [shipId, setShipId] = useState<string>(""); // start empty
  const [sailDate, setSailDate] = useState<string>("");

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Load cruise line + ship options from Apify once
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setOptionsError(null);

        const { lines: apiLines, ships: apiShips } =
          await getCruiseOptionsFromApify();
        if (cancelled) return;

        // Sort alphabetically by name
        const sortedLines = [...apiLines].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        const sortedShips = [...apiShips].sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        // Whitelist only the allowed cruise lines by name
        const allowedLines = sortedLines.filter((line) =>
          ALLOWED_CRUISE_LINES.has(line.name)
        );

        // Only keep ships that belong to those allowed lines
        const allowedLineIds = new Set(allowedLines.map((l) => l.id));
        const allowedShips = sortedShips.filter((ship) =>
          allowedLineIds.has(ship.lineId)
        );

        setLines(allowedLines);
        setShips(allowedShips);
      } catch (e) {
        console.error("Error loading cruise options from Apify:", e);
        if (!cancelled) {
          setOptionsError("Could not load cruise options. Please try again.");
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

  // Only show ships for the selected line
  const filteredShips = useMemo(
    () => ships.filter((s) => lineId && s.lineId === lineId),
    [ships, lineId]
  );

  // When the line changes, auto-select the first ship for that line
  useEffect(() => {
    if (!lineId) {
      setShipId("");
      return;
    }

    const firstShipForLine = filteredShips[0];
    if (firstShipForLine) {
      setShipId(firstShipForLine.id);
    } else {
      setShipId("");
    }
  }, [lineId, filteredShips]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineId || !shipId || !sailDate) return;

    const line = lines.find((l) => l.id === lineId);
    const ship = ships.find((s) => s.id === shipId);

    onSubmit({
      lineId,
      shipId,
      sailDate,
      lineName: line?.name ?? "",
      shipName: ship?.name ?? "",
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl bg-white/80 p-4 shadow-md"
    >
      <h2 className="text-xl font-semibold text-slate-800">
        Check Your Cruise Weather
      </h2>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Cruise Line */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Cruise Line
          </label>
          <select
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={loadingOptions || lines.length === 0}
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Ship</label>
          <select
            value={shipId}
            onChange={(e) => setShipId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={loadingOptions || !lineId || filteredShips.length === 0}
          >
            <option value="">Please Select One</option>
            {filteredShips.map((ship) => (
              <option key={ship.id} value={ship.id}>
                {ship.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sail Date */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Sail Date
          </label>
          <input
            type="date"
            value={sailDate}
            onChange={(e) => setSailDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loadingOptions && (
        <p className="text-xs text-slate-500">
          Loading cruise lines & ships…
        </p>
      )}
      {optionsError && (
        <p className="text-xs text-red-600">{optionsError}</p>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
        disabled={loadingOptions || !lineId || !shipId || !sailDate}
      >
        Show My Cruise Weather
      </button>
    </form>
  );
};

export default CruiseForm;
