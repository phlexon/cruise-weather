// src/screens/SavedCruisesScreen.tsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import SavedCruises, {
  type SavedCruiseSelection,
} from "../components/SavedCruises";

type SavedCruisesScreenProps = {
  onBack: () => void; // currently unused but keep for future
  onSelectSaved: (sel: SavedCruiseSelection) => void;
};

export default function SavedCruisesScreen({
  onSelectSaved,
}: SavedCruisesScreenProps) {
  const { user } = useAuth();

  const email = user?.email ?? "";
  const displayName =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    "CruiseCast traveler";

  return (
    <div className="cc-account-page">
      {/* === Top hero card ================================================= */}
      <section className="cc-account-hero">
        <h1 className="cc-account-hero-title">Your CruiseCast Account</h1>
        <p className="cc-account-hero-text">
          Signed in as <strong>{email}</strong>. View and reload the cruises
          you’ve saved. As your sail dates get closer, you can quickly re-check
          their itinerary &amp; weather from here.
        </p>
      </section>

      {/* === Bottom two-column layout ===================================== */}
      <section className="cc-account-panels">
        {/* LEFT – account overview */}
        <div className="cc-account-panel cc-account-panel-left">
          <h2 className="cc-account-panel-title">Account overview</h2>

          <dl className="cc-account-detail-list">
            <div className="cc-account-detail-row">
              <dt>Name</dt>
              <dd>{displayName}</dd>
            </div>
            <div className="cc-account-detail-row">
              <dt>Email</dt>
              <dd>{email}</dd>
            </div>
          </dl>

          <p className="cc-account-copy">
            CruiseCast helps you keep tabs on the weather trends for your
            upcoming cruises without having to rebuild the forecast from
            scratch.
          </p>

          <ul className="cc-account-bullets">
            <li>
              Reopen any saved cruise and reload its itinerary &amp; forecast.
            </li>
            <li>Watch how the forecast changes as you get closer to sail.</li>
            <li>Compare multiple sailings on the same ship or itinerary.</li>
          </ul>

          <button
            type="button"
            className="cc-account-secondary-btn"
            // you can wire this up later if you want to navigate
          >
            Check another cruise
          </button>
        </div>

        {/* RIGHT – saved cruises list */}
        <div className="cc-account-panel cc-account-panel-right">
          <h2 className="cc-account-panel-title">Saved cruises</h2>
          <p className="cc-account-panel-subtitle">
            Tap a cruise to reopen its itinerary &amp; forecast.
          </p>

          <SavedCruises onSelectSaved={onSelectSaved} />
        </div>
      </section>
    </div>
  );
}
