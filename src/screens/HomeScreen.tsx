// src/screens/HomeScreen.tsx
import React from "react";
import "./HomeScreen.css";
import HomeLogo from "../components/HomeLogo";
import { useAuth } from "../context/AuthContext";

type HomeScreenProps = {
  onFindCruise: () => void;
  onLogin?: () => void;
  onGoToAccount?: () => void; // NEW: handler for logged-in users
};

export default function HomeScreen({
  onFindCruise,
  onLogin,
  onGoToAccount,
}: HomeScreenProps) {
  const { user } = useAuth();

  // Choose what the second button should do
  const handleAccountAction = () => {
    if (user) {
      // Logged-in user → send them to account screen (saved cruises)
      onGoToAccount?.();
    } else {
      // Not logged in → send to login
      onLogin?.();
    }
  };

  return (
    <div className="cc-home">
      <div className="cc-home-inner">
        <header className="cc-home-header">
          <span className="cc-home-welcome">WELCOME TO Me</span>

          <img
            src="/icons/logo.svg"
            alt="CruiseCast"
            className="cc-home-logo-image"
          />
        </header>

        {/* 🔆 Animated sun + cloud icon */}
        <div className="cc-hero-wrapper">
          <HomeLogo />
        </div>

        {/* 🔘 Action buttons */}
        <div className="cc-home-actions">
          {/* FIND MY CRUISE (unchanged) */}
          <button
            className="cc-cta cc-cta--border"
            onClick={onFindCruise}
          >
            <span className="cc-cta-label">Find My Cruise</span>
          </button>

          {/* LOGIN / GO TO ACCOUNT (dynamic label) */}
          <button
            className="cc-cta cc-cta--border"
            type="button"
            onClick={handleAccountAction}
          >
            <span className="cc-cta-label">
              {user ? "Go To Account" : "Log In / Create An Account"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
