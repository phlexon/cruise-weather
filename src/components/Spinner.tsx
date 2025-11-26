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
          {/* Outer spinning ring */}
          <div className="cc-spinner-ring" />
          {/* Inner dot */}
          <div className="cc-spinner-dot" />
        </div>

        {message && (
          <div className="cc-spinner-text">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Spinner;
