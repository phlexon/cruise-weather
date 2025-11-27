import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

type SavedCruiseRow = {
  id: string;
  user_id: string;
  line_id: string;
  ship_id: string;
  sail_date: string;
  line_name: string | null;
  ship_name: string | null;
  created_at: string;
};

export type SavedCruiseSelection = {
  lineId: string;
  shipId: string;
  sailDate: string;
  lineName?: string;
  shipName?: string;
};

type SavedCruisesProps = {
  onSelectSaved: (sel: SavedCruiseSelection) => void;
};

export default function SavedCruises({ onSelectSaved }: SavedCruisesProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<SavedCruiseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }

    const fetchSaved = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("saved_cruises")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
      } else if (data) {
        setRows(data as SavedCruiseRow[]);
      }

      setLoading(false);
    };

    void fetchSaved();
  }, [user]);

  if (!user) return null;

  return (
    <div className="mt-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-slate-50">
      <h2 className="text-sm font-semibold mb-2">Saved cruises</h2>

      {loading && <p className="text-xs text-slate-300">Loading your cruises…</p>}
      {errorMsg && (
        <p className="text-xs text-red-400 mb-1 leading-snug">{errorMsg}</p>
      )}

      {!loading && !rows.length && !errorMsg && (
        <p className="text-xs text-slate-300">
          You haven&apos;t saved any cruises yet.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((row) => {
          const lineLabel =
            (row.line_name ?? row.line_id) || "Cruise line";
          const shipLabel =
            (row.ship_name ?? row.ship_id) || "Ship";

          return (
            <button
              key={row.id}
              type="button"
              className="w-full text-left rounded-xl bg-slate-800/80 hover:bg-slate-700/80 px-3 py-2 text-xs"
              onClick={() =>
                onSelectSaved({
                  lineId: row.line_id,
                  shipId: row.ship_id,
                  sailDate: row.sail_date,
                  lineName: row.line_name ?? undefined,
                  shipName: row.ship_name ?? undefined,
                })
              }
            >
              <div className="font-semibold text-slate-50">
                {lineLabel} — {shipLabel}
              </div>
              <div className="text-slate-300">
                Sail date:{" "}
                {new Date(row.sail_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
