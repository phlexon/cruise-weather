// src/screens/AuthSplitScreen.tsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

type AuthSplitScreenProps = {
  onBack: () => void;
  onAuthSuccess: () => void;
};

export default function AuthSplitScreen({
  onBack,
  onAuthSuccess,
}: AuthSplitScreenProps) {
  const { signIn, signUp } = useAuth();

  // login side
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // create side
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createError, setCreateError] = useState("");

  async function handleSignIn() {
    setLoginError("");
    const result = await signIn(loginEmail, loginPassword);

    // ✅ signIn returns null on success, or { error } on failure
    if (result && result.error) {
      setLoginError(result.error.message || "Unable to sign in.");
    } else {
      onAuthSuccess(); // success path
    }
  }

  async function handleCreate() {
    setCreateError("");
    const result = await signUp(createEmail, createPassword);

    // ✅ same pattern for signUp
    if (result && result.error) {
      setCreateError(result.error.message || "Unable to create account.");
    } else {
      onAuthSuccess();
    }
  }

  return (
    <div className="cc-authsplit-page">
      {/* Top logo */}
      <div className="cc-authsplit-logo-wrap">
        <img
          src="/cruisecast-logo.png"
          alt="CruiseCast"
          className="cc-authsplit-logo"
        />
      </div>

      {/* Back to home */}
      <button
        type="button"
        className="cc-back-secondary cc-authsplit-back"
        onClick={onBack}
      >
        ← Back to Home
      </button>

      <div className="cc-authsplit-shell">
        <div className="cc-authsplit-grid">
          {/* LEFT: LOGIN */}
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
            />

            <label className="cc-label">Password</label>
            <input
              type="password"
              className="cc-login-input"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />

            {loginError && <div className="cc-login-error">{loginError}</div>}

            <button
              type="button"
              className="cc-button-primary cc-login-submit"
              onClick={handleSignIn}
            >
              Sign In
            </button>
          </section>

          {/* RIGHT: CREATE ACCOUNT */}
          <section className="cc-authsplit-panel cc-authsplit-panel--blue">
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
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />

            <label className="cc-label">Password</label>
            <input
              type="password"
              className="cc-login-input"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
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
  );
}
