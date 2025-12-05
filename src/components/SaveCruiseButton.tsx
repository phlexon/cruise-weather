// src/components/SaveCruiseButton.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

type Props = {
  cruise: {
    cruiseLine: string;
    shipName: string;
    departIso: string;
  };
  sailDate: string;
};

export default function SaveCruiseButton({ cruise, sailDate }: Props) {
  const { user } = useAuth();

  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  const line = cruise.cruiseLine;
  const ship = cruise.shipName;

  // 1️⃣ CHECK IF THIS CRUISE IS ALREADY SAVED
  useEffect(() => {
    if (!user) return;

    const check = async () => {
      const { data } = await supabase
        .from("saved_cruises")
        .select("id")
        .eq("user_id", user.id)
        .eq("line_name", line)
        .eq("ship_name", ship)
        .eq("sail_date", sailDate)
        .maybeSingle();

      if (data) setIsSaved(true);
      setChecking(false);
    };

    check();
  }, [user, line, ship, sailDate]);

  // 2️⃣ SAVE NEW CRUISE
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { data: existing } = await supabase
      .from("saved_cruises")
      .select("id")
      .eq("user_id", user.id)
      .eq("line_name", line)
      .eq("ship_name", ship)
      .eq("sail_date", sailDate)
      .maybeSingle();

    if (existing) {
      setIsSaved(true);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("saved_cruises").insert({
      user_id: user.id,
      line_name: line,
      ship_name: ship,
      sail_date: sailDate,
    });

    setSaving(false);

    if (!error) {
      setIsSaved(true);
    }
  };

  // 🔥 HIDE BUTTON IF SAVED
  if (checking || isSaved) return null;

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className="cc-cta-button cc-cta-button--secondary"
      style={{ marginTop: "1rem" }}
    >
      {saving ? "Saving…" : "Save this cruise"}
    </button>
  );
}
