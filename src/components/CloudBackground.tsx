// src/components/CloudBackground.tsx
import React from "react";

type CloudConfig = {
  top: string;
  left: string;
  size: number;
  duration: number;
  opacity: number;
};

// DESKTOP CLOUDS (unchanged)
const CLOUDS_DESKTOP: CloudConfig[] = [
  { top: "8%", left: "-30%", size: 520, duration: 60, opacity: 0.22 },
  { top: "30%", left: "20%", size: 460, duration: 70, opacity: 0.18 },
  { top: "55%", left: "70%", size: 540, duration: 80, opacity: 0.20 },
  { top: "78%", left: "115%", size: 480, duration: 65, opacity: 0.19 },
];

// MOBILE CLOUDS (smaller + spaced like desktop)
const CLOUDS_MOBILE: CloudConfig[] = [
  { top: "5%", left: "-40%", size: 360, duration: 50, opacity: 0.22 },
  { top: "45%", left: "5%", size: 240, duration: 55, opacity: 0.18 },
  { top: "28%", left: "55%", size: 250, duration: 60, opacity: 0.20 },
  { top: "70%", left: "95%", size: 430, duration: 52, opacity: 0.19 },
];

export default function CloudBackground() {
  const isMobile = window.innerWidth <= 767;
  const CLOUDS = isMobile ? CLOUDS_MOBILE : CLOUDS_DESKTOP;

  return (
    <div className="cc-clouds-bg" aria-hidden="true">
      {CLOUDS.map((cloud, idx) => (
        <div
          key={idx}
          className="cc-cloud"
          style={{
            top: cloud.top,
            left: cloud.left,
            width: `${cloud.size}px`,
            opacity: cloud.opacity,
            animationDuration: `${cloud.duration}s`,
          }}
        >
          <img src="/icons/cloud.svg" alt="" />
        </div>
      ))}
    </div>
  );
}
