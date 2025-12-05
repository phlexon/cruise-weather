// src/components/CruiseResults.tsx
import React from "react";
import type { CruiseSummary } from "../services/cruiseApi";

interface CruiseResultsProps {
  results: CruiseSummary[];
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

const CruiseResults: React.FC<CruiseResultsProps> = ({
  results,
  onSelect,
  selectedIndex,
}) => {
  if (!results.length) {
    return (
      <p className="mt-4 text-center text-sm text-slate-600">
        No cruises found for that date.
      </p>
    );
  }

  // ---------------- SINGLE CRUISE MODE ----------------
// ---------------- SINGLE CRUISE MODE ----------------
if (results.length === 1) {
  const cruise = results[0];
  const departLabel = cruise.departIso
    ? new Date(cruise.departIso).toLocaleDateString()
    : "TBA";

  return (
    <section className="mt-6">
      <div className="w-full rounded-2xl bg-white px-5 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
              Current cruise
            </p>

            <h3 className="text-base font-semibold text-slate-900">
              {cruise.title || "Cruise itinerary"}
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              {cruise.shipName} · {cruise.cruiseLine}
            </p>
          </div>

          <div className="mt-2 flex flex-col items-start gap-1 sm:mt-0 sm:items-end">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[12px] font-medium text-blue-700 shadow-sm">
              {departLabel}
            </span>
          </div>

        </div>

        <div className="mt-3 text-[12px] text-slate-500">
          Viewing itinerary & forecast for this sailing below.
        </div>
      </div>
    </section>
  );
}


  // ---------------- MULTI-CRUISE MODE ----------------
  return (
    <div className="mt-6 space-y-3">
      {results.map((cruise, index) => {
        const isSelected = selectedIndex === index;

        return (
          <div
            key={cruise.id ?? index}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(index)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(index);
              }
            }}
            className={[
              "w-full rounded-xl px-4 py-3 transition cursor-pointer",
              "shadow-sm hover:-translate-y-0.5 hover:shadow-md",
              isSelected
                ? "border-2 border-blue-600 bg-white"
                : "border border-slate-200 bg-white",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] text-slate-500 tracking-wide uppercase">
                  Round-trip cruise
                </p>
                <h3 className="text-sm font-semibold text-slate-900">
                  {cruise.title || "Cruise itinerary"}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  {cruise.shipName} · {cruise.cruiseLine}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  {cruise.departIso
                    ? new Date(cruise.departIso).toLocaleDateString()
                    : "TBA"}
                </span>

                {isSelected && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Selected
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="font-medium text-blue-700 tracking-wide">
                View itinerary →
              </span>
              <span className="text-slate-500 lowercase">details</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CruiseResults;
