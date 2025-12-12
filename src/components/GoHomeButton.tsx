import React from "react";
import "./GoHomeButton.css";

type Props = {
  onGoHome: () => void;
};

export default function GoHomeButton({ onGoHome }: Props) {
  return (
    <button
      type="button"
      className="cc-go-home"
      onClick={onGoHome}
    >
      ← Go Home
    </button>
  );
}
