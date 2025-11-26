// src/components/HomeLogo.tsx
import React from "react";

export default function HomeLogo() {
  return (
    <div className="cc-home-logo-wrapper">
      {/* Clouds behind — stationary */}
      <img
        src="/icons/cloudy.svg"
        alt="Clouds"
        className="cc-home-logo-clouds"
      />

      {/* Sun in front — rotating */}
      <img
        src="/icons/sun.svg"
        alt="Sun"
        className="cc-home-logo-sun"
      />
    </div>
  );
}
