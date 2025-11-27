// src/components/CloudBackground.tsx
import React from "react";

type CloudConfig = {
  top: string;     // percent or px
  left: string;    // starting left
  size: number;    // width in px
  duration: number; // animation duration in seconds
  opacity: number;
};

const CLOUDS: CloudConfig[] = [
  // one starting off left, drifting across
  { top: "8%",  left: "-30%", size: 520, duration: 60, opacity: 0.22 },
  // one more centered
  { top: "30%", left: "20%",  size: 460, duration: 70, opacity: 0.18 },
  // one mid-right
  { top: "55%", left: "70%",  size: 540, duration: 80, opacity: 0.20 },
  // one starting off the far right
  { top: "78%", left: "115%", size: 480, duration: 65, opacity: 0.19 },
];


export default function CloudBackground() {
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
