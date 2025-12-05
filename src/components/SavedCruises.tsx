// src/components/SavedCruises.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

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

// cruise line name -> logo in /public/icons
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

export default function SavedCruises({
  onSelectSaved,
}: {
  onSelectSaved: (sel: SavedCruiseSelection) => void;
}) {
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
  if (loading) return <p>Loading saved cruises…</p>;
  if (!rows.length) return <p>You haven’t saved any cruises yet.</p>;

  return (
    <div className="cc-saved-cruise-list">
      {rows.map((row) => {
        const countdown = getCountdown(row.sail_date);
        const logo = getLogo(row.line_name);

        return (
          <div key={row.id} className="cc-saved-cruise-card">
            {/* X button */}
            <button
              className="cc-saved-remove-btn"
              onClick={() => removeCruise(row.id)}
              aria-label="Remove saved cruise"
            >
              ✕
            </button>

            {/* TOP: full-width text */}
            <div
              className="cc-saved-cruise-top"
              onClick={() =>
                onSelectSaved({
                  lineId: row.line_name || "",
                  shipId: row.ship_name || "",
                  sailDate: row.sail_date,
                  lineName: row.line_name || "",
                  shipName: row.ship_name || "",
                })
              }
            >
              <div className="cc-saved-cruise-title">{row.line_name}</div>
              <div className="cc-saved-cruise-ship">{row.ship_name}</div>

              <div className="cc-saved-cruise-date">
                Sail date:{" "}
                {new Date(row.sail_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              <div className="cc-saved-cruise-cta">View forecast →</div>
            </div>

            {/* BOTTOM: 2 columns = logo + countdown */}
            <div className="cc-saved-cruise-bottom">
              <div className="cc-saved-cruise-logo-wrap">
                {logo && (
                  <img
                    src={logo}
                    alt={`${row.line_name} logo`}
                    className="cc-cruise-logo"
                  />
                )}
              </div>

              <div className="cc-saved-cruise-countdown">
                {countdown.value === 0 ? (
                  <span className="cc-countdown-today">Sails today!</span>
                ) : (
                  <>
                    <span className="cc-countdown-number">
                      {countdown.value}
                    </span>
                    <span className="cc-countdown-label">
                      {countdown.past ? "days ago" : "days"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
