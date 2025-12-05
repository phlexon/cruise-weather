// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

type LoginScreenProps = {
  onBack: () => void;
  onAuthSuccess: () => void;
};

export default function LoginScreen({ onBack, onAuthSuccess }: LoginScreenProps) {
  const { signIn, signUp } = useAuth();

  // -------- SIGN IN STATE --------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [error, setError] = useState("");

  // -------- CREATE ACCOUNT STATE --------
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [createError, setCreateError] = useState("");

  async function handleSignIn() {
    setError("");
    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
    } else {
      onAuthSuccess();
    }
  }

  async function handleCreateAccount() {
    setCreateError("");
    const { error } = await signUp(newEmail, newPassword);
    if (error) {
      setCreateError(error.message);
    } else {
      onAuthSuccess();
    }
  }

  return (
    <div className="cc-auth-outer">
      <div className="cc-auth-wrapper">
        <section className="cc-main-card cc-login-card">
          {/* BACK TO HOME */}
          <button
            type="button"
            onClick={onBack}
            className="cc-login-back-button"
          >
            ← Back to Home
          </button>

          <div className="cc-login-grid">
            {/* LEFT: SIGN IN */}
            <div className="cc-login-col cc-login-col--left">
              <h2 className="cc-login-title">Sign in to CruiseCast</h2>
              <p className="cc-login-desc">
                Use your email and a password to save sailings you care about.
                You can return any time and reload their forecast instantly.
              </p>

              <label className="cc-label">Email</label>
              <input
                type="email"
                className="cc-login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <label className="cc-label">Password</label>
              <div className="cc-password-row">
                <input
                  type={showSignInPassword ? "text" : "password"}
                  className="cc-login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="cc-password-toggle"
                  onClick={() => setShowSignInPassword((v) => !v)}
                >
                  👁 {showSignInPassword ? "Hide" : "Show"}
                </button>
              </div>

              {error && <div className="cc-login-error">{error}</div>}

              <button
                type="button"
                onClick={handleSignIn}
                className="cc-button-primary cc-login-submit"
              >
                Sign In
              </button>
            </div>

            {/* RIGHT: CREATE ACCOUNT */}
            <div className="cc-login-col cc-login-col--right">
              <h2 className="cc-login-title">Create your CruiseCast account</h2>
              <p className="cc-login-desc">
                Creating an account lets you save your favorite cruises and
                quickly re-check their weather at any time. Your forecasts stay
                synced and easy to access across devices.
              </p>

              <label className="cc-label">Email</label>
              <input
                type="email"
                className="cc-login-input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />

              <label className="cc-label">Password</label>
              <div className="cc-password-row">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="cc-login-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="cc-password-toggle"
                  onClick={() => setShowNewPassword((v) => !v)}
                >
                  👁 {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>

              {createError && (
                <div className="cc-login-error">{createError}</div>
              )}

              <button
                type="button"
                onClick={handleCreateAccount}
                className="cc-button-primary cc-button-primary--yellow cc-login-submit"
              >
                Create Account
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
