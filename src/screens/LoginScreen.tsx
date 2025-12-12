// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

type LoginScreenProps = {
  onBack: () => void;
  onAuthSuccess: () => void;
  onGoToCreate: () => void;
};

export default function LoginScreen({
  onBack,
  onAuthSuccess,
  onGoToCreate,
}: LoginScreenProps) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignIn() {
    setError("");

    // signIn RETURNS error OR null
    const signInError = await signIn(email, password);

    if (signInError) {
      setError(signInError.message || "Unable to sign in.");
    } else {
      onAuthSuccess();
    }
  }

  return (
    <div className="cc-auth-outer">
      <div className="cc-auth-wrapper">
        <section className="cc-main-card cc-login-card">
          <div className="cc-login-grid">
            <div className="cc-login-col cc-login-col--left">
              <h2 className="cc-login-title">Sign in to CruiseCast</h2>
              <p className="cc-login-desc">
                Use your email and password to save sailings you care about.
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
                type="button"
                onClick={handleSignIn}
                className="cc-button-primary cc-login-submit"
              >
                Sign In
              </button>

              <button
                type="button"
                className="cc-text-link cc-auth-link"
                onClick={onGoToCreate}
              >
                Create an account
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
