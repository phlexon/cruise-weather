// src/screens/CreateAccountScreen.tsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

type CreateAccountScreenProps = {
  onBack: () => void;
  onAuthSuccess: () => void;
  onGoToLogin: () => void;
};

export default function CreateAccountScreen({
  onBack,
  onAuthSuccess,
  onGoToLogin,
}: CreateAccountScreenProps) {
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");

    try {
      const result = await signUp(email, password);

      // Handle null / undefined or { error } safely
      const authError = (result as any)?.error ?? null;

      if (authError) {
        setError(authError.message ?? "Unable to create your account.");
      } else {
        onAuthSuccess();
      }
    } catch (e: any) {
      console.error("Create account failed:", e);
      setError(e?.message ?? "Something went wrong creating your account.");
    }
  }

  return (
    <div className="cc-auth-wrapper">
      {/* Back button */}
      <button
        onClick={onBack}
        className="cc-cta-button cc-cta-button--secondary cc-back-secondary"
        type="button"
      >
        ← Back to Home
      </button>

      <div className="cc-auth-content">
        <h2 className="cc-login-title">Create your CruiseCast account</h2>

        <p className="cc-login-desc">
          Creating an account lets you save cruises and quickly re-check their
          weather any time. Your favorite sailings stay just a click away.
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
          onClick={handleCreate}
          type="button"
          className="cc-button-primary cc-button-primary--yellow cc-login-submit"
        >
          Create Account
        </button>

        <button
          type="button"
          className="cc-text-link cc-auth-link"
          onClick={onGoToLogin}
        >
          Already have an account? Sign in instead
        </button>
      </div>
    </div>
  );
}
