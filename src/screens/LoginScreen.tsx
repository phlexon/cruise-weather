// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

type LoginScreenProps = {
  onBack: () => void;
  onAuthSuccess: () => void; // App decides what to show next
};

export default function LoginScreen({ onBack, onAuthSuccess }: LoginScreenProps) {
  const { signIn, signUp } = useAuth();

  // Sign In fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Create Account fields
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
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
          {/* BACK BUTTON */}
         <button
  onClick={onBack}
  className="cc-cta-button cc-cta-button--secondary cc-back-secondary"
  type="button"
>
  ← Back to Home
</button>



          {/* TWO-COLUMN LAYOUT */}
          <div className="cc-login-grid">
            {/* LEFT COLUMN — SIGN IN */}
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
              <input
                type="password"
                className="cc-login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && <div className="cc-login-error">{error}</div>}

              <button
                onClick={handleSignIn}
                type="button"
                className="cc-button-primary cc-login-submit"
              >
                Sign In
              </button>
            </div>

            {/* RIGHT COLUMN — CREATE ACCOUNT */}
            <div className="cc-login-col cc-login-col--right">
              <h2 className="cc-login-title">Create your account</h2>

              <p className="cc-login-desc">
                Creating an account lets you save your favorite cruises and
                quickly re-check their weather at any time. All your
                forecasts stay synced and easy to access across devices.
              </p>

              <label className="cc-label">Email</label>
              <input
                type="email"
                className="cc-login-input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />

              <label className="cc-label">Password</label>
              <input
                type="password"
                className="cc-login-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              {createError && (
                <div className="cc-login-error">{createError}</div>
              )}

              <button
                onClick={handleCreateAccount}
                type="button"
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
