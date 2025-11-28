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

      if (error) setErrorMsg(error.message);
      else if (data) setRows(data as SavedCruiseRow[]);

      setLoading(false);
    };

    void fetchSaved();
  }, [user]);

  if (!user) return null;

  return (
    <div className="cc-saved-container">
      <h2 className="cc-saved-title">Saved cruises</h2>

      {loading && <p className="cc-saved-loading">Loading your cruises…</p>}
      {errorMsg && <p className="cc-saved-error">{errorMsg}</p>}
      {!loading && !rows.length && !errorMsg && (
        <p className="cc-saved-empty">You haven’t saved any cruises yet.</p>
      )}

      <div className="cc-saved-list">
        {rows.map((row) => {
          const lineLabel = row.line_name ?? row.line_id;
          const shipLabel = row.ship_name ?? row.ship_id;

          return (
            <button
              key={row.id}
              type="button"
              className="cc-saved-item"
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
              <div className="cc-saved-item-title">
                {lineLabel} — {shipLabel}
              </div>

              <div className="cc-saved-item-date">
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
