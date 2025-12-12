// src/components/SavedCruises.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

export type SavedCruiseSelection = {
  lineId: string;
  shipId: string;
  sailDate: string;
  lineName?: string;
  shipName?: string;
};

type SavedCruiseRow = {
  id: string;
  user_id: string;
  line_name: string | null;
  ship_name: string | null;
  sail_date: string;
};

const logoMap: Record<string, string> = {
  "Royal Caribbean Cruises": "/icons/royal.png",
  "Princess Cruises": "/icons/princess.png",
  "Celebrity Cruises": "/icons/celebrity.png",
  "Carnival Cruise Line Cruises": "/icons/carnival.png",
  "Disney Cruise Line Cruises": "/icons/disney.png",
  "Holland America Cruises": "/icons/holland.png",
  "MSC Cruises": "/icons/msc.png",
  "Norwegian Cruise Line Cruises": "/icons/norwegian.png",
  "Viking Cruises": "/icons/viking.png",
  "Silversea Cruises": "/icons/silversea.png",
  "Margaritaville at Sea Cruises": "/icons/margaritaville.png",
    "Virgin Voyages Cruises": "/icons/virgin.png",
};

function getLogo(lineName?: string | null) {
  if (!lineName) return null;
  return logoMap[lineName] || null;
}

function getCountdown(date: string) {
  const now = new Date();
  const sail = new Date(date);
  const diff = sail.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { label: "days ago", value: Math.abs(days), past: true };
  if (days === 0) return { label: "Sails today!", value: 0, past: false };
  return { label: "days", value: days, past: false };
}

type SavedCruisesProps = {
  onSelectSaved: (sel: SavedCruiseSelection) => void;
  onOpenPackingChecklist?: (sel: SavedCruiseSelection) => void;
};

export default function SavedCruises({
  onSelectSaved,
  onOpenPackingChecklist,
}: SavedCruisesProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<SavedCruiseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchRows() {
      const { data } = await supabase
        .from("saved_cruises")
        .select("*")
        .eq("user_id", user.id)
        .order("sail_date", { ascending: true });

      setRows(data ?? []);
      setLoading(false);
    }

    fetchRows();
  }, [user]);

  const removeCruise = async (id: string) => {
    await supabase.from("saved_cruises").delete().eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="cc-saved-cruise-loading">
        <Spinner label="Loading your saved cruises…" />
      </div>
    );
  }

  if (!rows.length) {
    return <p>You haven’t saved any cruises yet.</p>;
  }

  return (
    <div className="cc-saved-cruise-list">
      {rows.map((row) => {
        const countdown = getCountdown(row.sail_date);
        const logo = getLogo(row.line_name);
        const isToday = countdown.value === 0 && !countdown.past;

        const selection: SavedCruiseSelection = {
          lineId: row.line_name || "",
          shipId: row.ship_name || "",
          sailDate: row.sail_date,
          lineName: row.line_name || "",
          shipName: row.ship_name || "",
        };

        return (
          <div key={row.id} className="cc-saved-cruise-card">
            {/* Remove button */}
            <button
              className="cc-saved-remove-btn"
              onClick={() => removeCruise(row.id)}
              aria-label="Remove saved cruise"
            >
              ✕
            </button>

            {/* Card body */}
            <div
              className="cc-saved-cruise-top"
              onClick={() => onSelectSaved(selection)}
            >
              {logo && (
                <div className="cc-saved-cruise-logo-wrap cc-saved-cruise-logo-wrap--top">
                  <img
                    src={logo}
                    alt={`${row.line_name ?? "Cruise line"} logo`}
                    className="cc-cruise-logo"
                  />
                </div>
              )}

              <div className="cc-saved-cruise-header-row">
                <div className="cc-saved-cruise-ship">{row.ship_name}</div>

                <div className="cc-saved-cruise-countdown cc-saved-cruise-countdown--inline">
                  {isToday ? (
                    <div className="cc-saved-cruise-today-inline">
                      Cruise Day!
                    </div>
                  ) : (
                    <>
                      <span className="cc-countdown-number">
                        {countdown.value}
                      </span>
                      <span className="cc-countdown-label">
                        {countdown.past ? "days ago" : "days to go"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="cc-saved-cruise-date">
                {new Date(row.sail_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              {/* Stacked CTAs, using your button style */}
              <div className="cc-saved-cruise-cta-column">
                <button
  type="button"
  className="cc-cta cc-cta--border cc-account-secondary-btn cc-account-secondary-btn--blue"
  onClick={(e) => {
    e.stopPropagation();
    onSelectSaved(selection);
  }}
>
  <span className="cc-cta-label">View forecast</span>
</button>


              <button
  type="button"
  className="cc-cta cc-cta--border cc-account-secondary-btn cc-account-secondary-btn--yellow"
  onClick={(e) => {
    e.stopPropagation();
    onOpenPackingChecklist
      ? onOpenPackingChecklist(selection)
      : onSelectSaved(selection);
  }}
>
  <span className="cc-cta-label">Packing checklist</span>
</button>

              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
