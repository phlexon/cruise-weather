// CruiseResults_refactored.tsx
import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import type { CruiseSummary } from "../services/cruiseApi";

interface CruiseResultsProps {
  results: CruiseSummary[];
  onSelect: (index: number) => void;
  selectedIndex: number | null;
  loading?: boolean;
}

const CruiseResults: React.FC<CruiseResultsProps> = ({ results, onSelect, selectedIndex, loading }) => {
  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        {[...Array(3)].map((_, i) => (<Skeleton key={i} height={80} borderRadius={12} />))}
      </div>
    );
  }

  if (!results.length) {
    return <p className="mt-4 text-center text-sm text-slate-700">No cruises found for that date.</p>;
  }

  return (
    <div className="mt-6 space-y-3">
      {results.map((cruise, index) => {
        const isSelected = selectedIndex === index;
        return (
          <div key={cruise.id ?? index} role="button" tabIndex={0} onClick={() => onSelect(index)}
            className={`w-full rounded-xl px-4 py-3 shadow-sm transition cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${isSelected ? 'border-2 border-blue-600 bg-white' : 'border border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">7 days, round-trip cruise</p>
                <h3 className="text-sm font-semibold text-slate-900">{cruise.title || "Cruise itinerary"}</h3>
                <p className="mt-1 text-xs text-slate-600">• {cruise.shipName} ({cruise.cruiseLine})</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">{cruise.departIso ? new Date(cruise.departIso).toLocaleDateString() : "TBA"}</span>
                {isSelected && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Selected</span>}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="font-medium text-blue-700">View itinerary →</span>
              <span className="text-slate-500">TBA</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CruiseResults;
