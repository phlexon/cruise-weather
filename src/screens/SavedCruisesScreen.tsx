// src/screens/SavedCruisesScreen.tsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import SavedCruises, {
  type SavedCruiseSelection,
} from "../components/SavedCruises";

type SavedCruisesScreenProps = {
  onBack: () => void;
  onSelectSaved: (sel: SavedCruiseSelection) => void;
  onManagePassword: () => void;
  onOpenPackingChecklist: (sel: SavedCruiseSelection) => void;
  onCheckAnotherCruise: () => void;  // REQUIRED
};




export default function SavedCruisesScreen({
  onBack,
  onSelectSaved,
  onManagePassword,
  onOpenPackingChecklist,
  onCheckAnotherCruise,  // ADD THIS
}: SavedCruisesScreenProps) {




  const { user } = useAuth();

  const email = user?.email ?? "";
  const displayName =
    (user?.first_name && user.first_name + (user.last_name ? ` ${user.last_name}` : "")) ||
    (user?.email && user.email.split("@")[0]) ||
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

          <div className="cc-account-actions">
        <button
  type="button"
  className="cc-account-secondary-btn cc-cta--border"
  onClick={(e) => {
    e.stopPropagation();
    onCheckAnotherCruise();
  }}
>
  Check another cruise
</button>

            <button
              type="button"
              className="cc-account-secondary-btn cc-cta--border"
               onClick={(e) => {
    e.stopPropagation();
    onManagePassword(); // or whatever handler you're using
  }}
            >
              Manage password
            </button>
          </div>
        </div>

        {/* RIGHT – saved cruises list */}
        <div className="cc-account-panel cc-account-panel-right">
          <h2 className="cc-account-panel-title">Saved cruises</h2>
          <p className="cc-account-panel-subtitle">
            Tap a cruise to reopen its itinerary &amp; forecast.
          </p>

          <SavedCruises
  onSelectSaved={onSelectSaved}
  onOpenPackingChecklist={onOpenPackingChecklist}
  />
        </div>
      </section>
    </div>
  );
}
