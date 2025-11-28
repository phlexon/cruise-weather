// src/screens/SavedCruisesScreen.tsx
import React from "react";
import SavedCruises, {
  type SavedCruiseSelection,
} from "../components/SavedCruises";

type SavedCruisesScreenProps = {
  onBack: () => void;
  onSelectSaved: (selection: SavedCruiseSelection) => void;
};

export default function SavedCruisesScreen({
  onBack,
  onSelectSaved,
}: SavedCruisesScreenProps) {
  return (
    <>
      <button
        type="button"
        className="cc-cta-button cc-cta-button--secondary cc-back-secondary"
        onClick={onBack}
      >
        ← Back to Search
      </button>

      <h1 className="cc-main-title">Saved cruises</h1>

      <SavedCruises onSelectSaved={onSelectSaved} />
    </>
  );
}
