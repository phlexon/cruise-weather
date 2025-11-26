// src/screens/HomeScreen.tsx
import React from "react";
import "./HomeScreen.css";

type HomeScreenProps = {
  onFindCruise: () => void;
  onLogin?: () => void;
};

export default function HomeScreen({ onFindCruise, onLogin }: HomeScreenProps) {
  return (
    <div className="cc-home">
      <div className="cc-home-inner">
        <header className="cc-home-header">
          <span className="cc-home-welcome">WELCOME TO</span>
          <img
            src="/icons/logo.svg"
            alt="CruiseCast"
            className="cc-home-logo-image"
          />
        </header>

        <div className="cc-hero-wrapper">
          <img
            src="/icons/partly.svg"
            alt="Partly cloudy"
            className="cc-hero-icon"
          />
        </div>

        <div className="cc-home-actions">
          {/* 🔗 THIS BUTTON SWITCHES YOU INTO THE MAIN APP */}
          <button className="cc-cta cc-cta--border" onClick={onFindCruise}>
            <span className="cc-cta-label">FIND MY CRUISE</span>
            <span className="cc-cta-icon">▶</span>
          </button>

          <button
            className="cc-cta cc-cta--border"
            type="button"
            onClick={onLogin}
          >
            <span className="cc-cta-label">LOG IN</span>
            <span className="cc-cta-icon">▶</span>
          </button>
        </div>
      </div>
    </div>
  );
}
