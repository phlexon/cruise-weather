// CruiseForm_refactored.tsx
import React, { useEffect, useMemo, useState } from "react";
import SailingsCalendar, { type Sailing } from "./SailingsCalendar";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  getCruiseOptionsFromApify,
  getShipSailingsFromApify,
  type CruiseLineOption,
  type ShipOption,
} from "../services/cruiseApi";

type CruiseSelection = {
  lineId: string;
  shipId: string;
  sailDate: string;
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
  const [sailDate, setSailDate] = useState<string>("");
  const [calendarSailings, setCalendarSailings] = useState<Sailing[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

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
        if (!cancelled) setOptionsError("There was a problem loading cruise options.");
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }
    loadOptions();
    return () => { cancelled = true; };
  }, []);

  const shipsForLine = useMemo(() => {
    if (!selectedLineId) return [];
    return allShips.filter((s) => s.lineId === selectedLineId).sort((a, b) => a.name.localeCompare(b.name));
  }, [allShips, selectedLineId]);

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
      setCalendarSailings(sailings.map((s) => ({ date: s.departIso, title: s.title })));
    } catch {
      setCalendarSailings([]);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const handleCalendarSelect = (dateIso: string) => {
    setSailDate(dateIso);
    const line = lines.find((l) => l.id === selectedLineId);
    const ship = allShips.find((s) => s.id === selectedShipId);
    if (!line || !ship) return;
    onSubmit({ lineId: line.id, shipId: ship.id, sailDate: dateIso, lineName: line.name, shipName: ship.name });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const line = lines.find((l) => l.id === selectedLineId);
    const ship = allShips.find((s) => s.id === selectedShipId);
    if (!line || !ship || !sailDate) return;
    onSubmit({ lineId: line.id, shipId: ship.id, sailDate, lineName: line.name, shipName: ship.name });
  };

  const canSearch = !!selectedLineId && !!selectedShipId && !!sailDate && !loadingOptions;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Cruise Line</label>
        {loadingOptions ? (
          <Skeleton height={40} borderRadius={8} />
        ) : (
          <select value={selectedLineId} onChange={handleLineChange} className="w-full text-sm p-2 rounded-lg border border-gray-300">
            <option value="">Please Select One</option>
            {lines.map((line) => (<option key={line.id} value={line.id}>{line.name}</option>))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Ship</label>
        {loadingOptions ? (
          <Skeleton height={40} borderRadius={8} />
        ) : (
          <select value={selectedShipId} onChange={handleShipChange} disabled={!selectedLineId} className="w-full text-sm p-2 rounded-lg border border-gray-300">
            <option value="">Please Select One</option>
            {shipsForLine.map((ship) => (<option key={ship.id} value={ship.id}>{ship.name}</option>))}
          </select>
        )}
      </div>

      {selectedShipId && (
        <div>
          {loadingCalendar ? (
            <Skeleton height={100} borderRadius={8} />
          ) : calendarSailings.length ? (
            <SailingsCalendar sailings={calendarSailings} selectedDate={sailDate} onSelectDate={handleCalendarSelect} />
          ) : (
            <p className="text-xs text-gray-500 italic">No sailings found for this ship.</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Sail Date</label>
        <input type="date" value={sailDate} onChange={(e) => setSailDate(e.target.value)} className="w-full text-sm p-2 rounded-lg border border-gray-300" />
      </div>

      <button type="submit" disabled={!canSearch} className={`w-full py-2 rounded-full font-semibold text-white ${canSearch ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>
        Search Cruise
      </button>

      {optionsError && <p className="text-xs text-red-600 mt-2">{optionsError}</p>}
    </form>
  );
}
