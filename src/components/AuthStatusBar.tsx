// src/components/AuthStatusBar.tsx
import React from "react";
import { useAuth } from "../context/AuthContext";

type AuthStatusBarProps = {
  onGoToSaved?: () => void;
};

export default function AuthStatusBar({ onGoToSaved }: AuthStatusBarProps) {
  const { user, signOut } = useAuth();

  // If not signed in, don't render anything
  if (!user) return null;

  return (
    <div className="cc-auth-bar">
      <span>
        Signed in as <strong>{user.email ?? "CruiseCast user"}</strong>
      </span>

      {onGoToSaved && (
        <button
          type="button"
          className="cc-auth-bar-button"
          onClick={onGoToSaved}
        >
          View saved cruises
        </button>
      )}

      <button
        type="button"
        className="cc-auth-bar-button"
        onClick={() => void signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
