// src/screens/AuthSplitScreen.tsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

type AuthSplitScreenProps = {
  onAuthSuccess: () => void;      // after login
  onSignupSuccess?: () => void;   // after signup
};

export default function AuthSplitScreen({
  onAuthSuccess,
  onSignupSuccess,
}: AuthSplitScreenProps) {
  const { signIn, signUp } = useAuth();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Create account state
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPasswordConfirm, setCreatePasswordConfirm] = useState("");
  const [createError, setCreateError] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  async function handleSignIn() {
    setLoginError("");
    const error = await signIn(loginEmail, loginPassword);

    if (error) {
      setLoginError(error.message || "Unable to sign in.");
    } else {
      onAuthSuccess();
    }
  }

  async function handleCreate() {
    setCreateError("");

    if (!createFirstName.trim() || !createLastName.trim()) {
      setCreateError("Please enter your first and last name.");
      return;
    }

    if (!createPassword || !createPasswordConfirm) {
      setCreateError("Please enter and confirm your password.");
      return;
    }

    if (createPassword !== createPasswordConfirm) {
      setCreateError("The passwords do not match.");
      return;
    }

    const error = await signUp(createEmail, createPassword, {
      first_name: createFirstName.trim(),
      last_name: createLastName.trim(),
    });

    if (error) {
      setCreateError(error.message || "Unable to create account.");
      return;
    }

    if (onSignupSuccess) {
      onSignupSuccess();
    } else {
      onAuthSuccess();
    }
  }

  return (
    <main className="cc-app-main">
      <div className="cc-app-main-inner">
        <div className="cc-authsplit-shell">
          <div className="cc-authsplit-grid">
            {/* LEFT PANEL — SIGN IN */}
            <section className="cc-authsplit-panel">
              <h2 className="cc-login-title">Sign in to CruiseCast</h2>
              <p className="cc-login-desc">
                Use your email and a password to save sailings you care about.
                You can return any time and reload their forecast instantly.
              </p>

              <label className="cc-label">Email</label>
              <input
                type="email"
                className="cc-login-input"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
              />

              <label className="cc-label">Password</label>
              <div className="cc-password-wrapper">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  className="cc-login-input cc-login-input--password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="cc-password-toggle"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  aria-label={
                    showLoginPassword ? "Hide password" : "Show password"
                  }
                >
                  {showLoginPassword ? "🙈" : "👁"}
                </button>
              </div>

              {loginError && (
                <div className="cc-login-error">{loginError}</div>
              )}

              <button
                type="button"
                className="cc-button-primary cc-login-submit"
                onClick={handleSignIn}
              >
                Sign In
              </button>
            </section>

            {/* RIGHT PANEL — CREATE ACCOUNT */}
            <section className="cc-authsplit-panel cc-authsplit-panel--blue">
              <h2 className="cc-login-title">Create your CruiseCast account</h2>
              <p className="cc-login-desc">
                Creating an account lets you save your favorite cruises and
                quickly re-check their weather at any time. Your forecasts stay
                synced and easy to access across devices.
              </p>

              <label className="cc-label">First name</label>
              <input
                type="text"
                className="cc-login-input"
                value={createFirstName}
                onChange={(e) => setCreateFirstName(e.target.value)}
                autoComplete="given-name"
              />

              <label className="cc-label">Last name</label>
              <input
                type="text"
                className="cc-login-input"
                value={createLastName}
                onChange={(e) => setCreateLastName(e.target.value)}
                autoComplete="family-name"
              />

              <label className="cc-label">Email</label>
              <input
                type="email"
                className="cc-login-input"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                autoComplete="email"
              />

              <label className="cc-label">Password</label>
              <div className="cc-password-wrapper">
                <input
                  type={showCreatePassword ? "text" : "password"}
                  className="cc-login-input cc-login-input--password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="cc-password-toggle"
                  onClick={() =>
                    setShowCreatePassword((prev) => !prev)
                  }
                  aria-label={
                    showCreatePassword ? "Hide password" : "Show password"
                  }
                >
                  {showCreatePassword ? "🙈" : "👁"}
                </button>
              </div>

              <label className="cc-label">Confirm password</label>
              <input
                type="password"
                className="cc-login-input"
                value={createPasswordConfirm}
                onChange={(e) => setCreatePasswordConfirm(e.target.value)}
                autoComplete="new-password"
              />

              {createError && (
                <div className="cc-login-error">{createError}</div>
              )}

              <button
                type="button"
                className="cc-button-primary cc-login-submit cc-login-submit--yellow"
                onClick={handleCreate}
              >
                Create Account
              </button>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
