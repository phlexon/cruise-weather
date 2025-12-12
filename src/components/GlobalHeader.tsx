// src/components/GlobalHeader.tsx
import React from "react";

type GlobalHeaderProps = {
  onBack: () => void;
  /** If false, nothing is rendered (useful for the actual home screen). */
  showBack?: boolean;
};

export default function GlobalHeader({
  onBack,
  showBack = true,
}: GlobalHeaderProps) {
  if (!showBack) return null;

  return (
    <div className="cc-global-backbar">
      <button
        type="button"
        className="cc-global-backbar-button"
        onClick={onBack}
      >
        ← Back to Home
      </button>
    </div>
  );
}
