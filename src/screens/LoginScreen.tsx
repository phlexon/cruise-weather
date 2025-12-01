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

    try {
      const result = await signIn(email, password);

      // Handle null / undefined result safely
      const authError = (result as any)?.error ?? null;

      if (authError) {
        setError(authError.message ?? "Unable to sign in.");
      } else {
        onAuthSuccess();
      }
    } catch (e: any) {
      console.error("Sign-in failed:", e);
      setError(e?.message ?? "Something went wrong signing you in.");
    }
  }

  return (
    <div className="cc-auth-wrapper">
      {/* Top logo */}
      <div className="cc-auth-logo-wrap">
        <img
          src="/cruisecast-logo.png"
          alt="CruiseCast"
          className="cc-auth-logo"
        />
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="cc-back-secondary"
        type="button"
      >
        ← Back to Home
      </button>

      <div className="cc-auth-content">
        <h2 className="cc-login-title">Sign in to CruiseCast</h2>

        <p className="cc-login-desc">
          Use your email and a password to save sailings you care about. You can
          return anytime and reload their forecast instantly.
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

        <button
          type="button"
          className="cc-text-link cc-auth-link"
          onClick={onGoToCreate}
        >
          Don’t have an account? Create one instead
        </button>
      </div>
    </div>
  );
}
