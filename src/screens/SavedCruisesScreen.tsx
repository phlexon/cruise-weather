// src/screens/SavedCruisesScreen.tsx
import React from "react";
import { useAuth } from "../context/AuthContext";
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
  const { user } = useAuth();
  const email = user?.email ?? "CruiseCast traveler";

  return (
    <section className="cc-main-card cc-account">
      {/* Back button */}
      <button
        type="button"
        className="cc-cta-button cc-cta-button--secondary cc-back-secondary"
        onClick={onBack}
      >
        ← Back to search
      </button>

      {/* Account header */}
      <div className="cc-account-header">
        <h1 className="cc-account-title">Your CruiseCast account</h1>
        <p className="cc-account-subtitle">
          Signed in as{" "}
          <span className="cc-account-email">{email}</span>. View and reload the
          cruises you’ve saved to quickly re-check their weather as your sail
          date approaches.
        </p>
      </div>

      {/* Two-column dashboard layout on desktop, stacked on mobile */}
      <div className="cc-account-grid">
        {/* Left column: account overview */}
        <section className="cc-account-card">
          <h2 className="cc-account-card-title">Account overview</h2>
          <p className="cc-account-card-text">
            CruiseCast lets you preview weather trends for your upcoming cruises
            so you can plan outfits, excursions, and sea days with confidence.
          </p>

          <ul className="cc-account-card-list">
            <li>Save any cruise from the results screen.</li>
            <li>Return here to quickly reload its itinerary & weather.</li>
            <li>Check back closer to sail date to see updated forecasts.</li>
          </ul>

          <p className="cc-account-card-footnote">
            Tip: If you change ships or sail dates, just run a new search and
            save the updated cruise.
          </p>
        </section>

        {/* Right column: saved cruises list */}
        <section className="cc-account-card cc-account-card--saved">
          <SavedCruises onSelectSaved={onSelectSaved} />
        </section>
      </div>
    </section>
  );
}
