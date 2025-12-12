// src/components/SaveCruiseButton.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

type CruiseLike = {
  id?: string;
  cruiseLine: string;
  shipName: string;
  departIso?: string;
};

type Props = {
  cruise: CruiseLike | null;
  sailDate: string | null;
  /**
   * Called when a user who is NOT logged in clicks the CTA.
   * In App.tsx you'll wire this to setView("authSplit").
   */
  onRequireAuth?: () => void;
};

export default function SaveCruiseButton({
  cruise,
  sailDate,
  onRequireAuth,
}: Props) {
  const { user } = useAuth();

  const [isSaved, setIsSaved] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  // -------------------- DERIVED FIELDS --------------------
  const lineId = cruise?.cruiseLine ?? null;
  const shipId = cruise?.shipName ?? null;
  const lineName = cruise?.cruiseLine ?? "";
  const shipName = cruise?.shipName ?? "";
  const date = sailDate ?? cruise?.departIso ?? null;

  // -------------------- CHECK IF SAVED --------------------
  useEffect(() => {
    // If user isn’t logged in, we don’t need to check Supabase
    if (!user || !lineId || !shipId || !date) {
      setChecking(false);
      return;
    }

    const check = async () => {
      const { data, error } = await supabase
        .from("saved_cruises")
        .select("id")
        .eq("user_id", user.id)
        .eq("line_id", lineId)
        .eq("ship_id", shipId)
        .eq("sail_date", date)
        .maybeSingle();

      if (!error && data) {
        setIsSaved(true);
      }
      setChecking(false);
    };

    void check();
  }, [user, lineId, shipId, date]);

  // While checking, don’t flash anything
  if (checking) return null;

  // -------------------- NOT LOGGED IN → CTA --------------------
  if (!user) {
    return (
      <button
        type="button"
        className="cc-cta-button cc-cta-button--secondary"
        style={{ marginTop: "1rem" }}
        onClick={onRequireAuth}
      >
        Log in to save this cruise
      </button>
    );
  }

  // -------------------- SAVE HANDLER (LOGGED-IN) --------------------
  const handleSave = async () => {
    if (!user || !lineId || !shipId || !date) return;

    setSaving(true);

    // Prevent duplicates
    const { data: existing } = await supabase
      .from("saved_cruises")
      .select("id")
      .eq("user_id", user.id)
      .eq("line_id", lineId)
      .eq("ship_id", shipId)
      .eq("sail_date", date)
      .maybeSingle();

    if (existing) {
      setIsSaved(true);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("saved_cruises").insert({
      user_id: user.id,
      line_id: lineId,
      ship_id: shipId,
      sail_date: date,
      line_name: lineName,
      ship_name: shipName,
    });

    if (!error) {
      setIsSaved(true);
    }
    setSaving(false);
  };

  // -------------------- UI STATES (LOGGED-IN) --------------------
  if (isSaved) {
    return (
      <div
        style={{
            marginTop: "1rem",
            marginBottom: "1rem",
          padding: "0.6rem 1rem",
          background: "#ffc928",
          border: "1px solid #ffffff",
          borderRadius: "999px",
          color: "#152c4b",
          fontWeight: 500,
          fontSize: "0.9rem",
          letterSpacing: "0.05em",
          textAlign: "center",
        }}
      >
        ✓ This cruise is saved to your account
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      className="cc-cta-button cc-cta-button--secondary"
      style={{ marginTop: "1rem" }}
    >
      {saving ? "Saving…" : "Save this cruise"}
    </button>
  );
}
