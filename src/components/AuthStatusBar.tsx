// src/components/AuthStatusBar.tsx
import React from "react";
import { useAuth } from "../context/AuthContext";

type AuthStatusBarProps = {
  onGoToSaved?: () => void;
  onLogin?: () => void;
  onCreateAccount?: () => void;
};

export default function AuthStatusBar({
  onGoToSaved,
  onLogin,
  onCreateAccount,
}: AuthStatusBarProps) {
  const { user, signOut } = useAuth();

  const emailLabel = user?.email ?? "CruiseCast user";

  // ----------------------------
  // LOGGED-IN VIEW
  // ----------------------------
  if (user) {
    return (
      <div className="cc-auth-bar">
        <span className="cc-auth-bar-text">
          Signed in as <strong>{emailLabel}</strong>
        </span>

        <div className="cc-auth-bar-actions">
          {onGoToSaved && (
            <button
              type="button"
              className="cc-auth-bar-button"
              onClick={onGoToSaved}
            >
              Saved Cruises
            </button>
          )}

          <button
            type="button"
            className="cc-auth-bar-button"
            onClick={() => void signOut()}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------
  // LOGGED-OUT VIEW
  // ----------------------------
  return (
   <div className="cc-auth-bar cc-auth-bar--logged-out">
  <span className="cc-auth-bar-text">You’re not signed in.</span>

  <div className="cc-auth-bar-actions">
    <button
      type="button"
      className="cc-auth-bar-button"
      onClick={onLogin}
    >
      Log In
    </button>

    <button
      type="button"
      className="cc-auth-bar-button cc-auth-bar-button--primary"
      onClick={onCreateAccount}
    >
      Create Account
    </button>
  </div>
</div>

  );
}
