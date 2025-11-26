// src/components/Spinner.tsx
import React from "react";

type SpinnerProps = {
  message?: string;
};

const Spinner: React.FC<SpinnerProps> = ({ message }) => {
  return (
    <div className="cc-spinner-overlay">
      <div className="cc-spinner-card">
        <div className="cc-spinner-icon-wrapper">
          {/* Use custom SVG spinner from public/icons */}
          <img
            src="/icons/spinner.svg"
            alt="Loading…"
            className="cc-spinner-svg"
          />
        </div>

        {message && <div className="cc-spinner-text">{message}</div>}
      </div>
    </div>
  );
};

export default Spinner;
