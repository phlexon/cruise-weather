// src/components/SaveCruiseButton.tsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import type { CruiseSummary } from "../services/cruiseApi";

type SaveCruiseButtonProps = {
  cruise: CruiseSummary | null;
  sailDate: string;
};

export default function SaveCruiseButton({
  cruise,
  sailDate,
}: SaveCruiseButtonProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cruise) return null;

  const handleSave = async () => {
    if (!user) {
      setError("Sign in to save this cruise to your account.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: dbError } = await supabase.from("saved_cruises").insert({
        user_id: user.id,
        // these IDs are mainly for bookkeeping; the app filters by names
        line_id: cruise.cruiseLine || "",
        ship_id: cruise.shipName || "",
        sail_date: sailDate,
        line_name: cruise.cruiseLine ?? null,
        ship_name: cruise.shipName ?? null,
      });

      if (dbError) throw dbError;
      setSaved(true);
    } catch (e) {
      console.error("Error saving cruise", e);
      setError("Couldn’t save this cruise. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cc-save-wrapper">
      <button
        type="button"
        className={
          "cc-cta-button cc-cta-button--primary cc-save-button" +
          (saved ? " cc-save-button--saved" : "")
        }
        onClick={handleSave}
        disabled={saving}
      >
        {saved ? "Saved to your account" : saving ? "Saving…" : "Save this cruise"}
      </button>

      {error && <p className="cc-save-error">{error}</p>}

      {!user && !error && (
        <p className="cc-save-hint">
          Sign in from the top of the page to save and reload this cruise later.
        </p>
      )}
    </div>
  );
}
