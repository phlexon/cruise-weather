import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import type { CruiseSummary } from "../services/cruiseApi";

type SaveCruiseButtonProps = {
  cruise: CruiseSummary;
  sailDate: string; // ISO "YYYY-MM-DD"
};

export default function SaveCruiseButton({
  cruise,
  sailDate,
}: SaveCruiseButtonProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!user) {
    return (
      <p style={{ fontSize: "11px", marginTop: "8px", opacity: 0.7 }}>
        Sign in to save this cruise for later.
      </p>
    );
  }

  const handleSave = async () => {
    if (!cruise) return;
    setSaving(true);
    setErrorMsg(null);

    const { error } = await supabase.from("saved_cruises").insert({
      user_id: user.id,
      // We’re using names here as “ids” – that’s fine for your filtering logic
      line_id: cruise.cruiseLine ?? "",
      ship_id: cruise.shipName ?? "",
      sail_date: sailDate,
      line_name: cruise.cruiseLine ?? null,
      ship_name: cruise.shipName ?? null,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSaved(true);
    }

    setSaving(false);
  };

  return (
    <div style={{ marginTop: "8px" }}>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || saved}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400 text-slate-900 font-semibold text-xs sm:text-sm hover:bg-emerald-300 disabled:opacity-60"
      >
        {saved ? "Saved" : saving ? "Saving…" : "Save this cruise"}
      </button>
      {errorMsg && (
        <p className="text-[11px] text-red-400 mt-1 leading-snug">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
