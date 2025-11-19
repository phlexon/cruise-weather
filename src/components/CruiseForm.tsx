import React, { useMemo, useState } from "react";
import { cruiseLines, ships } from "../data/mockData";

const CruiseForm = ({ onSubmit }) => {
  const [lineId, setLineId] = useState("rcl");
  const [shipId, setShipId] = useState("");
  const [sailDate, setSailDate] = useState("");

  const filteredShips = useMemo(
    () => ships.filter((s) => s.lineId === lineId),
    [lineId]
  );

  React.useEffect(() => {
    if (!shipId && filteredShips.length > 0) {
      setShipId(filteredShips[0].id);
    }
  }, [filteredShips, shipId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!lineId || !shipId || !sailDate) return;
    onSubmit({ lineId, shipId, sailDate });
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Cruise Line
          </label>
          <select
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {cruiseLines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Ship</label>
          <select
            value={shipId}
            onChange={(e) => setShipId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {filteredShips.map((ship) => (
              <option key={ship.id} value={ship.id}>
                {ship.name}
              </option>
            ))}
          </select>
        </div>

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

      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
      >
        Show My Cruise Weather
      </button>
    </form>
  );
};

export default CruiseForm;
